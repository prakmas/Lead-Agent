"use client";

import { CheckCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { Listing, Paginated } from "@/types/api";

const CATEGORIES = [
  ["flat", "Flat / Apartment"],
  ["pg", "PG / Hostel"],
  ["room", "Single Room"],
  ["roommate", "Roommate / Sharing"],
  ["house", "House / Villa"],
  ["hotel", "Hotel / Short stay"],
  ["supermarket", "Supermarket / Grocery"],
  ["rental", "Commercial / Office"],
  ["service", "Home Service"],
];

const EMPTY_FORM = {
  title: "",
  category: "flat",
  budget: "",
  availability: "",
  description: "",
};

const EMPTY_LOC: LocationValue = { location: "" };

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [rematchNote, setRematchNote] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [loc, setLoc] = useState<LocationValue>(EMPTY_LOC);

  const loadListings = useCallback(async () => {
    const result = await api<Paginated<Listing>>("/admin/listings");
    setListings(result.data);
  }, []);

  useEffect(() => {
    let isMounted = true;
    api<Paginated<Listing>>("/admin/listings")
      .then((result) => { if (isMounted) setListings(result.data); })
      .catch((err) => { if (isMounted) setError(err.message); });
    return () => { isMounted = false; };
  }, []);

  const createListing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setRematchNote("");
    setSaving(true);

    try {
      const created = await api<Listing & { _rematchTriggered?: number }>("/admin/listings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          location: loc.location,
          budget: form.budget ? Number(form.budget) : undefined,
          metadata: {
            country: loc.country,
            state: loc.state,
            city: loc.city,
            area: loc.area,
            pincode: loc.pincode,
          },
          keywords: `${form.title} ${form.description} ${loc.location} ${loc.area || ""} ${loc.city || ""} ${loc.state || ""}`
            .split(/\s+/)
            .filter(Boolean),
        }),
      });

      setForm(EMPTY_FORM);
      setLoc(EMPTY_LOC);
      await loadListings();

      // The backend triggers re-matching in the background — show a note after a
      // short delay so the follow-up count reflects the new follow-ups.
      setTimeout(async () => {
        try {
          const stats = await api<{ totals: { scheduledFollowUps: number } }>("/admin/stats");
          const count = stats.totals.scheduledFollowUps;
          if (count > 0) {
            setRematchNote(`Listing saved. ${count} active lead(s) will receive a match update within 1 minute.`);
          } else {
            setRematchNote("Listing saved. No active leads matched this listing yet.");
          }
        } catch {
          // Non-fatal — ignore stats errors
        }
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async (id: string) => {
    await api(`/admin/listings/${id}`, { method: "DELETE" });
    setListings((items) => items.filter((l) => l._id !== id));
  };

  return (
    <AppShell>
      <PageHeader
        title="Listings"
        description="Create supply records that the matching engine scores against leads. Adding a listing instantly re-notifies active leads."
      />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {rematchNote ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle size={15} className="shrink-0" />
          {rematchNote}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        {/* ── Create form ── */}
        <form onSubmit={createListing} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">New listing</h2>
          <div className="mt-4 space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              placeholder="Title *"
              required
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
            >
              {CATEGORIES.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <LocationPicker value={loc} onChange={setLoc} />
            <input
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
              placeholder="Budget / price (₹)"
              type="number"
            />
            <input
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600"
              placeholder="Availability (e.g. immediate, next month)"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
              placeholder="Description"
            />
            <button
              disabled={saving}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
            >
              <Plus size={16} />
              {saving ? "Saving…" : "Create listing"}
            </button>
          </div>
        </form>

        {/* ── Inventory ── */}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Active inventory
              <span className="ml-2 text-xs font-normal text-slate-400">({listings.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => loadListings().catch((err) => setError(err.message))}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 px-2 text-xs font-medium hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>

          {listings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No listings yet — create one above.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {listings.map((listing) => (
                <article key={listing._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-950">{listing.title}</h3>
                      {listing.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{listing.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {listing.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteListing(listing._id).catch((err) => setError(err.message))}
                        title="Delete listing"
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="capitalize">{listing.category}</span>
                    {listing.location ? <span>{listing.location}</span> : null}
                    {listing.budget ? <span>₹{listing.budget.toLocaleString()}</span> : null}
                    {listing.availability ? <span>{listing.availability}</span> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
