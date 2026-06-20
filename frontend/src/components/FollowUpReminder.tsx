"use client";

import { BellRing, CheckCircle2, MapPin, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { leadService } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { REMINDER_INTERVAL_MS, REMINDER_POLL_MS, followUpTag } from "@/lib/followUpTags";
import type { Lead } from "@/types/api";

const LS_KEY = "crr:followup:lastShownAt";
const STATUSES = ["New", "Contacted", "Qualified", "Matched", "Closed", "Spam"];

const readLastShown = () => {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(LS_KEY) || 0);
};
const writeLastShown = (t: number) => {
  if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, String(t));
};

const leadName = (l: Lead) => l.contact?.name || l.contact?.phone || l.title || "Lead";

// App-wide follow-up reminder. Mounted once in AppShell so it runs on every admin
// page. Quietly polls for leads with an open follow-up and, every 5 minutes (or on
// login if one is overdue), pops a modal that lets the admin resolve them inline.
export function FollowUpReminder() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const maybePopup = useCallback((list: Lead[], force: boolean) => {
    if (list.length === 0) {
      setOpen(false);
      return;
    }
    const since = Date.now() - readLastShown();
    if (force || since >= REMINDER_INTERVAL_MS) {
      setOpen(true);
      writeLastShown(Date.now());
      // Best-effort desktop notification (in case the tab is in the background).
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Follow-up reminder", {
            body: `${list.length} lead${list.length > 1 ? "s" : ""} waiting for follow-up.`,
          });
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      if (!getToken()) return; // only when logged in
      try {
        const res = await leadService.activeFollowUps();
        setLeads(res.data);
        maybePopup(res.data, force);
      } catch {
        /* network hiccup — try again next poll */
      }
    },
    [maybePopup],
  );

  useEffect(() => {
    // Ask once for desktop-notification permission (non-blocking).
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const first = setTimeout(() => refresh(false), 0);
    const poll = setInterval(() => refresh(false), REMINDER_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolve = async (lead: Lead, status?: string) => {
    setBusyId(lead._id);
    try {
      await leadService.completeFollowUp(lead._id, status);
      const next = leads.filter((l) => l._id !== lead._id);
      setLeads(next);
      if (next.length === 0) setOpen(false);
    } finally {
      setBusyId(null);
    }
  };

  const snooze = () => {
    writeLastShown(Date.now());
    setOpen(false);
  };

  // Floating pill so the admin can re-open the list anytime there are pending items.
  const pending = leads.length;

  return (
    <>
      {pending > 0 && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
        >
          <BellRing size={16} className="animate-pulse" />
          {pending} follow-up{pending > 1 ? "s" : ""}
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white">
                  <BellRing size={17} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Follow-up reminder</p>
                  <p className="text-xs text-slate-500">
                    {pending} lead{pending > 1 ? "s" : ""} need{pending > 1 ? "" : "s"} your attention
                  </p>
                </div>
              </div>
              <button type="button" onClick={snooze} title="Remind me again in 5 min" className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {leads.map((lead) => {
                const tag = followUpTag(lead.followUp?.tag);
                return (
                  <div key={lead._id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{leadName(lead)}</p>
                        <p className="truncate text-xs text-slate-500">{lead.title || lead.category}</p>
                      </div>
                      {tag ? (
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tag.chip}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${tag.dot}`} />
                          {tag.label}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {lead.requirements?.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {lead.requirements.location}
                        </span>
                      ) : null}
                      {lead.requirements?.budgetMax ? (
                        <span className="inline-flex items-center gap-1">
                          <Wallet size={12} /> ₹{lead.requirements.budgetMax.toLocaleString("en-IN")}
                        </span>
                      ) : null}
                    </div>

                    {lead.followUp?.note ? (
                      <p className="mt-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">{lead.followUp.note}</p>
                    ) : null}

                    <div className="mt-2.5 flex items-center gap-2">
                      <select
                        defaultValue=""
                        disabled={busyId === lead._id}
                        onChange={(e) => e.target.value && resolve(lead, e.target.value)}
                        className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 outline-none focus:border-teal-600"
                        title="Change status (this resolves the follow-up)"
                      >
                        <option value="" disabled>
                          Change status…
                        </option>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => resolve(lead)}
                        disabled={busyId === lead._id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        {busyId === lead._id ? "Saving…" : "Done"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <p className="text-[11px] text-slate-400">Reminds again every 5 minutes until cleared.</p>
              <button
                type="button"
                onClick={snooze}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Snooze 5 min
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
