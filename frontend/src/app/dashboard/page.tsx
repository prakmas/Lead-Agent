"use client";

import {
  ArrowRight,
  BarChart3,
  BellRing,
  ChevronRight,
  Inbox,
  ListChecks,
  MailWarning,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChannelBadge } from "@/components/ChannelBadge";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { PageLoader } from "@/components/Loader";
import { statsService } from "@/lib/api";
import { getAdmin } from "@/lib/auth";
import type { Lead, LeadStatus } from "@/types/api";

type Stats = {
  totals: {
    leads: number;
    conversations: number;
    listings: number;
    matches: number;
    followUpsDue: number;
    unreadConversations: number;
    pendingSupervisors: number;
    supervisors: number;
    deletedListings: number;
  };
  leadsByStatus: { _id: string; count: number }[];
  channels: { _id: string; type: string; name: string; status: string; contacts: number }[];
  conversationsByStatus: { _id: string; count: number }[];
  recentLeads: Lead[];
};

const KPIS = [
  { key: "leads", label: "Leads", icon: Users, href: "/leads", tone: "text-sky-600 bg-sky-50" },
  { key: "conversations", label: "Open conversations", icon: Inbox, href: "/conversations", tone: "text-violet-600 bg-violet-50" },
  { key: "listings", label: "Listings", icon: ListChecks, href: "/listings", tone: "text-emerald-600 bg-emerald-50" },
  { key: "matches", label: "Matches", icon: BarChart3, href: "/matches", tone: "text-amber-600 bg-amber-50" },
] as const;

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const admin = getAdmin();
  const isOwner = admin?.role === "owner" || admin?.role === "admin";

  useEffect(() => {
    statsService
      .get<Stats>()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const t = stats?.totals;
  const maxLeadStatus = Math.max(1, ...(stats?.leadsByStatus || []).map((s) => s.count));

  // Action items that need attention (only those with a count > 0).
  const actions = [
    isOwner && t?.pendingSupervisors
      ? { label: "Supervisor signups awaiting approval", count: t.pendingSupervisors, href: "/supervisors", icon: ShieldCheck, tone: "border-amber-200 bg-amber-50 text-amber-800", iconTone: "bg-amber-500" }
      : null,
    t?.unreadConversations
      ? { label: "Unread customer messages", count: t.unreadConversations, href: "/conversations", icon: MailWarning, tone: "border-teal-200 bg-teal-50 text-teal-800", iconTone: "bg-teal-600" }
      : null,
    t?.followUpsDue
      ? { label: "Leads needing follow-up", count: t.followUpsDue, href: "/leads", icon: BellRing, tone: "border-orange-200 bg-orange-50 text-orange-800", iconTone: "bg-orange-500" }
      : null,
  ].filter(Boolean) as { label: string; count: number; href: string; icon: typeof Users; tone: string; iconTone: string }[];

  const greeting = `Welcome back, ${admin?.name?.split(" ")[0] || "Admin"}`;

  return (
    <AppShell>
      <PageHeader title="Dashboard" description={greeting} />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <PageLoader label="Loading dashboard…" />
      ) : (
        <div className="space-y-6">
          {/* ── KPI tiles (clickable) ── */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {KPIS.map((k) => {
              const Icon = k.icon;
              return (
                <Link
                  key={k.key}
                  href={k.href}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${k.tone}`}>
                      <Icon size={20} />
                    </span>
                    <ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600" />
                  </div>
                  <p className="mt-4 text-3xl font-bold text-slate-950">{(t?.[k.key] ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-slate-500">{k.label}</p>
                </Link>
              );
            })}
          </div>

          {/* ── Needs attention ── */}
          {actions.length > 0 ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Needs attention</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {actions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Link key={a.label} href={a.href} className={`group flex items-center gap-3 rounded-xl border p-3.5 transition hover:shadow-sm ${a.tone}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${a.iconTone}`}>
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold leading-none">{a.count}</p>
                        <p className="truncate text-xs">{a.label}</p>
                      </div>
                      <ChevronRight size={16} className="opacity-50 transition group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Main grid: recent leads + breakdowns ── */}
          <div className="grid gap-4 xl:grid-cols-3">
            {/* Recent leads */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-950">Recent leads</h2>
                <Link href="/leads" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                  View all <ChevronRight size={13} />
                </Link>
              </div>
              {stats?.recentLeads?.length ? (
                <div className="divide-y divide-slate-100">
                  {stats.recentLeads.map((lead) => (
                    <Link key={lead._id} href="/conversations" className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                        {(lead.contact?.name || lead.title || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{lead.contact?.name || lead.title || "Lead"}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <ChannelBadge channel={lead.channel} />
                          {lead.requirements?.location ? (
                            <span className="inline-flex items-center gap-0.5 truncate"><MapPin size={11} /> {lead.requirements.location}</span>
                          ) : null}
                        </div>
                      </div>
                      <StatusBadge status={lead.status as LeadStatus} />
                      <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(lead.createdAt)}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-slate-400">No leads yet.</p>
              )}
            </section>

            {/* Lead statuses breakdown */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Lead statuses</h2>
              <div className="mt-4 space-y-3">
                {(stats?.leadsByStatus || []).length === 0 ? (
                  <p className="text-sm text-slate-400">No data.</p>
                ) : (
                  (stats?.leadsByStatus || []).map((item) => (
                    <div key={item._id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{item._id}</span>
                        <span className="font-semibold text-slate-950">{item.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${(item.count / maxLeadStatus) * 100}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ── Bottom: channels, conversation statuses, quick actions ── */}
          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Channels</h2>
              <div className="mt-4 space-y-3">
                {(stats?.channels || []).length === 0 ? (
                  <p className="text-sm text-slate-400">No channels connected.</p>
                ) : (
                  (stats?.channels || []).map((channel) => (
                    <div key={channel._id} className="flex items-center justify-between gap-3 text-sm">
                      <ChannelBadge channel={channel.type} />
                      <span className="text-slate-600">{channel.contacts} contacts</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Conversation statuses</h2>
              <div className="mt-4 space-y-2.5">
                {(stats?.conversationsByStatus || []).length === 0 ? (
                  <p className="text-sm text-slate-400">No conversations.</p>
                ) : (
                  (stats?.conversationsByStatus || []).map((item) => (
                    <div key={item._id} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-600">{item._id}</span>
                      <span className="font-semibold text-slate-950">{item.count}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Quick actions */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Quick actions</h2>
              <div className="mt-3 space-y-2">
                <Link href="/listings" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50">
                  <Plus size={15} className="text-teal-600" /> Add a listing
                </Link>
                <Link href="/conversations" className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50">
                  <Inbox size={15} className="text-violet-600" /> Open inbox
                </Link>
                {isOwner ? (
                  <Link href="/supervisors" className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-300 hover:bg-teal-50">
                    <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-600" /> Manage supervisors</span>
                    {t?.supervisors ? <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">{t.supervisors}</span> : null}
                  </Link>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      )}
    </AppShell>
  );
}
