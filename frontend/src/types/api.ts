export type ChannelType = "whatsapp" | "instagram" | "facebook" | "manual";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Matched"
  | "Closed"
  | "Spam";

export type ModuleAccess = "none" | "view" | "manage";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: Record<string, ModuleAccess>;
};

export type Territory = { level: "state" | "city" | "pincode"; value: string };

export type Supervisor = {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: Record<string, ModuleAccess>;
  territories?: Territory[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
};

export type Channel = {
  _id: string;
  type: ChannelType;
  name: string;
  status: string;
  externalAccountId?: string;
};

export type Contact = {
  _id: string;
  name?: string;
  phone?: string;
  username?: string;
  externalId: string;
  channelType: ChannelType;
  tags?: string[];
  profile?: { notes?: string; [key: string]: unknown };
  lastSeenAt?: string;
  createdAt?: string;
};

export type Lead = {
  _id: string;
  title: string;
  category: string;
  channel: ChannelType;
  status: LeadStatus;
  contact?: Contact;
  requirements?: {
    location?: string;
    budgetMin?: number;
    budgetMax?: number;
    availability?: string;
    preferences?: string[];
    keywords?: string[];
    rawText?: string;
  };
  followUp?: {
    active?: boolean;
    tag?: string;
    note?: string;
    createdAt?: string;
    completedAt?: string;
  };
  createdAt: string;
};

export type Conversation = {
  _id: string;
  channel: Channel;
  contact: Contact;
  lead?: Lead;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  metadata?: { botEnabled?: boolean; [key: string]: unknown };
  createdAt?: string;
};

export type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  text: string;
  messageType: string;
  status?: string;
  metadata?: { source?: string; [key: string]: unknown };
  createdAt: string;
};

export type Listing = {
  _id: string;
  title: string;
  description?: string;
  category: string;
  location?: string;
  budget?: number;
  priceLabel?: string;
  availability?: string;
  preferences?: string[];
  keywords?: string[];
  images?: string[];
  coverThumb?: string;
  geo?: { lat?: number; lng?: number; address?: string };
  contactName?: string;
  contactPhone?: string;
  metadata?: { country?: string; state?: string; city?: string; area?: string; pincode?: string };
  createdBy?: { _id: string; name?: string; email?: string; role?: string } | string | null;
  status: string;
  createdAt: string;
};

export type Match = {
  _id: string;
  lead: Lead;
  listing: Listing;
  score: number;
  reasons: string[];
  status: string;
  createdAt: string;
};

export type FollowUp = {
  _id: string;
  channel: ChannelType;
  status: "scheduled" | "sent" | "cancelled" | "failed";
  scheduledAt: string;
  lead?: { _id: string; title: string; status: string };
  contact?: { name?: string; externalId: string };
  createdAt: string;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

// ── Location lookup responses ──
export type LocationSuggestion = {
  name: string;
  label: string;
  type: string;
  state?: string;
  city?: string;
  country?: string;
};

export type AreaResult = {
  label: string;
  area: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
};

export type PincodeResult = {
  area: string;
  district: string;
  state: string;
  country: string;
};
