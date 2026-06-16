# CRR — WhatsApp Lead Agent (single Next.js app)

CRR turns incoming WhatsApp / Instagram / Facebook messages into qualified
leads, chats with the customer like a real agent to fill in missing details,
matches them against your listings, and keeps sending new matches on a schedule
until they say they're done — all managed from one admin dashboard.

**It's one Next.js app** — UI, API, the Meta webhook, and the follow-up
scheduler all run together in a single project (`frontend/`).

```
Customer DM (WhatsApp / Instagram / Facebook)
        │
        ▼
  /api/webhooks/meta  ──►  AI (Gemini) extracts requirements
        │                        │
        │             missing info? → ask a follow-up question
        │                        │
        │                  requirements complete → matching engine
        │                        │
        ▼                        ▼
  Auto-reply with matches sent back on the same channel
        │
   every 5 min: scheduler checks each open lead for NEW listings
   and sends them, until the user replies "found" or "stop"
        │
        ▼
   Admin dashboard: Dashboard · Leads · Inbox · Listings · Matches · Settings
```

## Tech stack

| Layer    | Stack                                                              |
| -------- | ----------------------------------------------------------------- |
| App      | Next.js 16 (App Router) · React · Tailwind CSS · TypeScript        |
| API      | Next.js Route Handlers (`src/app/api/**`)                          |
| Data     | Mongoose · MongoDB Atlas                                           |
| Auth     | JWT (admin login), bcrypt hashing                                  |
| AI       | Gemini (default) · OpenAI · Claude · built-in `mock` fallback      |
| Channels | Meta Graph API: WhatsApp, Instagram, Facebook                     |
| Scheduler| `src/instrumentation.ts` → runs the follow-up loop on boot         |

## Project structure

```
CRR/
├── frontend/                    the whole app
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/             API routes (auth, admin/*, webhooks/*)
│   │   │   ├── dashboard, leads, conversations, listings, matches, settings, login
│   │   │   └── ...
│   │   ├── components/          UI components
│   │   ├── lib/                 client api helper + auth
│   │   ├── server/             ← backend logic (models, services, providers,
│   │   │   │                      adapters, utils, config, auth, http)
│   │   │   └── scripts/         seedAdmin / seedDemo / initDb
│   │   └── instrumentation.ts   starts the follow-up scheduler
│   ├── railway.json             Railway deploy config
│   └── scripts/railway-setenv.sh
├── DEPLOY.md                    Railway deployment guide
├── META_KEYS_SETUP.md           how to get the Meta/WhatsApp keys
└── start-realtime.sh            local: app + public tunnel for live testing
```

## Prerequisites

- Node.js 18+
- A MongoDB connection string (MongoDB Atlas works out of the box)

## 1. Install

```bash
cd frontend
npm install
```

## 2. Configure environment

Copy the example and fill it in:

```bash
cp .env.local.example .env.local
```

Key values in [frontend/.env.local](frontend/.env.local) (server-side secrets —
no `NEXT_PUBLIC_` prefix, so they never reach the browser):

```bash
NEXT_PUBLIC_API_URL=/api          # the app calls its own API (same origin)

MONGODB_URI=mongodb+srv://<user>:<pass>@<host>/crr?retryWrites=true&w=majority
JWT_SECRET=change-this-long-random-secret
ADMIN_EMAIL=admin@crr.local
ADMIN_PASSWORD=Admin@12345

AI_PROVIDER=gemini                # or: openai | claude | mock
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash

# WhatsApp (leave blank for local mock/dry-run; see META_KEYS_SETUP.md)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
META_VERIFY_TOKEN=make-a-long-random-string
META_APP_SECRET=
```

## 3. Seed the database (once)

```bash
npm run init:db      # create collections + indexes + admin user
npm run seed:admin   # (re)create the admin user
npm run seed:demo    # optional: sample listings + simulated leads/matches
```

## 4. Run (one command)

```bash
npm run dev          # → http://localhost:3000  (UI + API + webhook + scheduler)
```

That's it — the whole platform runs from one process.

