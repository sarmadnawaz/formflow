"use client";

import { useActionState } from "react";
import type { SubmitState } from "@/app/actions/forms";
import type { FormField, FormSettings } from "@/lib/fields";
import { Button, inputClass } from "./ui";

type RenderableForm = { title: string; description: string; fields: FormField[]; settings: FormSettings };

function FieldInput({ field, value, error }: { field: FormField; value?: unknown; error?: string }) {
  const common = { id: field.id, name: field.id, required: field.required, "aria-invalid": !!error || undefined };
  const dv = value === undefined || value === null ? undefined : String(value);
  const cls = error ? inputClass.replace("ring-slate-300", "ring-red-400") : inputClass;

  switch (field.type) {
    case "long_text":
      return <textarea {...common} rows={4} placeholder={field.placeholder} defaultValue={dv} className={cls} />;
    case "single_select":
      return (
        <div className="space-y-2">
          {field.options?.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-slate-200 has-[:checked]:bg-indigo-50 has-[:checked]:ring-indigo-500">
              <input type="radio" name={field.id} value={o} required={field.required} defaultChecked={dv === o} className="accent-indigo-600" />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      );
    case "multi_select": {
      const selected = Array.isArray(value) ? value.map(String) : [];
      return (
        <div className="space-y-2">
          {field.options?.map((o) => (
            <label key={o} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ring-1 ring-slate-200 has-[:checked]:bg-indigo-50 has-[:checked]:ring-indigo-500">
              <input type="checkbox" name={field.id} value={o} defaultChecked={selected.includes(o)} className="accent-indigo-600" />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      );
    }
    case "checkbox":
      return (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" {...common} value="true" defaultChecked={dv === "true" || dv === "on"} className="mt-0.5 accent-indigo-600" />
          <span>{field.label}</span>
        </label>
      );
    case "rating":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name={field.id} value={n} required={field.required} defaultChecked={dv === String(n)} className="peer sr-only" />
              <span className="grid h-10 w-10 place-items-center rounded-lg text-sm font-medium ring-1 ring-slate-300 peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:ring-indigo-600 hover:bg-slate-50 peer-checked:hover:bg-indigo-600">
                {n}
              </span>
            </label>
          ))}
        </div>
      );
    default: {
      const type = { email: "email", phone: "tel", number: "number", url: "text", date: "date", short_text: "text" }[field.type] ?? "text";
      return (
        <input
          {...common}
          type={type}
          inputMode={field.type === "url" ? "url" : undefined}
          step={field.type === "number" ? "any" : undefined}
          placeholder={field.placeholder}
          defaultValue={dv}
          className={cls}
        />
      );
    }
  }
}

function Fields({
  form,
  state,
  initialValues,
  disabled,
}: {
  form: RenderableForm;
  state?: SubmitState;
  initialValues?: Record<string, unknown>;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-6">
      {form.fields.map((field) => (
        <div key={field.id}>
          {field.type !== "checkbox" && (
            <label htmlFor={field.id} className="mb-1.5 block text-sm font-medium text-slate-800">
              {field.label}
              {field.required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
          )}
          {field.helpText && <p className="-mt-0.5 mb-2 text-xs text-slate-500">{field.helpText}</p>}
          <FieldInput field={field} value={state?.values?.[field.id] ?? initialValues?.[field.id]} error={state?.errors?.[field.id]} />
          {state?.errors?.[field.id] && <p className="mt-1.5 text-xs text-red-600">{state.errors[field.id]}</p>}
        </div>
      ))}
    </fieldset>
  );
}

function Header({ form }: { form: RenderableForm }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{form.title || "Untitled form"}</h1>
      {form.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{form.description}</p>}
    </div>
  );
}

/** Non-interactive preview used in the editor. */
export function FormPreview({ form }: { form: RenderableForm }) {
  return (
    <div>
      <Header form={form} />
      {form.fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">Add a field to see it here.</p>
      ) : (
        <Fields form={form} />
      )}
      <Button type="button" className="mt-8" disabled={!form.fields.length}>
        {form.settings.submitLabel || "Submit"}
      </Button>
    </div>
  );
}

/** The live, submittable form shown at /f/[slug]. */
export function LiveForm({
  form,
  action,
  initialValues,
}: {
  form: RenderableForm;
  action: (s: SubmitState, f: FormData) => Promise<SubmitState>;
  initialValues?: Record<string, unknown>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.done) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div>
        <h1 className="text-xl font-semibold text-slate-900">Response received</h1>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{form.settings.thankYouMessage || "Thanks for filling this in."}</p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      <Header form={form} />
      <input type="text" name="_hp" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Fields form={form} state={state} initialValues={initialValues} disabled={pending} />
      {state?.error && <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.errors && <p className="mt-6 text-sm text-red-600">Please fix the highlighted fields.</p>}
      <Button type="submit" className="mt-8" disabled={pending}>
        {pending ? "Sending…" : form.settings.submitLabel || "Submit"}
      </Button>
    </form>
  );
}
