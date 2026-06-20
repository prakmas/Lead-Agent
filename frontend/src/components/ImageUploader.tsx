"use client";

import { ImagePlus, Loader2, RefreshCw, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fileToResizedDataUrl } from "@/lib/image";

// Drag-drop image manager: upload multiple, reorder by dragging, set cover
// (first = cover), delete, and click a photo to preview it full-size with
// close / delete / set-cover / replace controls.
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
  const [preview, setPreview] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
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

  const removeAt = (i: number) => {
    onChange(images.filter((_, idx) => idx !== i));
    setPreview(null);
  };
  const makeCover = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    const [pick] = next.splice(i, 1);
    onChange([pick, ...next]);
    setPreview(0);
  };

  // Replace the image currently shown in the preview with a freshly picked file.
  const replaceAt = async (i: number, file: File) => {
    if (!file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      const resized = await fileToResizedDataUrl(file);
      onChange(images.map((src, idx) => (idx === i ? resized : src)));
    } finally {
      setBusy(false);
    }
  };

  // Close preview on Escape.
  useEffect(() => {
    if (preview === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

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
              <img
                src={src}
                alt={`photo ${i + 1}`}
                onClick={() => setPreview(i)}
                className="h-full w-full cursor-pointer object-cover transition group-hover:opacity-90"
                title="Click to preview"
              />
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

      {/* ── Full-size preview / lightbox ── */}
      {preview !== null && images[preview]
        ? createPortal(
            <div
              className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-black/80 p-4"
              onClick={() => setPreview(null)}
            >
              {/* hidden input for "change photo" */}
              <input
                ref={replaceRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && preview !== null) replaceAt(preview, f);
                  e.target.value = "";
                }}
              />

              <div className="relative max-h-[80vh] max-w-3xl" onClick={(e) => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[preview]} alt="preview" className="max-h-[80vh] rounded-lg object-contain shadow-2xl" />
                {preview === 0 ? (
                  <span className="absolute left-3 top-3 rounded bg-teal-600 px-2 py-0.5 text-xs font-bold text-white">COVER</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg hover:bg-slate-100"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Toolbar */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                {preview !== 0 ? (
                  <button
                    type="button"
                    onClick={() => makeCover(preview)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Star size={15} /> Set as cover
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => replaceRef.current?.click()}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Change photo
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(preview)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <Trash2 size={15} /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(null);
                    inputRef.current?.click();
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  <ImagePlus size={15} /> Upload more
                </button>
              </div>

              {/* Counter */}
              <p className="mt-3 text-xs text-white/70">
                Photo {preview + 1} of {images.length}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
