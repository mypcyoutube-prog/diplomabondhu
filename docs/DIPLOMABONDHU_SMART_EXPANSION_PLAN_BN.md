# DIPLOMABONDHU — ADVANCED SMART FEATURES EXPANSION
## Planning & Design Approval Report (বাংলা)

> অবস্থা: **শুধুমাত্র পরিকল্পনা — কোনো কোড লেখা হয়নি।**
> ভিত্তি: `main` @ `0fa3cae` (v0.11.13)। সব শ্রেণীবিন্যাস ও সিদ্ধান্ত বাস্তব ফাইল পরীক্ষা করে নেওয়া।
> Approval পাওয়ার আগে কোনো সোর্স কোড, স্কিমা, কনফিগ বা প্রোডাকশন ডেটা পরিবর্তন করা হবে না।

---

## ডেলিভারেবল ১ — Existing Architecture Audit

### ১.১ বর্তমান স্ট্যাক (অপরিবর্তিত থাকবে)

| উপাদান | প্রযুক্তি | অবস্থান |
|---|---|---|
| Student App | Flutter + Dart + Riverpod + GoRouter | `mobile_app/` |
| Backend | Node.js + Express + TypeScript | `backend/` |
| Database | MongoDB + Mongoose (২৪ model) | `backend/src/models/` |
| Admin Panel | React + TS + Vite + Tailwind + TanStack Query | `admin-panel/` |
| Result Service | Python + FastAPI | `result-service/` |

### ১.২ ব্যাকএন্ড মডিউল (বাস্তব তালিকা — `backend/src/modules/`)

`academic, admin, auth, bteb-subjects, community, exams, gpa, materials, notifications, planner, results, search, settings, users`

### ১.৩ Flutter ফিচার (`mobile_app/lib/features/`)

`auth, community, exams, gpa, home, library, notifications, planner, profile, results, search, settings, subjects`

### ১.৪ Admin পেজ (`admin-panel/src/pages/`)

`Academic, Announcements, AuditLogs, Community, Dashboard, Exams, GpaProfiles, Login, Materials, Results, Settings, Students`

### ১.৫ নিরাপত্তা অবকাঠামো (বিদ্যমান — reuse হবে)

- JWT access + hashed refresh token rotation/reuse-detection — `backend/src/modules/auth/`
- RBAC: `PERMISSIONS` + `requirePermission` — `backend/src/core/permissions.ts`
- Rate limit: global (`app.ts:7`), auth-specific (`auth.routes.ts:11`), results-check (`results.routes.ts:14`)
- Audit log: `audit-log.model.ts` + `writeAudit`
- Response envelope: `ok()`/`fail()`; zod validation via `middlewares/validate.ts`
- Soft delete: `deletedAt`; error 11000 → 409

### ১.৬ প্রাসঙ্গিক বিদ্যমান মডেল (এই এক্সপ্যানশনের ভিত্তি)

| Model | কী আছে | ফাইল |
|---|---|---|
| Bookmark | userId+materialId, unique index — **শুধু materials** | `bookmark.model.ts:15` |
| MaterialView | recently-viewed tracking (userId+materialId unique) | `material-view.model.ts:16` |
| Task | dueAt, reminderAt, status todo/done | `task.model.ts:14-24` |
| Goal | status active/achieved/abandoned | `goal.model.ts:14-19` |
| Routine | per-user unique (একজনের একটাই) | `routine.model.ts:26` |
| Notification + NotificationPreference | ৬ category toggle (material/exam/academic/community/announcement/system) — **quiet hours/scheduling নেই** | `notification-preference.model.ts:14-23` |
| AppSettings | `homepageSections` (key/visible/order), `featureFlags`, `maintenanceMode` — **admin-সাইড, per-student নয়** | `app-settings.model.ts:5-8` |
| User | `fcmTokens: string[]` — **ডিভাইস রেকর্ড নয়, মাত্র token array** | `user.model.ts:57` |
| CalculationHistory | GPA/CGPA history | `calculation-history.model.ts` |

### ১.৭ গুরুত্বপূর্ণ শূন্যতা (audit-প্রমাণিত)

