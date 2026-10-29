import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, notFound, readJson, withApiKey } from "@/lib/api";
import { deleteForm, formInputSchema, getForm, setFormStatus, updateForm } from "@/lib/forms";
import { serializeForm } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/forms/[id]">;

export const GET = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  return form ? NextResponse.json(serializeForm(form)) : notFound("Form");
});

const patchSchema = formInputSchema.partial().extend({ status: z.enum(["draft", "published"]).optional() });

/** PATCH /api/v1/forms/:id — any of title, description, fields, settings, status. */
export const PATCH = withApiKey<Ctx>(async (req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  if (!form) return notFound("Form");
  const body = await readJson(req, patchSchema);
  if (body.error) return body.error;
  const { status, ...rest } = body.data;
  if (!Object.keys(rest).length && !status) return apiError(400, "empty_update", "Send at least one field to update");
  let updated = Object.keys(rest).length ? await updateForm(form, rest) : form;
  if (status) updated = await setFormStatus(updated, status);
  return NextResponse.json(serializeForm(updated));
});

export const DELETE = withApiKey<Ctx>(async (_req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  if (!form) return notFound("Form");
  await deleteForm(form);
  return new Response(null, { status: 204 });
});