## 5. Log in

Open http://localhost:3000 → redirected to the dashboard (or login):

```
Email:    admin@crr.local
Password: Admin@12345
```

(from `ADMIN_EMAIL` / `ADMIN_PASSWORD` — change before deploying, then re-run
`npm run seed:admin`.)

## Test the full pipeline locally (no Meta keys needed)

A dev-only simulator runs a message through the exact same path as a real Meta
webhook (AI → lead → matching → reply):

```bash
curl -X POST http://localhost:3000/api/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","contactId":"test-1","message":"need a furnished 2bhk near Koramangala around 28k asap"}'
```

→ `{ "reply": "I found these matches: ...", "leadStatus": "Matched", "matches": 4 }`

## Go live on real WhatsApp (local testing)

```bash
./start-realtime.sh   # starts the app + a public Cloudflare tunnel
```

It prints the **Callback URL** (`https://<tunnel>/api/webhooks/meta`) and the
**verify token** to paste into Meta → WhatsApp → Configuration → Webhook. See
[META_KEYS_SETUP.md](META_KEYS_SETUP.md) for getting the keys.

> The tunnel URL changes each run. For a **permanent** URL, deploy to Railway —
> see [DEPLOY.md](DEPLOY.md).

## API reference

Base: same origin, under `/api`.

| Method | Path                                       | Auth | Description                |
| ------ | ------------------------------------------ | ---- | -------------------------- |
| GET    | `/api/health`                              | —    | Server + DB status         |
| GET    | `/api/webhooks/meta`                       | —    | Meta verification handshake|
| POST   | `/api/webhooks/meta`                       | —    | Inbound messages (HMAC)    |
| POST   | `/api/webhooks/simulate`                   | —    | Dev-only pipeline simulator|
| POST   | `/api/auth/login`                          | —    | → `{ token, admin }`       |
| GET    | `/api/auth/me`                             | ✓    | Current admin              |
| GET    | `/api/admin/stats`                         | ✓    | Dashboard totals           |
| GET/POST | `/api/admin/leads`                       | ✓    | List / create leads        |
| PATCH/DELETE | `/api/admin/leads/:id`               | ✓    | Update / delete lead       |
| GET    | `/api/admin/conversations`                 | ✓    | List conversations         |
| GET    | `/api/admin/conversations/:id/messages`    | ✓    | Messages in a conversation |
| GET    | `/api/admin/messages/search`               | ✓    | Full-text message search   |
| GET/POST | `/api/admin/listings`                    | ✓    | List / create listings     |
| PATCH/DELETE | `/api/admin/listings/:id`            | ✓    | Update / delete listing    |
| POST   | `/api/admin/listings/match`                | ✓    | Run matching for a lead    |
| GET    | `/api/admin/matches`                       | ✓    | List matches               |
| GET    | `/api/admin/channels`                      | ✓    | Connected channels         |
| GET    | `/api/admin/follow-ups`                    | ✓    | Scheduled follow-ups       |
| PATCH  | `/api/admin/follow-ups/:id/cancel`         | ✓    | Cancel a follow-up         |

Protected routes need `Authorization: Bearer <token>`.

## How matching works

`src/server/services/matching.service.js` scores each active listing against a
lead (max 100): category 20, location 25, budget fit 20, availability 10,
keyword overlap up to 25. Top matches are saved and the best are sent in the
reply. Tune the weights there.

## Conversation flow

The agent fills missing slots across turns (location → category → budget) and
understands short answers ("Nellore", "20000"). Commands: **continue** (more
options), **found** (close), **stop** (stop updates). When AI (Gemini) is
unavailable it automatically falls back to the built-in extractor.

## Deployment

See **[DEPLOY.md](DEPLOY.md)** — single Railway service, fixed webhook URL,
always-on scheduler.

## Security notes

- `.env.local` is git-ignored — never commit real secrets.
- Rotate any token/password shared in chat or screenshots.
- Use a long random `JWT_SECRET`, a real `ADMIN_PASSWORD`, and set
  `META_APP_SECRET` in production.
