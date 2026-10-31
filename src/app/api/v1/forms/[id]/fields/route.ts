import { NextResponse } from "next/server";
import { notFound, withApiKey } from "@/lib/api";
import { getForm } from "@/lib/forms";
import { serializeFieldList } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/forms/[id]/fields">;

/** GET /api/v1/forms/:id/fields — the mappable keys of the form's responses, standard contact keys first. */
export const GET = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  return form ? NextResponse.json({ data: serializeFieldList(form) }) : notFound("Form");
});
