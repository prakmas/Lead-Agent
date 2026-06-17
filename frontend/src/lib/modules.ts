import type { ModuleAccess } from "@/types/api";

// Mirror of src/server/utils/modules.js (keys MUST stay in sync). Used by the
// Supervisors screen for the permission editor and access summaries.
export const MODULES: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "leads", label: "Leads" },
  { key: "inbox", label: "Inbox" },
  { key: "listings", label: "Listings" },
  { key: "matches", label: "Matches" },
  { key: "settings", label: "Settings" },
];

export const ACCESS_OPTIONS: { value: ModuleAccess; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View" },
  { value: "manage", label: "Manage" },
];

export const emptyPermissions = (): Record<string, ModuleAccess> =>
  Object.fromEntries(MODULES.map((m) => [m.key, "none"]));

export const accessStyles: Record<ModuleAccess, string> = {
  none: "bg-slate-100 text-slate-400",
  view: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  manage: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};
