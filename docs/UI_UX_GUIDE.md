# UI_UX_GUIDE.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING

---

## 1. Design Direction

Premium, modern, professional, student-friendly — a real education product, not a
converted website. Mobile-first Android; clean hierarchy; restrained decoration.

## 2. Design System Tokens

### 2.1 Color Palette
| Token | Light | Dark | Usage |
|---|---|---|---|
| `primary` (Deep Navy) | #0F2A4A | #0B1F36 | App bars, headers, primary buttons |
| `secondary` (Emerald) | #10B981 | #34D399 | Success, active states, highlights |
| `accent` (Teal) | #14B8A6 | #2DD4BF | Links, chips, progress |
| `surface` (Off-white) | #FAFAF8 | #121A24 | Cards, sheets |
| `background` | #F4F6F8 | #0D141C | Screens |
| `error` | #DC2626 | #F87171 | Errors, fails |
| `warning` | #D97706 | #FBBF24 | Incomplete, pending |
| `textPrimary` | #1A2233 | #F1F5F9 | |
| `textSecondary` | #64748B | #94A3B8 | |

Subtle gradients allowed only on hero cards (navy→teal, ≤8% opacity shift).

### 2.2 Typography
- **Bangla:** Hind Siliguri / Noto Sans Bengali (full rendering support)
- **English:** Inter
- Scale: Display 32/40 · H1 24/32 · H2 20/28 · H3 18/26 · Body 16/24 · Small 14/20 ·
  Caption 12/16. Font switching follows app language automatically.

### 2.3 Shape, Spacing, Iconography, Motion
- Corner radius: cards 16, buttons/inputs 12, chips 8.
- 4px spacing grid (4/8/12/16/24/32).
- Icons: Material Symbols Rounded — consistent weight, single set.
- Motion: 150–250 ms, ease-out; page transitions via GoRouter custom transitions;
  skeleton loaders (no spinners for lists); respect `reduce_motion`.

### 2.4 Accessibility
- WCAG AA contrast on all text tokens (verified per pair above).
- Min touch target 48×48 dp; semantic labels for screen readers; no color-only meaning.

## 3. Mandatory UI States (every async surface)

| State | Treatment |
|---|---|
| Loading | Skeleton placeholders matching final layout |
| Empty | Friendly illustration + one-line explanation + primary CTA |
| Error | In-context message + Retry; never a dead end |
| Offline | Persistent banner + cached content where available |
| Success | Snack/toast + visual confirmation (e.g., saved ✓) |
| Maintenance | Full-screen branded state from app settings |

## 4. Screen-by-Screen Specifications (Student App)

### 4.1 Splash
Full navy background, animated logo (logo mark scales/fades in ~800 ms), tagline in
both languages beneath. Auto-route: onboarding (first run) → login → home.

### 4.2 Onboarding (3 slides + language)
1. **Study Materials** — "সব বই, নোট, লেকচার এক জায়গায়"
2. **Exam Prep & GPA** — "পরীক্ষার প্রস্তুতি ও GPA হিসাব একসাথে"
3. **Community & Planner** — "সিনিয়র-জুনিয়র সংযোগ ও পড়ার পরিকল্পনা"
Slide 1 includes **language selection** (বাংলা / English), persisted. Skip button.
Never shown again after completion.

### 4.3 Login / Registration
- Login: email + password, show/hide password, error states inline, link to register.
- Registration: 3 steps — (1) account (name, email, password), (2) academic
  (institute → program → regulation → technology → session → semester, cascading
  dropdowns), (3) confirm. Progress indicator. Phone optional.
- Trust markers: "আপনার তথ্য সুরক্ষিত" note.

### 4.4 Home Dashboard
- Header: greeting by time of day ("শুভ সকাল, রাহাত 👋"), avatar → profile, streak chip.
- Global search bar (sticky).
- Current semester card: semester, technology, regulation + CGPA-so-far (if history).
- Quick access grid (2×2): Study Library · Exam Center · GPA Calculator · Planner.
- Admin-configurable sections: Announcements carousel, Recent Materials (horizontal),
  Community highlights, Coming Soon (Result Checker) — order/visibility from settings.
- Pull-to-refresh; skeleton on load.

