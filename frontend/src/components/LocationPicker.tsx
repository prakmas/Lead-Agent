"use client";

import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { locationService } from "@/lib/api";

export type LocationValue = {
  location: string; // display string e.g. "Koramangala, Bangalore"
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  pincode?: string;
};

type Suggestion = {
  label: string;
  type: string;
  country?: string;
  state?: string;
  city?: string;
  area?: string;
  pincode?: string;
};

// Smart location picker: type a name → live suggestions (states / cities / areas),
// OR type a 6-digit pincode → auto-fills area / city / state / country.
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const [q, setQ] = useState(value.location || "");
  const [pin, setPin] = useState(value.pincode || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(value.location || "");
    setPin(value.pincode || "");
  }, [value.location, value.pincode]);

  // Search as you type (states/cities offline + areas/localities via pincode API).
  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [cities, areas] = await Promise.all([
          locationService.search(q, 6).catch(() => ({ data: [] })),
          q.trim().length >= 3
            ? locationService.area(q.trim()).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ]);

        const areaItems: Suggestion[] = (areas.data || []).slice(0, 6).map((a) => ({
          label: a.label,
          type: "area",
          country: a.country,
          state: a.state,
          city: a.district,
          area: a.area,
          pincode: a.pincode,
        }));
        const cityItems: Suggestion[] = (cities.data || []).map((c) => ({
          label: c.label,
          type: c.type,
          country: c.country,
          state: c.state,
          city: c.city || c.name,
        }));
        setSuggestions([...areaItems, ...cityItems].slice(0, 10));
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [q]);

  const select = (s: Suggestion) => {
    onChange({
      location: s.label,
      country: s.country,
      state: s.state,
      city: s.city,
      area: s.area,
      pincode: s.pincode,
    });
    setQ(s.label);
    if (s.pincode) setPin(s.pincode);
    setOpen(false);
  };

  const resolvePin = async (p: string) => {
    if (!/^\d{6}$/.test(p)) return;
    setPinLoading(true);
    try {
      const res = await locationService.pincode(p);
      const o = res.data?.[0];
      if (o) {
        const label = `${o.area}, ${o.district}, ${o.state}`;
        onChange({ location: label, country: o.country, state: o.state, city: o.district, area: o.area, pincode: p });
        setQ(label);
      }
    } catch {
      // ignore lookup errors
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Smart search */}
      <div className="relative">
        <div className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 focus-within:border-teal-600">
          <Search size={15} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              onChange({ ...value, location: e.target.value });
            }}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="h-9 flex-1 text-sm outline-none"
            placeholder="Search area / city / state"
          />
          {loading ? <Loader2 size={14} className="animate-spin text-slate-400" /> : null}
        </div>
        {open && suggestions.length > 0 ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {suggestions.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(s)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50"
                >
                  <MapPin size={13} className="shrink-0 text-teal-600" />
                  <span className="truncate">
                    {s.label}
                    {s.pincode ? ` · ${s.pincode}` : ""}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-slate-400">{s.type}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Pincode auto-fill */}
      <div className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 focus-within:border-teal-600">
        <span className="text-[11px] font-semibold text-slate-400">PIN</span>
        <input
          value={pin}
          onChange={(e) => {
            const p = e.target.value.replace(/\D/g, "").slice(0, 6);
            setPin(p);
            if (p.length === 6) resolvePin(p);
          }}
          inputMode="numeric"
          className="h-9 flex-1 text-sm outline-none"
          placeholder="6-digit pincode (auto-fills the area)"
        />
        {pinLoading ? <Loader2 size={14} className="animate-spin text-slate-400" /> : null}
      </div>

      {/* Resolved structured location */}
      {value.area || value.city || value.state ? (
        <div className="flex flex-wrap gap-1 text-[11px] text-slate-600">
          {value.area ? <span className="rounded bg-slate-100 px-1.5 py-0.5">Area: {value.area}</span> : null}
          {value.city ? <span className="rounded bg-slate-100 px-1.5 py-0.5">City: {value.city}</span> : null}
          {value.state ? <span className="rounded bg-slate-100 px-1.5 py-0.5">State: {value.state}</span> : null}
          {value.country ? <span className="rounded bg-slate-100 px-1.5 py-0.5">{value.country}</span> : null}
          {value.pincode ? <span className="rounded bg-slate-100 px-1.5 py-0.5">PIN: {value.pincode}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
