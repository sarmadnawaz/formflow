import { redirect } from "next/navigation";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <AuthForm
      mode="signup"
      action={signup}
      fields={[
        { name: "name", label: "Your name", autoComplete: "name" },
        { name: "company", label: "Company", autoComplete: "organization" },
        { name: "email", label: "Work email", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
      ]}
    />
  );
}
