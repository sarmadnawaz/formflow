import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/dashboard");
  return (
    <AuthForm
      mode="login"
      action={login}
      fields={[
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
      ]}
    />
  );
}
