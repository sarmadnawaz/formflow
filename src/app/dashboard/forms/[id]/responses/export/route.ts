import { asc, eq } from "drizzle-orm";
import { db, responses } from "@/db";
import { getSession } from "@/lib/auth";
import { formatAnswer } from "@/lib/fields";
import { getForm } from "@/lib/forms";

const csvCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(_: Request, ctx: RouteContext<"/dashboard/forms/[id]/responses/export">) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  const form = await getForm(session.workspace.id, (await ctx.params).id);
  if (!form) return new Response("Not found", { status: 404 });

  const rows = await db.select().from(responses).where(eq(responses.formId, form.id)).orderBy(asc(responses.createdAt));
  const header = ["Response ID", "Submitted at", ...form.fields.map((f) => f.label)];
  const lines = [header, ...rows.map((r) => [r.id, r.createdAt.toISOString(), ...form.fields.map((f) => formatAnswer(r.answers[f.id]))])];
  const csv = lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
  const filename = `${form.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "responses"}.csv`;

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` },
  });
}
