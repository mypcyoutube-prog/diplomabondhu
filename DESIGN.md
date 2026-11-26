# DiplomaBondhu Design System (DESIGN.md)

**"Your Diploma Life, One Platform."** — এই ফাইলটিই প্রজেক্টের একমাত্র ডিজাইন সোর্স।
UI-তে হাত দেওয়ার আগে এটি পড়ো এবং নিচের টোকেন ছাড়া কোনো রং/স্পেসিং/রেডিয়াস hard-code করবে না।

## Source of truth

- Student app: `mobile_app/lib/app/theme/theme.dart` — `DbColors`, `DbSpacing`, `DbRadius`, `DbShadows`, `DbDurations`, `DbCurves` + `buildLightTheme()` / `buildDarkTheme()`
- সব স্ক্রিন: `import '../../../app/theme/theme.dart';` (constant reference বাধ্যতামূলক)
- l10n: `lib/app/l10n/app_en.arb` / `app_bn.arb` — user-facing সব টেক্সট l10n দিয়ে, hardcode নিষিদ্ধ
- Admin panel: React + Tailwind — student app থেকে আলাদা professional dashboard লুক

## রং (Light / Dark)

| ব্যবহার | টোকেন | Light | Dark |
|---|---|---|---|
| Primary | `DbColors.navy` / `navyDark` | 0xFF0F2A4A | 0xFF0B1F36 |
| Secondary/CTA | `emerald` / `emeraldDark` | 0xFF10B981 | 0xFF34D399 |
| Accent/Focus | `teal` / `tealDark` | 0xFF14B8A6 | 0xFF2DD4BF |
| Background | `backgroundLight` / `backgroundDark` | 0xFFF4F6F8 | 0xFF0D141C |
| Surface (card) | `surfaceLight` / `surfaceDark` | 0xFFFAFAF8 | 0xFF121A24 |
| Text primary | `textPrimaryLight` / `textPrimaryDark` | 0xFF1A2233 | 0xFFF1F5F9 |
| Text secondary | `textSecondaryLight` / `textSecondaryDark` | 0xFF64748B | 0xFF94A3B8 |
| Error | `errorLight` / `errorDark` | 0xFFDC2626 | 0xFFF87171 |
| Warning | `warningLight` / `warningDark` | 0xFFD97706 | 0xFFFBBF24 |
| Success | `successLight` / `successDark` | 0xFF059669 | 0xFF34D399 |
| Info | `infoLight` / `infoDark` | 0xFF0284C7 | 0xFF38BDF8 |
| Border | `borderLight` / `borderDark` | 0xFFE2E8F0 | 0xFF24303F |
| Border strong | `borderStrongLight` / `borderStrongDark` | 0xFFCBD5E1 | 0xFF334155 |
| Fill | `fillLight` / `fillDark` | 0xFFF1F5F9 | 0xFF1A2531 |
| Overlay/scrim | `overlay` | 0x660F2A4A | — |

নিয়ম: card = elevation 0 + 1px border; dark মোডে CTA = emeraldDark; AA contrast দুই থিমেই বাধ্যতামূলক।

## স্পেসিং, রেডিয়াস, সাইজ

- `DbSpacing`: xs 4 · sm 8 · md 16 · lg 24 · xl 32
- `DbRadius`: card 16 · input 12 · chip 20 · sheet 24 · dialog 20 · badge 8 · full 999
- টাচ টার্গেট: বাটন/primary input ন্যূনতম 48×48, সেকেন্ডারি টার্গেট ≥ 44×44, দুই টার্গেটের মধ্যে ≥ 8dp
- Icon: inline 20 · default 24 · feature tile 28–32
- Shadow: `DbShadows.card` (কার্ড), `floating` (FAB/sheet), `darkCard`; motion: `DbDurations` (150/250/400ms) + `DbCurves`

## Typography scale

`_dbTextTheme`: display 32/w700 · headline 24, 20/w700 · title 18, 16, 14/w600 · body 15, 14/w400 (height 1.5) · body-small 12.5 secondary · label 14, 12/w600 · caption 11।
বাটন লেবেল w600; বাংলা রেন্ডারিং দুই থিমেই যাচাই করতে হবে।

## ৪টি বাধ্যতামূলক স্টেট (প্রতিটি async স্ক্রিনে)

1. **Loading** — skeleton/shimmer বা inline spinner; খালি স্ক্রিন নয়; লেবেল "…" দিয়ে শেষ
2. **Empty** — আইকন/ইলাস্ট্রেশন + এক লাইন ব্যাখ্যা + primary action
3. **Error** — কী ভুল হলো + পরের ধাপ + Retry
4. **Success** — প্রতিটি mutation-এর পরে snackbar/inline confirm

প্রতিটি বাটনের বাস্তব handler থাকবে; destructive action-এ confirm dialog বা undo।

## Anti-slop নিয়ম

- Purple-to-blue gradient headline নয়; gradient soup নয়; নিজের palette-এ violet নয়
- Feature heading-এর উপরে emoji icon-tile নয় — Material rounded icon
- Lorem ipsum / placeholder কনটেন্ট production-এ নয়; non-functional বাটন নয়
- এক স্ক্রিন = এক উদ্দেশ্য; এক বাটন-জোড়া, এক কার্ড স্টাইল, এক radius স্কেল; nesting ≤ ২ স্তর
- Quiet motion: card press ≈ 0.98 scale, 150–250ms, `MediaQuery.disableAnimations()` সম্মান করো

## Admin-control-by-default (গ্লোবাল নিয়ম)

অ্যাপের প্রায় সব দৃশ্যমান জিনিস admin নিয়ন্ত্রণ করবে: home sections (visibility/order/label), home banner (notice-এর নিচে — image, link/CTA, active period, priority), library, exam, CGPA rules (BTEB-verified), notification/announcement, community moderation, AI limits, search config, app settings।
অ্যাপ API config থেকে render করবে; section hide করলে মূল feature delete হবে না; student UI-preference জুড়ে দিয়ে disabled feature-এ ঢুকতে পারবে না। প্রতিটি admin পরিবর্তন audit log-এ থাকবে।

## পরিভাষা

- শুধু **CGPA** — semester GPA calculator / target GPA planner নেই; লেবেল: CGPA, CGPA History
- হিসাব server-verified (published BTEB profile); নিয়ম অনুমান করে বদলানো যাবে না
- Copy: active voice, সংখ্যা numeral-এ, নির্দিষ্ট বাটন লেবেল, error-এ পরের ধাপ

## Quality loop (প্রতি পেজ)

1. এই ফাইল পড়ো → নতুন widget-এর আগে বিদ্যমান token/widget reuse করো
2. ৪ স্টেট + admin API config দিয়ে implement
3. যাচাই: `flutter analyze`, প্রাসঙ্গিক test, light+dark, বাংলা+English, 320dp, back navigation
4. শেষে audit (impeccable) + guidelines রিভিউ — UI-only প্রমাণে কোনো ফিচার "complete" নয়; পুরনো test ভাঙা যাবে না

## Scope guard

বাদ: Project Hub, Career Zone, সত্যিকারের BTEB result checker (শুধু Coming Soon UI)। অনুমোদন ছাড়া নতুন module/schema পরিবর্তন নয়; বিদ্যমান feature rebuild নয়।
