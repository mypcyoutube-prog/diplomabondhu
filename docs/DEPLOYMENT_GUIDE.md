# DEPLOYMENT_GUIDE.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

> No hosting provider is approved yet. Per spec §15, low-cost reliable options are
> compared below and the **owner approves the final choice** before any deployment.

---

## 1. Android App

> Updated in P10 to match the actual implementation (mobile_app/ pubspec + android
> config). Environment note: the sandbox has no Android SDK/Java, so the build/sign
> commands below are documented but **not yet executed** - run them on a machine
> with Android SDK before any release claim (KI-10).

- Package name (confirmed, applied): `bd.diplomabondhu.app` - applicationId and
  namespace in `mobile_app/android/app/build.gradle.kts`; MainActivity.kt lives at
  `android/app/src/main/kotlin/bd/diplomabondhu/app/`.
- Toolchain: Flutter 3.50 stable / Dart 3.14. UI imports use
  `package:material_ui/material_ui.dart` (the Flutter 3.50+ official material
  entrypoint) - do not revert to `package:flutter/material.dart`.
- Flavors: `dev` (debug API URL), `prod`.
- App icon: launcher icons (legacy + adaptive, all densities) generated in P11
  (navy/emerald graduation cap + open book; owner approval pending, KI-13).
  Native splash screen (flutter_native_splash) is still TODO.
- Versioning: `version: X.Y.Z+build` in pubspec; build number auto-increment in CI.
- Build commands (run where Android SDK is installed):
  - `flutter pub get && flutter gen-l10n`
  - `flutter analyze && flutter test` (must be clean before any build)
  - `flutter build appbundle --release` (Play Store)
  - `flutter build apk --release --split-per-abi` (direct distribution)
- Signing: create an upload keystore **outside git**; reference it via
  `android/key.properties` (gitignored) wired into a signingConfig in
  `build.gradle.kts`. Owner keeps a secure backup of the keystore - losing it
  means the app can never be updated on Play Store.