### 4.5 Study Library
- Sticky segmented tabs: বই · নোট · সাবজেক্ট ম্যাটেরিয়াল · ভিডিও · বিগত প্রশ্ন.
- Filter sheet: program → regulation → technology → semester → subject → chapter
  (cascading); exam year for past questions; chips show active filters.
- Cards: type icon, title, subject/semester meta, size/pages, bookmark icon.
- Detail: PDF viewer (in-app, paginated, download if `downloadAllowed`) or external
  link sheet ("Open in YouTube/Browser"). Report button ("ভুল তথ্য রিপোর্ট করুন").
- Recently viewed rail on top.

### 4.6 Exam Center
- Hub: test type cards (Chapter / Subject / Semester / Model / Previous), stats strip
  (tests taken, avg score, best streak).
- Detail: rules card (duration, marks, negative marking), Start button.
- Runner: top timer (turns amber <20%, red <10%), question pager dots, options as
  large cards, mark-for-review flag, submit confirmation sheet, auto-submit on
  timeout with clear notice.
- Result: animated score ring, correct/wrong/skipped chips, per-question review with
  explanations ("ব্যাখ্যা দেখুন" expandable), Retake / Back to Center.

### 4.7 GPA Calculator
- Entry chips: Semester GPA · CGPA · Result History · Target Planner.
- Semester screen: regulation selector (**only published/verified profiles enabled;
  others show lock + "শীঘ্রই আসছে"**), input-mode toggle (মার্কস / গ্রেড).
  Marks mode renders per-subject component fields with max labels; grade mode renders
  grade dropdowns. Live subject rows: code, credit, grade, point.
- Result card: big GPA, pass/fail per subject, "হিসাব দেখুন" → Breakdown screen
  (step-by-step, rule references, per §5 of GPA spec). Save to History (auth).
- CGPA screen: 8 semester GPA inputs (completed ones filled), weightage % shown per
  semester, result with normalization note for partial completion.
- Target planner: inputs + projection table, always with estimate disclaimer banner.

### 4.8 Planner
- Tabs: Today · Tasks · Routine · Calendar.
- Task row: checkbox, title, due chip (overdue = red), reminder icon.
- Routine: weekly grid (class routine read-only import + personal slots editable).
- Calendar: month view with dots; day sheet lists items.
- Goals: progress bars with % and deadline.

### 4.9 Community
- Feed: post cards (author avatar+name only — no other PII, time, title, body preview,
  like/comment counts, answered badge for Q&A).
- Composer: title, body, tags, type (Question/Discussion), guideline checkbox.
- Post detail: comments with one-level replies, like, report ("রিপোর্ট করুন").
- Report sheet: reasons list + optional note.

### 4.10 Notifications
- Grouped by day; unread dot; type icons; tap → deep link (material/exam/post).
- Preferences: per-category switches (materials, exams, notices, community, system).

### 4.11 Profile & Settings
- Profile: avatar, academic info card (institute, program, tech, regulation, session,
  semester), tabs: Bookmarks · Exam History · GPA History · Progress.
- Settings: Language (বাংলা/English), Theme (System/Light/Dark), Notification
  preferences, Privacy, About (version), Account deletion request (confirmation sheet
  + cooling-period explanation).

### 4.12 Coming Soon — BTEB Result Checker
Branded card/screen: "শীঘ্রই আসছে", short description, button linking to the official
BTEB result portal (external). Visibility admin-controlled.

## 5. Admin Panel UX (summary)

- Layout: left sidebar (collapsible), top bar (admin name, role, logout), content area.
- Tailwind design language mirroring app palette; dense data tables with search,
  filters, sorting, pagination; destructive actions require typed confirmation.
- GPA profile editor: tabbed form (Grading / Assessment / Pass / CGPA / Special /
  Verification) with workflow status banner and transition buttons.
- All tables show status badges; audit history drawer on entity pages.
- Responsive: sidebar → bottom nav on tablet widths.

## 6. Navigation Flow (student)

```
Splash → (first run) Onboarding → Login/Register → Home
Home ⇄ Library ⇄ Material Detail
     ⇄ Exams ⇄ Runner ⇄ Result
     ⇄ GPA ⇄ Breakdown / History / Target
     ⇄ Planner / Community / Notifications / Profile / Settings
Deep links from notifications into material/exam/post screens (auth-guarded)
```
Back behavior: Android back always pops route; runners block back with confirm sheet.
