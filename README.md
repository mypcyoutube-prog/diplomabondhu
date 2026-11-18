# DiplomaBondhu

> **Your Diploma Life, One Platform.**
> A centralized education platform for all diploma students in Bangladesh.

![Status](https://img.shields.io/badge/status-PHASE%203%20IN%20PROGRESS-green)

## Current Status: PHASE 3 — BACKEND FOUNDATION (implemented, 35/35 tests passing)

Planning & Design Blueprint was **approved by the project owner**. Implementation has
started with the backend foundation. Latest test results: [docs/TEST_REPORT.md](docs/TEST_REPORT.md).

### Run the backend

```bash
cd backend
cp .env.example .env      # then fill real values (secrets are never committed)
npm install
npm run dev               # development (tsx watch)
npm test                  # 127 backend tests (in-memory MongoDB)
npm run build && npm start  # production build
npm run seed:admin <email> <password>   # create the one Main Admin
```

### Run the admin panel

```bash
cd admin-panel
npm install
npm run dev               # http://localhost:5173 (set VITE_API_URL to point at the API)
npm test                  # 8 component tests
npm run build             # production build → dist/
```

### Live E2E scripts (backend)

```bash
cd backend
node scripts/mongo-standalone.mjs &        # throws away in-memory MongoDB, prints URI
MONGODB_URI=<uri> JWT_ACCESS_SECRET=… JWT_REFRESH_SECRET=… npm run dev &
node scripts/e2e-admin-smoke.mjs           # 17 checks (admin workflows)
node scripts/e2e-gpa-flow.mjs              # 18 checks (GPA workflow end-to-end)
node scripts/e2e-results-flow.mjs          # 17 checks (result checker; needs result-service running)
```

### Run the result-service (P12, internal Python service)

Parses BTEB result PDFs and imports them into `results_db`. Not
student-facing — the Node API is the only public surface (see
`result-service/README.md`):

```bash
cd result-service
pip install -r requirements.txt
RESULT_SERVICE_TOKEN=<shared-secret> MONGODB_URI=<mongo-uri> \
  uvicorn result_service.app:app --host 127.0.0.1 --port 8300
python3 -m pytest        # 7 tests (pipeline test needs a reachable Mongo)
```

Start the Node API with matching `RESULT_SERVICE_URL=http://127.0.0.1:8300`,
`RESULT_SERVICE_TOKEN=<same secret>` and `RESULTS_DB=results_db`.

Test credentials used by these scripts are created by the scripts themselves and are
for local testing only.

## Run the Flutter student app (P9)

Requires the Flutter SDK (3.50+). Point the app at a running backend:

```bash
cd mobile_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4100/api/v1   # Android emulator → localhost
```

For a physical device use your machine's LAN IP instead of `10.0.2.2`.
The backend must be running (`cd backend && npm run dev`, see above).

> Note (Flutter 3.50): UI imports use `package:material_ui/material_ui.dart`
> (the official replacement for the deprecated `package:flutter/material.dart`).

## What is DiplomaBondhu?

DiplomaBondhu helps diploma students in Bangladesh access study materials, exam
preparation, a regulation-accurate GPA/CGPA calculator, a personal planner, and a
moderated student community — throughout their entire diploma journey.

| Component | Stack | Status |
|---|---|---|
| Student App (Android) | Flutter · Dart · Riverpod · GoRouter | **Built through P11 — 14/14 tests, analyzer clean, launcher icon, forgot-password, share, live external links; not yet device-tested** |
| Backend API | Node.js · Express · TypeScript · REST | **Done through P11 (118/118 tests + 91-check student-flow E2E)** |
| Database | MongoDB · Mongoose | Done through P8 |
| Admin Panel (Web) | React · TypeScript · Vite · Tailwind CSS · TanStack Query | **Built (P8) — 8/8 tests, production build OK** |

Both clients use **only** the centralized Backend API. Neither client accesses MongoDB
directly. All GPA/CGPA calculations, permission checks, and validations run
**server-side**.

## Documentation Index

| Document | Purpose |
|---|---|
| [PROJECT_REQUIREMENTS.md](docs/PROJECT_REQUIREMENTS.md) | Approved requirements, scope, in/out lists |
| [MASTER_BLUEPRINT.md](docs/MASTER_BLUEPRINT.md) | Feature matrix, screens, user journeys, roadmap, risks |
| [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | Architecture of all 3 components + diagrams |
| [DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | MongoDB collections, schemas, indexes |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | REST API v1 specification |
| [GPA_CALCULATION_SPECIFICATION.md](docs/GPA_CALCULATION_SPECIFICATION.md) | Regulation-based calculation engine design |
| [UI_UX_GUIDE.md](docs/UI_UX_GUIDE.md) | Design system + screen-by-screen specs |
| [SECURITY_GUIDE.md](docs/SECURITY_GUIDE.md) | Security architecture and controls |
| [TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) | Test plan for all layers |
| [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Build & deployment strategy |
| [DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md) | Phased delivery plan |
| [research/BTEB_GRADING_RESEARCH.md](docs/research/BTEB_GRADING_RESEARCH.md) | BTEB rule research with sources & verification status |

## Ground Rules (locked with the project owner)

1. No coding before Planning & Design approval.
2. Approved stack may not change without permission.
3. **Excluded features (never build without approval):** Project Hub, Career Zone.
4. **Coming Soon (not in first release):** BTEB Official Result Checker.
5. No invented BTEB rules — every calculation profile must be verified against
   official sources before it can be enabled for students.
6. No client-trusted academic results, no hardcoded secrets, no demo data in production.
