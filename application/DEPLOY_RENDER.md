# Deploy Pathwise to Render

Step-by-step guide for hosting the full app (API + frontend) on Render with a free external MySQL database.

**Architecture:** Render Web Service (Node) → TiDB Cloud Serverless (MySQL)

---

## Phase 1 — Database (TiDB Cloud)

1. Go to [https://tidbcloud.com](https://tidbcloud.com) and create a free account.
2. Create a **Serverless** cluster (free tier).
3. Open the cluster → **Connect** → choose **General** connection type.
4. Note these values (TiDB shows them in the connect panel):
   - Host
   - Port (often `4000` for TiDB; use whatever TiDB gives you)
   - User
   - Password
   - Database name → create or use `pathwise`
5. In TiDB SQL editor (or any MySQL client), create the database if needed:
   ```sql
   CREATE DATABASE IF NOT EXISTS pathwise;
   ```
6. Run the schema. Easiest path for a fresh deploy:
   - Open `application/db/migrations/masterMigration.sql`
   - Paste/run the full file in TiDB’s SQL editor against `pathwise`
   - Or run numbered migrations `001` through `015` in order (see `db/migrations/README.md`)
7. Optional: run `003_m3_seed_demo.sql` for sample goals (requires at least one registered user first).

**If you still have AWS RDS data:** export with `mysqldump` and import into TiDB before starting Render.

---

## Phase 2 — Push code to GitHub

Render deploys from Git. Ensure your repo is on GitHub with the latest code (including `render.yaml` at repo root).

```bash
git add .
git commit -m "Prepare Render deployment"
git push origin main
```

---

## Phase 3 — Create Render Web Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repo (`CSC-648-848-S02-Spring2026-Team02` or your fork).
4. Configure:

   | Field | Value |
   |-------|-------|
   | **Name** | `pathwise` (or your choice — becomes part of the URL) |
   | **Region** | Pick closest to you (e.g. Oregon) |
   | **Branch** | `main` |
   | **Root Directory** | `application` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |

5. Expand **Environment Variables** and add:

   | Key | Value |
   |-----|-------|
   | `DB_HOST` | TiDB host from Phase 1 |
   | `DB_PORT` | TiDB port (e.g. `4000`) |
   | `DB_USER` | TiDB username |
   | `DB_PASSWORD` | TiDB password |
   | `DB_NAME` | `pathwise` |
   | `DB_SSL` | `true` |
   | `SESSION_SECRET` | Long random string (32+ chars) — use a password generator |
   | `COOKIE_SECURE` | `true` |
   | `NODE_ENV` | `production` |
   | `GEMINI_API_KEY` | Your Google AI API key |
   | `GEMINI_MODEL` | e.g. `gemini-2.0-flash` |
   | `GEMINI_TIMEOUT_MS` | `45000` |
   | `GEMINI_MAX_OUTPUT_TOKENS` | `1800` |

6. Click **Create Web Service**. Render will build and deploy (first deploy takes a few minutes).

**Alternative:** **New +** → **Blueprint** → point at repo with `render.yaml` → fill in `sync: false` secrets when prompted.

---

## Phase 4 — Verify deployment

1. Wait until the deploy shows **Live** (green).
2. Open your URL: `https://pathwise-xxxx.onrender.com`
3. Test database:
   - Visit `https://your-app.onrender.com/api/db-test`
   - Expect JSON with `"success": true` and a resources sample
4. Test the app:
   - Landing page loads at `/`
   - **Register** a new account (no demo users are seeded by default)
   - Log in, create a goal, try AI goal planning if Gemini is configured
5. If deploy fails, open **Logs** in Render and look for `[db]` or `[startup] DB connection failed`.

---

## Phase 5 — LinkedIn

Use your Render URL: `https://your-service-name.onrender.com`

Free tier note: the app **spins down after ~15 minutes** of no traffic. The first visit after idle may take 30–60 seconds to wake up.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| DB connection failed | Check `DB_HOST`, `DB_PORT`, `DB_SSL=true`, TiDB IP allowlist (allow `0.0.0.0/0` for Render) |
| Login doesn’t stick | Ensure `COOKIE_SECURE=true` and app has `trust proxy` (already set in `server.js`) |
| Gemini errors | Verify `GEMINI_API_KEY` and `GEMINI_MODEL` in Render env vars |
| Uploaded images missing after redeploy | Expected on free tier — disk is ephemeral |
| Cold start slow | Normal on Render free tier |

---

## Local test with production-like env

Copy `.env.example` to `.env`, point `DB_*` at TiDB, set `DB_SSL=true` and `COOKIE_SECURE=true`, then:

```bash
cd application
npm start
```
