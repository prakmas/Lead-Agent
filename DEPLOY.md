# DEPLOY.md — Deploy to Railway (Dashboard **and** CLI, step by step)

This guide deploys the app to **Railway** as a single always-on service. You can
use **either** method:

- **Method A — Railway Dashboard (web app):** point-and-click in the browser,
  connects to GitHub, auto-deploys on every push. **Best if you don't like the
  terminal.**
- **Method B — Railway CLI (terminal):** deploy with commands from your machine.

After either method you'll have a permanent public URL, an always-on follow-up
scheduler, and a fixed WhatsApp webhook.

## What is Railway? (in simple words)

**Railway is a cloud hosting platform** — a place on the internet where your app
runs 24/7 so anyone can use it, without you keeping your laptop on.

> Think of it like **AWS, Google Cloud (GCP), or Microsoft Azure — but much
> simpler and beginner-friendly.** The big clouds are powerful but complicated to
> set up. Railway does the same core job (run your app in the cloud, give it a
> public web address, keep it online) with a few clicks or commands.

In one line: **your code lives on your laptop → Railway runs it on the internet.**

| | Railway | GCP / AWS / Azure |
|--|---------|-------------------|
| Ease of use | Very easy, beginner-friendly | Powerful but complex |
| Setup time | Minutes | Hours, lots of options |
| Best for | Small/medium apps, fast launch | Large enterprise systems |
| Cost | ~$5/month hobby | Pay-as-you-go, can get complex |

For this app, Railway is the perfect fit — simple, quick, and always-on.

**Why Railway specifically?** This app needs an **always-on server** (the follow-up
scheduler runs a continuous timer). Serverless hosts that sleep when idle would
stop it — Railway keeps one process running 24/7.

> Prerequisite: finish **[SETUP_KEYS.md](SETUP_KEYS.md)** first so you have all your
> environment values ready. Anything in `<ANGLE_BRACKETS>` is a placeholder.

---

## 0. What you need

| Tool | Why | Link |
|------|-----|------|
| **Railway account** | hosting | https://railway.com |
| **GitHub account + repo** | source for Dashboard deploy (Method A) | https://github.com |
| **Node.js 18+** | only for CLI method / local seeding | https://nodejs.org |
| Your **environment values** | secrets to upload | SETUP_KEYS.md |

> ⚠️ **One critical setting for BOTH methods:** this project lives in the
> **`frontend/`** subfolder, and its build needs dev dependencies. You must:
> 1. Set the service **Root Directory** to `frontend`, and
> 2. Add the variable **`NPM_CONFIG_INCLUDE=dev`** (explained below).
>
> Skip these and the build fails with *"Cannot find module '@tailwindcss/postcss'"*.

---

# Method A — Railway Dashboard (web app, no terminal)

### A1. Push your code to GitHub

Railway's dashboard deploys from a GitHub repository.

```bash
# one-time, if not already on GitHub
git add -A
git commit -m "Deploy to Railway"
git push
```

If you don't have a repo yet: create one at https://github.com/new, then follow
its "push an existing repository" commands.

### A2. Create a project from your repo

1. Go to **https://railway.com/dashboard** → **New Project**.
2. Choose **Deploy from GitHub repo**.
3. If first time, click **Configure GitHub App** → grant Railway access to your
   repository → come back and select your repo.
4. Railway creates a service and starts the first build.

✅ Reference: https://docs.railway.com/guides/services

### A3. Set the Root Directory to `frontend` (important)

Because the app is in a subfolder:

1. Open the **service** → **Settings** tab.
2. Find **Source** → **Root Directory** → set it to **`frontend`** → save.

Railway will now build from `frontend/` (where `package.json` and `railway.json`
live). Nixpacks auto-detects Next.js and uses the build/start commands from
`frontend/railway.json`.

✅ Reference: https://docs.railway.com/guides/build-configuration

### A4. Add environment variables

