"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "./ui";

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: ReactNode }) {
  const path = usePathname();
  const active = exact ? path === href || path.startsWith("/dashboard/forms") : path.startsWith(href);
  return (
    <Link
      href={href}
      className={cx("rounded-md px-2.5 py-1.5 font-medium", active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900")}
    >
      {children}
    </Link>
  );
}
