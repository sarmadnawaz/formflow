"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, responses } from "@/db";
import { requireSession } from "@/lib/auth";
import {
  createForm,
  deleteForm,
  formInputSchema,
  FormInputError,
  getForm,
  getPublishedFormBySlug,
  setFormStatus,
  submitResponse,
  updateForm,
} from "@/lib/forms";
import { TEMPLATES } from "@/lib/templates";

export async function createFormAction(formData: FormData) {
  const { workspace } = await requireSession();
  const template = TEMPLATES.find((t) => t.id === formData.get("template")) ?? TEMPLATES[0];
  const form = await createForm(workspace.id, template.form);
  redirect(`/dashboard/forms/${form.id}`);
}

async function ownForm(formId: string) {
  const { workspace } = await requireSession();
  const form = await getForm(workspace.id, formId);
  if (!form) throw new Error("Form not found");
  return form;
}

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string };

export async function saveFormAction(formId: string, payload: unknown): Promise<SaveResult> {
  const form = await ownForm(formId);
  const parsed = formInputSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  try {
    await updateForm(form, parsed.data);
  } catch (e) {
    if (e instanceof FormInputError) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath("/dashboard");
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function setStatusAction(formId: string, status: "draft" | "published"): Promise<SaveResult> {
  const form = await ownForm(formId);
  try {
    await setFormStatus(form, status);
  } catch (e) {
    if (e instanceof FormInputError) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath(`/dashboard/forms/${formId}`);
  revalidatePath("/dashboard");
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function deleteFormAction(formId: string) {
  const form = await ownForm(formId);
  await deleteForm(form);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteResponseAction(formId: string, responseId: string) {
  const form = await ownForm(formId);
  await db.delete(responses).where(and(eq(responses.id, responseId), eq(responses.formId, form.id)));
  revalidatePath(`/dashboard/forms/${formId}/responses`);
}

export type SubmitState = { errors?: Record<string, string>; values?: Record<string, unknown>; done?: boolean; error?: string } | undefined;

/** Public: called from the hosted form page, no session needed. */
export async function submitFormAction(slug: string, _: SubmitState, formData: FormData): Promise<SubmitState> {
  const form = await getPublishedFormBySlug(slug);
  if (!form || form.settings.closed) return { error: "This form is not accepting responses." };
  if (formData.get("_hp")) return { done: true }; // honeypot: silently drop bots

  const input: Record<string, unknown> = {};
  for (const field of form.fields) {
    input[field.id] = field.type === "multi_select" ? formData.getAll(field.id).map(String) : formData.get(field.id) ?? undefined;
  }
  const result = await submitResponse(form, input, "web");
  if (!result.ok) return { errors: result.errors, values: input };
  if (form.settings.redirectUrl) redirect(form.settings.redirectUrl);
  return { done: true };
}
