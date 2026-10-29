import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { submitFormAction } from "@/app/actions/forms";
import { LiveForm } from "@/components/form-renderer";
import { getPublishedFormBySlug } from "@/lib/forms";

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const form = await getPublishedFormBySlug((await params).slug);
  return { title: form?.title ?? "Form not found", description: form?.description || undefined };
}

export default async function PublicFormPage({ params, searchParams }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const form = await getPublishedFormBySlug(slug);
  if (!form) notFound();

  // Prefill by field id or by label slug: /f/abc?work_email=jane@acme.com
  const query = await searchParams;
  const initialValues: Record<string, unknown> = {};
  for (const f of form.fields) {
    const labelKey = f.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const value = query[f.id] ?? query[labelKey];
    if (value !== undefined) initialValues[f.id] = f.type === "multi_select" ? [value].flat() : [value].flat()[0];
  }

  return (
    <main className="flex flex-1 justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
          {form.settings.closed ? (
            <div className="py-10 text-center">
              <h1 className="text-xl font-semibold">{form.title}</h1>
              <p className="mt-2 text-sm text-slate-500">This form is closed and no longer accepts responses.</p>
            </div>
          ) : (
            <LiveForm
              form={{ title: form.title, description: form.description, fields: form.fields, settings: form.settings }}
              initialValues={initialValues}
              action={submitFormAction.bind(null, slug)}
            />
          )}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Made with <Link href="/" className="font-medium text-slate-500 hover:text-indigo-600">Formflow</Link>
        </p>
      </div>
    </main>
  );
}
