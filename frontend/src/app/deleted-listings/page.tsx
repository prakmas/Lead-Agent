"use client";

import { ImageOff, RotateCcw, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ListingFilters, EMPTY_GEO, type GeoFilter } from "@/components/ListingFilters";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/Loader";
import { deletedListingService, supervisorService } from "@/lib/api";
import { getAdmin } from "@/lib/auth";
import type { Listing, Supervisor } from "@/types/api";

export default function DeletedListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [geoFilter, setGeoFilter] = useState<GeoFilter>(EMPTY_GEO);
  const [appliedGeo, setAppliedGeo] = useState<GeoFilter>(EMPTY_GEO);
  const [creatorFilter, setCreatorFilter] = useState("");
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);

  const me = getAdmin();
  const isOwner = me?.role === "owner" || me?.role === "admin";

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(""), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await deletedListingService.list({
        createdBy: creatorFilter || undefined,
        state: appliedGeo.state || undefined,
        district: appliedGeo.district || undefined,
        area: appliedGeo.area || undefined,
        pincode: appliedGeo.pincodes.length ? appliedGeo.pincodes.join(",") : undefined,
      });
      setListings(res.data);
    } finally {
      setLoading(false);
    }
  }, [creatorFilter, appliedGeo]);

  useEffect(() => {
    const t = setTimeout(() => setAppliedGeo(geoFilter), 300);
    return () => clearTimeout(t);
  }, [geoFilter]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    if (!isOwner) return;
    supervisorService.list().then((r) => setSupervisors(r.data)).catch(() => {});
  }, [isOwner]);

  const restore = async (l: Listing) => {
    setBusyId(l._id);
    try {
      await deletedListingService.restore(l._id);
      setListings((items) => items.filter((x) => x._id !== l._id));
      flash(`"${l.title}" restored to active listings`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to restore");
    } finally {
      setBusyId(null);
    }
  };

  const purge = async (l: Listing) => {
    if (!confirm(`Permanently delete "${l.title}"? This cannot be undone.`)) return;
    setBusyId(l._id);
    try {
      await deletedListingService.purge(l._id);
      setListings((items) => items.filter((x) => x._id !== l._id));
      flash("Permanently deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  };

  const creatorName = (l: Listing) =>
    typeof l.createdBy === "object" && l.createdBy ? l.createdBy.name || l.createdBy.email : null;
  const deleterName = (l: Listing) =>
    typeof l.deletedBy === "object" && l.deletedBy ? l.deletedBy.name || l.deletedBy.email : null;

  return (
    <AppShell>
      <PageHeader title="Deleted listings" description="Removed businesses kept here for records — restore or permanently delete." />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="space-y-2.5 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-950">
            Deleted <span className="ml-1 text-xs font-normal text-slate-400">({listings.length})</span>
          </h2>
          <ListingFilters value={geoFilter} onChange={setGeoFilter} facetsFn={deletedListingService.facets} />
          {isOwner && supervisors.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Listed by:</span>
              <button type="button" onClick={() => setCreatorFilter("")} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${creatorFilter === "" ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"}`}>All</button>
              {supervisors.map((s) => (
                <button key={s._id} type="button" onClick={() => setCreatorFilter((c) => (c === s._id ? "" : s._id))} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${creatorFilter === s._id ? "bg-indigo-600 text-white ring-indigo-600" : "bg-indigo-50 text-indigo-700 ring-indigo-200"}`}>
                  <UserRound size={11} /> {s.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {loading ? (
          <PageLoader label="Loading deleted listings…" />
        ) : listings.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">No deleted listings.</p>
        ) : (
          <div className="max-h-[calc(100vh-15rem)] divide-y divide-slate-100 overflow-y-auto">
            {listings.map((listing) => (
              <article key={listing._id} className="relative flex gap-3 px-4 py-4">
                {busyId === listing._id ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                    <PageLoader label="" />
                  </div>
                ) : null}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  {listing.coverThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={listing.coverThumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300"><ImageOff size={18} /></div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-semibold text-slate-950">{listing.title}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button type="button" onClick={() => restore(listing)} title="Restore" className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
                        <RotateCcw size={12} /> Restore
                      </button>
                      <button type="button" onClick={() => purge(listing)} title="Delete permanently" className="text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700 ring-1 ring-red-100">
                    <span className="font-semibold">Deleted</span>
                    {listing.deleteReason ? <> — {listing.deleteReason}</> : <> — no reason given</>}
                    <span className="text-red-400">
                      {listing.deletedAt ? ` · ${new Date(listing.deletedAt).toLocaleDateString()}` : ""}
                      {deleterName(listing) ? ` by ${deleterName(listing)}` : ""}
                    </span>
                  </div>

                  {listing.services ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{listing.services}</p> : null}

                  <div className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                    {listing.ownerName || listing.ownerPhone ? <p>👤 {listing.ownerName || "Owner"}{listing.ownerPhone ? ` · ${listing.ownerPhone}` : ""}</p> : null}
                    {listing.address ? <p>🏠 {listing.address}</p> : null}
                    {listing.landmark ? <p>📌 {listing.landmark}</p> : null}
                    {listing.timings ? <p>🕒 {listing.timings}</p> : null}
                    {listing.mapLink ? <a href={listing.mapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 hover:underline">🗺️ Google Maps</a> : null}
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="capitalize">{listing.category}</span>
                    {listing.location ? <span>{listing.location}</span> : null}
                    {listing.budget ? <span>₹{listing.budget.toLocaleString()}</span> : null}
                    {creatorName(listing) ? <span className="inline-flex items-center gap-1 text-slate-400"><UserRound size={11} /> {creatorName(listing)}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
