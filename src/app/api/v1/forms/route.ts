import { NextResponse } from "next/server";
import { apiError, readJson, withApiKey } from "@/lib/api";
import { createForm, formInputSchema, listForms } from "@/lib/forms";
import { serializeForm } from "@/lib/serialize";

/** GET /api/v1/forms?status=published */
export const GET = withApiKey(async (req, _ctx, workspace) => {
  const status = new URL(req.url).searchParams.get("status");
  if (status && status !== "draft" && status !== "published") return apiError(400, "invalid_status", "status must be draft or published");
  const rows = await listForms(workspace.id);
  const data = rows
    .filter(({ form }) => !status || form.status === status)
    .map(({ form, responseCount }) => ({ ...serializeForm(form), response_count: responseCount }));
  return NextResponse.json({ data });
});

/** POST /api/v1/forms */
export const POST = withApiKey(async (req, _ctx, workspace) => {
  const body = await readJson(req, formInputSchema);
  if (body.error) return body.error;
  const form = await createForm(workspace.id, body.data);
  return NextResponse.json(serializeForm(form), { status: 201 });
});
