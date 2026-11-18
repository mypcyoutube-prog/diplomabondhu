# KNOWN_ISSUES.md — DiplomaBondhu

**Status: IMPLEMENTATION (P3–P12 done). Backend 127/127 tests + results E2E 17/17 (live python+node+mongo), Python result-service 7/7 pytest, admin panel 8/8 tests + build, Flutter app 18/18 tests + analyzer clean. Flutter app NOT yet run on a real Android device (KI-10).**

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
| KI-14 | Parser verified against synthetic sheets + real board NOTICE PDFs (bteb.gov.bd) only; real institute-wise result-sheet PDFs could not be downloaded in the sandbox (btebresultszone.com file downloads are bot-protected — bypassing was not attempted, per spec) | Wrong/missing rows possible for some institutes' layouts | Owner downloads 1-2 real result PDFs in a browser, uploads via admin Results page, reviews the preview (record count + first 5 rows + warnings) and spot-checks rolls against the source PDF per batch |

| KI-10 | Sandbox has no Android SDK/Java, so no APK build and no device/emulator run happened | App is analyzed + unit/widget-tested only; release claim blocked | Owner runs `flutter run` on a device/emulator (see README mobile section) |
| ~~KI-11~~ | RESOLVED (P11): `url_launcher` added; external-link/download buttons live | — | — |

## Deliberate limitations (by design, first release)
- No email verification / password recovery (D3)
- BTEB Result Checker = Coming Soon only
- Project Hub / Career Zone excluded entirely
| KI-12 | No email/SMTP infrastructure, so forgot-password codes are delivered out-of-band by admin (phone/in-person) | Reset flow works but code delivery is manual | Approve email provider (e.g. Resend/SES free tier) when ready |
| KI-13 | Launcher icon generated programmatically (geometric cap+book); no designer-approved brand asset yet | Icon may be replaced before release | Owner reviews/approves final icon |
