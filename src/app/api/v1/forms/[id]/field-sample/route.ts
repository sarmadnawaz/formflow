import { NextResponse } from "next/server";
import { notFound, withApiKey } from "@/lib/api";
import { getForm } from "@/lib/forms";
import { fieldSample } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/forms/[id]/field-sample">;

/** GET /api/v1/forms/:id/field-sample — one empty response record keyed by question label. */
export const GET = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  return form ? NextResponse.json({ data: [fieldSample(form)] }) : notFound("Form");
});
