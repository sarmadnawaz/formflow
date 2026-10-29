import Link from "next/link";
import { ButtonLink, Logo } from "@/components/ui";
import { getSession } from "@/lib/auth";

const features = [
  { title: "Build in minutes", body: "Eleven field types, templates, a live preview and no code." },
  { title: "Share anywhere", body: "A public link, an embed snippet and prefilled links for each person." },
  { title: "Every response in one place", body: "Browse answers, open any response and export to CSV." },
  { title: "Built for developers", body: "A REST API, an OpenAPI spec and signed webhooks for every new response." },
];

export default async function Home() {
  const session = await getSession();
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/docs" className="px-3 py-2 text-slate-600 hover:text-slate-900">
            API
          </Link>
          {session ? (
            <ButtonLink href="/dashboard">Dashboard</ButtonLink>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <ButtonLink href="/signup">Get started</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        <section className="py-20 text-center sm:py-28">
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">Forms that send answers where your team works.</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">Create a form, share the link and collect responses. Free to start.</p>
          <div className="mt-10 flex justify-center gap-3">
            <ButtonLink href={session ? "/dashboard" : "/signup"} className="px-5 py-2.5 text-base">
              {session ? "Go to dashboard" : "Create your first form"}
            </ButtonLink>
            <ButtonLink href="/docs" variant="secondary" className="px-5 py-2.5 text-base">
              Read the API docs
            </ButtonLink>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">Formflow</footer>
    </div>
  );
}
