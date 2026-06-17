"use client";

import {
  BarChart3,
  Bot,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { authService, supervisorService } from "@/lib/api";
import { clearSession, getAdmin, getToken, saveSession } from "@/lib/auth";
import type { AdminUser } from "@/types/api";
import { FollowUpReminder } from "@/components/FollowUpReminder";
import { NotificationBell } from "@/components/NotificationBell";

// Each nav item maps to a module key — supervisors only see modules they can
// access. The owner sees everything plus Supervisors (RBAC management).
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/leads", label: "Leads", icon: Users, module: "leads" },
  { href: "/conversations", label: "Inbox", icon: Inbox, module: "inbox" },
  { href: "/listings", label: "Listings", icon: ListChecks, module: "listings" },
  { href: "/matches", label: "Matches", icon: BarChart3, module: "matches" },
  { href: "/settings", label: "Settings", icon: Settings, module: "settings" },
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
    // Re-fetch the live profile so permission/role changes (and revocation)
    // take effect without a re-login.
    authService
      .me()
      .then((res) => {
        setAdmin(res.admin);
        saveSession(token, res.admin);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  const isOwner = admin?.role === "owner" || admin?.role === "admin";
  const canInbox = isOwner || (admin?.permissions?.inbox && admin.permissions.inbox !== "none");
  const [pendingSupervisors, setPendingSupervisors] = useState(0);

  // Owner: poll for pending supervisor signups to badge the Supervisors nav.
  useEffect(() => {
    if (!isOwner) return;
    const check = () =>
      supervisorService
        .list()
        .then((r) => setPendingSupervisors(r.pending || 0))
        .catch(() => {});
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [isOwner]);

  // Visible nav = owner sees all; supervisor sees modules with view/manage.
  const visibleNav = useMemo(
    () =>
      navItems.filter(
        (item) => isOwner || (admin?.permissions?.[item.module] && admin.permissions[item.module] !== "none"),
      ),
    [admin, isOwner],
  );

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  // Owner also gets the Supervisors (RBAC) link at the end.
  const links = isOwner
    ? [
        ...visibleNav.map((n) => ({ ...n, badge: 0 })),
        { href: "/supervisors", label: "Supervisors", icon: ShieldCheck, module: "supervisors", badge: pendingSupervisors },
      ]
    : visibleNav.map((n) => ({ ...n, badge: 0 }));

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
          {links.map((item) => {
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
                {item.badge ? (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
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
            {canInbox ? <NotificationBell /> : null}
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

        <nav className="flex justify-around border-b border-slate-200 bg-white lg:hidden">
          {links.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-12 flex-1 items-center justify-center ${isActive ? "text-teal-700" : "text-slate-500"}`}
                title={item.label}
              >
                <Icon size={18} />
              </Link>
            );
          })}
        </nav>

        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>

      {/* App-wide follow-up reminder popup */}
      <FollowUpReminder />
    </div>
  );
}
