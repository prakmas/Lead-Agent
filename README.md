# CRR — Multi-Channel Lead Matching Platform

CRR turns incoming WhatsApp, Instagram, and Facebook Messenger messages into
qualified leads, automatically matches them against your listings, and replies
to the customer — all visible from one admin dashboard.

```
Customer DM (WhatsApp / Instagram / Facebook)
        │
        ▼
  Meta webhook  ──►  AI extracts intent + requirements
        │                     │
        │                     ▼
        │              Lead created / updated
        │                     │
        │            ┌────────┴────────┐
        │            ▼                 ▼
        │   Missing details?     Matching engine
        │   ask a follow-up      scores Listings
        │            │                 │
        ▼            ▼                 ▼
   Auto-reply sent back to the customer on the same channel
        │
        ▼
   Admin dashboard: Leads · Inbox · Listings · Matches · Stats
```

## Tech stack

| Layer     | Stack                                                        |
| --------- | ------------------------------------------------------------ |
| Frontend  | Next.js (App Router) · React · Tailwind CSS · TypeScript     |
| Backend   | Node.js · Express · Mongoose (MongoDB Atlas)                 |
| Auth      | JWT (admin login), bcrypt password hashing                   |
| Channels  | Meta Graph API adapters for WhatsApp, Instagram, Facebook    |
| AI        | Pluggable provider: `mock` (default), `openai`, `claude`, `gemini` |

## Project structure

```
CRR/
├── backend/                  Express API + webhook + matching engine
│   └── src/
│       ├── adapters/         Meta channel normalize/send (whatsapp, instagram, facebook)
│       ├── config/           db + env loaders
│       ├── controllers/      auth, admin, webhook
│       ├── middleware/        JWT auth guard
│       ├── models/           Mongoose schemas (Lead, Listing, Match, Conversation, …)
│       ├── providers/        AI extraction (mock/openai/claude/gemini)
│       ├── routes/           auth, admin, webhook routers
│       ├── scripts/          initDb, seedAdmin, seedDemo
│       └── services/         conversation pipeline, matching, messaging, aiAgent
└── frontend/                 Next.js admin dashboard
    └── src/app/              login, dashboard, leads, conversations, listings, matches, settings
```

## Prerequisites

- Node.js 18+ (the adapters use the built-in `fetch`)
- A MongoDB connection string (MongoDB Atlas works out of the box)

## 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 2. Configure the backend

Copy the example env file and fill it in:

```bash
cd backend
cp .env.example .env
```

Key values in [backend/.env](backend/.env):

```bash
PORT=5000
CLIENT_URL=http://localhost:3000

# MongoDB Atlas — database name is "crr"
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/crr?retryWrites=true&w=majority

# Auth — change these before deploying
JWT_SECRET=change-this-long-random-secret
ADMIN_EMAIL=admin@crr.local
ADMIN_PASSWORD=Admin@12345

# AI provider: mock works with no API key
AI_PROVIDER=mock
```

The Meta channel keys (`WHATSAPP_*`, `INSTAGRAM_*`, `FACEBOOK_*`, `META_*`) can
stay blank for local testing — outbound sends fall back to a logged "dry-run"
and the simulator below lets you test the whole pipeline without them. To go
live, follow **[META_KEYS_SETUP.md](META_KEYS_SETUP.md)**.

## 3. Configure the frontend

```bash
cd frontend
cp .env.local.example .env.local
```

[frontend/.env.local](frontend/.env.local):

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 4. Initialize the database and admin user

```bash
cd backend
npm run init:db      # creates collections + indexes, seeds the admin user
npm run seed:admin   # (re)create or reset the admin user only
npm run seed:demo    # OPTIONAL: load sample listings + simulated leads/matches
```

`seed:demo` populates the dashboard with sample listings and runs a few sample
messages through the real pipeline, so Leads, Inbox, Matches, and Stats all show
data on first launch.

## 5. Run the apps

Backend (terminal 1):

```bash
cd backend
npm run dev      # nodemon, auto-reload  → http://localhost:5000
# or: npm start  # plain node, for production
```

Frontend (terminal 2):

```bash
cd frontend
npm run dev      # → http://localhost:3000
# npm run build && npm start  # production build
```

| Service   | URL                          |
| --------- | ---------------------------- |
| Frontend  | http://localhost:3000        |
| Backend   | http://localhost:5000        |
| Health    | http://localhost:5000/api/health |

## 6. Log in

Open http://localhost:3000 and sign in with the seeded admin credentials
(the login form is pre-filled with these defaults):

```
Email:    admin@crr.local
Password: Admin@12345
```

> These come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`. Change them
> (and re-run `npm run seed:admin`) before sharing or deploying.

## Test the full pipeline locally (no Meta keys needed)

A dev-only simulator endpoint runs a message through the exact same path as a
real Meta webhook — AI extraction, lead creation, matching, and auto-reply:

```bash
curl -X POST http://localhost:5000/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "contactId": "919900000001",
    "contactName": "Test User",
    "message": "Looking for a furnished 2bhk flat in Koramangala under 30000 immediately"
  }'
```

Response:

```json
{ "reply": "I found these matches:\n1. ...", "leadStatus": "Matched", "matches": 2, "conversationId": "..." }
```

Then refresh the dashboard to see the new conversation, lead, and matches.
The endpoint returns `403` in production (`NODE_ENV=production`).

## Backend API reference

Base URL: `http://localhost:5000`

