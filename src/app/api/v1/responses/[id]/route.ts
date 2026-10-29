import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, forms, responses } from "@/db";
import { notFound, withApiKey } from "@/lib/api";
import { serializeResponse } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/responses/[id]">;

async function load(workspaceId: string, id: string) {
  const [row] = await db
    .select({ response: responses, form: forms })
    .from(responses)
    .innerJoin(forms, eq(forms.id, responses.formId))
    .where(and(eq(responses.id, id), eq(responses.workspaceId, workspaceId)))
    .limit(1);
  return row;
}

export const GET = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const row = await load(workspace.id, (await ctx.params).id);
  return row ? NextResponse.json(serializeResponse(row.response, row.form)) : notFound("Response");
});

export const DELETE = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const row = await load(workspace.id, (await ctx.params).id);
  if (!row) return notFound("Response");
  await db.delete(responses).where(eq(responses.id, row.response.id));
  return new Response(null, { status: 204 });
});
