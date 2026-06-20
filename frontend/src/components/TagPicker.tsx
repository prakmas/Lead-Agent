"use client";

import { Check } from "lucide-react";
import { CONTACT_TAGS, contactTag } from "@/lib/contactTags";

// Multi-select colorful tag badges. Click to toggle a predefined tag on/off.
// Value is the list of selected tag values; any non-predefined tags already on
// the contact are still shown (neutral) so legacy/custom tags aren't lost.
export function TagPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  };

  const customTags = value.filter((v) => !contactTag(v));

  return (
    <div className="flex flex-wrap gap-1.5">
      {CONTACT_TAGS.map((t) => {
        const selected = value.includes(t.value);
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => toggle(t.value)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition ${
              selected ? t.on : `${t.off} opacity-70 hover:opacity-100`
            }`}
          >
            {selected ? <Check size={11} /> : null}
            {t.label}
          </button>
        );
      })}
      {customTags.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => toggle(t)}
          title="Remove tag"
          className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300"
        >
          <Check size={11} />
          {t}
        </button>
      ))}
    </div>
  );
}
