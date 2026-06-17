"use client";

import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { fileToResizedDataUrl } from "@/lib/image";

// Drag-drop image manager: upload multiple, reorder by dragging, set cover
// (first = cover), and delete. Stores resized JPEG data URLs.
export function ImageUploader({
  images,
  onChange,
  max = 8,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setBusy(true);
    try {
      const room = Math.max(0, max - images.length);
      const resized = await Promise.all(list.slice(0, room).map((f) => fileToResizedDataUrl(f)));
      onChange([...images, ...resized]);
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const makeCover = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    const [pick] = next.splice(i, 1);
    onChange([pick, ...next]);
  };

  // Reorder via native drag-and-drop between thumbnails.
  const onThumbDrop = (target: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-3 py-5 text-center text-sm transition ${
          over ? "border-teal-500 bg-teal-50" : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"
        }`}
      >
        {busy ? (
          <Loader2 size={20} className="animate-spin text-teal-600" />
        ) : (
          <ImagePlus size={20} className="text-slate-400" />
        )}
        <span className="text-slate-600">
          Drag &amp; drop photos, or <span className="font-semibold text-teal-700">browse</span>
        </span>
        <span className="text-xs text-slate-400">
          {images.length}/{max} · first photo is the cover
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onThumbDrop(i)}
              className={`group relative aspect-square overflow-hidden rounded-md border ${
                i === 0 ? "border-teal-500 ring-1 ring-teal-300" : "border-slate-200"
              }`}
              title="Drag to reorder"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-teal-600 px-1 py-0.5 text-[9px] font-bold text-white">
                  COVER
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(i)}
                  title="Make cover"
                  className="absolute left-1 top-1 rounded bg-black/50 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Star size={11} />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                title="Remove"
                className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
