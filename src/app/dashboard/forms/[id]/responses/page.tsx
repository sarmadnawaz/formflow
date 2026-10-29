import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteResponseAction } from "@/app/actions/forms";
import { LocalTime } from "@/components/local-time";
import { Badge, ButtonLink, buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatAnswer } from "@/lib/fields";
import { getForm, listResponses } from "@/lib/forms";

export const metadata = { title: "Responses" };

export default async function ResponsesPage({ params, searchParams }: PageProps<"/dashboard/forms/[id]/responses">) {
  const { workspace } = await requireSession();
  const form = await getForm(workspace.id, (await params).id);
  if (!form) notFound();
  const { before, open } = (await searchParams) as { before?: string; open?: string };
  const { rows, hasMore } = await listResponses(form.id, { limit: 50, before });
  const openRow = rows.find((r) => r.id === open);
  const cols = form.fields.slice(0, 5);

  return (
    <>
      <div className="mb-4">
        <Link href={`/dashboard/forms/${form.id}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← {form.title}
        </Link>
      </div>
      <PageHeader
        title="Responses"
        description={
          <>
            {form.title} <Badge tone={form.status === "published" ? "green" : "slate"}>{form.status === "published" ? "Live" : "Draft"}</Badge>
          </>
        }
        actions={
          rows.length > 0 && (
            <a href={`/dashboard/forms/${form.id}/responses/export`} className={buttonClass("secondary")}>
              Download CSV
            </a>
          )
        }
      />

      {rows.length === 0 && !before ? (
        <EmptyState
          title="No responses yet"
          description={form.status === "published" ? "Share your form link to start collecting responses." : "Publish your form to start collecting responses."}
          action={<ButtonLink href={`/dashboard/forms/${form.id}`}>{form.status === "published" ? "Get the link" : "Go to editor"}</ButtonLink>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Submitted</th>
                  {cols.map((f) => (
                    <th key={f.id} className="max-w-48 truncate px-4 py-3 font-medium">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className={r.id === open ? "bg-indigo-50" : "hover:bg-slate-50"}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`?open=${r.id}${before ? `&before=${before}` : ""}`} className="text-indigo-600 hover:underline" scroll={false}>
                        <LocalTime date={r.createdAt} />
                      </Link>
                      {r.source === "api" && <span className="ml-2 text-xs text-slate-400">API</span>}
                    </td>
                    {cols.map((f) => (
                      <td key={f.id} className="max-w-48 truncate px-4 py-3 text-slate-700">
                        {formatAnswer(r.answers[f.id])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(hasMore || before) && (
              <div className="flex justify-between border-t border-slate-100 px-4 py-3 text-sm">
                {before ? <Link href="?" className="text-indigo-600 hover:underline">← Newest</Link> : <span />}
                {hasMore && (
                  <Link href={`?before=${rows[rows.length - 1].id}`} className="text-indigo-600 hover:underline">
                    Older →
                  </Link>
                )}
              </div>
            )}
          </Card>

          <Card className="h-fit p-5">
            {openRow ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Response</div>
                    <div className="text-xs text-slate-500"><LocalTime date={openRow.createdAt} full /></div>
                  </div>
                  <form action={deleteResponseAction.bind(null, form.id, openRow.id)}>
                    <button className="text-xs text-red-600 hover:underline">Delete</button>
                  </form>
                </div>
                <dl className="space-y-4">
                  {form.fields.map((f) => (
                    <div key={f.id}>
                      <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">
                        {formatAnswer(openRow.answers[f.id]) || <span className="text-slate-300">-</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 border-t border-slate-100 pt-3 font-mono text-[11px] text-slate-400">{openRow.id}</div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a response to see every answer.</p>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
