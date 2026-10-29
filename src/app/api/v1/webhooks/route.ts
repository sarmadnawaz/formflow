import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, webhooks } from "@/db";
import { notFound, readJson, withApiKey } from "@/lib/api";
import { EVENT_TYPES } from "@/lib/events";
import { getForm } from "@/lib/forms";
import { newId, randomToken } from "@/lib/ids";
import { serializeWebhook } from "@/lib/serialize";

export const GET = withApiKey(async (_req, _ctx, workspace) => {
  const rows = await db.select().from(webhooks).where(eq(webhooks.workspaceId, workspace.id)).orderBy(desc(webhooks.createdAt));
  return NextResponse.json({ data: rows.map((h) => serializeWebhook(h)) });
});

const schema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  events: z.array(z.enum(EVENT_TYPES)).min(1).default(["response.submitted"]),
  form_id: z.string().optional(),
  description: z.string().max(200).optional(),
});

/** POST /api/v1/webhooks — subscribe a URL to events. The signing secret is returned once. */
export const POST = withApiKey(async (req, _ctx, workspace) => {
  const body = await readJson(req, schema);
  if (body.error) return body.error;
  const { url, events, form_id, description } = body.data;
  if (form_id && !(await getForm(workspace.id, form_id))) return notFound("Form");
  const [hook] = await db
    .insert(webhooks)
    .values({ id: newId("wh"), workspaceId: workspace.id, url, events, formId: form_id ?? null, description: description ?? "", secret: `whsec_${randomToken(24)}` })
    .returning();
  return NextResponse.json(serializeWebhook(hook, true), { status: 201 });
});
