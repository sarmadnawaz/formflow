import Link from "next/link";
import { Badge, Card, Logo } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { appUrl } from "@/lib/ids";
import { openApiSpec } from "@/lib/openapi";

export const metadata = { title: "API reference" };

const methodTone = { get: "indigo", post: "green", patch: "amber", delete: "red" } as const;

type Op = { summary: string; description?: string; tags: string[] };

function Code({ children }: { children: string }) {
  return <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{children}</pre>;
}

export default async function DocsPage() {
  const base = appUrl();
  const spec = openApiSpec(base);
  const session = await getSession();
  const ops = Object.entries(spec.paths).flatMap(([path, item]) =>
    Object.entries(item)
      .filter(([m]) => m in methodTone)
      .map(([method, op]) => ({ path, method: method as keyof typeof methodTone, op: op as Op })),
  );

  return (
    <div className="flex-1">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/">
            <Logo />
          </Link>
          <Link href={session ? "/dashboard" : "/login"} className="text-sm text-slate-600 hover:text-slate-900">
            {session ? "Dashboard →" : "Log in →"}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-10 px-4 py-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Formflow API</h1>
          <p className="mt-2 text-slate-600">{spec.info.description}</p>
          <p className="mt-3 text-sm">
            OpenAPI 3.1 spec:{" "}
            <a href="/api/v1/openapi.json" className="font-mono text-indigo-600 hover:underline">
              {base}/api/v1/openapi.json
            </a>
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Quick start</h2>
          <p className="text-sm text-slate-600">
            Create an API key in <Link href="/dashboard/settings" className="text-indigo-600 hover:underline">Settings</Link>, then:
          </p>
          <Code>{`curl ${base}/api/v1/forms \\
  -H "Authorization: Bearer ff_live_..."

curl -X POST ${base}/api/v1/forms/frm_.../responses \\
  -H "Authorization: Bearer ff_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"answers": {"Full name": "Jane Doe", "Email": "jane@acme.com"}}'`}</Code>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Endpoints</h2>
          <Card className="divide-y divide-slate-100">
            {ops.map(({ path, method, op }) => (
              <div key={method + path} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="w-16">
                  <Badge tone={methodTone[method]}>{method.toUpperCase()}</Badge>
                </span>
                <code className="w-72 text-sm">{path}</code>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="text-slate-800">{op.summary}</div>
                  {op.description && <div className="mt-0.5 text-xs text-slate-500">{op.description}</div>}
                </div>
              </div>
            ))}
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-slate-600">
            Events: {Object.keys(spec.webhooks).map((e) => <code key={e} className="mr-2 rounded bg-slate-100 px-1 py-0.5 text-xs">{e}</code>)}
          </p>
          <p className="text-sm text-slate-600">
            Each delivery is a JSON <code className="text-xs">POST</code> with headers <code className="text-xs">X-Formflow-Event</code>,{" "}
            <code className="text-xs">X-Formflow-Event-Id</code> and <code className="text-xs">X-Formflow-Signature</code>. Failed deliveries are
            retried up to 3 times. Verify the signature like this:
          </p>
          <Code>{`import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody, header, secret) {
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = createHmac("sha256", secret).update(\`\${t}.\${rawBody}\`).digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(t)) < 300;
  return fresh && timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
}`}</Code>
          <p className="text-sm text-slate-600">Example <code className="text-xs">response.submitted</code> payload:</p>
          <Code>{JSON.stringify(
            {
              id: "evt_...",
              type: "response.submitted",
              created_at: "2026-10-29T12:00:00.000Z",
              workspace_id: "ws_...",
              data: {
                form: { id: "frm_...", title: "Book a demo", url: `${base}/f/abc123`, fields: ["..."] },
                response: {
                  id: "rsp_...",
                  form_id: "frm_...",
                  answers: { fld_a1: "Jane Doe", fld_b2: "jane@acme.com" },
                  fields: [
                    { id: "fld_a1", label: "Full name", type: "short_text", value: "Jane Doe" },
                    { id: "fld_b2", label: "Work email", type: "email", value: "jane@acme.com" },
                  ],
                },
              },
            },
            null,
            2,
          )}</Code>
        </section>
      </main>
    </div>
  );
}
