# DATABASE_DESIGN.md — DiplomaBondhu

**Version:** 1.0 (Draft for Approval) · **Status:** PLANNING · **DB:** MongoDB + Mongoose

---

## 1. Design Principles

- Normalized logical model with references (`ObjectId` refs), not deep duplication.
- Collections grouped into domains; **no unnecessary collections** — small/related
  entities are embedded subdocuments where they have no standalone lifecycle.
- All documents: `createdAt`/`updatedAt` timestamps; soft delete (`deletedAt`) for
  academic, content, and user data; hard delete only per approved retention policy.
- Every write to sensitive collections writes an `audit_logs` entry.
- Pagination (cursor or skip/limit with max page size) on all list endpoints.

## 2. Collection Map

### Identity & Access
| Collection | Purpose | Key fields (abridged) |
|---|---|---|
| `users` | Students & admins (role in doc) | name, email (unique, lowercase), passwordHash, phone, role: `student\|admin`, status: `active\|suspended\|pending_deletion`, profile { pictureUrl, instituteId, programId, regulationId, sessionId, technologyId, currentSemesterId }, fcmTokens[], prefs { language, theme, notifications }, lastLoginAt |
| `refresh_tokens` | Rotating refresh sessions | userId, tokenHash, deviceInfo, expiresAt, revokedAt, replacedByHash |
| `roles` | Role → permission keys (RBAC) | name (unique), permissions: string[], isSystem |
| `audit_logs` | Immutable audit trail | actorId, action, targetType, targetId, before/after (sanitized), ip, userAgent, at |

### Academic Structure (hierarchy)
```
education_programs → regulations → academic_sessions
                                   → technologies → semesters → subjects → chapters
institutes (standalone) ── users.profile references institute/technology/...
```
| Collection | Purpose | Notes |
|---|---|---|
| `institutes` | Polytechnics/institutes | name, nameBn, code (unique), district, type |
| `education_programs` | Engineering, Textile, Agriculture, Medical Tech… | name, nameBn, code (unique), durationSemesters, isActive |
| `regulations` | 2010/2016/2022/… | programId, year (unique per program), name, status: `draft\|verification\|testing\|approved\|published\|retired`, officialRefs[] |
| `academic_sessions` | e.g. 2023–24 | programId, regulationId, startYear, label (unique per program+regulation) |
| `technologies` | Dept/Tech (CSE, Civil…) | programId, name, nameBn, code (unique per program) |
| `semesters` | 1–8 (+meta) | programId, regulationId, number, cgpaWeightPercent, isIndustrial |
| `subjects` | Courses | programId, regulationId, technologyId, semesterId, code (unique per regulation+tech), name, nameBn, credits, isElective |
| `chapters` | Subject chapters | subjectId, number, name, nameBn |

### GPA Engine
| Collection | Purpose | Notes |
|---|---|---|
| `assessment_schemes` | Component structure per subject type | regulationId, appliesTo (subjectType/theory+practical), components: [{key, label, maxMarks, weightPercent}] |
| `grading_schemes` | Marks→grade table | regulationId, table: [{minPercent, maxPercent, grade, point}] |
| `pass_rules` | Pass criteria | regulationId, per-component minima, subject pass grade, semester min GPA |
| `cgpa_rules` | Final CGPA strategy | regulationId, strategy: `semester_weighted\|credit_weighted`, weights ref semesters, class bands |
| `special_rules` | Improvement/retake/referred handling | regulationId, caseType, rule payload |
| `calculation_profiles` | Versioned bundle of the above per regulation | regulationId, version, status: `draft\|verification\|testing\|approved\|published`, verification {sourceRefs[], verifiedBy, verifiedAt, testRunId}, publishedAt |
| `calculation_history` | Student-saved results | userId, inputs, output (GPA/CGPA/breakdown), profileId, profileVersion, createdAt |

*Implementation note:* `assessment_schemes`, `grading_schemes`, `pass_rules`,
`cgpa_rules`, `special_rules` may be embedded inside `calculation_profiles` versions if
review prefers fewer collections — final choice at implementation; behavior identical.

