# DiplomaBondhu — Advanced Study Tab: Planning & Design Approval Document

Status: ⏸️ **APPROVAL PENDING** — এই ডকুমেন্টে অনুমোদন না পাওয়া পর্যন্ত কোনো কোড লেখা হবে না।

---

## 1. Existing Study Module Audit (Evidence-Based)

### Backend — ইতিমধ্যে শক্তিশালী
- **Model** `study-material.model.ts`: ৫টি type (`book`, `note`, `video`, `past_question`, `subject_material`) — মাস্টার প্রম্পটের ৫টি ক্যাটাগরির সাথে হুবহু মেলে। `status` (draft/published/unpublished), `downloadAllowed`, `viewCount`, `hierarchyRefs` (program/regulation/technology/semester/subject/chapter), `payload` (fileUrl/externalUrl/examYear/sizeBytes/pageCount), text-search index সহ।
- **Student API**: list (filter + `q` search + sort `recent|popular|title` + pagination), `/recent` (recently viewed), `/bookmarks`, `/download/:id` (backend-enforced permission), `/:id`, bookmark add/remove, report submit।
- **Admin API**: full CRUD + publish/unpublish + soft delete + reports list/resolve/dismiss — `CONTENT_MANAGE` permission-guarded।
- **Models আছে**: `Bookmark` (unique user+material), `MaterialView` (unique user+material — recently viewed সমর্থিত), `ContentReport` (open/resolved/dismissed workflow)।
- **Academic models**: Technology, Semester, Subject (admin-managed) — ফিল্টার hardcoded হবে না।

### Admin Panel
- `Materials.tsx`: create/edit/publish/unpublish/delete, report resolve/dismiss, RefSelect দিয়ে hierarchy নেওয়া, downloadAllowed checkbox — কাজ করছে।

### Student App
- `library_screen.dart`: ৫ tab + debounced search + Load More pagination — কাজ করছে।
- `material_detail_screen.dart`: bookmark, report (৪টি reason), open/download, metadata দেখানো — কাজ করছে।
- Home-এ Recently Viewed (`recentMaterialsProvider`) আছে।

---

## 2. Feature Classification

| Master Prompt Requirement | Classification | পরিকল্পনা |
|---|---|---|
| ৫টি ক্যাটাগরি, CRUD, publish workflow, pagination | ✅ Already Exists | পুনর্ব্যবহার |
| Backend search + filters + sort | ⚙️ Requires Enhancement | `oldest` sort যোগ; ফিল্টার UI mobile-এ |
| Bookmark system + My Bookmarks page | ⚙️ Requires Enhancement | API আছে; mobile-এ dedicated `/bookmarks` page নতুন |
| Report system (কারণ list + description) | ⚙️ Requires Enhancement | reason enum + `details` field যোগ |
| Recently Viewed | ✅ Already Exists | পুনর্ব্যবহার |
| Continue Learning (video progress) | ⚙️ Requires Enhancement (Phase 2) | `MaterialView`-এ `progressSec` field |
| Metadata: thumbnail, author, edition, duration, fileFormat | ⚙️ Requires Enhancement | `payload` extend — নতুন collection নয় |
| Preview permission (আলাদা download থেকে) | ⚙️ Requires Enhancement | `previewAllowed` boolean |
| Category visibility admin control | ⚙️ Requires Enhancement | AppSettings-এ `library.categories` |
| ক্যাটাগরি content count | ⚙️ Requires Enhancement | count দেখানো শুধু বাস্তব ডেটা থাকলে |
| PDF Viewer (in-app) | ⚠️ Approval দরকার | নতুন package লাগবে — নিচে ব্যাখ্যা |
| Video Player (in-app) | ❌ New — বাদ | External link (YouTube) খোলা থাকবে; নতুন player dependency অপ্রয়োজনীয় |
| Admin thumbnail upload | ⚙️ Requires Enhancement | URL field আগে; file upload Phase 2 |

---

## 3. UI/UX Design — Student App

### 3.1 Study Tab (Main) — বর্তমান ৫-tab কাঠামো রেখে upgrade
```
┌─────────────────────────────────────┐
│ Study                    🔖  ⌕      │  ← Bookmark shortcut + search
├─────────────────────────────────────┤
│ [ 🔍 Search materials...        ✕ ] │  ← debounced, clear button
├─────────────────────────────────────┤
│ Books | Notes | Subject Mat. | ...  │  ← ৫টি tab (আগের মতো)
├─────────────────────────────────────┤
│ Filter chips row (horizontal):      │
│ [Tech ▾][Semester ▾][Subject ▾]    │  ← বাস্তব admin ডেটা থেকে
│ [Year ▾][Sort: Latest ▾]           │
├─────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐            │
│ │ 📄 Card │ │ 📄 Card │            │  ← material cards
│ └─────────┘ └─────────┘            │
│         [ Load More ]               │
│   "সব material দেখানো হয়েছে"       │  ← end-of-list message
└─────────────────────────────────────┘
```
- **Card layout**: type অনুযায়ী — book: thumbnail থাকলে cover; video: thumbnail + duration badge; past_question: বড় year badge; PDF: document icon card।
- **Missing metadata কখনো দেখাবে না** — field শুধু ডেটা থাকলে render হবে।
- Press-scale animation, gradient icon (Home-এর সাথে consistent), DbShadows.card।

