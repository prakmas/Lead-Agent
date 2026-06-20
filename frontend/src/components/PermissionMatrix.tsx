"use client";

import { ACCESS_OPTIONS, MODULES } from "@/lib/modules";
import type { ModuleAccess } from "@/types/api";

// Per-module access editor: each module gets a segmented None / View / Manage
// control. Used in both the create and edit-access flows.
export function PermissionMatrix({
  value,
  onChange,
}: {
  value: Record<string, ModuleAccess>;
  onChange: (next: Record<string, ModuleAccess>) => void;
}) {
  const set = (key: string, level: ModuleAccess) => onChange({ ...value, [key]: level });
  const setAll = (level: ModuleAccess) => onChange(Object.fromEntries(MODULES.map((m) => [m.key, level])));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module access</p>
        <div className="flex gap-1.5 text-[11px]">
          <button type="button" onClick={() => setAll("view")} className="text-sky-600 hover:underline">
            All view
          </button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={() => setAll("manage")} className="text-emerald-600 hover:underline">
            All manage
          </button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={() => setAll("none")} className="text-slate-500 hover:underline">
            Clear
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {MODULES.map((m) => {
          const current = value[m.key] || "none";
          return (
            <div key={m.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-800">{m.label}</span>
              <div className="inline-flex overflow-hidden rounded-md border border-slate-200">
                {ACCESS_OPTIONS.map((opt) => {
                  const active = current === opt.value;
                  const tone =
                    opt.value === "manage"
                      ? "bg-emerald-600 text-white"
                      : opt.value === "view"
                        ? "bg-sky-600 text-white"
                        : "bg-slate-500 text-white";
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set(m.key, opt.value)}
                      className={`px-2.5 py-1 text-xs font-medium transition ${
                        active ? tone : "bg-white text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
