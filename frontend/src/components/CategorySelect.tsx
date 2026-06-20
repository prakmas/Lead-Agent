"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type CategoryGroup = [string, [string, string][]];

// A searchable, scrollable category picker. Replaces the native <select>, which
// becomes an unusable full-screen list with 130+ grouped options. Provides:
//   • a type-to-filter search box
//   • an internally-scrolling panel (the page never overflows)
//   • bold, sticky group ("department") headers
export function CategorySelect({
  groups,
  value,
  onChange,
}: {
  groups: CategoryGroup[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel = useMemo(() => {
    for (const [, items] of groups) {
      for (const [val, label] of items) if (val === value) return label;
    }
    return "Select a category";
  }, [groups, value]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups
      .map(([g, items]) => [g, items.filter(([, label]) => label.toLowerCase().includes(s))] as CategoryGroup)
      .filter(([, items]) => items.length > 0);
  }, [groups, q]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
    setQ("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
      >
        <span className="truncate text-slate-900">{currentLabel}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Search categories…"
              className="h-6 flex-1 text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Scrollable options */}
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.map(([group, items]) => (
              <li key={group}>
                <p className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  {group}
                </p>
                {items.map(([val, label]) => {
                  const active = val === value;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => select(val)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50 ${
                        active ? "bg-teal-50 font-medium text-teal-800" : "text-slate-700"
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {active ? <Check size={14} className="shrink-0 text-teal-700" /> : null}
                    </button>
                  );
                })}
              </li>
            ))}
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">No category matches “{q}”.</p>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
