const styles: Record<string, string> = {
  New: "bg-slate-100 text-slate-700 ring-slate-200",
  Contacted: "bg-sky-50 text-sky-700 ring-sky-200",
  Qualified: "bg-violet-50 text-violet-700 ring-violet-200",
  Matched: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Closed: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  Spam: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${styles[status] || styles.New}`}>
      {status}
    </span>
  );
}
