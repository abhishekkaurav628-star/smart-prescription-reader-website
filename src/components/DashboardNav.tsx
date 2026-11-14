"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, FileText, History, LogOut, Pill, ScanLine, Settings } from "lucide-react";
import { Logo } from "./Logo";
import { api, clearStoredSession } from "@/lib/client";

const items = [
  { href: "/dashboard", label: "Today", icon: CalendarCheck, exact: true },
  { href: "/dashboard/scan", label: "Scan", icon: ScanLine },
  { href: "/dashboard/prescriptions", label: "Rx", icon: FileText },
  { href: "/dashboard/medicines", label: "Meds", icon: Pill },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const fullLabels: Record<string, string> = {
  "/dashboard/prescriptions": "Prescriptions",
  "/dashboard/medicines": "Medicines",
};

export function DashboardNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    clearStoredSession();
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-navy-100 bg-white p-5 lg:flex">
        <Logo href="/dashboard" />
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Main">
          {items.map(({ href, label, icon: Icon, exact }) => {
            const on = active(href, exact);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  on ? "bg-navy-900 text-white shadow-sm" : "text-slate-600 hover:bg-navy-50 hover:text-navy-900"
                }`}
              >
                <Icon size={18} className={on ? "text-teal-300" : ""} />
                {fullLabels[href] ?? label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-xl border border-navy-100 bg-navy-50/60 p-3">
          <p className="truncate text-sm font-bold text-navy-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{email}</p>
          <button onClick={logout} className="mt-3 flex w-full items-center gap-2 text-xs font-semibold text-slate-600 hover:text-rose-700">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-navy-100 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" />
        <button onClick={logout} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-navy-50" aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-navy-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const on = active(href, exact);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${on ? "text-navy-900" : "text-slate-500"}`}>
              <span className={`grid h-7 w-10 place-items-center rounded-full transition ${on ? "bg-navy-900 text-teal-300" : ""}`}>
                <Icon size={17} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
