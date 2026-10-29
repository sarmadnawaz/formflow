import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, webhooks } from "@/db";
import { notFound, withApiKey } from "@/lib/api";
import { serializeWebhook } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/webhooks/[id]">;

const scope = (workspaceId: string, id: string) => and(eq(webhooks.id, id), eq(webhooks.workspaceId, workspaceId));

export const GET = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const [hook] = await db.select().from(webhooks).where(scope(workspace.id, (await ctx.params).id)).limit(1);
  return hook ? NextResponse.json(serializeWebhook(hook)) : notFound("Webhook");
});

/** DELETE /api/v1/webhooks/:id — unsubscribe. */
export const DELETE = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const deleted = await db.delete(webhooks).where(scope(workspace.id, (await ctx.params).id)).returning({ id: webhooks.id });
  return deleted.length ? new Response(null, { status: 204 }) : notFound("Webhook");
});
