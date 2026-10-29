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
 * A response with answers keyed by field id, plus a flat, labelled list so that
 * consumers can map answers without looking up the form first.
 */
export function serializeResponse(response: FormResponse, form: Form) {
  return {
    id: response.id,
    form_id: response.formId,
    source: response.source,
    created_at: response.createdAt.toISOString(),
    answers: response.answers,
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
