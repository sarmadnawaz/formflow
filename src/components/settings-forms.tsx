"use client";

import { useActionState, useState, useTransition } from "react";
import { createKeyAction, createWebhookAction, testWebhookAction } from "@/app/actions/settings";
import { Button, Input, Label } from "./ui";

function SecretOnce({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
      <p className="mb-2 text-sm text-amber-800">{label} Copy it now, it is shown only once.</p>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
        <Button
          variant="secondary"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function CreateKeyForm() {
  const [state, action, pending] = useActionState(createKeyAction, undefined);
  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2">
        <Input name="name" placeholder="Key name, for example Production" className="max-w-xs" />
        <Button disabled={pending}>Create key</Button>
      </form>
      {state?.key && <SecretOnce label="Your new API key." value={state.key} />}
    </div>
  );
}

export function CreateWebhookForm({ events }: { events: readonly string[] }) {
  const [state, action, pending] = useActionState(createWebhookAction, undefined);
  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        <div>
          <Label htmlFor="wh-url">Endpoint URL</Label>
          <Input id="wh-url" name="url" placeholder="https://example.com/webhooks/formflow" required />
        </div>
        <div>
          <Label>Events</Label>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {events.map((e) => (
              <label key={e} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="events" value={e} defaultChecked={e === "response.submitted"} className="accent-indigo-600" />
                <code className="text-xs">{e}</code>
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="wh-desc" hint="(optional)">
            Description
          </Label>
          <Input id="wh-desc" name="description" placeholder="What receives this webhook?" />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button disabled={pending}>Add webhook</Button>
      </form>
      {state?.secret && <SecretOnce label="Signing secret for this webhook." value={state.secret} />}
    </div>
  );
}

export function TestWebhookButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        className="text-xs text-indigo-600 hover:underline disabled:text-slate-400"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await testWebhookAction(id);
            setResult(r.ok ? `Delivered (${r.statusCode})` : `Failed: ${r.error}`);
          })
        }
      >
        {pending ? "Sending…" : "Send test"}
      </button>
      {result && <span className={`text-xs ${result.startsWith("Delivered") ? "text-emerald-600" : "text-red-600"}`}>{result}</span>}
    </span>
  );
}
