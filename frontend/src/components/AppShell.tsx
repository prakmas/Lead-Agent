"use client";

import {
  BarChart3,
  Bot,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { clearSession, getAdmin, getToken } from "@/lib/auth";
import type { AdminUser } from "@/types/api";
import { WhatsAppHealthBanner } from "./WhatsAppHealthBanner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/conversations", label: "Inbox", icon: Inbox },
  { href: "/listings", label: "Listings", icon: ListChecks },
  { href: "/matches", label: "Matches", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setAdmin(getAdmin());
  }, [router]);

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
            <Bot size={19} />
          </div>
          <div>
            <p className="text-sm font-bold">CRR LeadMatch</p>
            <p className="text-xs text-slate-500">Meta channels MVP</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div>
            <p className="text-sm font-semibold">Admin Dashboard</p>
            <p className="text-xs text-slate-500">WhatsApp, Instagram, Facebook unified workflow</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{admin?.name || "Admin"}</p>
              <p className="text-xs text-slate-500">{admin?.email}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <nav className="grid grid-cols-6 border-b border-slate-200 bg-white lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-12 items-center justify-center ${isActive ? "text-teal-700" : "text-slate-500"}`}
                title={item.label}
              >
                <Icon size={18} />
              </Link>
            );
          })}
        </nav>

        <WhatsAppHealthBanner />

        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
