"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import type { Match, Paginated } from "@/types/api";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Paginated<Match>>("/admin/matches")
      .then((result) => setMatches(result.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <AppShell>
      <PageHeader title="Matches" description="Review listing recommendations produced by the matching engine." />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4">
        {matches.map((match) => (
          <article key={match._id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lead</p>
                <h2 className="mt-1 font-semibold text-slate-950">{match.lead?.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{match.lead?.requirements?.location}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listing</p>
                <h3 className="mt-1 font-semibold text-slate-950">{match.listing?.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{match.listing?.location}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-teal-700">{match.score}%</p>
                  <p className="text-xs text-slate-500">score</p>
                </div>
                <StatusBadge status={match.status} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {match.reasons.map((reason) => (
                <span key={reason} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {reason}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
