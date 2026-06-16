# Deploying CRR to Production (single Next.js app, always-on)

CRR is now **one Next.js app** (UI + API + WhatsApp webhook + follow-up
scheduler) in `frontend/`. Deploy it as a **single always-on service on Railway**
so the webhook URL is fixed and the scheduler runs 24/7 (a persistent server is
required — serverless can't hold the `setInterval` follow-up loop).

- **App** (dashboard + `/api/*` + webhook + scheduler) → **Railway**
- **Database** → **MongoDB Atlas** (already set up)

After this, the webhook URL never changes again.

---

## Deploy to Railway

The Railway CLI is already installed (`railway --version`).

### 1. Log in (opens your browser)

```bash
railway login
```

### 2. Create the project from the app folder

```bash
cd /Users/praveenmaddela/Desktop/CRR/frontend
railway init        # name it e.g. "crr"
```

### 3. Push all secrets to Railway (one command)

```bash
./scripts/railway-setenv.sh
```

This uploads everything from `frontend/.env.local` (Mongo URI, JWT secret,
WhatsApp keys, Gemini key, Meta verify token, etc.), forces
`NODE_ENV=production`, and skips `PORT` (Railway sets it).

### 4. Deploy

```bash
railway up
```

Railway runs `npm install` → `npm run build` → `npm start` (see
`frontend/railway.json`).

### 5. Get your permanent URL

```bash
railway domain      # e.g. https://crr-production.up.railway.app
```

Check it:

```bash
curl https://crr-production.up.railway.app/api/health
```

### 6. Point CLIENT_URL at the deployed app (for dashboard CORS / same origin)

Since UI and API share one origin this is mostly a formality, but set it:

```bash
railway variables --set "CLIENT_URL=https://crr-production.up.railway.app"
```

### 7. Seed the admin user + demo data (once)

Run from your machine against the same Atlas DB:

```bash
cd /Users/praveenmaddela/Desktop/CRR/frontend
npm run seed:admin    # admin@crr.local / Admin@12345
npm run seed:demo     # optional sample listings
```

---

## Point Meta at the permanent URL (do this ONCE)

Meta → WhatsApp → Configuration → Webhook → Edit:

- **Callback URL:** `https://<your-railway-domain>/api/webhooks/meta`
- **Verify token:** value of `META_VERIFY_TOKEN` in `frontend/.env.local`

Click **Verify and save**, ensure the **`messages`** field is subscribed.
You never have to change this again.

> Note the path is now **`/api/webhooks/meta`** (Next.js routes live under `/api`).

---

## Production checklist (before real users)

- [ ] **Rotate the WhatsApp access token** to a permanent System User token
      (current one is a ~24h test token). Update it:
      `railway variables --set "WHATSAPP_ACCESS_TOKEN=..."`
- [ ] **Set a strong `JWT_SECRET`** (not the placeholder) and re-run `seed:admin`.
- [ ] **Change `ADMIN_PASSWORD`** from the default.
- [ ] **Set `META_APP_SECRET`** so inbound webhooks are HMAC-verified.
- [ ] Move off the WhatsApp **test number** to a real business number when ready.
- [ ] Add your **real listing inventory** via the dashboard.

## Redeploying after code changes

```bash
cd frontend && railway up
```

That's it — one service, one fixed URL, always on, scheduler running.
