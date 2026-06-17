"use client";

import { MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { locationService } from "@/lib/api";
import type { Territory } from "@/types/api";

const levelStyles: Record<string, string> = {
  state: "bg-violet-50 text-violet-700 ring-violet-200",
  city: "bg-sky-50 text-sky-700 ring-sky-200",
  pincode: "bg-amber-50 text-amber-700 ring-amber-200",
};

// Assign the geographic areas a supervisor manages. Search states/cities (from
// the geoplaces gazetteer) or add a 6-digit pincode. Selected areas show as
// removable colored chips.
export function TerritoryEditor({ value, onChange }: { value: Territory[]; onChange: (next: Territory[]) => void }) {
  const [q, setQ] = useState("");
  const [pin, setPin] = useState("");
  const [results, setResults] = useState<{ level: "state" | "city"; value: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exists = (t: Territory) => value.some((x) => x.level === t.level && x.value.toLowerCase() === t.value.toLowerCase());
  const add = (t: Territory) => {
    if (!exists(t)) onChange([...value, t]);
  };
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await locationService.search(q, 8);
        const mapped = (res.data || []).map((r) => ({
          level: (r.type === "state" ? "state" : "city") as "state" | "city",
          value: r.type === "state" ? r.state || r.name : r.city || r.name,
          label: r.label || r.name,
        }));
        // De-dupe by level+value.
        const seen = new Set<string>();
        setResults(
          mapped.filter((m) => {
            const k = `${m.level}:${m.value.toLowerCase()}`;
            if (seen.has(k) || !m.value) return false;
            seen.add(k);
            return true;
          }),
        );
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }, [q]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Territories</p>

      {/* Selected chips */}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t, i) => (
            <span key={`${t.level}-${t.value}`} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${levelStyles[t.level]}`}>
              <span className="opacity-60">{t.level}:</span> {t.value}
              <button type="button" onClick={() => remove(i)} className="ml-0.5 opacity-60 hover:opacity-100">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No areas yet — search a state/city or add a pincode below.</p>
      )}

      {/* Search state/city */}
      <div className="relative">
        <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 px-2.5 focus-within:border-teal-600">
          <Search size={14} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search a state or city…"
            className="h-8 flex-1 text-sm outline-none"
          />
        </div>
        {open && results.length > 0 ? (
          <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {results.map((r, i) => (
              <li key={`${r.level}-${r.value}-${i}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    add({ level: r.level, value: r.value });
                    setQ("");
                    setResults([]);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50"
                >
                  <MapPin size={13} className="shrink-0 text-teal-600" />
                  <span className="truncate">{r.label}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-slate-400">{r.level}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Add pincode */}
      <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 px-2.5 focus-within:border-teal-600">
        <span className="text-[11px] font-semibold text-slate-400">PIN</span>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && pin.length === 6) {
              add({ level: "pincode", value: pin });
              setPin("");
            }
          }}
          inputMode="numeric"
          placeholder="6-digit pincode"
          className="h-8 flex-1 text-sm outline-none"
        />
        <button
          type="button"
          disabled={pin.length !== 6}
          onClick={() => {
            add({ level: "pincode", value: pin });
            setPin("");
          }}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </div>
  );
}
