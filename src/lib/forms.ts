import "server-only";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { db, forms, responses, type Form } from "@/db";
import { emitFormEvent, emitResponseSubmitted } from "./events";
import { FIELD_TYPES, hasOptions, validateAnswers, type FormField } from "./fields";
import { newFieldId, newId, newSlug } from "./ids";

const fieldSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  type: z.enum(FIELD_TYPES.map((f) => f.type) as [FormField["type"], ...FormField["type"][]]),
  label: z.string().trim().min(1, "Every field needs a label").max(300),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  options: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
});

const settingsSchema = z.object({
  submitLabel: z.string().max(50).optional(),
  thankYouMessage: z.string().max(1000).optional(),
  redirectUrl: z.union([z.url(), z.literal("")]).optional(),
  closed: z.boolean().optional(),
});

export const formInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  fields: z.array(fieldSchema).max(100).optional(),
  settings: settingsSchema.optional(),
});

export type FormInput = z.infer<typeof formInputSchema>;

function normalizeFields(fields: z.infer<typeof fieldSchema>[]): FormField[] {
  const seen = new Set<string>();
  return fields.map((f) => {
    let id = f.id && !seen.has(f.id) ? f.id : newFieldId();
    while (seen.has(id)) id = newFieldId();
    seen.add(id);
    const field: FormField = { id, type: f.type, label: f.label, required: f.required };
    if (f.placeholder) field.placeholder = f.placeholder;
    if (f.helpText) field.helpText = f.helpText;
    if (hasOptions(f.type)) {
      const options = [...new Set(f.options ?? [])];
      if (!options.length) throw new FormInputError(`"${f.label}" needs at least one option`);
      field.options = options;
    }
    return field;
  });
}

export class FormInputError extends Error {
  name = "FormInputError";
}

export async function createForm(workspaceId: string, input: FormInput) {
  const [form] = await db
    .insert(forms)
    .values({
      id: newId("frm"),
      workspaceId,
      title: input.title,
      description: input.description ?? "",
      slug: newSlug(),
      fields: normalizeFields(input.fields ?? []),
      settings: input.settings ?? {},
    })
    .returning();
  emitFormEvent("form.created", form);
  return form;
}

export async function getForm(workspaceId: string, formId: string) {
  const [form] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, formId), eq(forms.workspaceId, workspaceId)))
    .limit(1);
  return form ?? null;
}

export async function listForms(workspaceId: string) {
  return db
    .select({
      form: forms,
      responseCount: sql<number>`(select count(*)::int from ${responses} where ${responses.formId} = ${forms.id})`,
    })
    .from(forms)
    .where(eq(forms.workspaceId, workspaceId))
    .orderBy(desc(forms.updatedAt));
}

export async function updateForm(form: Form, input: Partial<FormInput>) {
  const [updated] = await db
    .update(forms)
    .set({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.fields !== undefined && { fields: normalizeFields(input.fields) }),
      ...(input.settings !== undefined && { settings: { ...form.settings, ...input.settings } }),
      updatedAt: new Date(),
    })
    .where(eq(forms.id, form.id))
    .returning();
  return updated;
}

export async function setFormStatus(form: Form, status: Form["status"]) {
  if (status === "published" && !form.fields.length) throw new FormInputError("Add at least one field before publishing");
  if (form.status === status) return form;
  const [updated] = await db.update(forms).set({ status, updatedAt: new Date() }).where(eq(forms.id, form.id)).returning();
  emitFormEvent(status === "published" ? "form.published" : "form.unpublished", updated);
  return updated;
}

export async function deleteForm(form: Form) {
  await db.delete(forms).where(eq(forms.id, form.id));
  emitFormEvent("form.deleted", form);
}

export async function getPublishedFormBySlug(slug: string) {
  const [form] = await db.select().from(forms).where(eq(forms.slug, slug)).limit(1);
  return form && form.status === "published" ? form : null;
}

export async function submitResponse(form: Form, input: Record<string, unknown>, source: "web" | "api") {
  const result = validateAnswers(form.fields, input);
  if (!result.ok) return result;
  const [response] = await db
    .insert(responses)
    .values({ id: newId("rsp"), formId: form.id, workspaceId: form.workspaceId, answers: result.answers, source })
    .returning();
  emitResponseSubmitted(form, response);
  return { ok: true as const, response };
}

export async function listResponses(formId: string, opts: { limit?: number; before?: string } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  let beforeDate: Date | undefined;
  if (opts.before) {
    const [cursor] = await db.select({ createdAt: responses.createdAt }).from(responses).where(eq(responses.id, opts.before)).limit(1);
    beforeDate = cursor?.createdAt;
  }
  const rows = await db
    .select()
    .from(responses)
    .where(and(eq(responses.formId, formId), beforeDate ? lt(responses.createdAt, beforeDate) : undefined))
    .orderBy(desc(responses.createdAt))
    .limit(limit + 1);
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}
