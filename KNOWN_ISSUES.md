# KNOWN_ISSUES.md — DiplomaBondhu

**Status: IMPLEMENTATION (P3–P12 done). Backend 145/145 tests, Python result-service 48/48 pytest, Flutter app 29/29 tests + analyzer clean (latest verified: 0.11.7). Flutter app NOT yet run on a real Android device (KI-10).**

## Open items blocking implementation start
| # | Issue | Impact | Owner action needed |
|---|---|---|---|
| KI-1 | BTEB rules are from third-party web sources, not official documents | GPA profiles cannot be marked verified/published | Provide official regulation/curriculum documents or confirm web findings |
| KI-2 | 2010 Probidhan marks→grade mapping not found | 2010 profile will ship disabled | Provide 2010 regulation document |
| KI-3 | Firebase project not yet created | FCM push cannot be integrated | Create Firebase project, share google-services.json via secure channel |
| KI-4 | Hosting not deployed yet — Render blueprint (`render.yaml`) ready (api + result-svc + admin static); MongoDB must come from Atlas (Render hosts no Mongo) | Production deployment blocked | Owner: push repo to GitHub, create Atlas cluster, deploy Blueprint in Render, fill sync:false env vars (DEPLOYMENT_GUIDE §2) |
| KI-5 | Domain not registered | Admin panel + API URLs provisional | Owner registers domain when ready |
| KI-6 | Package name `com.diplomabondhu.app` unconfirmed | Play Store listing | Owner confirms |
| KI-7 | No file-storage backend chosen (S3/GridFS) | Admin material upload endpoint deferred; materials use external/file URLs | Owner picks hosting (ties to KI-4) |
| KI-8 | Admin panel visual QA (real browser screenshots, dark mode, Bangla labels) not yet done | UI polish risk before release | Owner reviews `npm run dev` in admin-panel |
| KI-9 | GPA profiles contain placeholder grading data; no profile is officially verified yet | No student-facing GPA profile is published until owner supplies official BTEB documents (same as KI-1) | Provide/confirm official regulation documents |
| KI-14 | Partially resolved: one owner-provided REAL institute-wise result sheet (1103 pages, Diploma in Engineering 7th Semester 2022 Regulation) parsed with 100% recall/precision — 31,094 records, gold-verified roll-by-roll against the source text (see CHANGELOG 0.10.5). Other board layout variants (other programs, other years' print styles, text-line-only sheets) remain unverified | A differently formatted result sheet (e.g. non-engineering program, different year) may still need a parser adjustment; the admin always reviews record count + first 5 rows + warnings before import | Owner uploads 1-2 more result PDFs from other programs/year variants and spot-checks the preview per batch |
| KI-15 | NEW (2026-11-18): the 2016-regulation 8th-semester sheet (`RESULT_8th_irr_2016_Regulation.pdf`, 567 pages, 4,549 records) shows a different record shape — `cgpa:` prefix before the gpa map, integer-looking GPA tokens (e.g. `4`), NAME-column text artifacts, 4 malformed-buffer warnings on the owner's preview. The parser's additive `cgpa:` extraction (v0.11.2) works for that pattern, but the full layout is NOT gold-verified and must not be imported | An unverified import could store wrong results for real students; the import stays blocked until gold verification | Owner provides the actual PDF file; parser tuned + gold-verified (100% recall/precision) before import is allowed |
| KI-10 | Sandbox has no Android SDK/Java, so no APK build and no device/emulator run happened | App is analyzed + unit/widget-tested only; release claim blocked | Owner runs `flutter run` on a device/emulator (see README mobile section) |
| KI-16 | NEW (0.11.7): BTEB subject catalog harvested from btebresultszone.com booklists (owner-designated source, harvested 2026-11-18); official BTEB verification pending. 2016 entries publish no credits/marks — fields kept absent, not invented. Catalog enrichment (subject names on results) applies only where the 5-digit code matches a catalog row | A subject on a result may show `name: null` if its code is missing from the source booklists; catalog details could change only if BTEB revises booklists | Owner spot-checks a few technologies against official BTEB curriculum documents; corrections can be pushed via `POST /bteb-subjects/admin/import` or the seed JSONs + `npm run seed:subjects` |
| ~~KI-11~~ | RESOLVED (P11): `url_launcher` added; external-link/download buttons live | — | — |

## Deliberate limitations (by design, first release)
- No email verification / password recovery (D3)
- BTEB Result Checker = Coming Soon only
- Project Hub / Career Zone excluded entirely
| KI-12 | No email/SMTP infrastructure, so forgot-password codes are delivered out-of-band by admin (phone/in-person) | Reset flow works but code delivery is manual | Approve email provider (e.g. Resend/SES free tier) when ready |
| KI-13 | Launcher icon generated programmatically (geometric cap+book); no designer-approved brand asset yet | Icon may be replaced before release | Owner reviews/approves final icon |
