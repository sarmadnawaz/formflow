import { NextResponse } from "next/server";
import { withApiKey } from "@/lib/api";

/** GET /api/v1/me — the workspace this API key belongs to. Useful as a connection test. */
export const GET = withApiKey(async (_req, _ctx, workspace) =>
  NextResponse.json({ workspace: { id: workspace.id, name: workspace.name, created_at: workspace.createdAt.toISOString() } }),
);