- **কোনো AI integration নেই** — পুরো রিপোতে `openai/gemini/anthropic/LLM` কোথাও নেই (grep-যাচাইকৃত)।
- **কোনো sync/device model নেই** — কোনো মডিউলে device/sync metadata নেই।
- **কোনো Personal Notes / Collections model নেই।**
- **কোনো export job model নেই।**
- Search মাত্র ৩ টাইপ (material/exam/post), regex-ভিত্তিক, typo-tolerance/semantic/synonym/history নেই — `backend/src/modules/search/`।
- Notification preference-এ শুধু on/off — quiet hours, scheduling, dedup, deep-link নেই।

---

## ডেলিভারেবল ২ ও ৩ — Compatibility Report + Duplicate Feature Analysis

### ২.১ ১০টি ফিচারের শ্রেণীবিন্যাস (প্রমাণসহ)

| # | ফিচার | শ্রেণী | প্রমাণ / ব্যাখ্যা |
|---|---|---|---|
| 01 | AI Smart Search | **Partially Exists → Requires Enhancement** | `backend/src/modules/search/` + `mobile_app/lib/features/search/` সবেমাত্র v0.11.13-এ তৈরি (regex, material/exam/post)। Typo-tolerance, Bangla/English suggestion, synonym, search history, admin analytics, subjects/chapters/formulas/dictionary/practicals স্কোপ — নতুন যোগ হবে। |
| 02 | AI Document Reader | **Completely New** | কোনো AI provider, upload pipeline (student-সাইড), document Q&A — কিছুই নেই। |
| 03 | Personalized Dashboard | **Partially Exists → Requires Enhancement** | Admin-নিয়ন্ত্রিত `homepageSections` + featureFlags আছে (`app-settings.model.ts:5`), Flutter home এটা consume করে। কিন্তু **per-student** কাস্টমাইজেশন, Continue Learning, syllabus progress card, recommendations — নেই। |
| 04 | Cross-Device Sync | **Partially Exists** | মূল পার্সোনাল ডেটা (bookmark, task, goal, routine, calculation history) **ইতিমধ্যেই server-authoritative** — যেকোনো লগইন ডিভাইসে কাজ করে। মার্জিত sync মানে বাকি: per-device registry, sync metadata, conflict resolution, offline queue, download metadata sync। |
| 05 | Personal Workspace | **Partially Exists → Requires Enhancement** | Bookmark + MaterialView (recent) আছে; My Notes, My Files, Collections, Pin, Archive, workspace search/export — সব নতুন। |
| 06 | Global Command Center | **Partially Exists → Requires Enhancement** | Global search screen + GoRouter deep links আছে (v0.11.13)। Command/action discovery, keyboard nav, বাংলা কমান্ড — নতুন স্তর, নতুন navigation বানাতে হবে না। |
| 07 | AI Study Plan Generator | **Partially Exists → Requires Enhancement** | Planner (task/goal/routine/calendar) + bteb-subjects syllabus আছে; AI-generated schedule, plan editing/regeneration — নতুন। |
| 08 | Smart Notification Engine | **Partially Exists → Requires Enhancement** | Notification + preference + fcmTokens আছে; quiet hours, scheduled sends, dedup, delivery status, context-aware triggers, deep linking — নতুন। |
| 09 | Smart Home Screen Customization | **Partially Exists → Requires Enhancement** | Admin-সাইড homepageSections আছে; per-student show/hide/reorder/layout/reset — নতুন (উপরে admin সীমা রক্ষা করে)। |
| 10 | Student Data Export | **Completely New** | কোনো export job, file generation, download expiry — কিছুই নেই। |

### ২.২ Duplicate-নিয়ন্ত্রণ সিদ্ধান্ত (কী reuse হবে)

