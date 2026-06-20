// Predefined colorful contact tags shown as selectable badges in the Inbox.
// Stored on contact.tags as their `value`.

export type ContactTag = {
  value: string;
  label: string;
  on: string; // classes when selected
  off: string; // classes when not selected
};

export const CONTACT_TAGS: ContactTag[] = [
  { value: "vip", label: "VIP", on: "bg-violet-600 text-white ring-violet-600", off: "bg-violet-50 text-violet-700 ring-violet-200" },
  { value: "hot-lead", label: "Hot lead", on: "bg-red-600 text-white ring-red-600", off: "bg-red-50 text-red-700 ring-red-200" },
  { value: "follow-up", label: "Follow-up", on: "bg-amber-500 text-white ring-amber-500", off: "bg-amber-50 text-amber-700 ring-amber-200" },
  { value: "new", label: "New", on: "bg-blue-600 text-white ring-blue-600", off: "bg-blue-50 text-blue-700 ring-blue-200" },
  { value: "interested", label: "Interested", on: "bg-emerald-600 text-white ring-emerald-600", off: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "negotiating", label: "Negotiating", on: "bg-orange-500 text-white ring-orange-500", off: "bg-orange-50 text-orange-700 ring-orange-200" },
  { value: "callback", label: "Callback", on: "bg-cyan-600 text-white ring-cyan-600", off: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
  { value: "not-interested", label: "Not interested", on: "bg-slate-600 text-white ring-slate-600", off: "bg-slate-100 text-slate-600 ring-slate-200" },
  { value: "closed", label: "Closed", on: "bg-green-700 text-white ring-green-700", off: "bg-green-50 text-green-700 ring-green-200" },
];

export const contactTag = (value: string) => CONTACT_TAGS.find((t) => t.value === value);
