# Deploying CRR to Production (permanent, always-on)

This replaces the temporary `cloudflared` tunnel with a **fixed, always-on URL**
so you register the Meta webhook **once** and your laptop is no longer involved.

- **Backend** (Express + WhatsApp webhook) → **Railway** (fixed URL, runs 24/7)
- **Frontend** (admin dashboard) → **Vercel** (free)
- **Database** → **MongoDB Atlas** (already set up)

After this, the webhook URL never changes again.

---

## Part A — Backend to Railway

The Railway CLI is already installed (`railway --version`).

### 1. Log in (opens your browser)

```bash
railway login
```

### 2. Create the project from the backend folder

```bash
cd /Users/praveenmaddela/Desktop/CRR/backend
railway init        # give it a name, e.g. "crr-backend"
```

### 3. Push all your secrets to Railway (one command)

```bash
./scripts/railway-setenv.sh
```

This uploads everything from `backend/.env` (Mongo URI, JWT secret, WhatsApp
keys, Gemini key, Meta verify token, etc.), forces `NODE_ENV=production`, and
skips `PORT` (Railway sets that itself).

### 4. Deploy

```bash
railway up
```

### 5. Get your permanent public URL

```bash
railway domain      # generates + prints e.g. https://crr-backend-production.up.railway.app
```

Quick check (replace with your URL):

```bash
curl https://crr-backend-production.up.railway.app/api/health
```

### 6. Seed the admin user + demo data (once)

Run these against the deployed DB. Easiest from your machine — they use the same
Atlas URI:

```bash
cd /Users/praveenmaddela/Desktop/CRR/backend
npm run seed:admin    # creates admin@crr.local / Admin@12345
npm run seed:demo     # optional sample listings
```

(Atlas is shared between local and Railway, so seeding locally populates prod.)

---

## Part B — Point Meta at the permanent URL (do this ONCE)

Meta → WhatsApp → Configuration → Webhook → Edit:

- **Callback URL:** `https://<your-railway-domain>/webhooks/meta`
- **Verify token:** the value of `META_VERIFY_TOKEN` in `backend/.env`
  (currently `d91d382ae43a54f666663be2e538554ccbb97bc26f42604e`)

Click **Verify and save**, ensure the **`messages`** field is subscribed.

You never have to change this again.

---

## Part C — Frontend to Vercel

### 1. Install + log in

```bash
npm i -g vercel
vercel login
```

### 2. Deploy the dashboard

```bash
cd /Users/praveenmaddela/Desktop/CRR/frontend
vercel            # follow prompts; accept defaults
```

### 3. Set the API URL env var

In the Vercel dashboard (Project → Settings → Environment Variables), add:

```
NEXT_PUBLIC_API_URL = https://<your-railway-domain>/api
```

Then redeploy: `vercel --prod`

### 4. Allow the frontend origin on the backend

Point the backend's CORS at your Vercel URL:

```bash
cd /Users/praveenmaddela/Desktop/CRR/backend
railway variables --set "CLIENT_URL=https://<your-vercel-domain>"
```

(`CLIENT_URL` accepts a comma-separated list if you want to keep
`http://localhost:3000` for local dev too.)

---

## Production checklist (before real users)

- [ ] **Rotate the WhatsApp access token** to a permanent System User token
      (the current one is a ~24h test token). Update `WHATSAPP_ACCESS_TOKEN` in
      Railway: `railway variables --set "WHATSAPP_ACCESS_TOKEN=..."`.
- [ ] **Set a strong `JWT_SECRET`** (not the placeholder) and re-run `seed:admin`.
- [ ] **Change `ADMIN_PASSWORD`** from the default.
- [ ] **Set `META_APP_SECRET`** so inbound webhooks are HMAC-verified.
- [ ] Move off the WhatsApp **test number** to a real business number when ready
      (this also lifts the allow-list restriction — you can message anyone who
      messages you first, within the 24h window).
- [ ] Add your **real listing inventory** via the dashboard.

## Redeploying after code changes

```bash
cd backend && railway up        # backend
cd frontend && vercel --prod    # frontend
```

That's it — fixed URLs, always on, no tunnel.
