# SETUP_KEYS.md — Complete Setup Guide (All API Keys & Credentials)

This is the **only setup file you need**. Follow it top to bottom and you will have
every key the app requires, filled into one `.env.local` file.

This app turns incoming **WhatsApp / Instagram / Facebook** messages into leads,
chats with the customer using AI, matches them against your listings, and is
managed from an admin dashboard. To run it you need:

| # | What | Cost | Time |
|---|------|------|------|
| 1 | A **MongoDB** database (data storage) | Free | 5 min |
| 2 | A **Google Gemini** API key (the AI) | Free tier | 2 min |
| 3 | A **Meta / WhatsApp** app + number + tokens (messaging) | Free to test | 20 min |
| 4 | A couple of **app secrets** you make up yourself (JWT, admin login) | Free | 1 min |

> Throughout this guide, anything in `<ANGLE_BRACKETS>` is a placeholder — replace
> it with your own value. Example values shown are **dummy data**, not real keys.

---

## 0. The `.env.local` file (where every key goes)

All keys live in **one file**: `frontend/.env.local`.
Create it by copying the example:

```bash
cd frontend
cp .env.local.example .env.local
```

Here is the complete file with every variable. Each section below explains where
to get each value. Keep this open and fill it in as you go.

```bash
# ── App basics ────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=/api
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# ── 1. Database (Section 1) ───────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/crr?retryWrites=true&w=majority
ATLAS_URI=mongodb+srv://<user>:<password>@<cluster-host>/crr?retryWrites=true&w=majority

# ── 4. App secrets you invent yourself (Section 4) ────────────
JWT_SECRET=<a-long-random-string-you-make-up>
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<a-strong-password-you-choose>

# ── 3. Meta / WhatsApp (Section 3) ────────────────────────────
META_VERIFY_TOKEN=<a-random-string-you-make-up>
META_APP_SECRET=<from Meta App → App settings → Basic>
META_API_VERSION=v20.0

WHATSAPP_PHONE_NUMBER_ID=<from WhatsApp → API Setup>
WHATSAPP_ACCESS_TOKEN=<temporary or permanent token>

# Optional extra channels (leave blank if not used)
INSTAGRAM_PAGE_ID=
INSTAGRAM_ACCESS_TOKEN=
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=

# ── 2. AI provider (Section 2) ────────────────────────────────
AI_PROVIDER=gemini
GEMINI_API_KEY=<from Google AI Studio>
GEMINI_MODEL=gemini-2.5-flash

# Other AI options (only if you switch AI_PROVIDER)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
CLAUDE_API_KEY=
CLAUDE_MODEL=claude-3-5-sonnet-latest
```

> 🔒 `.env.local` is git-ignored — **never commit it** and never share these values.

---

## 1. MongoDB — the database

The app stores leads, conversations, and listings in MongoDB. The easiest free
option is **MongoDB Atlas** (cloud).

1. Create a free account → **https://www.mongodb.com/cloud/atlas/register**
2. Create a **free M0 cluster** (pick any cloud/region near you).
3. **Database Access** → *Add New Database User* → set a username + password.
   Save these — they go into the connection string.
   *(Reference: https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)*