### Study Content
| Collection | Purpose | Notes |
|---|---|---|
| `study_materials` | Unified material registry | type: `book\|note\|video\|past_question\|subject_material`, title, titleBn, description, hierarchyRefs {programId, regulationId, technologyId, semesterId, subjectId, chapterId}, payload per type (fileUrl/externalUrl, examYear for past questions, source), status: `draft\|published\|unpublished`, uploadedBy, downloadAllowed, viewCount |
| `bookmarks` | User bookmarks | userId, materialId (unique pair) |
| `content_reports` | Report incorrect content | reporterId, materialId, reason, status: `open\|resolved\|dismissed`, resolvedBy |

### Exams
| Collection | Purpose | Notes |
|---|---|---|
| `exams` | Test definitions | title, type: `chapter\|subject\|semester\|model\|previous`, hierarchyRefs, questionIds[], durationSec, marksPerQuestion, negativeMarkPercent, status: `draft\|scheduled\|published\|closed`, scheduledAt, shuffle, createdBy |
| `questions` | MCQ bank | subjectId, chapterId, text, textBn, options[{key,text}], correctKey, explanation, explanationBn, marks, difficulty, status |
| `exam_attempts` | One attempt per take | userId, examId (unique while active), startedAt, submittedAt, serverDeadline, answers[], status: `active\|submitted\|expired` |
| `exam_results` | Server-scored results | attemptId (unique), userId, examId, score, totalMarks, correctCount, wrongCount, perQuestion[], percentile, createdAt |

### Planner
| Collection | Purpose |
|---|---|
| `routines` | userId, type: `class\|personal`, weekly slots [{day, start, end, subjectId?, label}] |
| `tasks` | userId, title, dueAt, type: `assignment\|exam\|study\|custom`, reminderAt, status, goalId? |
| `study_goals` | userId, title, target, progress, deadline |

### Community
| Collection | Purpose | Notes |
|---|---|---|
| `community_posts` | Posts | authorId, title, body, tags[], type: `question\|discussion`, likeCount, commentCount, status: `visible\|hidden\|removed`, isAnswered |
| `comments` | Comments & replies | postId, authorId, parentId?, body, status |
| `post_likes` | Likes | postId, userId (unique pair) |
| `community_reports` | Reports on posts/comments | reporterId, targetType, targetId, reason, status, moderation {action, by, at, note} |

### Notifications & Settings
| Collection | Purpose |
|---|---|
| `notifications` | Per-user inbox items: userId, type, title, titleBn, body, bodyBn, data, readAt |
| `announcements` | Admin-created broadcasts: title(s), body(s), targets {all\|programIds\|technologyIds\|semesterIds}, publishAt, status, createdBy |
| `notification_prefs` | userId, per-category opt-in/out |
| `app_settings` | Singleton: branding, homepage sections config, feature flags (incl. result_checker visibility), maintenanceMode, supportInfo, legal {privacy, terms}, versionInfo |
| `deletion_requests` | userId, requestedAt, status, processedBy |

## 3. Index Plan (key ones)

| Collection | Index |
|---|---|
| `users` | `{email:1}` unique; `{role:1, status:1}`; text on name |
| `study_materials` | compound `{type:1, "hierarchyRefs.subjectId":1, status:1}`; text index (title, titleBn, description); `{createdAt:-1}` |
| `subjects` | `{programId:1, regulationId:1, technologyId:1, semesterId:1}`; `{code:1, regulationId:1}` unique |
| `questions` | `{subjectId:1, chapterId:1, status:1}` |
| `exam_attempts` | `{userId:1, examId:1, status:1}`; TTL-safe expiry on active attempts |
| `calculation_profiles` | `{regulationId:1, version:-1}` unique; `{status:1}` |
| `calculation_history` | `{userId:1, createdAt:-1}` |
| `bookmarks` / `post_likes` | unique compound pairs |
| `notifications` | `{userId:1, readAt:1, createdAt:-1}` |
| `refresh_tokens` | `{tokenHash:1}` unique; TTL index `expiresAt` |
| `audit_logs` | `{actorId:1, at:-1}`; `{targetType:1, targetId:1}` |

## 4. Validation & Retention

- Mongoose schema validation + Zod at API boundary; `enum` on all status fields;
  uniqueness enforced by unique indexes (not app logic alone).
- **Retention:** academic history (`calculation_history`, `exam_results`) never
  auto-deleted; user deletion → anonymize PII, retain anonymized aggregates;
  soft-deleted content purgeable after admin-approved policy (default 90 days).
- Backups: daily automated MongoDB dumps (deployment guide §4).