1. **নতুন আলাদা search বানানো হবে না** — Feature 01 বিদ্যমান `search` মডিউলকেই enhance করবে।
2. **নতুন notification system বানানো হবে না** — Feature 08 বিদ্যমান notification/preference/fcmToken চেইন extend করবে।
3. **নতুন planner বানানো হবে না** — Feature 07 বিদ্যমান Task/Goal/Routine-এ plan রাউট করবে।
4. **নতুন home config বানানো হবে না** — Feature 03/09 একই `homepageSections` schema-কে per-student লেয়ার দিয়ে extend করবে (admin-এর key/visible/order ফরম্যাট অপরিবর্তিত)।
5. **Bookmark মডেল duplicate করা হবে না** — Workspace/Collections bookmark-কে reference করবে; MaterialView "Recent Items"-এর ভিত্তি হবে।
6. **GoRouter navigation duplicate হবে না** — Command Center বিদ্যমান route-গুলোতেই push করবে।

---

## ডেলিভারেবল ৪ — Advanced Feature Expansion Architecture

সব নতুন কোড বিদ্যমান প্যাটার্নে: backend-এ `modules/<name>/{routes,schemas,service}`, Flutter-এ `features/<name>/{data,providers,screens}`, admin-এ নতুন permission-gated page।

### নতুন backend মডিউল (প্রস্তাবিত)

| মডিউল | সেবা দেবে | নতুন কী |
|---|---|---|
| `ai` | 02, 07 | AI provider abstraction (configurable), usage tracking, cost guard |
| `sync` | 04 | device registry, sync metadata, conflict resolution |
| `workspace` | 05 | notes, collections, pin/archive |
| `export` | 10 | export jobs, file generation, download link |
| `dashboard-prefs` | 03, 09 | per-student home preferences |
| `search` (enhance) | 01, 06 | typo-tolerance, synonyms, history, suggestions, নতুন স্কোপ |
| `notifications` (enhance) | 08 | quiet hours, scheduling, dedup, delivery log |

### AI provider কৌশল (Feature 02, 07)

- Backend-only abstraction interface: `generate(prompt, context) → {text, tokensUsed}`; provider (যেমন Gemini/OpenAI) `.env` দিয়ে configurable — **কোনো key Flutter/React-এ যাবে না**।
- Grounded Q&A: ডকুমেন্ট text chunks + page numbers prompt-context হিসেবে যাবে; answer-এ source উল্লেখ; "নথিতে তথ্য নেই" state বাধ্যতামূলক।
- Cost guard: per-user daily request quota, token cap, response cache (একই doc+question hash), background processing বড় ফাইলের জন্য।
- **Privacy**: ডকুমেন্ট টেক্সট থার্ড-পার্টি AI-তে যাওয়া student-এর স্পষ্ট opt-in ছাড়া হবে না; settings-এ disclosure।

### Cross-Device Sync কৌশল (Feature 04)

- Server-authoritative বর্তমান অবস্থা রক্ষা; নতুন শুধু **sync স্তর**: `deviceId`, per-collection `updatedAt` watermark, `GET /sync/changes?since=` delta pull, `POST /sync/push` offline changes-এর জন্য।
- Conflict rule: server `updatedAt` নতুন হলে server জেতে; একই field দুই ডিভাইসে পরিবর্তন হলে ডিফল্ট last-write-wins + user-কে sync status-এ জানানো। সব অপারেশনে ownership validation।
- Logout/device-removal: device registry থেকে remove; sync token revoke। Auth secrets কখনো sync হবে না।

---

## ডেলিভারেবল ৫ — Student App Page-by-Page Blueprint (সারসংক্ষেপ)

