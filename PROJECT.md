# PROJECT.md — Understand This Project End to End

This document is written for someone **new to building this kind of application**.
It explains the concepts first, then exactly what our app does, what we built (the
MVP), how every part works, the technologies we used and why, and how to talk about
it confidently.

Read it once slowly and you'll be able to explain the whole system to anyone.

---

# Part 1 — The concepts (plain English)

Before the app, here are the building blocks. Every one of these is used in our
project.

### 1. What is a "lead"?
A **lead** is a potential customer who has shown interest — for us, anyone who
sends a message asking for something (e.g. "I need a 2BHK in Koramangala under
30k"). **Lead generation** = capturing those people and their requirements so you
can serve them. Our app is a **lead generator + responder**.

### 2. Frontend, backend, and API
- **Frontend** = what you see (the admin dashboard in the browser).
- **Backend** = the logic running on a server (receiving messages, AI, matching,
  database access).
- **API** (Application Programming Interface) = the "doors" the frontend uses to
  ask the backend for data, e.g. `GET /api/admin/leads` returns the list of leads.
  Think of the API as a waiter: the frontend orders, the backend (kitchen) prepares.

> In our project, frontend and backend are **one Next.js app** — the UI and the API
> live together in a single project and run as one server.

### 3. What is a webhook? (the key to "real-time")
Normally your app **asks** a service for new data ("any new messages?"). A
**webhook** flips that around: the service **pushes** data to you the instant
something happens.

- WhatsApp doesn't make us keep asking "did anyone message?"
- Instead, the moment a customer messages, **Meta calls our webhook URL**
  (`/api/webhooks/meta`) and hands us the message immediately.

That instant push is what makes the bot feel **real-time**.

### 4. What is an LLM / AI agent?
An **LLM** (Large Language Model, e.g. Google **Gemini**) is an AI that understands
natural language. We use it for **one job**: read a messy human sentence and pull
out structured facts.

> Input: "need a furnished 2bhk near koramangala around 28k asap"
> AI output: `{ category: accommodation, location: Koramangala, budget: 28000,
> keywords: [furnished, 2bhk] }`

The AI **understands**, it does not invent listings (see matching below).

### 5. What is a database? (MongoDB)
A **database** stores data permanently. We use **MongoDB**, a **NoSQL** database —
it stores flexible "documents" (like JSON objects) instead of rigid tables. Our
collections: `leads`, `contacts`, `conversations`, `messages`, `listings`,
`matches`, `followups`. **MongoDB Atlas** is the cloud-hosted version we use.

### 6. What is authentication? (JWT)
The dashboard must be private. **Authentication** proves who you are.
- You log in with email + password.
- The server gives you a **JWT** (JSON Web Token) — a signed "pass".
- Every later request carries that pass so the server knows it's really you.
- Passwords are stored **hashed** (scrambled with **bcrypt**), never in plain text.

### 7. What is a scheduler? (the "keep following up" engine)
A **scheduler** runs code automatically on a timer, without anyone clicking
anything. Ours wakes up **every 5 minutes** and checks: "for each open lead, are
there any NEW listings I haven't sent yet? If yes, send them." This is how the app
keeps working for the customer even when no one is watching. (Details in Part 4.)

### 8. What is the WhatsApp Business / Cloud API?
The official way for software to send and receive WhatsApp messages. Key facts:
- It works on **1-to-1 private chats only** — it **cannot** do WhatsApp groups.
- A customer messaging you + your reply **within 24 hours** is free.
- Outside 24 hours you need pre-approved **message templates**.

---

# Part 2 — What our app does (the product)

**One line:** *It turns incoming WhatsApp/Instagram/Facebook messages into
qualified leads, chats like a real agent to fill in missing details, matches them
against your listings, keeps sending new matches on a schedule, and is fully
managed from one admin dashboard.*

**The problem it solves:** Businesses (e.g. real estate, rentals, services) get
flooded with DMs. Replying fast, asking the right questions, remembering everyone,
and following up is slow and easy to drop. Leads go cold. Our app automates that
entire front desk.

**The customer's experience:**
1. Customer messages the business on WhatsApp: *"need a 2bhk in koramangala 28k"*.
2. Within seconds an agent (the bot) replies — either with matching options, or
   with a smart follow-up question if something's missing (*"What's your budget?"*).
3. The customer answers in plain words (*"around 28000"*); the bot remembers the
   earlier answers and completes the picture.
4. The bot sends the best matching listings from the business's inventory.
5. If nothing new now, it keeps checking and **sends new matches later
   automatically** until the customer says **"found"** or **"stop"**.

**The business's experience:** one admin dashboard showing every lead,
conversation, listing, and match — and the ability to **reply manually** to any
customer or **turn the bot off** for a specific chat and handle it personally.

---

# Part 3 — The MVP (what we have actually implemented)

> **MVP = Minimum Viable Product** — the smallest version that delivers the core
> value and can be demoed/used for real. Here's ours, all working and deployed:

✅ **Multi-channel intake** — WhatsApp (live), with Instagram & Facebook supported
   in the same pipeline.
✅ **Real-time webhook** — Meta pushes messages to us instantly, signature-verified
   for security.
✅ **AI requirement extraction** — Gemini reads each message; automatic fallback to
   a built-in extractor if AI is down (so it never fully breaks).
✅ **Conversational slot-filling agent** — asks for missing info (location →
   category → budget), understands short replies, remembers context across turns.
✅ **Matching engine** — scores every listing in the database against the lead and
   returns the best ones (pure code + database, not AI guesswork).
✅ **Automatic follow-up scheduler** — every 5 minutes, sends newly added matching
   listings to open leads until they say "found"/"stop".
✅ **Admin dashboard** — Dashboard, Leads, **Inbox (chat + manual reply + per-chat
   bot toggle + customer details)**, Listings, Matches, Settings.
✅ **Auth** — JWT login, bcrypt-hashed passwords.
✅ **Deployed & always-on** on Railway, with a permanent URL and the scheduler
   running 24/7.

---

# Part 4 — How it works (the flow, in detail)

### A. Inbound message pipeline (what happens on each message)
```
Customer message (WhatsApp)
        │  Meta pushes it instantly
        ▼
/api/webhooks/meta   ── verifies it's really from Meta (HMAC signature)
        │
        ▼
Normalize the payload → a common { channel, contactId, name, message } shape
        │
        ▼
Save/refresh the Contact + Conversation + store the inbound Message
        │
        ▼
Is the per-chat bot ON?  ── if OFF → stop here (admin replies manually)
        │ yes
        ▼
AI (Gemini) extracts requirements  ── fallback to built-in extractor if AI down
        │
        ▼
Create/update the Lead and merge requirements gathered so far
        │
        ├── Missing info?  → ask the next follow-up question
        │
        └── Complete?      → run the MATCHING ENGINE → send best matches
                             → schedule a follow-up for later
        ▼
Reply is sent back on the same channel + saved as an outbound Message
```

### B. The matching engine (how listings are chosen)
This is **pure code against the database — no AI involved**. Each active listing is
scored against the lead out of 100:

| Factor | Points |
|--------|-------:|
| Location match | 25 |
| Budget fit | 20 |
| Category match | 20 |
| Keyword overlap | up to 25 |
| Availability match | 10 |

Listings are sorted by score; the top ones are saved as **Matches** and the best
are sent in the reply. **Every property a customer sees is a real record from your
database** — the AI cannot fabricate listings. (Weights live in
`matching.service.js` and are easy to tune.)

### C. The conversational agent (slot-filling)
The bot fills "slots" across multiple messages:
- It tracks which fields are still missing (location, category, budget).
- It asks for one at a time and **remembers which question it asked**, so a bare
  reply like "Nellore" is understood as the answer to "which location?".
- Special commands the customer can use: **continue** (more options), **found**
  (close the request), **stop** (stop updates).

### D. The scheduler (the follow-up engine) — in detail
This is what makes the app keep working on its own.

- **How it starts:** when the server boots, `instrumentation.ts` starts a timer.
- **How often:** every **5 minutes** (`setInterval`), plus once immediately on boot.
- **What it does each run:** for every lead that is still **open** (not found/
  stopped/closed), it re-runs matching and finds listings the customer **hasn't
  been sent yet**. If there are new ones, it sends them and records them as "sent"
  so they're never repeated.
- **Why it needs an always-on server:** a timer like this only survives on a
  persistent process. That's exactly why we deploy to Railway (always-on) and not a
  serverless host that sleeps. (This is the single most important deployment
  decision — be ready to say it.)
- **What it enables:** "Added a new flat at 2pm? Every matching open lead is
  notified automatically by 2:05pm" — without anyone doing anything.

> In the **Listings** page, adding a listing also instantly re-notifies active
> leads, so good matches go out immediately, not just on the 5-minute tick.

### E. The admin dashboard
- **Dashboard:** live counts (leads, conversations, listings, matches).
- **Leads:** every captured requirement, with status (New → Contacted → Qualified →
  Matched → Closed) you can change.
- **Inbox (the CRM):** a chat view per customer — see the full thread, **type and
  send a manual reply** (delivered on WhatsApp), **toggle the bot on/off** per chat,
  change status, and edit the customer's **name, phone, tags, notes**, plus see
  their requirement and the matches sent.
- **Listings:** add/edit your inventory (what the matching engine scores against).
- **Matches:** every recommendation with its score and the reasons.
- **Settings:** webhook info, connected channels, AI provider, scheduled follow-ups.

---

# Part 5 — Technologies used (and why each one)

| Technology | What it is | Why we use it / real-time role |
|------------|-----------|--------------------------------|
| **Next.js 16** (App Router) | React framework that runs UI **and** server APIs together | One project for dashboard + API + webhook + scheduler — simple to run & deploy |
| **React** | UI library | Builds the interactive dashboard |
| **TypeScript** | JavaScript with types | Fewer bugs; safer code |
| **Tailwind CSS** | Utility CSS framework | Fast, consistent, modern styling |
| **Node.js** | JavaScript server runtime | Runs the backend & the always-on scheduler |
| **MongoDB + Mongoose** | NoSQL database + data modeling library | Flexible storage for leads/chats/listings; Mongoose defines the schemas |
| **MongoDB Atlas** | Cloud-hosted MongoDB | Managed database, free tier, no server to maintain |
| **Google Gemini (LLM)** | The AI | Understands customer messages and extracts requirements |
| **Meta WhatsApp Cloud API** | Official WhatsApp messaging API | Receive (webhook) and send messages in real time |
| **Webhooks (HMAC-verified)** | Event push from Meta | Instant delivery of incoming messages; signature check for security |
| **JWT + bcrypt** | Auth token + password hashing | Secure admin login |
| **Railway** | Cloud hosting | Always-on server (keeps the scheduler alive) + permanent URL |
| **Cloudflare Tunnel** (dev) | Temporary public URL | Test the live webhook locally before deploying |

---

# Part 6 — Advantages (why this approach is strong)

- **Real-time & automatic:** replies in seconds, follows up for days — no human in
  the loop required.
- **Never loses a lead:** every message becomes a tracked lead with full history.
- **Trustworthy answers:** matches come from your real database, not AI invention.
- **Resilient:** if the AI is overloaded, a built-in extractor keeps it working.
- **Human + bot together:** agents can jump in, reply manually, or switch the bot
  off per chat — best of both.
- **Multi-channel, one inbox:** WhatsApp, Instagram, Facebook flow through the same
  pipeline and dashboard.
- **Simple to run:** one Next.js app, one deploy, one always-on service.
- **Private by design:** 1-to-1 chats mean no lead can be "seen" or stolen by other
  customers.

---

# Part 7 — Limitations & what's next (be honest about scope)

Current MVP runs on a WhatsApp **test number** (replies only to ~5 allow-listed
phones). To serve the real public:
- Move to your **own business number** + **Meta Business Verification** (free).
- Add a **payment method** (replies within 24h are free; proactive/marketing
  messages are paid per message).
- Create approved **message templates** for follow-ups sent after the 24-hour
  window.

Future ideas: richer analytics/charts, lead assignment to multiple agents, CSV
import/export of listings, tunable matching from the UI, and template-based
follow-ups.

---

# Part 8 — How to explain it confidently (cheat sheet)

**The 20-second pitch:**
> "It's an AI lead agent for WhatsApp. When a customer messages the business, it
> instantly understands what they want, asks any missing questions like a real
> agent, matches them against the business's listings, and keeps following up
> automatically until they're satisfied — all managed from one admin dashboard."

**If asked "is it real-time?"**
> "Yes — Meta pushes each message to our webhook the instant it's sent, so we reply
> in seconds. And a scheduler runs every 5 minutes to send new matches on its own."

**If asked "does the AI make up the properties?"**
> "No. The AI only *understands* the customer's message. The actual matches come
> from our database via a scoring engine — so every property shown is real."

**If asked "why Railway / why always-on?"**
> "Because the follow-up scheduler runs as a continuous timer. That needs a
> persistent server, which Railway provides — serverless hosts that sleep would
> stop it."

**If asked "what's the AI's exact job?"**
> "Turn a messy sentence into structured data — location, budget, category — and
> phrase follow-up questions. Understanding, not decision-making."

**If asked "what about groups?"**
> "The WhatsApp API only supports 1-to-1 chats, which is actually ideal — every
> lead stays private and can't be poached by others in a group."

**Key numbers to remember:** matching is scored out of 100 (location 25, budget 20,
category 20, keywords 25, availability 10); the scheduler ticks every 5 minutes;
WhatsApp service replies within 24 hours are free.

---

## Where to go next
- **Get all keys:** [SETUP_KEYS.md](SETUP_KEYS.md)
- **Deploy it:** [DEPLOY.md](DEPLOY.md)
- **Project overview:** [README.md](README.md)
