# DiplomaBondhu — Page List & Remaining Work Status

তারিখ: সর্বশেষ আপডেট — Home Premium Polish (commit `25d0ffe`) অনুযায়ী

---

## ১. Student App (Flutter) — সব পেজ

### Auth (৫টি) — সম্পূর্ণ ✅
| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Splash | `/splash` | ✅ |
| 2 | Onboarding | `/onboarding` | ✅ |
| 3 | Login | `/login` | ✅ |
| 4 | Register | `/register` | ✅ |
| 5 | Forgot Password | `/forgot-password` | ✅ |

### Bottom Navigation Tabs (৫টি) — সম্পূর্ণ ✅
| # | Tab | Page | Status |
|---|-----|------|--------|
| 6 | Home | `/home` | ✅ Premium polish সম্পন্ন (gradient tiles, result bar, notice ticker, banner, greeting) |
| 7 | Study | `/library` + `/library/:id` | ✅ |
| 8 | Result | `/results` (auto timeline from profile roll) | ✅ নতুন |
| 9 | Community | `/community` | ✅ |
| 10 | Profile | `/profile` | ✅ (roll/registration edit সহ) |

### Academic Services (৭টি) — সম্পূর্ণ ✅
| # | Page | Route | Status |
|---|------|-------|--------|
| 11 | Exam Center | `/exams` | ✅ |
| 12 | Exam Detail | `/exams/:id` | ✅ |
| 13 | Exam Runner | `/exams/:id/run` | ✅ |
| 14 | Exam Result | `/exams/result/:attemptId` | ✅ |
| 15 | GPA Hub | `/gpa` | ✅ |
| 16 | CGPA Calculator | `/gpa/cgpa` | ✅ |
| 17 | GPA History | `/gpa/history` | ✅ |

### Result & Syllabus (৩টি) — সম্পূর্ণ ✅
| # | Page | Route | Status |
|---|------|-------|--------|
| 18 | Result Checker (full) | `/results/checker` | ✅ auto-roll timeline সহ |
| 19 | Technology/Subject Catalog | `/subjects` | ✅ |
| 20 | Subject Detail (Syllabus) | `/subjects/:slug` | ✅ |

### Notices & Community (৪টি) — সম্পূর্ণ ✅
| # | Page | Route | Status |
|---|------|-------|--------|
| 21 | All Notices (source filter) | `/notices` | ✅ নতুন |
| 22 | Notice Detail | `/notices/:id` | ✅ নতুন |
| 23 | Post Composer | `/community/new` | ✅ |
| 24 | Post Detail | `/community/:id` | ✅ |

### Smart Expansion Features (৯টি) — সম্পূর্ণ ✅
| # | Page | Route | Status |
|---|------|-------|--------|
| 25 | AI Smart Search | `/search` | ✅ |
| 26 | Notification Center | `/notifications` | ✅ |
| 27 | Personal Workspace | `/workspace` | ✅ |
| 28 | Dashboard Customize | `/dashboard-customize` | ✅ |
| 29 | Data Export | `/export` | ✅ |
| 30 | AI Study Plan | `/study-plan` | ✅ |
| 31 | Global Command Center | `/commands` | ✅ |
| 32 | Sync Devices | `/sync-devices` | ✅ |
| 33 | Planner | `/planner` | ✅ |

### Settings (১টি) — সম্পূর্ণ ✅
| # | Page | Route | Status |
|---|------|-------|--------|
| 34 | Settings | `/settings` | ✅ |

**মোট: ৩৫টি স্ক্রিন — সবগুলো কার্যকর ও রাউটেড।**

---

## ২. Admin Panel (React) — ১৫টি পেজ, সম্পূর্ণ ✅

Login, Dashboard, Students, Academic, Materials, Exams, Results, GpaProfiles,
Announcements (source/PDF সহ), Banners, Community, ScheduledNotifications,
AiSearchSettings, Settings (Home notice bar + Result display সহ), AuditLogs.

---

## ৩. Backend — সম্পূর্ণ ✅

- ১৯৪/১৯৪ টেস্ট পাস, `tsc` ক্লিন
- Home v2 API: published announcements, resultDisplay/homeNotice settings,
  profile roll/registration, homepage sections seeds (services + resources)

---

## ৪. যা এখনো বাকি আছে (Backlog)

| # | কাজ | জায়গা | অগ্রাধিকার |
|---|-----|--------|-----------|
| 1 | **বাকি পেজের professional polish** — Home হয়ে গেছে; Study, Result, Community, Profile, Exam, GPA, Search, Workspace ইত্যাদি পেজেও একই premium look (gradient, press-scale, see-all) | Student App | উঁচু |
| 2 | **Dark theme contrast verification** — নতুন Home ডিজাইন dark mode-এ যাচাই | Student App | উঁচু |
| 3 | **Flutter widget tests** — নতুন স্ক্রিনের (Notices, Result Tab, Home v2) টেস্ট নেই | Student App | মাঝারি |
| 4 | **Help Center পেজ** — Home প্ল্যানে উল্লেখ ছিল, এখনো আলাদা পেজ নেই | Student App | মাঝারি |
| 5 | **FastAPI result service hardening** — rate limit, validation আরও শক্ত করা | Result Service | মাঝারি |
| 6 | **Admin panel E2E যাচাই** — Banner upload → Home banner প্রদর্শন, Result display window → Home result bar লাইভ টেস্ট | Admin + App | উঁচু |

### বাদ রাখা হয়েছে (অনুমোদিত exclusion)
- Project Hub, Career Zone — স্কোপের বাইরে
- BTEB Official Result Checker — Coming Soon (রাখা হবে না, নিয়ম অনুযায়ী)

---

## ৫. লোকাল রান কমান্ড

```bash
# Backend
cd backend && npm run dev        # http://localhost:4100

# Admin panel
cd admin-panel && npm run dev

# Student app (web)
cd mobile_app
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4100/api/v1
```
