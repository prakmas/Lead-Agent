// ─────────────────────────────────────────────────────────────────────────────
// Endpoint registry — every backend path the frontend knows about, in ONE place.
// Static paths are strings; dynamic ones are builder functions taking the param.
// Change a URL here once and it updates everywhere. Nothing else should hardcode
// an endpoint string.
// ─────────────────────────────────────────────────────────────────────────────

export const endpoints = {
  auth: {
    login: "/auth/login",
    me: "/auth/me",
  },

  health: "/health",

  admin: {
    stats: "/admin/stats",
    channels: "/admin/channels",

    leads: "/admin/leads",
    lead: (id: string) => `/admin/leads/${id}`,

    listings: "/admin/listings",
    listing: (id: string) => `/admin/listings/${id}`,
    listingsRematch: "/admin/listings/match",
    listingFacets: "/admin/listings/facets",
    listingOtpSend: "/admin/listings/otp/send",
    listingOtpVerify: "/admin/listings/otp/verify",

    matches: "/admin/matches",

    conversations: "/admin/conversations",
    conversation: (id: string) => `/admin/conversations/${id}`,
    conversationMessages: (id: string) => `/admin/conversations/${id}/messages`,
    conversationReply: (id: string) => `/admin/conversations/${id}/reply`,

    contact: (id: string) => `/admin/contacts/${id}`,

    followUps: "/admin/follow-ups",
    followUpCancel: (id: string) => `/admin/follow-ups/${id}/cancel`,

    messagesSearch: "/admin/messages/search",

    supervisors: "/admin/supervisors",
    supervisor: (id: string) => `/admin/supervisors/${id}`,
    supervisorPassword: (id: string) => `/admin/supervisors/${id}/password`,
  },

  locations: {
    search: "/locations/search",
    area: (name: string) => `/locations/area/${encodeURIComponent(name)}`,
    pincode: (pin: string) => `/locations/pincode/${pin}`,
  },
} as const;
