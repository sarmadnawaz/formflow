import "server-only";
import { createHmac } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { after } from "next/server";
import { db, webhookDeliveries, webhooks, type Form, type FormResponse, type Webhook } from "@/db";
import { appUrl, newId } from "./ids";
import { serializeForm, serializeResponse } from "./serialize";

import { EVENT_TYPES, type EventType } from "./events-types";

export { EVENT_TYPES, type EventType };

export type FormflowEvent = {
  id: string;
  type: EventType | "ping";
  created_at: string;
  workspace_id: string;
  data: Record<string, unknown>;
};

const RETRY_DELAYS_MS = [0, 2000, 8000];

export function sign(secret: string, timestamp: number, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function deliver(hook: Webhook, event: FormflowEvent) {
  const body = JSON.stringify(event);
  const deliveryId = newId("dlv");
  await db.insert(webhookDeliveries).values({ id: deliveryId, webhookId: hook.id, eventId: event.id, eventType: event.type, payload: event });

  let statusCode: number | null = null;
  let error: string | null = null;
  let attempts = 0;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    attempts++;
    const ts = Math.floor(Date.now() / 1000);
    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Formflow-Webhooks/1.0",
          "x-formflow-event": event.type,
          "x-formflow-event-id": event.id,
          "x-formflow-signature": `t=${ts},v1=${sign(hook.secret, ts, body)}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      statusCode = res.status;
      error = res.ok ? null : `HTTP ${res.status}`;
      // 4xx other than 408/429 will not get better with a retry.
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429)) break;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }
  await db
    .update(webhookDeliveries)
    .set({ ok: error === null, statusCode, attempts, error })
    .where(eq(webhookDeliveries.id, deliveryId));
  return { ok: error === null, statusCode, error };
}

/** Records the event and delivers it to matching webhooks after the response is sent. */
export function emit(workspaceId: string, type: EventType, data: Record<string, unknown>, formId?: string) {
  const event: FormflowEvent = { id: newId("evt"), type, created_at: new Date().toISOString(), workspace_id: workspaceId, data };
  after(async () => {
    const hooks = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.workspaceId, workspaceId),
          eq(webhooks.active, true),
          formId ? or(isNull(webhooks.formId), eq(webhooks.formId, formId)) : isNull(webhooks.formId),
        ),
      );
    await Promise.all(hooks.filter((h) => h.events.includes(type)).map((h) => deliver(h, event)));
  });
  return event;
}

export function emitResponseSubmitted(form: Form, response: FormResponse) {
  return emit(form.workspaceId, "response.submitted", { form: serializeForm(form), response: serializeResponse(response, form) }, form.id);
}

export function emitFormEvent(type: Exclude<EventType, "response.submitted">, form: Form) {
  return emit(form.workspaceId, type, { form: serializeForm(form) }, form.id);
}

export async function sendPing(hook: Webhook) {
  return deliver(hook, {
    id: newId("evt"),
    type: "ping",
    created_at: new Date().toISOString(),
    workspace_id: hook.workspaceId,
    data: { message: "Webhook test from Formflow", app_url: appUrl() },
  });
}