| পেজ | উদ্দেশ্য | নেভিগেশন | মূল উপাদান | State |
|---|---|---|---|---|
| Enhanced Search | সবকিছু খোঁজা | Home search field → `/search` (বিদ্যমান) | বিদ্যমান screen + recent searches, suggestion, typo-correction banner, নতুন type chip (subject/formula/dictionary/practical) | Loading/Empty/Error বিদ্যমান `Db*View` |
| Document Reader | ডকুমেন্ট থেকে প্রশ্নোত্তর | Material detail → "AI-কে জিজ্ঞাসা করুন" (opt-in) | upload/pick PDF, size/type limit notice, chat-style Q&A, page-number source chips, summary/terম explain buttons | uploading/processing/limit-reached/opt-in gate |
| Dashboard Customize | হোম ব্যক্তিগতকরণ | Home header ⚙️ → "Dashboard সাজান" | section toggle, drag-reorder (supported section), reset default, Estimated badge রক্ষা | saving/conflict |
| Workspace | ব্যক্তিগত সম্পদ কেন্দ্র | Bottom nav Profile → Workspace tab বা Home quick action | tabs: Notes/Bookmarks/Collections/Recent; pin, archive, collection create, personal search | empty/loading/error |
| Command Center | দ্রুত নেভিগেশন | Home FAB / long-press search | overlay sheet: অ্যাপ-অ্যাকশন search, recent, keyboard nav (web/tablet), বাংলা কমান্ড | authorization-filtered |
| Study Plan | AI-সাহায্যকৃত রুটিন | Planner → "AI Study Plan" | subject multi-select, available time, goal input; generated plan editable; regenerate; **"পরামর্শমূলক — Estimated"** badge; বিদ্যমান routine-এ সেভ করার আগে confirmation | generating/editing/saved |
| Export | নিজের ডেটা ডাউনলোড | Settings → "আমার ডেটা এক্সপোর্ট" | dataset checkbox (Notes/Bookmarks/Progress/Collections/Tasks), format (JSON/CSV/PDF), history list with expiry countdown | queued/ready/expired |

প্রতিটি পেজে বিদ্যমান Design System (`DbColors/DbSpacing/DbRadius`, `lib/app/theme/theme.dart`), shared states (`lib/shared/widgets/states.dart`), l10n (en+bn ARB) ব্যবহৃত হবে। Dark theme ও ছোট Android screen সব নতুন স্ক্রিনে যাচাইযোগ্য হবে।

---

## ডেলিভারেবল ৬ — Admin Panel Page-by-Page Blueprint (সারসংক্ষেপ)

নতুন Sidebar items (permission-gated, `App.tsx` pattern):

1. **AI Configuration** — provider select, model, daily token/quota cap, per-feature on/off (02, 07)। Document AI opt-in policy toggle।
2. **Search Settings** — synonym table, searchable-type toggles, search analytics (top queries, zero-result queries), suggestion source।
3. **Dashboard Layout** — বিদ্যমান `Settings.tsx` homepageSections editor extend: per-section "student-customizable?" flag, default order, announcements।
4. **Devices & Sync Monitor** — per-student device list, last-sync, forced device revoke (audit-logged)।
5. **Workspace Policy** — note length cap, file cap, collection limit, sharing on/off।
6. **Notification Rules** — scheduled announcement create/cancel, targeting (program/dept/semester), delivery status, dedup window, quiet-hours default।
7. **Export Policy & Monitor** — allowed datasets/formats, size cap, job history, failed jobs retry।

সব sensitive পরিবর্তন `writeAudit` দিয়ে audit log-এ যাবে। **Admin-এর student-এর private note/document-এ সরাসরি প্রবেশাধিকার হবে না** — শুধু নীতি (policy) ও মেটাডেটা দেখা যাবে।

---

## ডেলিভারেবল ৭ — UI/UX Design Specification (মূলনীতি)

- Android-first, Material 3, বিদ্যমান design token-ই একমাত্র উৎস; নতুন রঙ/spacing যোগ নিষিদ্ধ।
- প্রতিটি নতুন স্ক্রিনে: purpose, layout, buttons (প্রতিটি functional), input validation, loading/empty/error/success, confirmation dialog (destructive আগে), responsive, dark theme, accessibility।
- AI আউটপুট সবসময় স্পষ্টভাবে "AI-generated / Estimated" লেবেলযুক্ত — কখনো official/verified মনে হবে না (GPA নীতির মতোই)।
- অতিরিক্ত animation/gradient নিষিদ্ধ; এক স্ক্রিন এক উদ্দেশ্য।

---

## ডেলিভারেবল ৮ — API Expansion Specification (প্রস্তাবিত)

সবই `/api/v1` এর অধীনে, `requireAuth` + ownership যাচাই + zod validation + `ok/fail` envelope। **এটি প্রস্তাব মাত্র — approval ছাড়া কোনো endpoint লেখা হবে না।**

