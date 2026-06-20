"use client";

import { Loader2 } from "lucide-react";

// Small inline spinner (e.g. inside buttons).
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

// Centered section loader shown while a page fetches its first batch of data.
export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <Loader2 size={30} className="animate-spin text-teal-600" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

// Skeleton placeholder block.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} />;
}

// A row of skeleton cards/tiles for grid-style pages.
export function SkeletonCards({ count = 4, className = "h-28" }: { count?: number; className?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${className} w-full`} />
      ))}
    </div>
  );
}