### 3.2 Material Detail — বর্তমান পেজ upgrade
- Bookmark + Share (share_plus আগে থেকেই আছে)।
- সব available metadata: title, description, category, tech, semester, subject + code, exam year, pages, size, format, views।
- **PDF**: `previewAllowed` হলে in-app preview (package approval সাপেক্ষে), নইলে Open Original Link; `downloadAllowed` হলে Download — দুটোই backend-enforced।
- **Video**: duration badge + Open Video (external)।

### 3.3 My Bookmarks — নতুন পেজ (`/bookmarks`)
- আমার সব saved materials, search, remove, tap → detail।
- শুধু নিজের bookmark (backend `userId`-enforced)।
- Study tab header-এর 🔖 icon থেকে যাওয়া যাবে।

### 3.4 নতুন রাউট
| Route | Page |
|---|---|
| `/bookmarks` | My Bookmarks |

বাকি সব existing route-এই থাকবে।

---

## 4. Admin Panel Design (Materials.tsx সম্প্রসারণ)

নতুন form fields (মৌজুদা form-এ যোগ হবে, নতুন পেজ নয়):
- **Thumbnail URL**, **Author**, **Edition**, **Duration (মিনিট, video)** — সব optional।
- **Preview allowed** checkbox (default ON)।
- Report reason এখন structured — admin table-এ reason badge।
- Category visibility: Settings-এ ৫টি checkbox (Books/Notes/Videos/Subject Materials/Previous Questions)।

---

## 5. Database Change Plan — কোনো migration নয়

শুধু **backward-compatible field additions** (নতুন collection নয়, index নতুন হলে non-blocking):

| Collection | পরিবর্তন |
|---|---|
| `StudyMaterial.payload` | + `thumbnailUrl`, `author`, `edition`, `durationSec` |
| `StudyMaterial` | + `previewAllowed: Boolean (default true)` |
| `ContentReport` | + `reasonCode` enum (broken_link/wrong_info/wrong_file/duplicate/other), `details` free text (পুরনো `reason` অক্ষত) |
| `MaterialView` | + `progressSec` (Phase 2, video progress) |
| `AppSettings` | + `library.categories` visibility map |

---

## 6. API Change Plan

| Endpoint | পরিবর্তন |
|---|---|
| `GET /materials` | sort enum-এ `oldest` যোগ; response-এ category counts (faceted) |
| `POST /materials/:id/report` | body: `reasonCode` + optional `details`; এক user-এর এক material-এ এক open report (duplicate prevention) |
| Admin materials CRUD | নতুন payload fields + previewAllowed accept করবে |
| `GET /settings/app` | library categories visibility expose |

---

## 7. Security & Permission Plan

- Download/Preview permission **backend-এ** enforce (এখনকার `/download/:id` pattern অনুযায়ী) — frontend শুধু hide করবে না।
- Bookmark/Report সব operation-এ `requireAuth` + ownership।
- External URL: শুধু http/https, `launchUrl(externalApplication)`।
- Report rate-limit: user প্রতি material-এ একটাই open report।
- কোনো storage credential client-এ যাবে না।

---

## 8. PDF Viewer — Approval দরকার ⚠️

In-app PDF preview-র জন্য একটি package লাগবে (যেমন `flutter_pdfview`)। বিকল্প:
- **Option A (সুপারিশকৃত, এই ফেজে)**: `url_launcher` দিয়ে সিস্টেম PDF viewer-এ খোলা — নতুন dependency নেই, Android-এ নির্ভরযোগ্য।
- **Option B (Phase 2)**: in-app viewer package — approval দিলে যোগ হবে।

---

## 9. Testing Plan

- **Backend (jest, বর্তমান ১৯৪ টেস্টের সাথে)**: `oldest` sort, report reasonCode validation + duplicate prevention, previewAllowed enforcement, bookmark ownership, category counts।
- **Admin panel**: form fields + save round-trip, report badge।
- **Student app**: sandbox-এ Flutter নেই — তুমি লোকালে চালাবে; আমি Dart-level verification (brace balance, reference check) করব।
- **Regression**: Home, Result, CGPA, Notices, Auth — কোনো route/model ভাঙবে না (সব পরিবর্তন additive)।

---

## 10. Implementation Roadmap (Approval-এর পর)

| Phase | কাজ | অনুমানিক ধাপ |
|---|---|---|
| 1 | Backend: schema fields + API enhancements + টেস্ট | ছোট |
| 2 | Admin panel: form fields + category visibility + report badge | ছোট |
| 3 | Mobile: filter chips + sort + premium card design + detail upgrade | মাঝারি |
| 4 | Mobile: My Bookmarks page + end-of-list message | ছোট |
| 5 | প্রতিটি ফেজ শেষে commit + push main | — |

Phase 2 (আলাদা, পরে): in-app PDF viewer (package approval), video progress/Continue Learning।

---

## ✅ Approval Checklist — এগুলো ঠিক করে বললেই কাজ শুরু হবে

1. PDF এখন Option A (সিস্টেম viewer) — সম্মত?
2. Video in-app player বাদ, external link — সম্মত?
3. নতুন `payload` fields + `previewAllowed` + report reasonCode — সম্মত?
4. Category visibility Settings-এ — সম্মত?