4. **Network Access** → *Add IP Address* → allow `0.0.0.0/0` (anywhere) for
   testing. *(Reference: https://www.mongodb.com/docs/atlas/security/ip-access-list/)*
5. **Clusters → Connect → Drivers** → copy the connection string. It looks like:

   ```
   mongodb+srv://myuser:mypassword@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority
   ```

6. Add the database name `crr` before the `?`:

   ```
   mongodb+srv://myuser:mypassword@cluster0.ab1cd.mongodb.net/crr?retryWrites=true&w=majority
   ```

7. Paste it into **both** `MONGODB_URI` and `ATLAS_URI` in `.env.local`.

✅ **Reference link:** Atlas getting started — https://www.mongodb.com/docs/atlas/getting-started/

---

## 2. Google Gemini — the AI brain

The AI reads each customer message and extracts what they want (location, budget,
type). Gemini has a generous free tier.

1. Go to **Google AI Studio** → **https://aistudio.google.com/app/apikey**
2. Sign in with a Google account → click **Create API key**.
3. Copy the key (looks like `AIzaSy...`).
4. Put it in `GEMINI_API_KEY`, and keep:
   ```
   AI_PROVIDER=gemini
   GEMINI_MODEL=gemini-2.5-flash
   ```

> The app automatically falls back to a built-in extractor if the AI is ever
> unavailable, so messaging never fully breaks.

✅ **Reference links:**
- Get a key — https://aistudio.google.com/app/apikey
- Gemini API docs — https://ai.google.dev/gemini-api/docs
- Pricing / free tier — https://ai.google.dev/pricing

*(Alternatives: set `AI_PROVIDER=openai` with `OPENAI_API_KEY` from
https://platform.openai.com/api-keys, or `AI_PROVIDER=claude` with `CLAUDE_API_KEY`
from https://console.anthropic.com/ . Only one provider is needed.)*

---

## 3. Meta / WhatsApp — the messaging channel

This is the biggest part. You will: create a Meta app, add WhatsApp, get a test
number, and create the tokens.

### 3.1 — Create a Meta Developer account & app

1. Go to **Meta for Developers** → **https://developers.facebook.com/**
2. Log in with a Facebook account → **My Apps** → **Create App**.
   *(Direct: https://developers.facebook.com/apps/ )*
3. Choose use case **Other** → app type **Business** → give it any name
   (e.g. `My Lead Bot`) → create.

✅ Reference: App creation — https://developers.facebook.com/docs/development/create-an-app/

### 3.2 — Add the WhatsApp product

1. In your app's left sidebar, find **Add product** → **WhatsApp** → **Set up**.
2. This also creates a **WhatsApp Business Account (WABA)** for you automatically.

✅ Reference: WhatsApp Cloud API get-started —
https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

### 3.3 — Get the test number + IDs

1. Left sidebar → **WhatsApp → API Setup** (or "Quickstart").
2. You'll see a free **test number** like `+1 555 555 0123` and two IDs:
   - **Phone number ID** → copy into `WHATSAPP_PHONE_NUMBER_ID`
     *(dummy example: `1234567890123456`)*
   - **WhatsApp Business Account ID** → note it down (used for the permanent token)
     *(dummy example: `9876543210987654`)*

### 3.4 — Add your phone as a test recipient

The test number can only message numbers you add (up to 5).

1. On the same **API Setup** page, find the **"To"** recipient dropdown →
   **Manage phone number list** → **Add phone number**.
2. Enter your own WhatsApp number (with country code) → verify the OTP it sends.

> ⚠️ A random person messaging the test number will **not** get a reply — only the
> numbers on this list do. To let *anyone* message you, see Section 5 (production).

### 3.5 — Make up the Verify Token (you invent this)

`META_VERIFY_TOKEN` is **not** given by Meta — **you create it yourself**. It's a
secret password used once when connecting the webhook. Make any random string:

```
META_VERIFY_TOKEN=my-secret-verify-1a2b3c4d5e6f
```

Generate a strong one with: `openssl rand -hex 24`

### 3.6 — Get the App Secret (`META_APP_SECRET`)

This lets the app verify that incoming webhooks really came from Meta.

1. Left sidebar → **App settings → Basic**.
   *(Direct path: `developers.facebook.com/apps/<YOUR_APP_ID>/settings/basic/`)*
2. Find **App secret** → **Show** → enter your password → copy it.
3. Put it in `META_APP_SECRET`. *(dummy example: `28e8cb198ffcbd0ed264da6b7b163c3a`)*

### 3.7 — Get a WhatsApp access token

**Option A — Temporary token (fast, for first test):** expires in ~24 hours.
- On **WhatsApp → API Setup**, click **Generate access token** (or copy the
  temporary token shown). Put it in `WHATSAPP_ACCESS_TOKEN`.

**Option B — Permanent token (recommended):** never expires. See Section 3.8.

*(dummy token example: `EAAGxxxxPERMANENTxxxxZD`)*

### 3.8 — Permanent token via a System User (free, never expires)

1. Open **Business Settings → Users → System users** →
   **https://business.facebook.com/settings/system-users**
2. **Add** → name it `bot-user` → role **Admin** → create.
3. Select it → **Assign assets** → **Apps** → choose your app → enable
   **Full control** → save.
   *(Also assign your **WhatsApp account** under Assign assets → WhatsApp accounts → Full control.)*
4. Click **Generate token** → select your app → **Expiration: Never**.
5. Tick these two permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. **Generate** → copy the token (shown only once) → put it in
   `WHATSAPP_ACCESS_TOKEN`.

✅ Reference: System user tokens —
https://developers.facebook.com/docs/whatsapp/business-management-api/get-started

### 3.9 — Connect the Webhook (so messages reach the app)

The webhook is the URL Meta calls when a customer messages you.

1. First, your app must be reachable on a public HTTPS URL:
   - **Production:** your deployed URL, e.g. `https://your-app.example.com`
   - **Local testing:** use a tunnel like Cloudflare (`./start-realtime.sh` in this
     repo prints a temporary public URL) or `ngrok http 3000`.
2. In your Meta app → **WhatsApp → Configuration → Webhook → Edit**:
   - **Callback URL:** `https://<YOUR_PUBLIC_URL>/api/webhooks/meta`
   - **Verify token:** the exact value of `META_VERIFY_TOKEN` from Section 3.5
3. Click **Verify and save**. (Meta sends a check to your server; it must be
   running with the same verify token.)
4. Under **Webhook fields**, click **Manage** → **Subscribe** to **`messages`**.
   *(This one field is what delivers incoming chats. Other fields aren't needed.)*

✅ Reference: Webhooks setup —
https://developers.facebook.com/docs/graph-api/webhooks/getting-started

> Note the path is **`/api/webhooks/meta`**. If the public URL changes (tunnels
> change each run), update the Callback URL again. A deployed app has a fixed URL.

---

## 4. App secrets you invent yourself

These are **not** from any provider — you choose them.

| Key | What to set |
|-----|-------------|
| `JWT_SECRET` | Any long random string. Generate: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Leave as `7d` (login session length) |
| `ADMIN_EMAIL` | The email you'll log into the dashboard with, e.g. `admin@example.com` |
| `ADMIN_PASSWORD` | A strong password you choose |

After setting these, create the admin user (Section 6).

---

## 5. Going to production (real customers, your own number)

The test number only talks to your ~5 allow-listed phones. To let **any** customer
message your bot:

1. **Add your own business phone number** (a number not already on WhatsApp):
   WhatsApp Manager → add & verify via OTP. Replace `WHATSAPP_PHONE_NUMBER_ID`
   with the new number's ID.
   *(Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/add-a-phone-number )*
2. **Business Verification** (free) — lifts the messaging limit:
   Business Settings → Security Center → Start verification.
   *(Reference: https://www.facebook.com/business/help/2058515294227817 )*
3. **Add a payment method** — free to add; you only pay for *business-initiated*
   messages. Customer replies within 24h are free.
   *(Pricing: https://developers.facebook.com/docs/whatsapp/pricing )*
4. **Message templates** — required to message a customer *after* the 24-hour
   window (e.g. scheduled follow-ups). Create & get them approved in WhatsApp
   Manager. *(Reference: https://developers.facebook.com/docs/whatsapp/message-templates )*
5. Set the app to **Live** mode (toggle at the top of the Meta app dashboard).

---

## 6. Finish: seed the database & run

Once `.env.local` is filled:

```bash
cd frontend
npm install
npm run init:db      # create collections + indexes
npm run seed:admin   # create the admin login (uses ADMIN_EMAIL / ADMIN_PASSWORD)
npm run seed:demo    # optional: sample listings + leads
npm run dev          # → http://localhost:3000
```

Log in at http://localhost:3000 with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

**Test without any Meta keys** (dev only) — runs a message through the full
pipeline locally:

```bash
curl -X POST http://localhost:3000/api/webhooks/simulate \
  -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","contactId":"test-1","message":"need a 2bhk near downtown around 28k"}'
```

---

## Quick reference — every key at a glance

| Variable | Where it comes from | Required? |
|----------|---------------------|-----------|
| `MONGODB_URI` / `ATLAS_URI` | MongoDB Atlas connection string (Section 1) | ✅ Yes |
| `GEMINI_API_KEY` | Google AI Studio (Section 2) | ✅ Yes (or another AI provider) |
| `AI_PROVIDER` | `gemini` \| `openai` \| `claude` \| `mock` | ✅ Yes |
| `JWT_SECRET` | You invent it (Section 4) | ✅ Yes |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | You choose (Section 4) | ✅ Yes |
| `META_VERIFY_TOKEN` | You invent it (Section 3.5) | ✅ For WhatsApp |
| `META_APP_SECRET` | Meta App → Settings → Basic (Section 3.6) | ✅ For WhatsApp security |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp → API Setup (Section 3.3) | ✅ For WhatsApp |
| `WHATSAPP_ACCESS_TOKEN` | Temp or permanent token (Section 3.7–3.8) | ✅ For WhatsApp |
| `META_API_VERSION` | Leave as `v20.0` | ✅ Yes |
| `INSTAGRAM_*` / `FACEBOOK_*` | Same Meta app, if using those channels | ⬜ Optional |
| `OPENAI_*` / `CLAUDE_*` | Only if you switch `AI_PROVIDER` | ⬜ Optional |

## All reference links in one place

- Meta for Developers — https://developers.facebook.com/
- Your apps — https://developers.facebook.com/apps/
- WhatsApp Cloud API get started — https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
- Webhooks — https://developers.facebook.com/docs/graph-api/webhooks/getting-started
- System users (permanent token) — https://business.facebook.com/settings/system-users
- WhatsApp pricing — https://developers.facebook.com/docs/whatsapp/pricing
- Message templates — https://developers.facebook.com/docs/whatsapp/message-templates
- MongoDB Atlas — https://www.mongodb.com/cloud/atlas/register
- Google AI Studio (Gemini key) — https://aistudio.google.com/app/apikey
- OpenAI keys — https://platform.openai.com/api-keys
- Anthropic (Claude) keys — https://console.anthropic.com/