| এরিয়া | Endpoints (প্রস্তাবিত) |
|---|---|
| Search+ | `GET /search` (extend: `scopes=subject,formula,dict,practical`), `GET /search/suggest?q=`, `GET/DELETE /search/history`, `GET /search/analytics` (admin) |
| AI Doc | `POST /ai/documents` (upload job), `GET /ai/documents/:id/status`, `POST /ai/documents/:id/ask`, quota headers; admin: `GET/PUT /ai/config` |
| Sync | `POST /sync/devices` (register), `GET /sync/devices`, `DELETE /sync/devices/:id`, `GET /sync/changes?since=`, `POST /sync/push` |
| Workspace | `GET/POST/PUT/DELETE /workspace/notes`, `/workspace/collections(+/items)`, `POST /workspace/:type/:id/pin`, `/archive`, `GET /workspace/search` |
| Study Plan | `POST /ai/study-plan/generate`, `PUT /ai/study-plan/:id`, `POST /ai/study-plan/:id/regenerate`, `POST /ai/study-plan/:id/apply-to-planner` (explicit confirm) |
| Notifications+ | `PUT /notifications/preferences` (extend: quietHours, per-category scheduling), admin: `POST /notifications/scheduled`, `DELETE /notifications/scheduled/:id`, `GET /notifications/delivery-stats` |
| Home prefs | `GET/PUT /me/dashboard-preferences`, `POST /me/dashboard-preferences/reset` |
| Export | `POST /export/jobs`, `GET /export/jobs`, `GET /export/jobs/:id/download` (signed, expiring), admin: `GET/PUT /export/policy` |

Rate limit: AI endpoints আলাদা stricter limiter (`express-rate-limit`, বিদ্যমান pattern)।

---

## ডেলিভারেবল ৯ — Database Change Proposal (শুধু প্রস্তাব)

**নতুন collection (মাত্র প্রয়োজনীয়, কোনো duplicate নয়):**

| Collection | উদ্দেশ্য | Key fields / Index |
|---|---|---|
| `aidecuments` | আপলোড করা ডকুমেন্ট + প্রসেসিং স্টেটাস | userId, materialId?, status, pages, storageRef, expiresAt; `{userId:1, createdAt:-1}` |
| `aiusagelogs` | AI usage/cost tracking | userId, feature, tokens, cost, createdAt; `{userId:1, createdAt:-1}` |
| `workspacenotes` | ব্যক্তিগত নোট | userId, title, body, pinned, archived, collectionId?; `{userId:1, updatedAt:-1}` |
| `workspacecollections` + items | সংগ্রহ | userId, name, items[]; unique `{userId:1, name:1}` |
| `syncdevices` | ডিভাইস রেজিস্ট্রি | userId, deviceId, platform, lastSyncAt, revoked; unique `{userId:1, deviceId:1}` |
| `syncstates` | per-device watermark | deviceId, collection, lastPulledAt; unique compound |
| `exportjobs` | এক্সপোর্ট | userId, datasets, format, status, fileRef, expiresAt; `{userId:1, createdAt:-1}` |
| `searchhistory` | ব্যক্তিগত সার্চ হিস্ট্রি | userId, q, searchedAt; capped/pruned |
| `dashboardprefs` | per-student home layout | userId unique, sections[], updatedAt |
| `schedulednotifications` | নির্ধারিত পাঠানো | audience, payload, sendAt, status, sentAt |

**পরিবর্তন (in-place, migration ছাড়াই সম্ভব):** `notification-preference.model.ts`-এ quietHours/schedule fields add; `user.model.ts`-এ fcmTokens → ধরে রাখা (syncdevices পাশে থাকবে, breaking নয়)।

**মূল ডেটা (bookmark, task, goal, routine, materials) — কোনো schema breaking change নেই।** কোনো migration চালানো হবে না অনুমোদন ছাড়া।

---

## ডেলিভারেবল ১০ — Cross-Device Sync Architecture

```
Flutter (device A/B) ⇄ /sync (JWT + deviceId header)
   GET /sync/changes?since=watermark → delta (bookmarks, notes, tasks, prefs, downloads-meta, recents)
   POST /sync/push {ops[]} → server validate ownership + updatedAt conflict check
```
- Offline: Flutter লোকাল কিউ; অনলাইনে push; fail হলে retry with backoff (বিদ্যমান dio retry interceptor pattern)।
- Duplicate প্রতিরোধ: বিদ্যমান unique index (যেমন bookmark userId+materialId) রক্ষা; upsert-by-natural-key।
- Sync status UI: last-sync time, failed count, manual retry।

