"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiKeys, db, webhooks, workspaces } from "@/db";
import { createApiKey } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { EVENT_TYPES, sendPing } from "@/lib/events";
import { newId, randomToken } from "@/lib/ids";

const done = () => revalidatePath("/dashboard/settings");

export async function renameWorkspaceAction(formData: FormData) {
  const { workspace } = await requireSession();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (name) await db.update(workspaces).set({ name }).where(eq(workspaces.id, workspace.id));
  revalidatePath("/dashboard", "layout");
}

export type KeyState = { key?: string; error?: string } | undefined;

export async function createKeyAction(_: KeyState, formData: FormData): Promise<KeyState> {
  const { workspace } = await requireSession();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100) || "API key";
  const { key } = await createApiKey(workspace.id, name);
  done();
  return { key };
}

export async function revokeKeyAction(keyId: string) {
  const { workspace } = await requireSession();
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, workspace.id)));
  done();
}

export type WebhookState = { error?: string; secret?: string } | undefined;

const webhookSchema = z.object({
  url: z.url({ protocol: /^https?$/, error: "Enter a valid http(s) URL" }),
  events: z.array(z.enum(EVENT_TYPES)).min(1, "Pick at least one event"),
  description: z.string().max(200).optional(),
});

export async function createWebhookAction(_: WebhookState, formData: FormData): Promise<WebhookState> {
  const { workspace } = await requireSession();
  const parsed = webhookSchema.safeParse({
    url: String(formData.get("url") ?? "").trim(),
    events: formData.getAll("events").map(String),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const secret = `whsec_${randomToken(24)}`;
  await db.insert(webhooks).values({ id: newId("wh"), workspaceId: workspace.id, secret, ...parsed.data });
  done();
  return { secret };
}

async function ownWebhook(id: string) {
  const { workspace } = await requireSession();
  const [hook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, id), eq(webhooks.workspaceId, workspace.id)))
    .limit(1);
  if (!hook) throw new Error("Webhook not found");
  return hook;
}

export async function deleteWebhookAction(id: string) {
  const hook = await ownWebhook(id);
  await db.delete(webhooks).where(eq(webhooks.id, hook.id));
  done();
}

export async function toggleWebhookAction(id: string) {
  const hook = await ownWebhook(id);
  await db.update(webhooks).set({ active: !hook.active }).where(eq(webhooks.id, hook.id));
  done();
}

export async function testWebhookAction(id: string) {
  const hook = await ownWebhook(id);
  const result = await sendPing(hook);
  done();
  return result;
}
