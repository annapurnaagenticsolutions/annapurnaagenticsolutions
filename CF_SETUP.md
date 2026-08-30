# Pramana Lead Gate — Cloudflare Setup Guide
## One-time manual steps in the Cloudflare dashboard and terminal

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

---

## STEP 2 — Create D1 Database

In your terminal (with Node.js installed):
```bash
npx wrangler login
npx wrangler d1 create pramana-leads
```
Copy the `database_id` from the output and paste it into `wrangler.toml` replacing `REPLACE_AFTER_D1_CREATE`.

Then run the migration:
```bash
npx wrangler d1 execute pramana-leads --file=./migrations/0001_leads.sql
```

---

## STEP 3 — Create KV Namespace

```bash
npx wrangler kv namespace create PRAMANA_OTP
```
Copy the `id` from the output and paste it into `wrangler.toml` replacing `REPLACE_AFTER_KV_CREATE`.

---

## STEP 4 — Set up Resend.com (email OTP delivery)

1. Go to [resend.com](https://resend.com) → Sign up (free)
2. **Add Domain**: enter `annapurnaagenticsolutions.com`
3. Resend will show you DNS records to add → go to Cloudflare DNS → add them (takes ~5 min to verify)
4. Once verified, go to **API Keys** → **Create API Key** → name it "pramana-gate"
5. Copy the key

---

## STEP 5 — Set the Resend API Key as a Secret

```bash
npx wrangler secret put RESEND_API_KEY
# Paste your Resend API key when prompted
```

Or in the Cloudflare dashboard:
- Workers & Pages → your Pages project → Settings → Environment Variables → Add variable
- Name: `RESEND_API_KEY`, Value: (paste key), Type: **Secret**

---

## STEP 6 — Update wrangler.toml with real IDs

Edit `wrangler.toml`:
- Replace `REPLACE_AFTER_D1_CREATE` with the D1 database_id from Step 2
- Replace `REPLACE_AFTER_KV_CREATE` with the KV namespace id from Step 3

Commit and push:
```bash
git add wrangler.toml
git commit -m "chore: add CF Pages wrangler.toml with D1 and KV IDs"
git push origin main
```

Cloudflare Pages auto-deploys on every push to `main`.

---

## STEP 7 — Verify SSL/TLS in Cloudflare

1. Cloudflare dashboard → your domain → **SSL/TLS** → **Overview**
2. Set mode to **Full** (not Flexible)
3. SSL/TLS → **Edge Certificates** → Enable **Always Use HTTPS**

---

## STEP 8 — View Your Leads

1. Cloudflare dashboard → **Workers & Pages** → your project → **D1** → `pramana-leads`
2. Click **Console** tab → run:  
   `SELECT * FROM leads ORDER BY created_at DESC LIMIT 50;`
3. Or export: `npx wrangler d1 export pramana-leads --output leads.csv`

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