---

## ডেলিভারেবল ১১ — AI Integration Architecture

- একক `aiService` ব্যহতারা: provider adapter + retry + token accounting; `env.AI_PROVIDER/AI_API_KEY/AI_MODEL`।
- ৩টি ব্যবহার: Document Q&A (02), Study Plan (07), (ঐচ্ছিক ভবিষ্যৎ) search semantic boost (01) — semantic index প্রথম ধাপে **নয়**; regex/typo-fuzzy দিয়ে শুরু, খরচ কম।
- Grounding: document chunks (page refs) prompt-এ; answer template-এ "source: page N" বাধ্যতামূলক; তথ্য না পেলে স্পষ্ট অস্বীকার।
- Study plan: শুধু user-supplied subjects/time/goal + verified syllabus (bteb-subjects); AI কখনো official date/deadline বানাবে না।

---

## ডেলিভারেবল ১২ — Security & Privacy Plan

- সব নতুন route: `requireAuth`; ownership filter (`userId === req.user.id`) প্রতিটি read/write-এ।
- AI key শুধু backend env; client-এ কখনো নয়।
- Upload validation: MIME/extension whitelist (pdf), size cap (configurable, default ১০MB), page cap, malware-safe parsing (text extraction only), storage KI-7 সিদ্ধান্ত অনুযায়ী।
- Export download: signed expiring URL, owner-only, audit-logged।
- Third-party AI-তে student data পাঠানোর আগে in-app disclosure + opt-in; opt-out হলে feature disabled।
- Global search-এ কোনো private student data সূচিত হবে না (শুধু published/visible content)।
- Admin private-কনটেন্ট অ্যাক্সেস নীতিমালা: শুধু policy + metadata; ব্যতিক্রমে explicit authorized reason + audit।
- Rate limit: AI (per-user daily), upload, export job queue।
- Sensitive সব admin কাজ audit-logged।

---

## ডেলিভারেবল ১৩ — Performance & Cost Analysis

| খরচ-সৃষ্টি | নিয়ন্ত্রণ |
|---|---|
| AI Document Q&A | per-user daily quota (প্রস্তাব: ২০ প্রশ্ন/দিন), token cap, একই doc+question response cache, বড় doc background job |
| AI Study Plan | regeneration limit (দিনে ৫), plan cache |
| Semantic search | প্রথম ধাপে বাদ (regex+fuzzy ফ্রি); ভবিষ্যতে embedding হলে আলাদা approval |
| Export | background job, size cap, file expiry (৭ দিন), দিনে সীমিত job |
| Search | বিদ্যমান text index reuse; pagination বিদ্যমান meta pattern |
| নতুন infra | **কোনো নতুন paid service বাধ্যতামূলক নয়**; storage KI-7 সিদ্ধান্ত প্রয়োজন |

Usage monitoring: admin AI Configuration পাতায় দৈনিক token/request গ্রাফ (`aiusagelogs` থেকে)।

---

## ডেলিভারেবল ১৪ — Testing Strategy

| স্তর | কী |
|---|---|
| Backend unit/integration | প্রতিটি নতুন মডিউলে ownership 403, validation 400, quota 429, empty/error state; sync conflict tests; export job lifecycle; notification scheduling/dedup/quiet-hours; AI service mocked provider |
| Flutter widget/unit | নতুন স্ক্রিন প্রতিটির loading/empty/error; dashboard prefs round-trip; workspace CRUD; command center nav (fake repo pattern — `test/search_screen_test.dart` স্টাইলে) |
| Admin tests | নতুন পাতার render + permission gate + form validation (বিদ্যমান vitest 8/8 ধরা রেখে) |
| Offline/online | sync queue → push retry, conflict resolution assertions |
| File security | ভুল MIME, অতিরাক্তি বড় ফাইল, malicious PDF প্রত্যাখ্যান |
| Regression | বিদ্যমান 156 backend + admin 8 + result-service 48 টেস্ট সব রানে পাস হতে হবে |
| Android device | owner দ্বারা manual smoke (sandbox-এ Flutter SDK নেই — KI-10) |

