import type {
  AdminUser,
  AreaResult,
  Channel,
  Contact,
  Conversation,
  FollowUp,
  Lead,
  Listing,
  LocationSuggestion,
  Match,
  Message,
  ModuleAccess,
  Paginated,
  PincodeResult,
  Supervisor,
} from "@/types/api";
import { http, type QueryParams } from "./client";
import { endpoints } from "./endpoints";

// ─────────────────────────────────────────────────────────────────────────────
// Typed domain services — the reusable API surface the whole app calls. Each
// method names an action ("listingService.update(id, data)") and returns a typed
// result, so pages never juggle URLs, methods, or JSON.stringify themselves.
// ─────────────────────────────────────────────────────────────────────────────

export const authService = {
  login: (email: string, password: string) =>
    http.post<{ token: string; admin: AdminUser }>(endpoints.auth.login, { email, password }, { auth: false }),
  me: () => http.get<{ admin: AdminUser }>(endpoints.auth.me),
};

export const statsService = {
  get: <T = Record<string, unknown>>() => http.get<T>(endpoints.admin.stats),
};

export const channelService = {
  list: () => http.get<{ data: Channel[] }>(endpoints.admin.channels),
};

export const leadService = {
  list: (query?: QueryParams) => http.get<Paginated<Lead>>(endpoints.admin.leads, { query }),
  update: (id: string, payload: Record<string, unknown>) =>
    http.patch<Lead>(endpoints.admin.lead(id), payload),
  // Leads with an open follow-up reminder (drives the reminder popup + filter).
  activeFollowUps: () =>
    http.get<Paginated<Lead>>(endpoints.admin.leads, { query: { followUp: "active", limit: 100 } }),
  // Start/replace a follow-up reminder on a lead.
  setFollowUp: (id: string, tag: string, note = "") =>
    http.patch<Lead>(endpoints.admin.lead(id), {
      followUp: { active: true, tag, note, createdAt: new Date().toISOString() },
    }),
  // Resolve a follow-up (stops the reminder); optionally also move the status.
  completeFollowUp: (id: string, status?: string) =>
    http.patch<Lead>(endpoints.admin.lead(id), {
      ...(status ? { status } : {}),
      followUp: { active: false, completedAt: new Date().toISOString() },
    }),
};

export const listingService = {
  list: (query?: QueryParams) => http.get<Paginated<Listing>>(endpoints.admin.listings, { query }),
  get: (id: string) => http.get<Listing>(endpoints.admin.listing(id)),
  create: (payload: Record<string, unknown>) => http.post<Listing>(endpoints.admin.listings, payload),
  update: (id: string, payload: Record<string, unknown>) =>
    http.patch<Listing>(endpoints.admin.listing(id), payload),
  remove: (id: string) => http.del<{ message?: string }>(endpoints.admin.listing(id)),
};

export const matchService = {
  list: (query?: QueryParams) => http.get<Paginated<Match>>(endpoints.admin.matches, { query }),
};

export const conversationService = {
  list: (query?: QueryParams) => http.get<Paginated<Conversation>>(endpoints.admin.conversations, { query }),
  get: (id: string) => http.get<{ data: Conversation }>(endpoints.admin.conversation(id)),
  messages: (id: string) => http.get<{ data: Message[] }>(endpoints.admin.conversationMessages(id)),
  reply: (id: string, text: string) =>
    http.post<{ data: Message; sendResult?: { ok?: boolean; error?: string } }>(
      endpoints.admin.conversationReply(id),
      { text },
    ),
  update: (id: string, payload: Record<string, unknown>) =>
    http.patch<{ data: Conversation }>(endpoints.admin.conversation(id), payload),
  markRead: (id: string) => http.patch<{ data: Conversation }>(endpoints.admin.conversation(id), { markRead: true }),
  setBot: (id: string, botEnabled: boolean) =>
    http.patch<{ data: Conversation }>(endpoints.admin.conversation(id), { botEnabled }),
  setStatus: (id: string, status: string) =>
    http.patch<{ data: Conversation }>(endpoints.admin.conversation(id), { status }),
};

export const contactService = {
  update: (id: string, payload: Record<string, unknown>) =>
    http.patch<{ data: Contact }>(endpoints.admin.contact(id), payload),
};

export const followUpService = {
  list: (query?: QueryParams) => http.get<Paginated<FollowUp>>(endpoints.admin.followUps, { query }),
  cancel: (id: string) => http.patch<{ message?: string }>(endpoints.admin.followUpCancel(id)),
};

export const supervisorService = {
  list: () => http.get<{ data: Supervisor[] }>(endpoints.admin.supervisors),
  create: (payload: { name: string; email: string; password: string; permissions: Record<string, ModuleAccess> }) =>
    http.post<{ data: Supervisor }>(endpoints.admin.supervisors, payload),
  update: (id: string, payload: { name?: string; isActive?: boolean; permissions?: Record<string, ModuleAccess> }) =>
    http.patch<{ data: Supervisor }>(endpoints.admin.supervisor(id), payload),
  setActive: (id: string, isActive: boolean) =>
    http.patch<{ data: Supervisor }>(endpoints.admin.supervisor(id), { isActive }),
  setPermissions: (id: string, permissions: Record<string, ModuleAccess>) =>
    http.patch<{ data: Supervisor }>(endpoints.admin.supervisor(id), { permissions }),
  setPassword: (id: string, password: string) =>
    http.post<{ message: string }>(endpoints.admin.supervisorPassword(id), { password }),
  revoke: (id: string) => http.del<{ message: string }>(endpoints.admin.supervisor(id)),
};

export const locationService = {
  search: (q: string, limit = 10) =>
    http.get<{ data: LocationSuggestion[] }>(endpoints.locations.search, { query: { q, limit }, auth: false }),
  area: (name: string) => http.get<{ data: AreaResult[] }>(endpoints.locations.area(name), { auth: false }),
  pincode: (pin: string) => http.get<{ data: PincodeResult[] }>(endpoints.locations.pincode(pin), { auth: false }),
};
