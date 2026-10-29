"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/actions/auth";
import { Button, Card, Input, Label, Logo } from "./ui";

type Field = { name: string; label: string; type?: string; autoComplete?: string };

export function AuthForm({
  mode,
  action,
  fields,
}: {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  fields: Field[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <Card className="p-6">
          <h1 className="text-lg font-semibold">{mode === "login" ? "Log in to Formflow" : "Create your workspace"}</h1>
          <form action={formAction} className="mt-5 space-y-4">
            {fields.map((f) => (
              <div key={f.name}>
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? "text"}
                  autoComplete={f.autoComplete}
                  defaultValue={state?.values?.[f.name]}
                  required
                />
              </div>
            ))}
            {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
        </Card>
        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? (
            <>
              No account yet?{" "}
              <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-indigo-600 hover:underline">
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
