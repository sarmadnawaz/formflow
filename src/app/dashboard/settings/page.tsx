import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import Link from "next/link";
import { deleteWebhookAction, renameWorkspaceAction, revokeKeyAction, toggleWebhookAction } from "@/app/actions/settings";
import { LocalTime } from "@/components/local-time";
import { CreateKeyForm, CreateWebhookForm, TestWebhookButton } from "@/components/settings-forms";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { apiKeys, db, webhookDeliveries, webhooks } from "@/db";
import { requireSession } from "@/lib/auth";
import { EVENT_TYPES } from "@/lib/events";

export const metadata = { title: "Settings" };

const when = (d: Date | null) => (d ? <LocalTime date={d} /> : "Never");

function Section({ title, description, children }: { title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-slate-200 py-8 first:pt-0 last:border-0 md:grid-cols-[16rem_minmax(0,1fr)]">
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const { workspace } = await requireSession();
  const keys = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.workspaceId, workspace.id), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
  const hooks = await db.select().from(webhooks).where(eq(webhooks.workspaceId, workspace.id)).orderBy(desc(webhooks.createdAt));
  const deliveries = hooks.length
    ? await db
        .select()
        .from(webhookDeliveries)
        .where(inArray(webhookDeliveries.webhookId, hooks.map((h) => h.id)))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(100)
    : [];

  return (
    <>
      <PageHeader title="Settings" description={`Workspace ${workspace.id}`} />

      <Section title="Workspace" description="The name your team and API clients see.">
        <form action={renameWorkspaceAction} className="flex max-w-md gap-2">
          <Input name="name" defaultValue={workspace.name} />
          <Button variant="secondary">Save</Button>
        </form>
      </Section>

      <Section
        title="API keys"
        description={
          <>
            Use a key to call the{" "}
            <Link href="/docs" className="text-indigo-600 hover:underline">
              Formflow API
            </Link>{" "}
            from your own systems.
          </>
        }
      >
        <CreateKeyForm />
        {keys.length > 0 && (
          <Card className="divide-y divide-slate-100">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{k.name}</div>
                  <div className="font-mono text-xs text-slate-500">{k.prefix}…</div>
                </div>
                <div className="text-xs text-slate-500">Last used {when(k.lastUsedAt)}</div>
                <form action={revokeKeyAction.bind(null, k.id)}>
                  <button className="text-xs text-red-600 hover:underline">Revoke</button>
                </form>
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section
        title="Webhooks"
        description="Formflow sends a signed POST request to your URL when something happens, for example a new response."
      >
        <Card className="p-5">
          <CreateWebhookForm events={EVENT_TYPES} />
        </Card>
        {hooks.map((h) => {
          const recent = deliveries.filter((d) => d.webhookId === h.id).slice(0, 5);
          return (
            <Card key={h.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <code className="min-w-0 flex-1 truncate text-sm">{h.url}</code>
                <Badge tone={h.active ? "green" : "slate"}>{h.active ? "Active" : "Paused"}</Badge>
                <TestWebhookButton id={h.id} />
                <form action={toggleWebhookAction.bind(null, h.id)}>
                  <button className="text-xs text-slate-600 hover:underline">{h.active ? "Pause" : "Resume"}</button>
                </form>
                <form action={deleteWebhookAction.bind(null, h.id)}>
                  <button className="text-xs text-red-600 hover:underline">Delete</button>
                </form>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {h.events.join(", ")}
                {h.formId && ` · form ${h.formId}`}
                {h.description && ` · ${h.description}`}
              </div>
              {recent.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                  {recent.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 text-xs">
                      <span className={d.ok ? "text-emerald-600" : "text-red-600"}>●</span>
                      <code className="w-36">{d.eventType}</code>
                      <span className="text-slate-500">{d.statusCode ?? d.error ?? "pending"}</span>
                      <span className="text-slate-400">
                        {d.attempts} {d.attempts === 1 ? "attempt" : "attempts"}
                      </span>
                      <span className="ml-auto text-slate-400">{when(d.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </Section>
    </>
  );
}