**Public**

| Method | Path                 | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/api/health`        | Server + DB status                   |
| GET    | `/webhooks/meta`     | Meta webhook verification handshake  |
| POST   | `/webhooks/meta`     | Inbound messages (HMAC-verified)     |
| POST   | `/webhooks/simulate` | Dev-only pipeline simulator          |
| POST   | `/api/auth/login`    | Admin login → `{ token, admin }`     |

**Protected** — send `Authorization: Bearer <token>`

| Method | Path                                      | Description                |
| ------ | ----------------------------------------- | -------------------------- |
| GET    | `/api/auth/me`                            | Current admin              |
| GET    | `/api/admin/stats`                        | Dashboard totals           |
| GET    | `/api/admin/leads`                        | List/search/filter leads   |
| POST   | `/api/admin/leads`                        | Create a manual lead       |
| PATCH  | `/api/admin/leads/:id`                    | Update a lead              |
| DELETE | `/api/admin/leads/:id`                    | Delete a lead              |
| GET    | `/api/admin/conversations`                | List conversations         |
| GET    | `/api/admin/conversations/:id/messages`   | Messages in a conversation |
| GET    | `/api/admin/messages/search`              | Full-text message search   |
| GET    | `/api/admin/listings`                     | List/search listings       |
| POST   | `/api/admin/listings`                     | Create a listing           |
| PATCH  | `/api/admin/listings/:id`                 | Update a listing           |
| DELETE | `/api/admin/listings/:id`                 | Delete a listing           |
| POST   | `/api/admin/listings/match`               | Run matching for a lead    |
| GET    | `/api/admin/matches`                      | List matches               |
| GET    | `/api/admin/channels`                     | List connected channels    |
| GET    | `/api/admin/follow-ups`                   | List follow-ups (filter `?status=scheduled`) |
| PATCH  | `/api/admin/follow-ups/:id/cancel`        | Cancel a scheduled follow-up |

## Scheduled follow-ups (the core real-time loop)

This is how the manager's vision works end-to-end:

```
User DMs "2bhk in Koramangala under 30k immediately"
    │
    ▼
AI extracts requirements → Lead created → Listings scored
    │
    ├─ Matches found? → send top 3 matches, mark them "sent"
    │                   → schedule a follow-up in 24 h
    │
    └─ No matches? → "I'll keep checking" → schedule a follow-up in 24 h

Every 5 minutes on the server:
    runFollowUpScheduler()
    ├─ finds all FollowUp records with scheduledAt <= now and status=scheduled
    ├─ for each: re-runs matching, finds listings NOT already sent to that lead
    ├─ if new listings → sends them via the same channel (WhatsApp/Instagram/Facebook)
    │                  → marks those matches as sent → schedules the NEXT follow-up
    └─ if no new listings → reschedules silently (still keeps checking)

User says "continue" → sends the next batch of unsent matches immediately.
User says "found"   → closes the conversation and cancels future follow-ups.
User says "stop"    → stops updates, cancels follow-ups.

Admin adds a new listing → all active leads whose requirements match it
                           get a near-immediate follow-up (within 1 minute).
```

The follow-up schedule, status, and history are visible in **Settings → Scheduled follow-ups** in the dashboard.

## How matching works

The matching engine ([backend/src/services/matching.service.js](backend/src/services/matching.service.js))
scores each active listing against a lead's requirements (max 100):

- Category match — 20
- Location match — 25
- Budget fit (within min/max) — 20
- Availability match — 10
- Keyword overlap — up to 25

Listings scoring `> 0` are saved as `Match` records and the top 3 are returned
in the auto-reply. Adjust the weights in that file to tune relevance.

## Going live with Meta channels

1. Follow **[META_KEYS_SETUP.md](META_KEYS_SETUP.md)** to create the app, tokens,
   and verify token, and to fill in the `WHATSAPP_*` / `INSTAGRAM_*` /
   `FACEBOOK_*` / `META_*` values.
2. Expose the backend over HTTPS (ngrok / Cloudflare Tunnel for testing, or a
   real domain in production) and set the webhook callback URL to:

   ```
   https://your-public-domain.com/webhooks/meta
   ```

3. Set `META_APP_SECRET` so inbound webhooks are HMAC-verified
   (`X-Hub-Signature-256`). When this is set, unsigned/forged requests are
   rejected with `401`.

## Troubleshooting

- **`EADDRINUSE` / port 5000 in use on macOS** — macOS **AirPlay Receiver**
  listens on port 5000. Either turn it off in **System Settings → General →
  AirDrop & Handoff → AirPlay Receiver**, or run the backend on another port and
  point the frontend at it:

  ```bash
  # backend
  PORT=5055 npm run dev
  # frontend/.env.local
  NEXT_PUBLIC_API_URL=http://localhost:5055/api
  ```

- **`MONGODB_URI or ATLAS_URI is missing`** — copy `.env.example` to `.env` and
  set the connection string.
- **Login fails / no admin** — run `npm run seed:admin` in `backend`.
- **Dashboard is empty** — run `npm run seed:demo`, or send a message through
  the simulator.

## Security notes

- Never commit a real `.env` — both are git-ignored.
- Rotate any DB password or Meta/AI token that has been shared in chat,
  screenshots, or tickets.
- Use a long random `JWT_SECRET` and strong admin password in production.
- Always serve webhooks over HTTPS and set `META_APP_SECRET`.
