// Single source of truth for the app's access-controlled modules. Imported by
// both the server (permission checks) and the client (nav gating + permission
// editor). Keep `key` stable — it's what gets stored in a supervisor's
// permissions map.

export const MODULES = [
  { key: "dashboard", label: "Dashboard", route: "/dashboard" },
  { key: "leads", label: "Leads", route: "/leads" },
  { key: "inbox", label: "Inbox", route: "/conversations" },
  { key: "listings", label: "Listings", route: "/listings" },
  { key: "matches", label: "Matches", route: "/matches" },
  { key: "settings", label: "Settings", route: "/settings" },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

// Access levels, low → high. "none" hides the module; "view" is read-only;
// "manage" allows create/update/delete.
export const ACCESS_LEVELS = ["none", "view", "manage"];
export const ACCESS_RANK = { none: 0, view: 1, manage: 2 };

// A fresh permissions object with every module set to "none".
export const emptyPermissions = () => Object.fromEntries(MODULE_KEYS.map((k) => [k, "none"]));

// Does `have` satisfy the `needed` access level?
export const satisfies = (have, needed) => (ACCESS_RANK[have] || 0) >= (ACCESS_RANK[needed] || 0);
