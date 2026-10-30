import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, notFound, readJson, withApiKey } from "@/lib/api";
import { getForm } from "@/lib/forms";
import { appUrl } from "@/lib/ids";
import { resolveAnswerKeys } from "@/lib/serialize";

const schema = z.object({ prefill: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() });

/**
 * POST /api/v1/forms/:id/share-link — a link to send to someone, optionally with
 * answers prefilled (keyed by field id, label or a standard contact key such as email).
 */
export const POST = withApiKey<RouteContext<"/api/v1/forms/[id]/share-link">>(async (req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  if (!form) return notFound("Form");
  if (form.status !== "published") return apiError(409, "form_not_published", "Publish the form before sharing it");
  // The body is optional: an empty POST returns the plain link.
  let prefill: Record<string, string | number | boolean> = {};
  if ((await req.clone().text()).trim()) {
    const body = await readJson(req, schema);
    if (body.error) return body.error;
    prefill = body.data.prefill ?? {};
  }

  const url = new URL(`${appUrl()}/f/${form.slug}`);
  const { answers, unknown } = resolveAnswerKeys(form, prefill);
  if (unknown.length) return apiError(422, "unknown_fields", `No field matches: ${unknown.join(", ")}`);
  for (const [id, value] of Object.entries(answers)) url.searchParams.set(id, String(value));
  return NextResponse.json({ form_id: form.id, url: url.toString() });
});
