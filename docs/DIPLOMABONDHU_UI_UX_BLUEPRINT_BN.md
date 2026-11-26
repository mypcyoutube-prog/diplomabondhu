# DIPLOMABONDHU — UI/UX ডিজাইন ব্লুপ্রিন্ট (Phase 2)

**গুরুত্বপূর্ণ:** এটি প্রস্তাব (Proposal) — অনুমোদন ছাড়া কোনো screenshot/ডিজাইন/কোডে পরিবর্তন হবে না। বর্তমান যা আছে সেটি রেফারেন্স হিসেবে ব্যবহার করা হয়েছে: `mobile_app/lib/app/theme/theme.dart` (টোকেন), `mobile_app/lib/shared/widgets/states.dart` (loading/error/empty), `lib/app/l10n/` (bn/en)। Admin side: `admin-panel/src/components/Layout.tsx`, `ui.tsx`।

---

## অংশ ক — Student App Design System (বর্তমান → প্রস্তাবিত শক্তিশালীকরণ)

বর্তমান `theme.dart` এক-ফাইল টোকেন সেট; প্রস্তাব: এটিকেই একমাত্র সত্যের উৎস রেখে ৪ স্তরে সাজানো (নতুন dependency নয়):

1. **Colors** — primary/secondary/surface/background + success(warning/error); Light ও Dark উভয়ে ≥4.5:1 টেক্সট কনট্রাস্ট।
2. **Typography** — Bangla এবং English দুটোর জন্যই ফলব্যাক-সহ টেক্সট থিম (H1–H3, body, caption); বাংলা সংখ্যা রেন্ডার পরীক্ষা (KI-8)।
3. **Components** — Card (radius 16), Button (primary/secondary/ghost + loading state), Input (label+hint+error, focus ring), Dialog/BottomSheet, Badge/Chip, Skeleton loader।
4. **Spacing & Elevation** — 4/8/12/16/24/32 গ্রিড; elevation সর্বোচ্চ 2 স্তর (অতিরিক্ত শ্যাডো/গ্রেডিয়েন্ট নিষেধ)।

## অংশ খ — প্রাধিকৃত ১০ স্ক্রিনের ব্লুপ্রিন্ট

প্রতিটি স্ক্রিনের জন্য: উদ্দেশ্য · লেআউট · স্টেট (লোডিং/এরর/এম্পটি) · প্রয়োজনীয় API (বর্তমান আছে/নেই)।

### ১. Home Dashboard (`/home`)
- **উদ্দেশ্য:** ছাত্রের সব দরকারি জিনিস ২ ট্যাপের মধ্যে।
- **লেআউট (উপর→নিচ):** Header (Greeting+নাম+avatar+notification bell) → Academic Summary Card (Program/Dept/Semester/Institute) → Quick Actions grid (৬টা: GPA, CGPA, Exam, Routine, Library, Bookmark) → Study Library horizontal rail → Exam section → Routine (আজকের ক্লাস) → Community rail।
- **বর্তমান সমস্যা:** Section-এর ক্রম/দৃশ্যমাত্রা অ্যাডমিন-নিয়ন্ত্রিত নয় (`app-settings.model.ts` এ শুধু জেনেরিক `featureFlags`)।
- **প্রস্তাব (API বর্তমান নেই — MIS-2):** `GET /settings/app` response-এ `dashboardSections: [{key, title, enabled, order}]`; অ্যাপ সেটি অনুযায়ী render করবে; ফিচার ডিলিট হবে না, শুধু hide।
- **স্টেট:** লোডিং = skeleton প্রতি-secিশন; এরর = retry banner প্রতি-section; এম্পটি = উপযুক্ত CTA।

### ২. Study Library (`/library`, ৫ ট্যাব: Books/Notes/Materials/Videos/Past Questions)
- **লেআউট:** Title+Search বার → Chip-ফিল্টার রো (Program/Dept/Semester/Subject — শুধু API-supported ফিল্টার) → কার্ড লিস্ট + pagination।
- **কার্ড:** থাম্বনেইল, টাইটেল, subject+semester chip, টাইপ ব্যাজ, bookmark icon।
- **স্টেট:** এম্পটি = "এই সেমিস্টারে এখনো কিছু যোগ হয়নি"; এরর = retry।
- **API:** ✅ আছে (`GET /materials` ফিল্টার+pagination সহ)।

### ৩. Material Detail (`/library/:id`)
- **লেআউট:** Cover → টাইটেল → একাডেমিক তথ্য চিপগুলো → বর্ণনা → অ্যাকশন বার (Open PDF / External link / Bookmark / Share / Report)।
- **PDF:** in-app viewer (লোডিং spinner, page nav, zoom) — এরর হলে Retry + "External link-এ খুলুন"।
- **API:** ✅ আছে (`GET /materials/:id` optionalAuth, `/download/:id`, bookmark/report, `material-view` tracking)।

