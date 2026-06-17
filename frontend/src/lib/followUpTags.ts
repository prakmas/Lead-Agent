// Colored follow-up tags — shared by the Leads page and the reminder modal so a
// lead's follow-up reason looks identical everywhere.

export type FollowUpTag = {
  value: string;
  label: string;
  chip: string; // tailwind classes for the chip background/text/ring
  dot: string; // tailwind class for the small colored dot
};

export const FOLLOW_UP_TAGS: FollowUpTag[] = [
  { value: "call-back", label: "Call back", chip: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  { value: "hot-lead", label: "Hot lead", chip: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  { value: "site-visit", label: "Site visit", chip: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  { value: "send-details", label: "Send details", chip: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  { value: "negotiating", label: "Negotiating", chip: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  { value: "waiting-reply", label: "Waiting reply", chip: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
];

export const followUpTag = (value?: string) => FOLLOW_UP_TAGS.find((t) => t.value === value);

// How often the reminder modal re-appears while follow-ups remain open.
export const REMINDER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
// How often we quietly poll the server for the current active follow-up list.
export const REMINDER_POLL_MS = 60 * 1000; // 1 minute
