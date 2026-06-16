import type { ChannelType } from "@/types/api";

const styles: Record<string, string> = {
  whatsapp: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  instagram: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
  facebook: "bg-blue-50 text-blue-700 ring-blue-200",
  manual: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function ChannelBadge({ channel }: { channel?: ChannelType | string }) {
  const label = channel || "manual";

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${styles[label] || styles.manual}`}>
      {label}
    </span>
  );
}
