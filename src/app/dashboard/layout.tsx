import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/ui";
import { NavLink } from "@/components/nav-link";
import { requireSession } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const { user, workspace } = await requireSession();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/dashboard" exact>
              Forms
            </NavLink>
            <NavLink href="/dashboard/integrations">Integrations</NavLink>
            <NavLink href="/dashboard/settings">Settings</NavLink>
            <NavLink href="/docs">API</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {user.name} · <span className="font-medium text-slate-700">{workspace.name}</span>
            </span>
            <form action={logout}>
              <button className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700">Log out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
