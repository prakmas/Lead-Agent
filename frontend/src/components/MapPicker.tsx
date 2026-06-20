"use client";

import { Crosshair, MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type GeoValue = { lat?: number; lng?: number; address?: string };

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

// Load Leaflet from CDN once (avoids react-leaflet peer-dep issues on React 19).
const loadLeaflet = () =>
  new Promise<void>((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) return resolve();
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = LEAFLET_JS;
    s.onload = () => resolve();
    document.body.appendChild(s);
  });

const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const d = await r.json();
    return d.display_name as string;
  } catch {
    return "";
  }
};

// Map location picker: drag the pin or click the map to set an exact spot;
// search to jump to a place. Stores { lat, lng, address }.
export function MapPicker({ value, onChange }: { value: GeoValue; onChange: (v: GeoValue) => void }) {
  const mapEl = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(() => {
      if (cancelled || !mapEl.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const L = (window as any).L;
      if (mapRef.current) return;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const start = value.lat && value.lng ? [value.lat, value.lng] : [20.5937, 78.9629];
      const zoom = value.lat && value.lng ? 14 : 4;
      const map = L.map(mapEl.current).setView(start, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker(start, { draggable: true }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;

      const setFromLatLng = async (lat: number, lng: number) => {
        const address = await reverseGeocode(lat, lng);
        onChange({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), address });
      };

      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setFromLatLng(p.lat, p.lng);
      });
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng(e.latlng);
        setFromLatLng(e.latlng.lat, e.latlng.lng);
      });

      // Fix tiles not rendering when the container was hidden/sized late.
      setTimeout(() => map.invalidateSize(), 200);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync if the value is set externally (e.g. pincode picker).
  useEffect(() => {
    if (mapRef.current && markerRef.current && value.lat && value.lng) {
      markerRef.current.setLatLng([value.lat, value.lng]);
      mapRef.current.setView([value.lat, value.lng], 14);
    }
  }, [value.lat, value.lng]);

  const search = async () => {
    if (q.trim().length < 3) return;
    setSearching(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      );
      const d = await r.json();
      if (d[0]) {
        onChange({ lat: Number(d[0].lat), lng: Number(d[0].lon), address: d[0].display_name });
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 focus-within:border-teal-600">
        <Search size={14} className="text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          className="h-8 flex-1 text-sm outline-none"
          placeholder="Search a place to drop the pin"
        />
        <button type="button" onClick={search} className="text-xs font-semibold text-teal-700">
          {searching ? "…" : "Go"}
        </button>
      </div>
      <div ref={mapEl} className="h-56 w-full overflow-hidden rounded-md border border-slate-200" />
      <p className="flex items-start gap-1 text-[11px] text-slate-500">
        <MapPin size={12} className="mt-0.5 shrink-0 text-teal-600" />
        {value.lat && value.lng ? (
          <span>
            <span className="font-medium">{value.address || `${value.lat}, ${value.lng}`}</span>
            <span className="text-slate-400"> · {value.lat}, {value.lng}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Crosshair size={11} /> Click the map or drag the pin to set the exact location
          </span>
        )}
      </p>
    </div>
  );
}