1. Open the **service** → **Variables** tab.
2. Click **Raw Editor** (top-right) — this lets you paste many at once.
3. Paste all your values (from `frontend/.env.local`), one `KEY=VALUE` per line,
   **but**:
   - set `NODE_ENV=production`
   - **add** `NPM_CONFIG_INCLUDE=dev`  ← makes the build install Tailwind/TypeScript
   - do **not** add `PORT` (Railway sets it)
4. Click **Update Variables**. Railway redeploys automatically.

Minimum required variables (see SETUP_KEYS.md for where each comes from):

```
NODE_ENV=production
NPM_CONFIG_INCLUDE=dev
NEXT_PUBLIC_API_URL=/api
MONGODB_URI=<your-atlas-uri>
ATLAS_URI=<your-atlas-uri>
JWT_SECRET=<your-secret>
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=<your-email>
ADMIN_PASSWORD=<your-password>
META_VERIFY_TOKEN=<your-verify-token>
META_APP_SECRET=<your-app-secret>
META_API_VERSION=v20.0
WHATSAPP_PHONE_NUMBER_ID=<your-number-id>
WHATSAPP_ACCESS_TOKEN=<your-token>
AI_PROVIDER=gemini
GEMINI_API_KEY=<your-gemini-key>
GEMINI_MODEL=gemini-2.5-flash
```

✅ Reference: https://docs.railway.com/guides/variables

### A5. Generate a public URL

1. Service → **Settings** → **Networking** → **Public Networking**.
2. Click **Generate Domain** (Railway gives you
   `https://<name>-production.up.railway.app`).
3. Optionally add your own custom domain here later.

✅ Reference: https://docs.railway.com/guides/public-networking

### A6. Done — and it auto-deploys

From now on, **every `git push` to your repo redeploys automatically**. Watch
progress in the service's **Deployments** tab; read logs in the **Deploy Logs** /
**Build Logs** panels.

➡️ Now jump to **"Shared steps after deploy"** below.

---

# Method B — Railway CLI (terminal)

### B1. Install the CLI

```bash
# macOS
brew install railway
# Windows (Scoop) or any OS via npm
scoop install railway       # or:  npm install -g @railway/cli
# Linux/macOS script
bash <(curl -fsSL https://railway.com/install.sh)
```
Verify: `railway --version`  •  Docs: https://docs.railway.com/guides/cli

### B2. Log in

```bash
railway login      # opens the browser
railway whoami     # confirm
```
> The website login and the CLI login are separate — run `railway login` in the
> terminal even if the site is logged in.

### B3. Create the project (from the app folder)

```bash
cd frontend
railway init --name <your-project-name>
railway add --service <your-project-name>
railway status
```

### B4. Upload environment variables

**Option 1 — bulk from `.env.local` (this repo includes a helper):**
```bash
cd frontend
./scripts/railway-setenv.sh
```
**Option 2 — manually:**
```bash
railway variables --set "MONGODB_URI=<your-uri>"
# ...one per key
```
List them: `railway variables`

**Required build fix (run once):**
```bash
railway variables --set "NPM_CONFIG_INCLUDE=dev"
```

### B5. Deploy

```bash
railway up
```
Runs `npm install` → `npm run build` → `npm start` (from `frontend/railway.json`).
> If the CLI prints a `reqwest`/timeout error, the build often still ran. Check
> `railway status` and `railway logs --build`.

### B6. Get the public URL

```bash
railway domain
curl https://<your-domain>/api/health      # expect database: connected
railway variables --set "CLIENT_URL=https://<your-domain>"
```

➡️ Now continue to **"Shared steps after deploy"**.

---

# Shared steps after deploy (both methods)

### S1. Verify it's live
Open `https://<your-domain>/api/health` in a browser — you should see:
```json
{"message":"Backend API is running","database":"connected"}
```

