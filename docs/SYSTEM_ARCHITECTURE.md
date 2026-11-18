# SYSTEM_ARCHITECTURE.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

---

## 1. High-Level Architecture

```
                        ┌──────────────────────────────────────────────┐
                        │                INTERNET                      │
                        └──────┬───────────────────────────┬───────────┘
                               │ HTTPS (TLS)               │ HTTPS (TLS)
                  ┌────────────▼───────────┐   ┌───────────▼────────────┐
                  │  Student App (Android) │   │  Admin Panel (Web)     │
                  │  Flutter + Riverpod    │   │  React + Vite + TS     │
                  │  GoRouter, features/   │   │  Tailwind + TanStack Q │
                  └────────────┬───────────┘   └───────────┬────────────┘
                               │  REST /api/v1 (JWT)       │  REST /api/v1 (JWT)
                  ┌────────────▼───────────────────────────▼────────────┐
                  │              Backend API — Modular Monolith          │
                  │  Node.js + Express + TypeScript                      │
                  │                                                      │
                  │  Layers (per module):                                │
                  │   routes → middlewares(auth, rbac, validate, limit)  │
                  │           → controllers → services → repositories    │
                  │                                                      │
                  │  Modules: auth · users · academic · institutes ·     │
                  │  materials · exams · gpa · results · planner ·       │
                  │  community · notifications · settings · admin ·      │
                  │  media · audit                                       │
                  │                                                      │
                  │  Cross-cutting: error handler · logger · config ·    │
                  │  rate limiter · validators (Zod) · audit logger      │
                  └───────┬───────────────┬───────────────┬──────────────┘
                          │               │               │
                   ┌──────▼─────┐  ┌──────▼──────┐  ┌─────▼────────────┐
                   │  MongoDB   │  │ File storage│  │ FCM (push)       │
                   │ (Mongoose) │  │ (PDFs)      │  │ (owner's acct)   │
                   └────────────┘  └─────────────┘  └──────────────────┘
```

## 2. Backend Architecture (Modular Monolith, Layered)

```
backend/
├── src/
│   ├── config/            # env-driven config (validated at boot)
│   ├── core/              # shared kernel: errors, logger, response, constants
│   ├── middlewares/       # auth, rbac, validate(zod), rateLimit, upload, audit
│   ├── modules/
│   │   ├── auth/          # register, login, refresh, logout, sessions
│   │   ├── users/         # profiles, preferences, account deletion
│   │   ├── academic/      # programs, regulations, sessions, institutes,
│   │   │                  # technologies, semesters, subjects, chapters
│   │   ├── materials/     # books, notes, videos, past questions, bookmarks, reports
│   │   ├── exams/         # exams, questions, attempts, scoring, statistics
│   │   ├── gpa/           # schemes, calculation profiles, ENGINE (pure functions)
│   │   ├── results/       # saved student results, history
│   │   ├── planner/       # routines, tasks, goals
│   │   ├── community/     # posts, comments, likes, reports, moderation
│   │   ├── notifications/ # templates, targeting, FCM dispatch, preferences
│   │   ├── settings/      # app settings, feature flags, legal content
│   │   ├── admin/         # dashboard aggregations, admin users, audit viewer
│   │   └── media/         # upload validation, signed URLs
│   ├── jobs/              # scheduled: notification dispatch, cleanup
│   └── app.ts / server.ts
├── tests/                 # unit + integration (per module)
└── package.json
```

**Layer rules**
- `routes`: HTTP shape only. `controllers`: request/response mapping only.
- `services`: business logic + authorization checks. `repositories`: Mongoose queries.
- **GPA engine is pure**: `profile + inputs → result + breakdown`; no DB access inside
  the engine. Services fetch profiles, engine computes, results persist with version ref.
- Every module registers its routes under `/api/v1/<module>`.

## 3. Flutter App Architecture

```
mobile_app/lib/
├── main.dart
├── app/
│   ├── router/            # GoRouter config, guards (auth, onboarding)
│   ├── theme/             # design tokens, light/dark ThemeData
│   └── l10n/              # .arb files (bn, en)
├── core/                  # network client (dio), token storage, errors, utils
├── shared/                # reusable widgets (cards, buttons, states, inputs)
└── features/
    ├── auth/              # controllers(Riverpod), screens, repo
    ├── home/
    ├── library/
    ├── exams/
    ├── gpa/
    ├── planner/
    ├── community/
    ├── notifications/
    ├── profile/
    └── settings/
    # each: data/ (models, api), providers/ (Riverpod), screens/, widgets/
```

- **State:** Riverpod (`AsyncNotifier` for server data; local persistence via
  shared_preferences for onboarding flag, theme, language).
- **Navigation:** GoRouter with redirect guards: splash→onboarding→login→home.
- **Network:** single dio client; access-token interceptor with silent refresh on 401;
  retry with backoff for idempotent GETs; offline detection → offline state widgets.
- The app **never** computes final GPA/exam results locally for persistence — server is
  the source of truth. (A local preview may exist in UI but must be confirmed by API.)

## 4. Admin Panel Architecture

```
admin_panel/src/
├── main.tsx, App.tsx
├── api/               # axios/fetch client, TanStack Query hooks per resource
├── components/        # ui primitives (Tailwind): Table, Modal, Form, StatCard...
├── features/          # dashboard, students, academic, content, exams, gpa,
│                      # moderation, notifications, settings, audit
├── routes/            # route guards by role/permission
└── lib/               # auth context, formatters (bn/en)
```

- TanStack Query for all server state (caching, invalidation on mutations).
- Role/permission-aware rendering; every sensitive action re-authorized server-side.
- Responsive: desktop-first grid, tablet/mobile fallback.

## 5. Key Architectural Decisions (ADR summary)

| # | Decision | Rationale |
|---|---|---|
| ADR-1 | Modular monolith, not microservices | Spec §13; lowest cost/ops; module boundaries allow later extraction |
| ADR-2 | GPA engine as pure, versioned functions | Testability, explainability, auditability, regression safety |
| ADR-3 | Calculation profiles stored as data (JSON-like documents), interpreted by engine | New regulations/programs need no code change; publishing workflow possible |
| ADR-4 | Exam scoring server-side only; keys withheld until submission | Anti-cheating requirement |
| ADR-5 | JWT access (short) + refresh (rotating, revocable) | Stateless scale + session control |
| ADR-6 | Zod schemas shared between validation layers (backend) | Single source of truth for request validation |
| ADR-7 | Soft delete + audit log for academic/content data | Retention policy requirement |
| ADR-8 | FCM via owner's Firebase project | D2 decision; free tier sufficient |

## 6. Versioning & Compatibility

- API: URI versioning `/api/v1`. Breaking changes → `/api/v2`, v1 supported during
  migration window.
- Calculation profiles carry `version`; saved results reference the exact version used
  so historical results remain explainable even after rule updates.
- Mobile app: semantic versioning; admin panel: semantic versioning; API changelog in
  API_DOCUMENTATION.md.
