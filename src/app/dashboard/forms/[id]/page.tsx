import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, responses } from "@/db";
import { FormEditor } from "@/components/form-editor";
import { requireSession } from "@/lib/auth";
import { getForm } from "@/lib/forms";
import { appUrl } from "@/lib/ids";

export const metadata = { title: "Edit form" };

export default async function EditFormPage({ params }: PageProps<"/dashboard/forms/[id]">) {
  const { workspace } = await requireSession();
  const form = await getForm(workspace.id, (await params).id);
  if (!form) notFound();
  const [{ value: responseCount }] = await db.select({ value: count() }).from(responses).where(eq(responses.formId, form.id));

  return (
    <FormEditor
      initial={{ id: form.id, title: form.title, description: form.description, status: form.status, fields: form.fields, settings: form.settings }}
      publicUrl={`${appUrl()}/f/${form.slug}`}
      responseCount={responseCount}
    />
  );
}
