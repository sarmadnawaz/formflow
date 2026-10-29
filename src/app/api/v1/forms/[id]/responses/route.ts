import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, notFound, readJson, withApiKey } from "@/lib/api";
import { getForm, listResponses, submitResponse } from "@/lib/forms";
import { serializeResponse } from "@/lib/serialize";

type Ctx = RouteContext<"/api/v1/forms/[id]/responses">;

/** GET /api/v1/forms/:id/responses?limit=50&before=rsp_... (newest first) */
export const GET = withApiKey<Ctx>(async (req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  if (!form) return notFound("Form");
  const q = new URL(req.url).searchParams;
  const { rows, hasMore } = await listResponses(form.id, { limit: Number(q.get("limit")) || 50, before: q.get("before") ?? undefined });
  return NextResponse.json({
    data: rows.map((r) => serializeResponse(r, form)),
    has_more: hasMore,
    next_cursor: hasMore ? rows[rows.length - 1].id : null,
  });
});

const createSchema = z.object({ answers: z.record(z.string(), z.unknown()) });

/**
 * POST /api/v1/forms/:id/responses — submit a response on someone's behalf.
 * Answers can be keyed by field id or by field label (case-insensitive).
 */
export const POST = withApiKey<Ctx>(async (req, ctx, workspace) => {
  const form = await getForm(workspace.id, (await ctx.params).id);
  if (!form) return notFound("Form");
  const body = await readJson(req, createSchema);
  if (body.error) return body.error;

  const byLabel = new Map(form.fields.map((f) => [f.label.trim().toLowerCase(), f.id]));
  const input: Record<string, unknown> = {};
  const unknownKeys: string[] = [];
  for (const [key, value] of Object.entries(body.data.answers)) {
    const id = form.fields.some((f) => f.id === key) ? key : byLabel.get(key.trim().toLowerCase());
    if (id) input[id] = value;
    else unknownKeys.push(key);
  }
  if (unknownKeys.length) return apiError(422, "unknown_fields", `No field matches: ${unknownKeys.join(", ")}`);

  const result = await submitResponse(form, input, "api");
  if (!result.ok) return apiError(422, "validation_failed", "Some answers are invalid", result.errors);
  return NextResponse.json(serializeResponse(result.response, form), { status: 201 });
});
