import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-normal text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}
