"use client";

import {
  AlertCircle,
  Bot,
  CheckCheck,
  Info,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  Sparkles,
  Tag,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChannelBadge } from "@/components/ChannelBadge";
import { PageHeader } from "@/components/PageHeader";
import { contactService, conversationService, matchService } from "@/lib/api";
import type { Conversation, Match, Message } from "@/types/api";

const STATUS_OPTIONS = ["open", "waiting", "matched", "closed", "stopped", "spam"];

const statusStyles: Record<string, string> = {
  open: "bg-sky-50 text-sky-700 ring-sky-200",
  waiting: "bg-amber-50 text-amber-700 ring-amber-200",
  matched: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  closed: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  stopped: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  spam: "bg-red-50 text-red-700 ring-red-200",
};

const avatarColors: Record<string, string> = {
  whatsapp: "bg-emerald-100 text-emerald-700",
  instagram: "bg-fuchsia-100 text-fuchsia-700",
  facebook: "bg-blue-100 text-blue-700",
  manual: "bg-slate-200 text-slate-700",
};

const displayName = (c?: Conversation | null) =>
  c?.contact?.name || c?.contact?.phone || c?.contact?.externalId || "Unknown";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const timeAgo = (iso?: string) => {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString();
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Editable contact fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => conversations.find((c) => c._id === selectedId) || null,
    [conversations, selectedId],
  );
  const botEnabled = selected?.metadata?.botEnabled !== false;

  const loadConversations = useCallback(async () => {
    const result = await conversationService.list({ status: statusFilter || undefined, limit: 100 });
    setConversations(result.data);
    setSelectedId((prev) => prev || result.data[0]?._id || null);
  }, [statusFilter]);

  useEffect(() => {
    loadConversations().catch((err) => setError(err.message));
  }, [loadConversations]);

  // Poll the list periodically so new inbound messages surface without a refresh.
  useEffect(() => {
    const t = setInterval(() => loadConversations().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [loadConversations]);

  const loadThread = useCallback(async (conversation: Conversation | null) => {
    if (!conversation) {
      setMessages([]);
      setMatches([]);
      return;
    }
    const msgs = await conversationService.messages(conversation._id);
    setMessages(msgs.data);
    const leadId = conversation.lead?._id;
    if (leadId) {
      const m = await matchService.list({ leadId, limit: 10 });
      setMatches(m.data);
    } else {
      setMatches([]);
    }
  }, []);

  // When the selected conversation changes, load its thread + sync edit fields.
  useEffect(() => {
    if (!selected) return;
    loadThread(selected).catch((err) => setError(err.message));
    setEditName(selected.contact?.name || "");
    setEditPhone(selected.contact?.phone || "");
    setEditNotes(selected.contact?.profile?.notes || "");
    setEditTags((selected.contact?.tags || []).join(", "));
    // Clear unread on open.
    if (selected.unreadCount > 0) {
      conversationService.markRead(selected._id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Poll the open thread for new messages.
  useEffect(() => {
    if (!selectedId) return;
    const t = setInterval(() => {
      conversationService
        .messages(selectedId)
        .then((r) => setMessages(r.data))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, [selectedId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  };

  const sendReply = async () => {
    const text = draft.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await conversationService.reply(selected._id, text);
      setMessages((prev) => [...prev, res.data]);
      setDraft("");
      if (res.sendResult?.ok === false) {
        flash(`Saved, but delivery failed: ${res.sendResult.error || "unknown error"}`);
      }
      loadConversations().catch(() => {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const toggleBot = async () => {
    if (!selected) return;
    try {
      const res = await conversationService.setBot(selected._id, !botEnabled);
      setConversations((prev) => prev.map((c) => (c._id === selected._id ? res.data : c)));
      flash(res.data.metadata?.botEnabled === false ? "Auto-reply bot turned OFF" : "Auto-reply bot turned ON");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    try {
      const res = await conversationService.setStatus(selected._id, status);
      setConversations((prev) => prev.map((c) => (c._id === selected._id ? res.data : c)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveContact = async () => {
    if (!selected?.contact?._id) return;
    setSavingContact(true);
    try {
      const res = await contactService.update(selected.contact._id, {
        name: editName,
        phone: editPhone,
        notes: editNotes,
        tags: editTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setConversations((prev) =>
        prev.map((c) => (c._id === selected._id ? { ...c, contact: { ...c.contact, ...res.data } } : c)),
      );
      flash("Customer details saved");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingContact(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const hay = `${c.contact?.name || ""} ${c.contact?.phone || ""} ${c.contact?.externalId || ""} ${c.lastMessage || ""}`;
      return hay.toLowerCase().includes(q);
    });
  }, [conversations, search]);

  const lead = selected?.lead;
  const channelType = selected?.channel?.type || selected?.contact?.channelType || "manual";

  return (
    <AppShell>
      <PageHeader
        title="Inbox"
        description="Chat with every customer in one place — reply manually or let the bot handle it."
        action={
          <button
            type="button"
            onClick={() => loadConversations().catch((err) => setError(err.message))}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-teal-50 p-3 text-sm text-teal-800">
          <Info size={16} /> {notice}
        </div>
      ) : null}

      <div className="grid min-h-[720px] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* ── Conversation list ─────────────────────────────────────────── */}
        <aside className="flex flex-col border-r border-slate-200">
          <div className="space-y-2 border-b border-slate-200 p-3">
            <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 flex-1 text-sm outline-none"
                placeholder="Search name, phone, message"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 px-2 text-xs text-slate-600 outline-none"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[640px] flex-1 divide-y divide-slate-100 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No conversations</p>
            ) : null}
            {filtered.map((c) => {
              const name = displayName(c);
              const isActive = c._id === selectedId;
              const botOff = c.metadata?.botEnabled === false;
              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => setSelectedId(c._id)}
                  className={`flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50 ${
                    isActive ? "bg-teal-50/70" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      avatarColors[c.channel?.type || "manual"] || avatarColors.manual
                    }`}
                  >
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
                      <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{c.lastMessage || "—"}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <ChannelBadge channel={c.channel?.type} />
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${statusStyles[c.status] || statusStyles.open}`}>
                        {c.status}
                      </span>
                      {botOff ? (
                        <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-orange-200">
                          bot off
                        </span>
                      ) : null}
                      {c.unreadCount > 0 ? (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1.5 text-[10px] font-bold text-white">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Chat thread ───────────────────────────────────────────────── */}
        <section className="flex min-h-[400px] flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                    avatarColors[channelType] || avatarColors.manual
                  }`}
                >
                  {initials(displayName(selected))}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{displayName(selected)}</p>
                  <p className="text-xs text-slate-500">
                    {selected.contact?.phone || selected.contact?.externalId} · {channelType}
                  </p>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={selected.status}
                    onChange={(e) => changeStatus(e.target.value).catch(() => {})}
                    className="h-8 rounded-md border border-slate-300 px-2 text-xs"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={toggleBot}
                    title="Toggle the auto-reply bot for this chat"
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ring-1 transition ${
                      botEnabled
                        ? "bg-teal-50 text-teal-700 ring-teal-200"
                        : "bg-orange-50 text-orange-700 ring-orange-200"
                    }`}
                  >
                    <Bot size={14} />
                    Bot {botEnabled ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {!botEnabled ? (
                <div className="border-b border-orange-100 bg-orange-50 px-5 py-2 text-xs text-orange-700">
                  Auto-reply is OFF — incoming messages are saved but the bot won&apos;t respond. Reply manually below.
                </div>
              ) : null}

              <div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 p-5">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-400">No messages yet</p>
                ) : null}
                {messages.map((m) => {
                  const out = m.direction === "outbound";
                  const manual = m.metadata?.source === "manual";
                  const failed = m.status === "failed";
                  return (
                    <div
                      key={m._id}
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        out
                          ? `ml-auto ${failed ? "bg-red-600" : "bg-teal-700"} text-white`
                          : "bg-white text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text || "[non-text message]"}</p>
                      <div className={`mt-1.5 flex items-center gap-1.5 text-[10px] ${out ? "text-teal-100" : "text-slate-400"}`}>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                        {out ? (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-0.5">
                              {manual ? "agent" : "bot"}
                              {failed ? " · failed" : <CheckCheck size={11} />}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <div className="border-t border-slate-200 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                    rows={1}
                    placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                    className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !draft.trim()}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-40"
                  >
                    <Send size={16} />
                    {sending ? "Sending" : "Send"}
                  </button>
                </div>
                <p className="mt-1.5 px-1 text-[11px] text-slate-400">
                  This message is sent to the customer on {channelType} as an agent reply.
                </p>
              </div>
            </>
          )}
        </section>

        {/* ── Customer details ──────────────────────────────────────────── */}
        <aside className="hidden flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-slate-50/50 p-4 xl:flex">
          {!selected ? (
            <p className="text-sm text-slate-400">No customer selected</p>
          ) : (
            <>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</h3>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                  <label className="block text-[11px] font-medium text-slate-500">Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-teal-600"
                    placeholder="Customer name"
                  />
                  <label className="block text-[11px] font-medium text-slate-500">
                    <Phone size={11} className="mr-1 inline" /> Phone
                  </label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-teal-600"
                    placeholder="Phone number"
                  />
                  <label className="block text-[11px] font-medium text-slate-500">
                    <Tag size={11} className="mr-1 inline" /> Tags (comma separated)
                  </label>
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm outline-none focus:border-teal-600"
                    placeholder="vip, hot lead"
                  />
                  <label className="block text-[11px] font-medium text-slate-500">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-md border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-teal-600"
                    placeholder="Private notes about this customer"
                  />
                  <button
                    type="button"
                    onClick={saveContact}
                    disabled={savingContact}
                    className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-slate-900 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Save size={15} />
                    {savingContact ? "Saving…" : "Save details"}
                  </button>
                  <div className="space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                    <p>Channel ID: {selected.contact?.externalId}</p>
                    <p>First seen: {selected.contact?.createdAt ? new Date(selected.contact.createdAt).toLocaleDateString() : "—"}</p>
                  </div>
                </div>
              </div>

              {lead ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Requirement</h3>
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                    <p className="font-semibold text-slate-950">{lead.title || "Lead"}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{lead.category || "general"}</span>
                      <span className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-700">{lead.status}</span>
                    </div>
                    {lead.requirements?.location ? (
                      <p className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={13} className="text-slate-400" /> {lead.requirements.location}
                      </p>
                    ) : null}
                    {lead.requirements?.budgetMax ? (
                      <p className="flex items-center gap-1.5 text-slate-600">
                        <Wallet size={13} className="text-slate-400" /> ₹{lead.requirements.budgetMax.toLocaleString()}
                      </p>
                    ) : null}
                    {lead.requirements?.availability ? (
                      <p className="text-xs text-slate-500">Availability: {lead.requirements.availability}</p>
                    ) : null}
                    {lead.requirements?.keywords?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.requirements.keywords.slice(0, 8).map((k) => (
                          <span key={k} className="rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-100">
                            {k}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Sparkles size={13} /> Matches sent ({matches.length})
                </h3>
                <div className="space-y-2">
                  {matches.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                      No matches yet for this customer.
                    </p>
                  ) : null}
                  {matches.map((m) => (
                    <div key={m._id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{m.listing?.title}</p>
                        <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          {m.score}%
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {m.listing?.location || "—"}
                        {m.listing?.budget ? ` · ₹${m.listing.budget.toLocaleString()}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