### S2. Seed the database (once)
Run from your machine against the same Atlas DB (uses your local `.env.local`):
```bash
cd frontend
npm install
npm run seed:admin    # creates the admin login
npm run seed:demo     # optional sample listings
```
Log in at `https://<your-domain>` with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### S3. Point the WhatsApp webhook at the URL (once)
Meta app → **WhatsApp → Configuration → Webhook → Edit**:
- **Callback URL:** `https://<your-domain>/api/webhooks/meta`
- **Verify token:** your `META_VERIFY_TOKEN`

Click **Verify and save**, then **Subscribe** to the **`messages`** field.
*(Full details in [SETUP_KEYS.md](SETUP_KEYS.md) Section 3.9.)* The deployed URL never
changes, so you only do this once.

---

## Updating things later

| Task | Dashboard (Method A) | CLI (Method B) |
|------|----------------------|----------------|
| Deploy new code | `git push` (auto-deploys) | `cd frontend && railway up` |
| Change a variable | Variables tab → edit → Update | `railway variables --set "K=V"` |
| Restart the app | Deployments → ⋯ → Redeploy | `railway redeploy --yes` |
| View logs | Deployments → Build/Deploy Logs | `railway logs` / `railway logs --build` |
| Add a domain | Settings → Networking | `railway domain` |

Example — swap to a permanent WhatsApp token without redeploying everything:
```bash
railway variables --set "WHATSAPP_ACCESS_TOKEN=<new-token>"
```
(Or, in the Dashboard: Variables tab → edit the value → Update.)

---

## Railway CLI cheat sheet

| Command | What it does |
|---------|--------------|
| `railway login` / `railway whoami` | Auth / who am I |
| `railway init --name <n>` | Create a project |
| `railway add --service <n>` | Add a service |
| `railway status` | Project / service / deploy status |
| `railway variables` | List variables |
| `railway variables --set "K=V"` | Set a variable (restarts unless `--skip-deploys`) |
| `railway up` | Build & deploy current folder |
| `railway redeploy --yes` | Restart / redeploy |
| `railway domain` | Create / show public URL |
| `railway logs` / `--build` | Runtime / build logs |
| `railway open` | Open the project in the browser |

---

## Troubleshooting

| Symptom | Cause & fix |
|---------|-------------|
| Build fails: `Cannot find module '@tailwindcss/postcss'` | `NODE_ENV=production` skipped dev deps. Add `NPM_CONFIG_INCLUDE=dev` (Variables/`--set`) and redeploy. |
| Build can't find `package.json` | Root Directory not set to `frontend` (Dashboard: Settings → Source → Root Directory). |
| CLI: "Project has no services" | Run `railway add --service <name>`. |
| CLI: `reqwest error` / `operation timed out` during `up` | Network blip; build may still be running. Check `railway status` / `railway logs --build`. |
| `/api/health` shows `"database":"disconnected"` | Wrong `MONGODB_URI` or Atlas IP access not open to `0.0.0.0/0`. See SETUP_KEYS.md §1. |
| Webhook won't verify | Verify token must exactly match `META_VERIFY_TOKEN`, and the app must be deployed & running when you click "Verify and save". |
| Bot replies stop after ~24h | Temporary WhatsApp token expired — switch to a permanent System User token (SETUP_KEYS.md §3.8) and update `WHATSAPP_ACCESS_TOKEN`. |
| `railway-setenv.sh`: permission denied | `chmod +x scripts/railway-setenv.sh` then re-run. |

---

## Cost note

Railway runs on a small trial credit, then a Hobby plan (~$5/month) keeps the
service always-on. WhatsApp customer replies within 24h are free; see SETUP_KEYS.md
§5 for messaging pricing.

## Reference links

- Railway dashboard — https://railway.com/dashboard
- Railway docs — https://docs.railway.com/
- Deploy from GitHub — https://docs.railway.com/guides/services
- Build configuration / root directory — https://docs.railway.com/guides/build-configuration
- Variables & secrets — https://docs.railway.com/guides/variables
- Public networking / domains — https://docs.railway.com/guides/public-networking
- Railway CLI — https://docs.railway.com/guides/cli
- Pricing — https://railway.com/pricing
