import Link from "next/link";
import { createFormAction } from "@/app/actions/forms";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { listForms } from "@/lib/forms";
import { TEMPLATES } from "@/lib/templates";

export const metadata = { title: "Forms" };

export default async function FormsPage() {
  const { workspace } = await requireSession();
  const rows = await listForms(workspace.id);

  return (
    <>
      <PageHeader title="Forms" description="Create a form, publish it, and share the link." />

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-slate-500">Start a new form</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {TEMPLATES.map((t) => (
            <form key={t.id} action={createFormAction}>
              <input type="hidden" name="template" value={t.id} />
              <button className="h-full w-full rounded-xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:ring-2 hover:ring-indigo-500">
                <div className="text-sm font-semibold text-slate-900">{t.id === "blank" ? "+ Blank form" : t.name}</div>
                <div className="mt-1 text-xs text-slate-500">{t.description}</div>
              </button>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-500">Your forms</h2>
        {rows.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-slate-500">No forms yet. Pick a template above to create your first one.</Card>
        ) : (
          <Card className="divide-y divide-slate-100 overflow-hidden">
            {rows.map(({ form, responseCount }) => (
              <div key={form.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                <Link href={`/dashboard/forms/${form.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900">{form.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {form.fields.length} fields · updated {form.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </div>
                </Link>
                <Badge tone={form.status === "published" ? "green" : "slate"}>{form.status === "published" ? "Live" : "Draft"}</Badge>
                <Link
                  href={`/dashboard/forms/${form.id}/responses`}
                  className="w-28 text-right text-sm text-slate-600 hover:text-indigo-600"
                >
                  {responseCount} {responseCount === 1 ? "response" : "responses"}
                </Link>
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
