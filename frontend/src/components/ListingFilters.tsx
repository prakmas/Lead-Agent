"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { listingService } from "@/lib/api";

export type GeoFilter = { state: string; district: string; area: string; pincode: string };
export const EMPTY_GEO: GeoFilter = { state: "", district: "", area: "", pincode: "" };

// Cascading location filter: State → District → Area/Village (options come from
// the listings themselves so every choice returns results), plus an independent
// pincode. Reports the current selection up via onChange.
export function ListingFilters({ value, onChange }: { value: GeoFilter; onChange: (v: GeoFilter) => void }) {
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  useEffect(() => {
    listingService.facets().then((r) => setStates(r.states)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!value.state) {
      setDistricts([]);
      return;
    }
    listingService.facets({ state: value.state }).then((r) => setDistricts(r.districts)).catch(() => {});
  }, [value.state]);

  useEffect(() => {
    if (!value.state || !value.district) {
      setAreas([]);
      return;
    }
    listingService
      .facets({ state: value.state, district: value.district })
      .then((r) => setAreas(r.areas))
      .catch(() => {});
  }, [value.state, value.district]);

  const sel =
    "h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-700 outline-none focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-300";
  const active = value.state || value.district || value.area || value.pincode;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={sel}
        value={value.state}
        onChange={(e) => onChange({ ...EMPTY_GEO, pincode: value.pincode, state: e.target.value })}
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
        onChange={(e) => onChange({ ...value, district: e.target.value, area: "" })}
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
        onChange={(e) => onChange({ ...value, area: e.target.value })}
      >
        <option value="">{value.district ? "All areas" : "Area / Village"}</option>
        {areas.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <div className="flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 focus-within:border-teal-600">
        <span className="text-[10px] font-semibold text-slate-400">PIN</span>
        <input
          value={value.pincode}
          inputMode="numeric"
          onChange={(e) => onChange({ ...value, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          placeholder="Pincode"
          className="h-7 w-20 text-xs outline-none"
        />
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
