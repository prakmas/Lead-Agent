import { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <Icon className="text-teal-700" size={18} />
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
