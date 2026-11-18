# SECURITY_GUIDE.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

---

## 1. Authentication & Session Management

- **Passwords:** bcrypt (cost ≥ 12). Password policy: min 8 chars, checked against a
  small common-password list. Never logged, never returned.
- **Tokens:** short-lived JWT access token (~15 min) + rotating refresh token (~30 d,
  httpOnly Secure SameSite=Strict cookie for web; secure storage for mobile).
  Refresh rotation with reuse detection → family revocation on reuse.
- **Sessions:** device list + revoke; logout revokes refresh token; suspension
  revokes all sessions immediately.
- **Roles:** `student` on registration. **Admin accounts are created only by an
  existing Main Admin (seeded via server CLI) — never via public registration.**
  Clients can never set role/permissions; server derives role from the token + DB.

## 2. Authorization (RBAC)

- Central `requireAuth` + `requirePermission(key)` middlewares; permission keys map to
  roles via `roles` collection.
- Ownership checks in services (e.g., result/planner/attempt access is owner-only).
- Admin panel renders by permission but **every** route re-checks server-side.

## 3. Input Validation & Injection Protection

- Zod schema validation on every request (body, query, params); unknown keys stripped.
- Mongoose queries built from whitelisted fields only; `express-mongo-sanitize`
  (or equivalent operator stripping) against NoSQL injection.
- Output encoding in admin panel; React escapes by default (no `dangerouslySetInnerHTML`).

## 4. Transport & Headers

- HTTPS enforced (TLS 1.2+); HSTS in production.
- Helmet: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
  Permissions-Policy. CORS: explicit origin allowlist (admin panel domain; mobile uses
  no CORS), credentials only for allowlisted origins.

## 5. Rate Limiting & Abuse Control

- Layered limits (see API doc §4): auth endpoints strictest; community writes; global.
- Exam endpoints: one active attempt per exam/user; server-clock deadlines.
- Upload limits: PDF/images only, max size (PDF 25 MB), magic-byte validation,
  randomized storage keys, no user-controlled paths, served via signed URLs.

## 6. Secrets & Configuration

- All secrets via environment variables; validated at boot (fail-fast).
- `.env` files git-ignored; `.env.example` contains placeholders only.
- Separate secrets per environment (dev/staging/prod); JWT secret ≥ 256-bit random.
- Mobile app contains **no** secrets — only public API base URL and FCM sender ID.

## 7. Data Protection & Privacy

- PII minimized to spec §FR-2 fields; email/phone never exposed to other students
  (community shows display name + avatar only).
- Admin dashboard shows aggregates, not raw PII dumps.
- Account deletion request → cooling period → anonymize user PII, retain anonymized
  academic aggregates per retention policy.
- Audit logs store actor IDs and sanitized diffs — never passwords or tokens.

## 8. Audit Logging

- All admin actions, auth events (login success/fail, refresh, revoke), moderation
  actions, GPA profile workflow transitions, and settings changes are audit-logged
  with actor, action, target, timestamp, IP, user agent. Immutable (append-only).

## 9. Dependency & Infrastructure Security

- `npm audit` / lockfile pinning; Dependabot-equivalent checks in CI; build fails on
  high/critical advisories.
- MongoDB: auth enabled, least-privilege user, TLS, network-restricted (no public
  bind), backups encrypted at rest.
- Error monitoring without sensitive payload capture (stack traces server-side only).

## 10. Security Testing Checklist (enforced in CI)

- [ ] Auth: brute-force lockout/rate limit, token expiry, refresh rotation & reuse detection
- [ ] RBAC: student cannot reach any `/admin/*` route; moderator permission boundaries
- [ ] IDOR: cross-user access denied on results, attempts, planner, bookmarks
- [ ] Injection: NoSQL operator payloads rejected on login/search/filters
- [ ] Upload: spoofed extensions, oversized, non-PDF magic bytes rejected
- [ ] Headers/CORS: verified against allowlist
- [ ] Exam integrity: late submissions rejected; keys absent from pre-submission payloads
- [ ] Secrets: no secret values in repo, logs, or client bundles (CI grep + review)