**কোনো ফিচার শুধু UI দেখলে complete ঘোষণা হবে না; প্রতিটিতে বাস্তব API + DB + টেস্ট থাকবে।**

---

## ডেলিভারেবল ১৫ — Development Roadmap (প্রস্তাবিত ধাপ)

| Phase | কাজ | নির্ভরতা |
|---|---|---|
| S1 | Search Enhancement (01+06 core: scopes, history, suggest, admin settings) | নেই |
| S2 | Dashboard/Home personalization (03+09: per-student prefs + admin flags) | নেই |
| S3 | Workspace (05: notes/collections/pin/archive/search) | নেই |
| S4 | Smart Notification (08: quiet hours, scheduling, dedup, deep link, admin rules) | নেই |
| S5 | Sync layer (04: device registry, delta, conflict) | S3 |
| S6 | AI foundation + Study Plan (07) | AI key + approval |
| S7 | AI Document Reader (02) | KI-7 storage সিদ্ধান্ত + AI key + opt-in UI |
| S8 | Data Export (10) | S3 |
| S9 | Command Center polish (06) | S1 |

প্রতিটি phase ছোট, আলাদা commit, প্রতিটির পরে পূর্ণ regression টেস্ট। Owner-এর সিদ্ধান্ত প্রয়োজন: AI provider/key (KI নতুন), file storage (KI-7), কোন phases আগে।

---

## ডেলিভারেবল ১৬ — Risk Assessment

| ঝুঁকি | স্তর | প্রশমন |
|---|---|---|
| AI API খরচ অনিয়ন্ত্রিত | উচ্চ | quota + cap + cache + usage monitoring; ছাড়া কোনো AI ফিচার চালু হবে না |
| Student প্রাইভেসি (ডকুমেন্ট থার্ড-পার্টিতে) | উচ্চ | explicit opt-in + disclosure + opt-out |
| Sync conflict-এ ডেটা ক্ষতি | মাঝারি | server-authoritative + last-write-wins + status visibility + ownership validation |
| Upload malware/abuse | মাঝারি | whitelist + caps + text-only extraction + rate limit |
| বিদ্যমান ফিচার ভাঙা | মাঝারি | প্রতি phase-এ full regression; কোনো breaking schema change নেই |
| Flutter verify করা যাচ্ছে না (KI-10) | মাঝারি | সব Dart-এ টেস্ট কমিট হবে; owner-কে `flutter test` চালাতে হবে |
| Gemini/AI hallucination (ভুল academic তথ্য) | উচ্চ | grounding + source refs + "Estimated/AI-generated" লেবেল + official দাবি নিষিদ্ধ |
| Export-এ অন্যের ডেটা লিক | উচ্চ | শুধু নিজের userId স্কোপ, signed expiring URL |
| Notification spam | কম | dedup window + quiet hours + preference respect |
| Scope creep (Project Hub/Career Zone/Result Checker) | — | অপরিবর্তিত বহিষ্কৃত থাকবে |

---

## Approval-এর জন্য সিদ্ধান্ত তালিকা (Owner)

| # | সিদ্ধান্ত | ডিফল্ট প্রস্তাব |
|---|---|---|
| A-1 | কোন phases অনুমোদিত? | সব S1–S9, ক্রমানুসারে |
| A-2 | AI provider + API key | owner দিলে তবেই S6/S7 শুরু |
| A-3 | File storage (KI-7) | Cloudflare R2 / local disk — owner সিদ্ধান্ত |
| A-4 | AI quota সীমা | doc ২০ প্রশ্ন/দিন, plan ৫ বার/দিন |
| A-5 | Export formats | JSON+CSV প্রথমে, PDF পরে |
| A-6 | per-student dashboard reorder scope | শুধু admin-enabled sections |

**এই রিপোর্ট অনুমোদন না করা পর্যন্ত কোনো কোড, স্কিমা বা কনফিগ পরিবর্তন হবে না।**
