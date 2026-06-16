"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ChannelBadge } from "@/components/ChannelBadge";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { Conversation, Message, Paginated } from "@/types/api";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Paginated<Conversation>>("/admin/conversations")
      .then((result) => {
        setConversations(result.data);
        setSelected(result.data[0] || null);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api<{ data: Message[] }>(`/admin/conversations/${selected._id}/messages`)
      .then((result) => setMessages(result.data))
      .catch((err) => setError(err.message));
  }, [selected]);

  return (
    <AppShell>
      <PageHeader title="Unified Inbox" description="View WhatsApp, Instagram, and Facebook conversations in one place." />

      {error ? <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid min-h-[680px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
        <aside className="border-r border-slate-200">
          <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-3">
            <Search size={16} className="text-slate-400" />
            <input className="h-9 flex-1 text-sm outline-none" placeholder="Search conversations" />
          </div>
          <div className="divide-y divide-slate-100">
            {conversations.map((conversation) => (
              <button
                key={conversation._id}
                type="button"
                onClick={() => setSelected(conversation)}
                className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${
                  selected?._id === conversation._id ? "bg-teal-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {conversation.contact?.name || conversation.contact?.phone || conversation.contact?.externalId}
                  </p>
                  <ChannelBadge channel={conversation.channel?.type} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{conversation.lastMessage}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex flex-col">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-950">
              {selected?.contact?.name || selected?.contact?.externalId || "No conversation selected"}
            </h2>
            <p className="text-xs text-slate-500">{selected?.status}</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`max-w-2xl rounded-lg px-4 py-3 text-sm shadow-sm ${
                  message.direction === "outbound"
                    ? "ml-auto bg-teal-700 text-white"
                    : "bg-white text-slate-800"
                }`}
              >
                <p className="whitespace-pre-line">{message.text || "[non-text message]"}</p>
                <p className={`mt-2 text-xs ${message.direction === "outbound" ? "text-teal-100" : "text-slate-400"}`}>
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
