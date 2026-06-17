"use client";

import { BarChart3, Inbox, ListChecks, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChannelBadge } from "@/components/ChannelBadge";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { statsService } from "@/lib/api";

type Stats = {
  totals: {
    leads: number;
    conversations: number;
    listings: number;
    matches: number;
  };
  leadsByStatus: { _id: string; count: number }[];
  channels: { _id: string; type: string; name: string; status: string; contacts: number }[];
  conversationsByStatus: { _id: string; count: number }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    statsService
      .get<Stats>()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Live overview of leads, conversations, listings, and channel activity."
      />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Leads" value={stats?.totals.leads ?? "-"} icon={Users} />
        <StatTile label="Open conversations" value={stats?.totals.conversations ?? "-"} icon={Inbox} />
        <StatTile label="Listings" value={stats?.totals.listings ?? "-"} icon={ListChecks} />
        <StatTile label="Matches" value={stats?.totals.matches ?? "-"} icon={BarChart3} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Lead statuses</h2>
          <div className="mt-4 space-y-3">
            {(stats?.leadsByStatus || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item._id}</span>
                <span className="font-semibold text-slate-950">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Channels</h2>
          <div className="mt-4 space-y-3">
            {(stats?.channels || []).map((channel) => (
              <div key={channel._id} className="flex items-center justify-between gap-3 text-sm">
                <ChannelBadge channel={channel.type} />
                <span className="text-slate-600">{channel.contacts} contacts</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Conversation statuses</h2>
          <div className="mt-4 space-y-3">
            {(stats?.conversationsByStatus || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item._id}</span>
                <span className="font-semibold text-slate-950">{item.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