- Release checklist: minify/shrink on, ProGuard rules, permissions audit (currently
  only INTERNET; add POST_NOTIFICATIONS when FCM lands), privacy policy URL set,
  Bangla strings proofread, offline/error states verified, FCM
  google-services.json in place (owner's Firebase, KI-3).

## 2. Backend

- Build: `npm run build` (tsc) → run compiled JS; health endpoint `GET /health`.
- Environment variables (documented in `.env.example`): NODE_ENV, PORT, MONGODB_URI,
  JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGINS, FCM_SERVER_KEY (or service
  account), FILE_STORAGE_*, LOG_LEVEL. Never committed.
- Process: systemd/Docker; structured JSON logs; error monitoring (e.g., Sentry free
  tier — owner approval).
- HTTPS via reverse proxy (Caddy/Nginx + Let's Encrypt).
- Backups: daily `mongodump` to separate storage, 30-day retention, restore tested.

## 2b. Result-service (Python, internal)

Internal FastAPI service that parses BTEB result PDFs and imports them into
`results_db`. NOT student-facing; the Node API is the only public surface.

- Run: `pip install -r result-service/requirements.txt` then
  `RESULT_SERVICE_TOKEN=<shared-secret> MONGODB_URI=<mongo-uri>
  RESULT_BATCH_DIR=<persistent-volume> uvicorn result_service.app:app --host 127.0.0.1 --port 8300`
- Environment: `RESULT_SERVICE_TOKEN` (same value as the Node API's),
  `MONGODB_URI`, `RESULTS_DB` (default `results_db`), `RESULT_BATCH_DIR`
  (MUST be a persistent volume — batches are keyed by content hash and lost
  otherwise).
- Node API needs matching env: `RESULT_SERVICE_URL=http://127.0.0.1:8300`,
  `RESULT_SERVICE_TOKEN=<same secret>`, `RESULTS_DB=results_db`.
- Keep it loopback-only (no public ingress): it is protected by a single
  shared token and is not meant to be reachable from outside the host.
- Backups: `results_db` is covered by the same daily `mongodump`; batches in
  `RESULT_BATCH_DIR` are reproducible from the source PDFs.

### Hosting comparison (to be finalized with owner)
| Option | Est. cost/mo | Pros | Cons |
|---|---|---|---|
| Railway / Render | ~$5–10 | Easy deploy, managed Mongo add-on | Usage-based pricing spikes |
| VPS (Hetzner/DO) + Docker | ~$4–8 | Full control, cheapest at scale | Self-managed ops |
| MongoDB Atlas free/M10 + free app host | $0–10 | Managed DB backups | M10 needed for backups |
| **Recommendation** | — | VPS + Docker + Atlas M10 (or single VPS with self-hosted Mongo + backups) — final pick with owner | |

### Render blueprint deployment (quick start, owner-approved direction)

`render.yaml` at the repo root defines all three services. Steps:

1. Push this repository to GitHub (Render deploys from a Git repo).
2. Create a MongoDB Atlas cluster (M0 free for testing, M10 for production
   backups). Create database users; whitelist Render's outbound IPs (or
   allow 0.0.0.0/0 with strong credentials).
3. Render Dashboard → **New → Blueprint** → select the repo. Render reads
   `render.yaml` and creates: `diplomabondhu-api` (Node web service),
   `diplomabondhu-results` (Python web service), `diplomabondhu-admin`
   (static site).
4. Fill the `sync: false` env vars when prompted:
   - `MONGODB_URI` (both services) — Atlas URI with DB name
     (`.../diplomabondhu` for the api; the results service reads
     `results_db` on the same cluster)
   - `CORS_ORIGINS` (api) — `https://diplomabondhu-admin.onrender.com`
   - `RESULT_SERVICE_TOKEN` — set the **same** value on api and result-svc
   - `VITE_API_URL` (admin) — `https://diplomabondhu-api.onrender.com/api/v1`
     (baked in at build time; changing it re-triggers the build)
5. First-time setup after deploy:
   - Seed the Main Admin: Render shell on the api service →
     `npm run seed:admin <email> <password>` (or run locally against the
     Atlas URI)
   - Admin panel → Settings → set branding, homepage sections, feature flags
6. Keep-alive: UptimeRobot → monitor `https://<api>/health` every 5 min.
   Keep ONLY the api awake — one always-on free web service fits the 750
   instance-hours/month; keeping both awake would exhaust it mid-month.
   The result service may sleep (it is only needed when importing PDFs).
7. Free-tier caveats: weekly instance restarts (1–2 min downtime),
   ephemeral disk on result-svc (batches reproducible from source PDFs —
   re-upload and re-parse if a batch is missing).
8. Production hardening before real students: upgrade api to a paid plan
   (no sleep/restarts), Atlas M10 (backups), custom domain + HTTPS (Render
   provides TLS automatically).

## 3. Admin Panel

- `npm run build` (Vite) → static files; served from same VPS (Nginx) or Netlify/Vercel
  free tier; API base URL per environment; only HTTPS origins in CORS allowlist.
- Domain + subdomain suggestion: `admin.diplomabondhu.com` (owner registers domain).

## 4. Environments & Release Flow

```
dev (local) → staging (optional small VPS) → production
```
- Config per environment; production flags: maintenance mode toggle tested.
- Database migrations: none needed at first (fresh DB); any future migration requires a
  documented plan + owner approval (spec rule 18.13).
- First production deploy includes: seeded Main Admin (CLI, one-time), app settings,
  verified GPA profile(s) only.

## 5. Monitoring & Recovery

- `/health` (app) + `/health/ready` (DB ping) for uptime checks.
- Log retention 30 days; error alerts to owner's email.
- Rollback: previous Docker image tag; DB restores from nightly backup.
