import "server-only";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, workspaces, type User, type Workspace } from "@/db";
import { createApiKey } from "./api";

/**
 * Fastn embed: each Formflow workspace is one Fastn customer (orgId = workspace id).
 * The API key and identity secret stay on the server; only the short-lived embed token
 * reaches the browser.
 */
const API_URL = (process.env.FASTN_API_URL ?? "https://api.fastn.dev").replace(/\/$/, "");

export const fastnConfigured = () => Boolean(process.env.FASTN_API_KEY && process.env.FASTN_IDENTITY_SECRET);

/** HMAC over `${orgId}\n${userId}`. Registering a customer signs with an empty orgId. */
function identityHmac(orgId: string, userId: string) {
  return createHmac("sha256", process.env.FASTN_IDENTITY_SECRET!).update(`${orgId}\n${userId}`).digest("hex");
}

function headers(orgId: string, userId: string): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.FASTN_API_KEY}`,
    "content-type": "application/json",
    "x-user-id": userId,
    "x-identity-hmac": identityHmac(orgId, userId),
    ...(orgId ? { "x-org-id": orgId } : {}),
  };
}

export class FastnError extends Error {
  name = "FastnError";
  constructor(message: string, readonly status: number, readonly body: string) {
    super(message);
  }
}

/** Registers the workspace as a Fastn customer once. Safe to call again: an existing customer counts as done. */
export async function ensureCustomer(workspace: Workspace, user: User) {
  if (workspace.fastnRegisteredAt) return;
  const res = await fetch(`${API_URL}/api/v1/orgs`, {
    method: "POST",
    headers: headers("", user.id),
    body: JSON.stringify({ name: workspace.name, orgId: workspace.id, plan: "free" }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  const alreadyThere = res.status === 409 || /already/i.test(body);
  if (!res.ok && !alreadyThere) throw new FastnError(`Registering the workspace with Fastn failed (HTTP ${res.status})`, res.status, body);
  await db.update(workspaces).set({ fastnRegisteredAt: new Date() }).where(eq(workspaces.id, workspace.id));
}

/**
 * Fastn keeps the partner's own product (Formflow) out of the customer's connect step, so the
 * partner creates that connection for each customer. We mint a dedicated Formflow API key for the
 * workspace and store it as the workspace's Formflow connection, which lets Formflow-triggered
 * integrations subscribe to this workspace's own webhooks.
 */
export async function ensureProductConnection(workspace: Workspace, user: User) {
  const connectorId = process.env.FASTN_PRODUCT_CONNECTOR_ID;
  const authMethodId = process.env.FASTN_PRODUCT_AUTH_METHOD_ID;
  if (!connectorId || !authMethodId) return;
  const [fresh] = await db.select({ at: workspaces.fastnConnectionAt }).from(workspaces).where(eq(workspaces.id, workspace.id)).limit(1);
  if (fresh?.at) return;

  const { key } = await createApiKey(workspace.id, "Fastn integrations");
  const res = await fetch(`${API_URL}/api/v1/connections`, {
    method: "POST",
    headers: headers("", user.id),
    body: JSON.stringify({ connectorId, authMethodId, orgId: workspace.id, name: "Formflow", credentials: { token: key } }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.text();
  const alreadyThere = res.status === 409 || /already exists/i.test(body);
  if (!res.ok && !alreadyThere) throw new FastnError(`Creating the Formflow connection in Fastn failed (HTTP ${res.status})`, res.status, body);
  await db.update(workspaces).set({ fastnConnectionAt: new Date() }).where(eq(workspaces.id, workspace.id));
}

/** A short-lived embed token for this workspace and user. Fetch a new one on every page load. */
export async function embedToken(workspace: Workspace, user: User) {
  const res = await fetch(`${API_URL}/api/v1/embed/token`, {
    method: "POST",
    headers: headers(workspace.id, user.id),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  if (!res.ok) throw new FastnError(`Fastn refused the embed token (HTTP ${res.status})`, res.status, body);
  const json = JSON.parse(body) as { token?: string; data?: { token?: string } };
  const token = json.token ?? json.data?.token;
  if (!token) throw new FastnError("Fastn returned no embed token", res.status, body);
  return token;
}

export const iframeSrc = (token: string) => `${API_URL}/api/v1/embed/iframe?token=${encodeURIComponent(token)}`;
