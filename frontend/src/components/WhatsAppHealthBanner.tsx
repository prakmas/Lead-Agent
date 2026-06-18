"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type WhatsAppHealth = {
  configured: boolean;
  ok: boolean;
  code?: number;
  error?: string;
  hint?: string;
};

// Polls the WhatsApp token liveness probe and shows a red banner the moment
// outbound replies would fail (expired/blocked token, or dry-run mode), so a
// dead token is caught here instead of via missing customer replies.
export function WhatsAppHealthBanner() {
  const [health, setHealth] = useState<WhatsAppHealth | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    let active = true;

    const check = () =>
      api<WhatsAppHealth>("/admin/health/whatsapp")
        .then((data) => active && setHealth(data))
        .catch(() => {
          /* ignore probe errors; never block the UI */
        });

    check();
    const interval = setInterval(check, 5 * 60 * 1000); // re-check every 5 min
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!health || health.ok) return null;

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-3 sm:px-6">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
        <div className="text-sm text-red-800">
          <p className="font-semibold">
            WhatsApp replies are not being delivered
            {health.code ? ` (Meta error ${health.code})` : ""}.
          </p>
          {health.error ? <p className="mt-0.5 text-red-700">{health.error}</p> : null}
          {health.hint ? <p className="mt-1 text-red-700">{health.hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