### ৪. Exam Center (`/exams`)
- **লেআউট:** ট্যাব (Available/Upcoming/Completed) → এক্সাম কার্ড (title, subject, duration, marks, অবস্থা ব্যাজ)। নির্দেশনা পাতা → Confirmation dialog → রান স্ক্রিন।
- **রান স্ক্রিন (`/exams/:id/run`):** উপরে timer (server `deadlineAt` থেকে হিসাব) + progress; প্রশ্ন card; navigator grid (answered/unanswered রং); Prev/Next; Submit → নিশ্চিতকরণ।
- **Integrity नोট (বর্তমানেই মেনে চলছে):** deadline server-side (`exam.service.ts:103`), duplicate submit-safe (`:122` idempotent `alreadySubmitted`)। প্রস্তাব শুধু: timer-এ periodic server-time sync (এখন start-এই sync)।
- **API:** ✅ আছে (attempts/answer/submit/result)।

### ৫–৬. GPA Calculator (`/gpa/semester`) ও CGPA (`/gpa/cgpa`)
- **Terminology (বাধ্যতামূলক):** সেমিস্টার হিসাবের আউটপুট **শুধু "GPA"**, multiple-semester আউটপুট **শুধু "CGPA"** — কোনো পর্দায় আলাদা "Result" শব্দ থাকবে না; ইতিহাস হবে **GPA History / CGPA History**। (`/api/v1/gpa/results` API নামটি ভেতরের বিষয় — UI-তে প্রকাশ হবে না; MIN-1 দেখুন।)
- **GPA ফ্লো:** Profile নির্বাচন (Program→Regulation→Session→Dept→Sem; শুধু verified+published প্রোফাইল — বর্তমানে KI-1/KI-9 অনুযায়ী কোনোটা published হবে না) → Input mode (Marks/Grade toggle) → Subject রো (code/name/credit/marks-or-grade validation) → **Calculation** বাটন → ফল: GPA, বিষয়ভিত্তিক grade+point, credit তথ্য, breakdown।
- **CGPA ফ্লো:** সেমিস্টারভিত্তিক GPA টেবিল → applicable credit/weight → CGPA + breakdown।
- **Target planner:** future-সেমিস্টার target দিলে estimated required average; সবসময় **"Estimate"** ব্যাজে চিহ্নিত।
- **API:** ✅ আছে (`/gpa/profiles`, `/calculate/semester`, `/calculate/cgpa`, `/results` CRUD, `/target`)।

### ৭. Routine (`/planner`)
- **লেআউট:** ট্যাব (Routine / Tasks / Goals / Calendar)। Routine = weekly grid + daily view, class card (subject/teacher?/room/time), নিজের routine এটা-এডিট সহ। Tasks/Goals = চেকবক্স লিস্ট + priority chip + due date, FAB=add। Calendar = monthly view, দিনে dot indicators (task/reminder/class)।
- **API:** ✅ আছে (`/planner/routine|tasks|goals|calendar`)। লোকাল নোটিফিকেশন timezone হ্যান্ডলিং সহ।

### ৮. Community (`/community`)
- **লেআউট:** ফিড (post card: author, content, like/comment/report) → FAB new post → detail (কমেন্ট+reply)। Guidelines acceptance gate আগে (`/community/guidelines/accept`)।
- **নিরাপত্তা:** rate limit + moderation + report — API-তে আছে; UI-তে report bottom-sheet (কারণ+বর্ণনা)।
- **API:** ✅ আছে; DB-র PM2 নয়, spam/multi-যাচাই test আছে (security.test.ts)।

### ৯. Profile (`/profile`)
- **লেআউট:** avatar+নাম, একাডেমিক তথ্য সেকশন, Edit → Settings list (Language, Theme, Notification prefs, Change password, Account deletion request, Logout)।
- **Deletion request:** confirmation → identity verify → request status screen (pending/processing/completed)।
- **API:** ✅ আছে (`/users/me*`, `/users/me/deletion-request`)।

### ১০. Admin Panel — Dashboard
- **বর্তমান:** `admin.routes.ts:/dashboard` overview counters + admin-panel/src/pages/Dashboard.tsx।
- **প্রস্তাব:** overview cards (students/materials/exams/pending reports) + recent activities (audit-logs থেকে) + trend chart — **শুধু বাস্তব API ডেটা থাকলে**; ডেটা না থাকলে সেকশন হাইড (demo data নিষিদ্ধ)। উপরের ৯টি ছাত্র-স্ক্রিনের সমান্তরাল admin পেজগুলোর table/filter/pagination প্যাটার্ন `Layout.tsx`+`ui.tsx` tokens অনুসরণ করবে।

## অংশ গ — সব স্ক্রিনে বাধ্যতামূলক ১৪-পয়েন্ট চেকলিস্ট

উদ্দেশ্য · লেআউট · Header · Content · Cards · Buttons · Inputs · Navigation · Empty · Loading · Error · Success · Responsive (ছোট স্ক্রিন) · Dark + Accessibility — প্রতিটি অনুমোদিত স্ক্রিনে implementation-এর আগে এই চেকলিস্ট পূরণ হবে; প্রতিটি বাটনের বাস্তব action + loading/success/error feedback হবে (non-functional বাটন নিষিদ্ধ)।

## অংশ ঘ — Visual Mockups

Text-wireframe এই ডকুমেন্টে প্রতিটি স্ক্রিনের লেআউট-ক্রম হিসেবে আছে; বাস্তব রেন্ডারড মকআপ PNG Flutter ফোল্ডার স্ট্রাকচারের উপর অনুমোদন-পরবর্তী ধাপে তৈরি হবে (KI-10: sandbox-এ Flutter চলে না, তাই pre-render সম্ভব নয়)।
