import type { Form, FormResponse, Webhook } from "@/db";
import { appUrl } from "./ids";

/** Public JSON shape of a form, shared by the REST API and webhook payloads. */
export function serializeForm(form: Form) {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    status: form.status,
    url: `${appUrl()}/f/${form.slug}`,
    fields: form.fields,
    settings: form.settings,
    created_at: form.createdAt.toISOString(),
    updated_at: form.updatedAt.toISOString(),
  };
}

/**
 * Standard contact keys worked out from the form's fields, so integrations can map
 * "email", "firstname" and the like without knowing each customer's field ids.
 */
export function contactFrom(form: Form, answers: Record<string, unknown>) {
  const value = (pred: (f: Form["fields"][number]) => boolean) => {
    const f = form.fields.find((x) => pred(x) && answers[x.id] != null && answers[x.id] !== "");
    return f ? String(answers[f.id]) : undefined;
  };
  const label = (re: RegExp) => (f: Form["fields"][number]) => re.test(f.label);
  const email = value((f) => f.type === "email");
  const phone = value((f) => f.type === "phone") ?? value(label(/phone|mobile/i));
  const company = value(label(/company|organi[sz]ation|business/i));
  const first = value(label(/^first\s*name/i));
  const last = value(label(/^(last|sur)\s*name/i));
  const full = value((f) => f.type === "short_text" && /name/i.test(f.label) && !/company|organi[sz]ation|first|last|sur/i.test(f.label));
  const [splitFirst, ...rest] = (full ?? "").trim().split(/\s+/);
  const out: Record<string, string> = {};
  if (email) out.email = email;
  const firstname = first ?? (full ? splitFirst : undefined);
  const lastname = last ?? (full && rest.length ? rest.join(" ") : undefined);
  if (firstname) out.firstname = firstname;
  if (lastname) out.lastname = lastname;
  if (full ?? (first || last)) out.name = full ?? [first, last].filter(Boolean).join(" ");
  if (phone) out.phone = phone;
  if (company) out.company = company;
  return out;
}

/**
 * A response with answers keyed by field id, plus a flat, labelled list so that
 * consumers can map answers without looking up the form first.
 */
export function serializeResponse(response: FormResponse, form: Form) {
  return {
    id: response.id,
    form_id: response.formId,
    source: response.source,
    created_at: response.createdAt.toISOString(),
    // Field-id keys plus standard contact keys (email, firstname, lastname, name, phone, company).
    answers: { ...contactFrom(form, response.answers), ...response.answers },
    contact: contactFrom(form, response.answers),
    fields: form.fields.map((f) => ({ id: f.id, label: f.label, type: f.type, value: response.answers[f.id] ?? null })),
  };
}

export function serializeWebhook(hook: Webhook, includeSecret = false) {
  return {
    id: hook.id,
    url: hook.url,
    events: hook.events,
    form_id: hook.formId,
    description: hook.description,
    active: hook.active,
    created_at: hook.createdAt.toISOString(),
    ...(includeSecret ? { secret: hook.secret } : {}),
  };
}
