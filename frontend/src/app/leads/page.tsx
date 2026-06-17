"use client";

import { RefreshCw } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChannelBadge } from "@/components/ChannelBadge";
import { FollowUpControl } from "@/components/FollowUpControl";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { leadService } from "@/lib/api";
import type { Lead, LeadStatus } from "@/types/api";

const statuses: LeadStatus[] = ["New", "Contacted", "Qualified", "Matched", "Closed", "Spam"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [followUp, setFollowUp] = useState(""); // "" | "active"
  const [error, setError] = useState("");

  const loadLeads = useCallback(async () => {
    const result = await leadService.list({ search, status, followUp: followUp || undefined });
    setLeads(result.data);
  }, [search, status, followUp]);

  useEffect(() => {
    let isMounted = true;

    leadService
      .list()
      .then((result) => {
        if (isMounted) setLeads(result.data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const changeStatus = async (leadId: string, nextStatus: string) => {
    const updated = await leadService.update(leadId, { status: nextStatus });
    setLeads((items) => items.map((item) => (item._id === leadId ? updated : item)));
  };

  return (
    <AppShell>
      <PageHeader
        title="Leads"
        description="Review extracted requirements and move leads through the funnel."
        action={
          <button
            type="button"
            onClick={() => loadLeads().catch((err) => setError(err.message))}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") loadLeads().catch((err) => setError(err.message));
          }}
          placeholder="Search leads"
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:w-80"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        >
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={followUp}
          onChange={(event) => {
            setFollowUp(event.target.value);
            leadService
              .list({ search, status, followUp: event.target.value || undefined })
              .then((r) => setLeads(r.data))
              .catch((err) => setError(err.message));
          }}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
        >
          <option value="">All leads</option>
          <option value="active">Needs follow-up</option>
        </select>
        <button
          type="button"
          onClick={() => loadLeads().catch((err) => setError(err.message))}
          className="h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Apply
        </button>
      </div>

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead._id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{lead.title}</p>
                    <p className="text-xs text-slate-500">{lead.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ChannelBadge channel={lead.channel} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.requirements?.location || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.requirements?.budgetMax ? `₹${lead.requirements.budgetMax}` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <FollowUpControl lead={lead} onChange={() => loadLeads().catch((err) => setError(err.message))} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={lead.status} />
                      <select
                        value={lead.status}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          changeStatus(lead._id, event.target.value).catch((err) => setError(err.message))
                        }
                        className="h-8 rounded-md border border-slate-300 px-2 text-xs"
                      >
                        {statuses.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
