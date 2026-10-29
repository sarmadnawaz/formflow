import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiKeys, db, workspaces } from "@/db";
import { randomToken, sha256, newId } from "./ids";

export const KEY_PREFIX = "ff_live_";

export async function createApiKey(workspaceId: string, name: string) {
  const key = `${KEY_PREFIX}${randomToken(24)}`;
  const [row] = await db
    .insert(apiKeys)
    .values({ id: newId("key"), workspaceId, name, prefix: key.slice(0, KEY_PREFIX.length + 6), keyHash: sha256(key) })
    .returning();
  return { key, row };
}

/** Resolves the workspace for a `Authorization: Bearer ff_live_...` request. */
export async function authenticate(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const key = header.match(/^Bearer\s+(\S+)$/i)?.[1] ?? req.headers.get("x-api-key");
  if (!key) return null;
  const [row] = await db
    .select({ keyId: apiKeys.id, workspace: workspaces })
    .from(apiKeys)
    .innerJoin(workspaces, eq(workspaces.id, apiKeys.workspaceId))
    .where(and(eq(apiKeys.keyHash, sha256(key)), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!row) return null;
  // Best effort; never block the request on it.
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.keyId)).catch(() => {});
  return row.workspace;
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export const unauthorized = () =>
  apiError(401, "unauthorized", "Missing or invalid API key. Send it as `Authorization: Bearer ff_live_...`.");
export const notFound = (what: string) => apiError(404, "not_found", `${what} not found`);

export async function readJson<T extends z.ZodType>(req: Request, schema: T) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: apiError(400, "invalid_json", "Request body must be valid JSON") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: apiError(422, "validation_failed", "Request body is invalid", z.flattenError(parsed.error).fieldErrors) };
  return { data: parsed.data as z.infer<T> };
}

/** Wraps a handler so every route gets API-key auth and consistent JSON errors. */
export function withApiKey<C>(handler: (req: Request, ctx: C, workspace: typeof workspaces.$inferSelect) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const workspace = await authenticate(req);
    if (!workspace) return unauthorized();
    try {
      return await handler(req, ctx, workspace);
    } catch (e) {
      if (e instanceof Error && e.name === "FormInputError") return apiError(422, "validation_failed", e.message);
      console.error(e);
      return apiError(500, "internal_error", "Something went wrong");
    }
  };
}
