"use client";

import { Bell, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChannelBadge } from "@/components/ChannelBadge";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Loader";
import { apiUrl, channelService, followUpService } from "@/lib/api";
import type { Channel, FollowUp } from "@/types/api";

export default function SettingsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpTotal, setFollowUpTotal] = useState(0);
  const [fuStatus, setFuStatus] = useState("scheduled");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadChannels = () =>
    channelService
      .list()
      .then((r) => setChannels(r.data))
      .catch((err) => setError(err.message));

  const loadFollowUps = (status: string) =>
    followUpService
      .list({ status, limit: 50 })
      .then((r) => {
        setFollowUps(r.data);
        setFollowUpTotal(r.total);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    Promise.all([loadChannels(), loadFollowUps(fuStatus)]).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelFollowUp = async (id: string) => {
    await followUpService.cancel(id);
    loadFollowUps(fuStatus);
  };

  const handleStatusChange = (s: string) => {
    setFuStatus(s);
    loadFollowUps(s);
  };

  const statusColor: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    sent: "bg-green-100 text-green-700",
    cancelled: "bg-slate-100 text-slate-500",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Meta webhook, channel connections, AI provider, and scheduled follow-ups."
      />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ── Webhook endpoint ── */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-950">Webhook endpoint</h2>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="font-medium text-slate-700">Verify and receive</dt>
              <dd className="mt-1 rounded-md bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
                {apiUrl.replace(/\/api$/, "")}/webhooks/meta
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">Local simulator</dt>
              <dd className="mt-1 rounded-md bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
                POST {apiUrl.replace(/\/api$/, "")}/webhooks/simulate
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-700">AI provider</dt>
              <dd className="mt-1 text-slate-600">
                Configured from <code className="rounded bg-slate-100 px-1 text-xs">backend/.env</code> using{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">AI_PROVIDER</code>.
              </dd>
            </div>
          </dl>
        </section>

        {/* ── Connected channels ── */}
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Connected channels</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-6"><Spinner size={20} className="text-teal-600" /></div>
            ) : channels.length === 0 ? (
              <p className="text-sm text-slate-500">
                Channels appear after the first webhook message arrives (or after running{" "}
                <code className="rounded bg-slate-100 px-1 text-xs">npm run seed:demo</code>).
              </p>
            ) : (
              channels.map((channel) => (
                <div
                  key={channel._id}
                  className="flex items-center justify-between rounded-md border border-slate-100 p-3"
                >
                  <div>
                    <ChannelBadge channel={channel.type} />
                    <p className="mt-2 text-xs text-slate-500">{channel.externalAccountId}</p>
                  </div>
                  <span className="text-sm font-medium text-slate-700">{channel.status}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* ── Scheduled follow-ups ── */}
      <section className="mt-4 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell size={17} className="text-teal-700" />
            <h2 className="text-sm font-semibold text-slate-950">
              Scheduled follow-ups
              {followUpTotal > 0 ? (
                <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-800">
                  {followUpTotal}
                </span>
              ) : null}
            </h2>
          </div>
          <select
            value={fuStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-8 rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-teal-600"
          >
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={20} className="text-teal-600" /></div>
        ) : followUps.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            {fuStatus === "scheduled"
              ? "No follow-ups scheduled. They are created automatically when a lead is matched."
              : `No ${fuStatus} follow-ups.`}
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {followUps.map((fu) => (
              <div key={fu._id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={fu.channel} />
                    <span className="truncate text-sm font-medium text-slate-950">
                      {fu.contact?.name || fu.contact?.externalId || "Unknown contact"}
                    </span>
                  </div>
                  {fu.lead ? (
                    <p className="mt-1 truncate text-xs text-slate-500">
                      Lead: {fu.lead.title} — {fu.lead.status}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {fu.status === "scheduled"
                      ? `Sends: ${new Date(fu.scheduledAt).toLocaleString()}`
                      : `${fu.status[0].toUpperCase() + fu.status.slice(1)}: ${new Date(fu.scheduledAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[fu.status] || "bg-slate-100 text-slate-600"}`}
                  >
                    {fu.status}
                  </span>
                  {fu.status === "scheduled" ? (
                    <button
                      type="button"
                      onClick={() => cancelFollowUp(fu._id).catch((err) => setError(err.message))}
                      title="Cancel this follow-up"
                      className="text-slate-400 hover:text-red-600"
                    >
                      <XCircle size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
