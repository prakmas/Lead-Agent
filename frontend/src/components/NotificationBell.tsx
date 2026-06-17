"use client";

import { Bell, Inbox as InboxIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { conversationService } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Conversation } from "@/types/api";

const POLL_MS = 8_000;

const nameOf = (c: Conversation) =>
  c.contact?.name || c.contact?.phone || c.contact?.externalId || "Unknown";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

// Header notification bell. Polls conversations for unread inbound messages and
// shows a red badge + dropdown of brief previews. Suppressed on the Inbox page
// (you're already there). Clicking a notification routes to that conversation.
export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Conversation[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevTotal = useRef<number | null>(null);

  const onInbox = pathname.startsWith("/conversations");

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await conversationService.list({ limit: 50 });
      const unread = res.data
        .filter((c) => (c.unreadCount || 0) > 0)
        .sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
      setItems(unread);

      // Best-effort desktop notification when the unread total grows (and the
      // admin isn't already on the Inbox).
      const total = unread.reduce((n, c) => n + (c.unreadCount || 0), 0);
      if (
        prevTotal.current !== null &&
        total > prevTotal.current &&
        !pathname.startsWith("/conversations") &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const top = unread[0];
        try {
          new Notification("New message", { body: top ? `${nameOf(top)}: ${top.lastMessage || ""}` : "You have new messages." });
        } catch {
          /* ignore */
        }
      }
      prevTotal.current = total;
    } catch {
      /* will retry next poll */
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    const first = setTimeout(refresh, 0);
    const poll = setInterval(refresh, POLL_MS);
    // Refresh instantly when a conversation is read/unread elsewhere in the app.
    const onChanged = () => refresh();
    window.addEventListener("crr:conversations-changed", onChanged);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      window.removeEventListener("crr:conversations-changed", onChanged);
    };
  }, [refresh]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const total = items.reduce((n, c) => n + (c.unreadCount || 0), 0);
  // No badge while on the Inbox (you're already seeing the chats there).
  const badge = onInbox ? 0 : total;

  const goTo = (id: string) => {
    setOpen(false);
    router.push(`/conversations?c=${id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={17} />
        {badge > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            {total > 0 ? <span className="text-xs text-slate-400">{total} unread</span> : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">You&apos;re all caught up</p>
            ) : (
              items.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => goTo(c._id)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                    {initials(nameOf(c))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{nameOf(c)}</p>
                      <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{c.lastMessage || "New message"}</p>
                  </div>
                  {c.unreadCount > 0 ? (
                    <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push("/conversations");
            }}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            <InboxIcon size={14} /> Open Inbox
          </button>
        </div>
      ) : null}
    </div>
  );
}
