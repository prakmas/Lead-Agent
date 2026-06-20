"use client";

import { BellPlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { leadService } from "@/lib/api";
import { FOLLOW_UP_TAGS, followUpTag } from "@/lib/followUpTags";
import type { Lead } from "@/types/api";

// Per-lead follow-up control used in the Leads table. Shows the active colored
// tag (with a clear button), or a "+ Follow-up" button that opens a tag menu.
// The menu is portalled to <body> with fixed positioning so the table's
// overflow-hidden/overflow-x-auto never clips it.
export function FollowUpControl({ lead, onChange }: { lead: Lead; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const active = lead.followUp?.active;
  const tag = followUpTag(lead.followUp?.tag);

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setMenu({ top: r.bottom + 6, left: r.left });
  };

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", close);
    };
  }, [menu]);

  const set = async (value: string) => {
    setBusy(true);
    try {
      await leadService.setFollowUp(lead._id, value);
      setMenu(null);
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
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (menu ? setMenu(null) : openMenu())}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-amber-400 hover:text-amber-600"
      >
        <BellPlus size={13} />
        Follow-up
      </button>

      {menu
        ? createPortal(
            <div
              style={{ position: "fixed", top: menu.top, left: menu.left, zIndex: 60 }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-xl"
            >
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mark for follow-up</p>
              {FOLLOW_UP_TAGS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set(t.value)}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                  {t.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
