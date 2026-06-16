export type ChannelType = "whatsapp" | "instagram" | "facebook" | "manual";

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Matched"
  | "Closed"
  | "Spam";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
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
};

export type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  text: string;
  messageType: string;
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
