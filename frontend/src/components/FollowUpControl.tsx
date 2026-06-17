"use client";

import { BellPlus, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { leadService } from "@/lib/api";
import { FOLLOW_UP_TAGS, followUpTag } from "@/lib/followUpTags";
import type { Lead } from "@/types/api";

// Per-lead follow-up control used in the Leads table. Shows the active colored
// tag (with a clear button), or a "+ Follow-up" button that opens a tag menu.
export function FollowUpControl({ lead, onChange }: { lead: Lead; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = lead.followUp?.active;
  const tag = followUpTag(lead.followUp?.tag);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const set = async (value: string) => {
    setBusy(true);
    try {
      await leadService.setFollowUp(lead._id, value);
      setOpen(false);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await leadService.completeFollowUp(lead._id);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  if (active && tag) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tag.chip}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${tag.dot}`} />
        {tag.label}
        <button type="button" onClick={clear} disabled={busy} title="Clear follow-up" className="ml-0.5 opacity-60 hover:opacity-100">
          <X size={12} />
        </button>
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-amber-400 hover:text-amber-600"
      >
        <BellPlus size={13} />
        Follow-up
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mark for follow-up</p>
          {FOLLOW_UP_TAGS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set(t.value)}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
            >
              <span className={`h-2 w-2 rounded-full ${t.dot}`} />
              {t.label}
              <Check size={12} className="ml-auto text-transparent" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
