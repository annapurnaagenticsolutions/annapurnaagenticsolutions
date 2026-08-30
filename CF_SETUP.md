# Pramana Lead Gate — Cloudflare Setup Guide
## One-time manual steps in the Cloudflare dashboard and terminal

> **Binding strategy**: D1, KV, and the Resend secret are bound to the Pages
> project **in the Cloudflare dashboard**, not in `wrangler.toml`. This keeps
> account-specific resource IDs out of git and avoids placeholder deploy
> failures. `wrangler.toml` only holds non-secret `[vars]` (e.g.
> `ALLOWED_ORIGIN`). The Functions code reads bindings by name from
> `context.env` — names must match exactly:
> `PRAMANA_LEADS` (D1), `PRAMANA_OTP` (KV), `RESEND_API_KEY` (secret).

---

## STEP 1 — Migrate to Cloudflare Pages (replaces GitHub Pages)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Left sidebar → **Workers & Pages** → **Create** → **Pages**
3. Click **Connect to Git** → Authorise GitHub → Select repo:
   `annapurnaagenticsolutions/annapurnaagenticsolutions`
4. Branch: `main`
5. Build settings: **none** (Framework preset: None, Build command: empty, Output dir: `.`)
6. Click **Save and Deploy**
7. Once deployed, go to **Custom domains** → **Set up a custom domain** → enter `annapurnaagenticsolutions.com`
8. Cloudflare will auto-configure DNS. HTTPS is **automatic** — the "Not Secure" warning will disappear.
9. In your old GitHub repo settings → Pages → disable GitHub Pages (or leave as redirect)

> The first deploy may publish static assets but fail to publish the Function
> until Steps 2–5 are complete (bindings not yet attached). That is expected —
> re-deploy after Step 6.

---

## STEP 2 — Create the D1 Database

**Option A — Dashboard (recommended, no CLI):**
1. Cloudflare dashboard → **Workers & Pages** → **D1** → **Create database**
2. Database name: `pramana-leads` → **Create**
3. Open the database → **Console** tab → paste the contents of
   `migrations/0001_leads.sql` → **Run**

**Option B — CLI:**
```bash
npx wrangler login
npx wrangler d1 create pramana-leads
npx wrangler d1 execute pramana-leads --remote --file=./migrations/0001_leads.sql
```

No ID needs to be copied anywhere — binding happens in Step 4.

---

## STEP 3 — Create the KV Namespace

**Option A — Dashboard (recommended):**
1. Cloudflare dashboard → **Workers & Pages** → **KV** → **Create namespace**
2. Namespace name: `PRAMANA_OTP` → **Add**

**Option B — CLI:**
```bash
npx wrangler kv namespace create PRAMANA_OTP
```

No ID needs to be copied anywhere — binding happens in Step 4.

---

## STEP 4 — Bind D1 + KV to the Pages Project (dashboard)

This is the key step — it replaces the old "paste IDs into wrangler.toml" flow.

1. Cloudflare dashboard → **Workers & Pages** → select your Pages project
   (`annapurnaagenticsolutions`)
2. **Settings** → **Bindings** → **Add**

**D1 binding:**
- Type: **D1 database**
- Variable name: `PRAMANA_LEADS`  ← must match exactly
- D1 database: select `pramana-leads`
- Environment: **Production** (repeat for **Preview** if you want preview deploys
  to work)
- **Save**

**KV binding:**
- Type: **KV namespace**
- Variable name: `PRAMANA_OTP`  ← must match exactly
- KV namespace: select `PRAMANA_OTP`
- Environment: **Production** (and **Preview** if needed)
- **Save**

---

## STEP 5 — Set up Resend.com (email OTP delivery)

1. Go to [resend.com](https://resend.com) → Sign up (free)
2. **Add Domain**: enter `annapurnaagenticsolutions.com`
3. Resend will show you DNS records → go to Cloudflare DNS → add them (takes ~5 min to verify)
4. Once verified, go to **API Keys** → **Create API Key** → name it "pramana-gate"
5. Copy the key

---

## STEP 6 — Set the Resend API Key as a Secret (dashboard)

1. Cloudflare dashboard → **Workers & Pages** → your Pages project →
   **Settings** → **Bindings** (or **Environment Variables** for older
   dashboards) → **Add**
2. Type: **Secret** (or **Encrypt**)
3. Variable name: `RESEND_API_KEY`  ← must match exactly
4. Value: paste your Resend API key
5. Environment: **Production** (and **Preview** if needed)
6. **Save**

Or via CLI (must be run in the project directory):
```bash
npx wrangler secret put RESEND_API_KEY
# Paste your Resend API key when prompted
```

---

## STEP 7 — Redeploy

After bindings + secret are saved, trigger a redeploy so the Function picks
them up:

- Dashboard: **Deployments** → latest → **Retry deployment**
- Or push any commit to `main`:
```bash
git commit --allow-empty -m "chore: trigger redeploy after binding setup"
git push origin main
```

The Function should now publish successfully (no more "Invalid KV namespace ID"
error). Verify in the deployment log: you should see
`✨ Success! Uploaded … Functions` and no binding errors.

---

## STEP 8 — Verify SSL/TLS in Cloudflare

1. Cloudflare dashboard → your domain → **SSL/TLS** → **Overview**
2. Set mode to **Full** (not Flexible)
3. SSL/TLS → **Edge Certificates** → Enable **Always Use HTTPS**

---

## STEP 9 — View Your Leads

1. Cloudflare dashboard → **Workers & Pages** → **D1** → `pramana-leads`
2. Click **Console** tab → run:
   `SELECT * FROM leads ORDER BY created_at DESC LIMIT 50;`
3. Or export: `npx wrangler d1 export pramana-leads --remote --output leads.csv`

---

## What Happens When Someone Fills the Checklist

```
1. User completes 15 DPDP questions in browser
2. Score calculated client-side (no server call)
3. Gate modal shows: teaser score + unlock form
4. User fills: name, work email, org, role, size, budget → clicks "Send Verification Code"
5. Client-side: blocks free email domains (Gmail, Yahoo etc.)
6. POST /api/lead/submit (CF Pages Function):
   → Validates email
   → Checks D1 for duplicate (soft message if exists within 24h)
   → Generates 6-digit OTP
   → Stores OTP in KV (10-min TTL)
   → Sends OTP email via Resend from noreply@annapurnaagenticsolutions.com
7. OTP step shown in modal — user enters 6-digit code
8. POST /api/lead/verify:
   → Checks KV (expired = error, wrong = decrement attempts)
   → Deletes KV entry (one-time use)
   → Inserts lead into D1 (with score, sector, budget, UTM source)
   → Returns { status: "verified" }
9. Modal closes — full gap report revealed — PDF export unlocked
```

---

## Local Development (optional)

To run the Functions locally with bindings, use `wrangler pages dev` and pass
bindings on the CLI (since they're not in `wrangler.toml`):

```bash
npx wrangler pages dev . \
  --kv=PRAMANA_OTP \
  --d1=PRAMANA_LEADS \
  --var ALLOWED_ORIGIN:http://localhost:8788
```

Put the Resend key in a local `.dev.vars` file (do not commit it):
```
RESEND_API_KEY=re_xxxxxxxxxxxx
```
