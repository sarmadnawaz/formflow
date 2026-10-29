"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { deleteFormAction, saveFormAction, setStatusAction } from "@/app/actions/forms";
import { FIELD_TYPES, fieldTypeLabel, hasOptions, type FieldType, type FormField, type FormSettings } from "@/lib/fields";
import { FormPreview } from "./form-renderer";
import { Badge, Button, buttonClass, Card, cx, Input, Label, Textarea } from "./ui";

type EditorForm = {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  fields: FormField[];
  settings: FormSettings;
};

const tmpId = () => `fld_${Math.random().toString(36).slice(2, 10)}`;

export function FormEditor({ initial, publicUrl, responseCount }: { initial: EditorForm; publicUrl: string; responseCount: number }) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [settings, setSettings] = useState<FormSettings>(initial.settings);
  const [status, setStatus] = useState(initial.status);
  const [selected, setSelected] = useState<string | null>(initial.fields[0]?.id ?? null);
  const [tab, setTab] = useState<"build" | "settings" | "share">("build");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const touch = () => {
    setDirty(true);
    setMessage(null);
  };

  const save = () =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const cleaned = fields.map((f) => (f.options ? { ...f, options: f.options.map((o) => o.trim()).filter(Boolean) } : f));
        const res = await saveFormAction(initial.id, { title, description, fields: cleaned, settings });
        if (res.ok) {
          setDirty(false);
          setMessage({ tone: "ok", text: "Saved" });
        } else setMessage({ tone: "error", text: res.error });
        resolve(res.ok);
      }),
    );

  const toggleStatus = async () => {
    const next = status === "published" ? "draft" : "published";
    if (dirty && !(await save())) return;
    startTransition(async () => {
      const res = await setStatusAction(initial.id, next);
      if (res.ok) {
        setStatus(next);
        setMessage({ tone: "ok", text: next === "published" ? "Form is live" : "Form unpublished" });
        if (next === "published") setTab("share");
      } else setMessage({ tone: "error", text: res.error });
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  const addField = (type: FieldType) => {
    const field: FormField = {
      id: tmpId(),
      type,
      label: type === "checkbox" ? "I agree" : fieldTypeLabel(type),
      required: false,
      ...(hasOptions(type) && { options: ["Option 1", "Option 2"] }),
    };
    setFields((f) => [...f, field]);
    setSelected(field.id);
    touch();
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    touch();
  };

  const moveField = (id: string, dir: -1 | 1) => {
    setFields((fs) => {
      const i = fs.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= fs.length) return fs;
      const copy = [...fs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
    touch();
  };

  const removeField = (id: string) => {
    setFields((fs) => fs.filter((f) => f.id !== id));
    if (selected === id) setSelected(null);
    touch();
  };

  const duplicateField = (id: string) => {
    setFields((fs) => {
      const i = fs.findIndex((f) => f.id === id);
      const copy = { ...fs[i], id: tmpId(), label: `${fs[i].label} (copy)` };
      return [...fs.slice(0, i + 1), copy, ...fs.slice(i + 1)];
    });
    touch();
  };

  const updateSettings = (patch: Partial<FormSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    touch();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">
          ← Forms
        </Link>
        <span className="text-slate-300">/</span>
        <span className="max-w-xs truncate text-sm font-medium text-slate-800">{title || "Untitled form"}</span>
        <Badge tone={status === "published" ? "green" : "slate"}>{status === "published" ? "Live" : "Draft"}</Badge>
        <div className="ml-auto flex items-center gap-2">
          {message && <span className={cx("text-sm", message.tone === "ok" ? "text-emerald-600" : "text-red-600")}>{message.text}</span>}
          {dirty && !message && <span className="text-sm text-amber-600">Unsaved changes</span>}
          <Link href={`/dashboard/forms/${initial.id}/responses`} className={buttonClass("ghost")}>
            Responses ({responseCount})
          </Link>
          <Button variant="secondary" onClick={save} disabled={pending || !dirty}>
            Save
          </Button>
          <Button onClick={toggleStatus} disabled={pending} variant={status === "published" ? "secondary" : "primary"}>
            {status === "published" ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left: editor */}
        <div className="space-y-4">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            {(["build", "settings", "share"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx("flex-1 rounded-md px-3 py-1.5 font-medium capitalize", tab === t ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "build" && (
            <>
              <Card className="space-y-4 p-5">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => (setTitle(e.target.value), touch())} />
                </div>
                <div>
                  <Label htmlFor="description" hint="(optional)">
                    Description
                  </Label>
                  <Textarea id="description" rows={2} value={description} onChange={(e) => (setDescription(e.target.value), touch())} />
                </div>
              </Card>

              <div className="space-y-2">
                {fields.map((field, i) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    open={selected === field.id}
                    first={i === 0}
                    last={i === fields.length - 1}
                    onToggle={() => setSelected(selected === field.id ? null : field.id)}
                    onChange={(patch) => updateField(field.id, patch)}
                    onMove={(d) => moveField(field.id, d)}
                    onRemove={() => removeField(field.id)}
                    onDuplicate={() => duplicateField(field.id)}
                  />
                ))}
              </div>

              <Card className="p-4">
                <div className="mb-3 text-sm font-medium text-slate-700">Add a field</div>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TYPES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => addField(t.type)}
                      className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-300"
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}

          {tab === "settings" && (
            <Card className="space-y-5 p-5">
              <div>
                <Label htmlFor="submitLabel">Submit button text</Label>
                <Input id="submitLabel" placeholder="Submit" value={settings.submitLabel ?? ""} onChange={(e) => updateSettings({ submitLabel: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="thankYou">Thank-you message</Label>
                <Textarea
                  id="thankYou"
                  rows={3}
                  placeholder="Thanks for filling this in."
                  value={settings.thankYouMessage ?? ""}
                  onChange={(e) => updateSettings({ thankYouMessage: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="redirect" hint="(optional, replaces the thank-you message)">
                  Redirect after submit
                </Label>
                <Input id="redirect" placeholder="https://example.com/thanks" value={settings.redirectUrl ?? ""} onChange={(e) => updateSettings({ redirectUrl: e.target.value })} />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={!!settings.closed} onChange={(e) => updateSettings({ closed: e.target.checked })} className="accent-indigo-600" />
                Close form (stop accepting responses)
              </label>
              <div className="border-t border-slate-100 pt-5">
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm("Delete this form and all its responses? This cannot be undone.")) startTransition(() => deleteFormAction(initial.id));
                  }}
                >
                  Delete form
                </Button>
              </div>
            </Card>
          )}

          {tab === "share" && (
            <Card className="space-y-5 p-5">
              {status !== "published" ? (
                <p className="text-sm text-slate-600">Publish the form to get a shareable link.</p>
              ) : (
                <>
                  <div>
                    <Label>Public link</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={publicUrl} onFocus={(e) => e.target.select()} />
                      <Button variant="secondary" onClick={copyLink}>
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <a href={publicUrl} target="_blank" className={buttonClass("secondary")}>
                        Open
                      </a>
                    </div>
                  </div>
                  <div>
                    <Label>Embed on your website</Label>
                    <Textarea
                      readOnly
                      rows={3}
                      className="font-mono text-xs"
                      value={`<iframe src="${publicUrl}" width="100%" height="800" style="border:0"></iframe>`}
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <div>
                    <Label>Prefill answers</Label>
                    <p className="text-sm text-slate-500">
                      Add answers to the link by field label, for example{" "}
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">?email=jane@acme.com</code>.
                    </p>
                  </div>
                </>
              )}
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                Form ID <code className="font-mono text-slate-700">{initial.id}</code>, use it with the{" "}
                <Link href="/docs" className="text-indigo-600 hover:underline">
                  Formflow API
                </Link>
                .
              </div>
            </Card>
          )}
        </div>

        {/* Right: live preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Preview</div>
          <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-2xl bg-white p-8 ring-1 ring-slate-200">
            <FormPreview form={{ title, description, fields, settings }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldCard({
  field,
  open,
  first,
  last,
  onToggle,
  onChange,
  onMove,
  onRemove,
  onDuplicate,
}: {
  field: FormField;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<FormField>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const iconBtn = "rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30";
  return (
    <Card className={cx(open && "ring-2 ring-indigo-500")}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{fieldTypeLabel(field.type)}</span>
          <span className="truncate text-sm font-medium text-slate-800">
            {field.label || <span className="text-slate-400">No label</span>}
            {field.required && <span className="ml-0.5 text-red-500">*</span>}
          </span>
        </button>
        <button className={iconBtn} disabled={first} onClick={() => onMove(-1)} title="Move up">
          ↑
        </button>
        <button className={iconBtn} disabled={last} onClick={() => onMove(1)} title="Move down">
          ↓
        </button>
        <button className={iconBtn} onClick={onDuplicate} title="Duplicate">
          ⧉
        </button>
        <button className={cx(iconBtn, "hover:text-red-600")} onClick={onRemove} title="Delete">
          ✕
        </button>
      </div>
      {open && (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          <div>
            <Label htmlFor={`${field.id}-label`}>{field.type === "checkbox" ? "Checkbox text" : "Question"}</Label>
            <Input id={`${field.id}-label`} value={field.label} onChange={(e) => onChange({ label: e.target.value })} autoFocus />
          </div>
          {!["single_select", "multi_select", "checkbox", "rating", "date"].includes(field.type) && (
            <div>
              <Label htmlFor={`${field.id}-ph`} hint="(optional)">
                Placeholder
              </Label>
              <Input id={`${field.id}-ph`} value={field.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} />
            </div>
          )}
          <div>
            <Label htmlFor={`${field.id}-help`} hint="(optional)">
              Help text
            </Label>
            <Input id={`${field.id}-help`} value={field.helpText ?? ""} onChange={(e) => onChange({ helpText: e.target.value })} />
          </div>
          {hasOptions(field.type) && (
            <div>
              <Label htmlFor={`${field.id}-opts`} hint="(one per line)">
                Options
              </Label>
              <Textarea
                id={`${field.id}-opts`}
                rows={Math.max(3, (field.options?.length ?? 0) + 1)}
                value={(field.options ?? []).join("\n")}
                onChange={(e) => onChange({ options: e.target.value.split("\n") })}
                onBlur={(e) => onChange({ options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean) })}
              />
            </div>
          )}
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={field.required} onChange={(e) => onChange({ required: e.target.checked })} className="accent-indigo-600" />
            Required
          </label>
        </div>
      )}
    </Card>
  );
}
