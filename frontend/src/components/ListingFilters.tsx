"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listingService } from "@/lib/api";

export type GeoFilter = { state: string; district: string; area: string; pincodes: string[] };
export const EMPTY_GEO: GeoFilter = { state: "", district: "", area: "", pincodes: [] };

// Cascading location filter: State → District → Area/Village, then a multi-select
// Pincode dropdown of the pincodes available for that selection. Options come from
// the listings themselves so every choice returns results.
export function ListingFilters({ value, onChange }: { value: GeoFilter; onChange: (v: GeoFilter) => void }) {
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [pincodes, setPincodes] = useState<string[]>([]);
  const [pinOpen, setPinOpen] = useState(false);
  const pinRef = useRef<HTMLDivElement>(null);

  // One facets call covers everything for the current scope.
  useEffect(() => {
    listingService
      .facets({ state: value.state || undefined, district: value.district || undefined, area: value.area || undefined })
      .then((r) => {
        setStates(r.states);
        setDistricts(r.districts);
        setAreas(r.areas);
        setPincodes(r.pincodes);
      })
      .catch(() => {});
  }, [value.state, value.district, value.area]);

  useEffect(() => {
    if (!pinOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pinRef.current && !pinRef.current.contains(e.target as Node)) setPinOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pinOpen]);

  const togglePin = (p: string) =>
    onChange({
      ...value,
      pincodes: value.pincodes.includes(p) ? value.pincodes.filter((x) => x !== p) : [...value.pincodes, p],
    });

  const sel =
    "h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 outline-none focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-300";
  const active = value.state || value.district || value.area || value.pincodes.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={sel}
        value={value.state}
        onChange={(e) => onChange({ ...EMPTY_GEO, state: e.target.value })}
      >
        <option value="">All states</option>
        {states.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        className={sel}
        value={value.district}
        disabled={!value.state}
        onChange={(e) => onChange({ ...value, district: e.target.value, area: "", pincodes: [] })}
      >
        <option value="">{value.state ? "All districts" : "District"}</option>
        {districts.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        className={sel}
        value={value.area}
        disabled={!value.district}
        onChange={(e) => onChange({ ...value, area: e.target.value, pincodes: [] })}
      >
        <option value="">{value.district ? "All areas" : "Area / Village"}</option>
        {areas.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {/* Multi-select pincode dropdown */}
      <div className="relative" ref={pinRef}>
        <button
          type="button"
          disabled={pincodes.length === 0}
          onClick={() => setPinOpen((o) => !o)}
          className={`flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-300 ${
            value.pincodes.length ? "text-teal-700" : "text-slate-600"
          }`}
        >
          <span className="text-[10px] font-semibold text-slate-400">PIN</span>
          {value.pincodes.length === 0
            ? pincodes.length
              ? "Pincodes"
              : "Select area first"
            : `${value.pincodes.length} selected`}
          <ChevronDown size={13} className={`text-slate-400 transition-transform ${pinOpen ? "rotate-180" : ""}`} />
        </button>
        {pinOpen && pincodes.length > 0 ? (
          <div className="absolute right-0 z-30 mt-1 max-h-60 w-44 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-xl">
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <span>{pincodes.length} pincodes</span>
              {value.pincodes.length ? (
                <button type="button" onClick={() => onChange({ ...value, pincodes: [] })} className="text-slate-500 hover:underline">
                  Clear
                </button>
              ) : null}
            </div>
            {pincodes.map((p) => {
              const checked = value.pincodes.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePin(p)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300"}`}>
                    {checked ? <Check size={11} /> : null}
                  </span>
                  {p}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {active ? (
        <button
          type="button"
          onClick={() => onChange(EMPTY_GEO)}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-slate-500 hover:bg-slate-100"
        >
          <X size={12} /> Clear
        </button>
      ) : null}
    </div>
  );
}
