// E2E: student (mobile app) flow against a live server.
// Covers every API surface the Flutter app uses:
// auth -> profile -> settings -> notifications -> library -> exams -> gpa ->
// planner -> community -> security checks.
// Prereq: server on 127.0.0.1:4100 with in-memory/standalone Mongo (see mongo-standalone.mjs).
// Run: node scripts/e2e-student-flow.mjs

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4100/api/v1';
const RUN = Date.now().toString(36);
const results = [];
function check(name, cond, extra = '') {
  const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`;
  results.push(line);
  console.log(line);
  if (!cond) process.exitCode = 1;
}

function makeClient() {
  let accessToken = '';
  let refreshToken = '';
  return {
    get token() { return accessToken; },
    get refreshToken() { return refreshToken; },
    setTokens(a, r) { accessToken = a; refreshToken = r; },
    async req(method, path, body) {
      const headers = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      let json = null;
      try { json = await res.json(); } catch { /* no body */ }
      return { status: res.status, json };
    },
  };
}

const admin = makeClient();
const student = makeClient();

// ---------- admin seeds content ----------
const adminLogin = await admin.req('POST', '/auth/login', {
  email: 'admin@diplomabondhu.test',
  password: 'AdminPass123',
});
check('admin login', adminLogin.status === 200 && adminLogin.json?.data?.accessToken, `status=${adminLogin.status}`);
admin.setTokens(adminLogin.json.data.accessToken, adminLogin.json.data.refreshToken);

const material = await admin.req('POST', '/materials/admin/materials', {
  type: 'book',
  title: `Physics Textbook Chapter 1 (${RUN})`,
  titleBn: 'পদার্থবিজ্ঞান বই অধ্যায় ১',
  description: 'E2E seed material',
  payload: { externalUrl: 'https://example.com/physics-ch1.pdf', pageCount: 120 },
  downloadAllowed: true,
});
check('admin create material', material.status === 201, `status=${material.status}`);
const materialId = material.json?.data?.item?._id ?? material.json?.data?.item?.id;
const publishMaterial = await admin.req('POST', `/materials/admin/materials/${materialId}/publish`);
check('admin publish material', publishMaterial.status === 200 && publishMaterial.json?.data?.status === 'published');

const q1 = await admin.req('POST', '/exams/admin/questions', {
  text: 'What is the SI unit of force?',
  options: [
    { key: 'A', text: 'Joule' },
    { key: 'B', text: 'Newton' },
    { key: 'C', text: 'Pascal' },
    { key: 'D', text: 'Watt' },
  ],
  correctKey: 'B',
  explanation: 'Force is measured in Newtons (kg·m/s²).',
  marks: 1,
});
const q2 = await admin.req('POST', '/exams/admin/questions', {
  text: 'Water boils at what temperature at sea level?',
  options: [
    { key: 'A', text: '90°C' },
    { key: 'B', text: '100°C' },
    { key: 'C', text: '110°C' },
    { key: 'D', text: '80°C' },
  ],
  correctKey: 'B',
  marks: 1,
});
check('admin create questions', q1.status === 201 && q2.status === 201, `q1=${q1.status} q2=${q2.status}`);
const q1Id = q1.json?.data?.item?._id;
const q2Id = q2.json?.data?.item?._id;
const pubQ1 = await admin.req('POST', `/exams/admin/questions/${q1Id}/publish`);
const pubQ2 = await admin.req('POST', `/exams/admin/questions/${q2Id}/publish`);
check('admin publish questions', pubQ1.status === 200 && pubQ2.status === 200, `q1=${pubQ1.status} q2=${pubQ2.status}`);

const exam = await admin.req('POST', '/exams/admin/exams', {
  title: `Physics Model Test (${RUN})`,
  type: 'model',
  questionIds: [q1Id, q2Id],
  durationSec: 600,
  marksPerQuestion: 1,
  negativeMarkPercent: 25,
  shuffle: false,
});
check('admin create exam', exam.status === 201, `status=${exam.status}`);
const examId = exam.json?.data?.item?._id;
const publishExam = await admin.req('POST', `/exams/admin/exams/${examId}/publish`);
check('admin publish exam', publishExam.status === 200 && publishExam.json?.data?.status === 'published');

// GPA profile: full workflow so the student calculator has a published profile
const prog = await admin.req('POST', '/academic/admin/programs', {
  name: `Diploma in Engineering ${RUN}`, code: `DIP-${RUN}`, durationSemesters: 8, isActive: true,
});
const programId = prog.json?.data?.item?._id ?? prog.json?.data?.item?.id;
const reg = await admin.req('POST', '/academic/admin/regulations', {
  programId, year: 2022, name: `Regulation 2022 (${RUN})`, status: 'draft', officialRefs: [],
});
const regulationId = reg.json?.data?.item?._id ?? reg.json?.data?.item?.id;
const profile = await admin.req('POST', '/gpa/admin/profiles', {
  regulationId,
  data: {
    grading: { scale: 4, table: [
      { minPercent: 80, maxPercent: 100, grade: 'A+', point: 4 },
      { minPercent: 70, maxPercent: 79, grade: 'A', point: 3.75 },
      { minPercent: 60, maxPercent: 69, grade: 'A-', point: 3.5 },
      { minPercent: 50, maxPercent: 59, grade: 'B', point: 3 },
      { minPercent: 40, maxPercent: 49, grade: 'C', point: 2 },
      { minPercent: 33, maxPercent: 39, grade: 'D', point: 1 },
      { minPercent: 0, maxPercent: 32, grade: 'F', point: 0 },
    ]},
    assessments: { theory: [{ key: 'final', label: 'Final Exam', maxMarks: 100, weightPercent: 100 }] },
    passRules: { minSubjectGrade: 'D' },
    cgpa: { strategy: 'credit_weighted', semesterWeights: [1, 2].map((n) => ({ semesterNumber: n, percent: 50 })), classBands: [{ minCgpa: 3.5, label: 'First Class' }] },
    special: {},
  },
  verification: { sourceRefs: [{ title: 'BTEB 2022 grading rules (E2E placeholder)' }] },
});
const profileId = profile.json?.data?.id;
const testRun = await admin.req('POST', `/gpa/admin/profiles/${profileId}/test-run`);
check('GPA profile test-run passes', testRun.status === 200 && testRun.json?.data?.passed === true, `body=${JSON.stringify(testRun.json?.data?.checks?.filter((c) => !c.passed))}`);
let publishProfile = null;
for (const to of ['verification', 'testing', 'approved', 'published']) {
  publishProfile = await admin.req('POST', `/gpa/admin/profiles/${profileId}/transition`, { to });
}
check('GPA profile published (workflow gates passed)', publishProfile.status === 200, `status=${publishProfile.status}`);

// ---------- student registration & session ----------
const STUDENT_EMAIL = `student-${RUN}@e2e.test`;
const STUDENT_PASSWORD = 'StudentPass123';
const register = await student.req('POST', '/auth/register', {
  name: `Student ${RUN}`,
  email: STUDENT_EMAIL,
  password: STUDENT_PASSWORD,
  phone: '01712345678',
});
check('register returns 201', register.status === 201, `status=${register.status}`);
check('register body has accessToken (mobile contract)', Boolean(register.json?.data?.accessToken));
check('register body has refreshToken (mobile contract)', Boolean(register.json?.data?.refreshToken));
student.setTokens(register.json.data.accessToken, register.json.data.refreshToken);

const badLogin = await student.req('POST', '/auth/login', { email: `student-${RUN}@e2e.test`, password: 'WrongPass123' });
check('wrong password rejected with 401', badLogin.status === 401, `status=${badLogin.status}`);

const refresh = await student.req('POST', '/auth/refresh', { refreshToken: student.refreshToken });
check('body-based refresh works (mobile path)', refresh.status === 200 && refresh.json?.data?.accessToken, `status=${refresh.status}`);
student.setTokens(refresh.json.data.accessToken, refresh.json.data.refreshToken);

const me = await student.req('GET', '/users/me');
check('GET /users/me', me.status === 200 && me.json?.data?.user?.email === `student-${RUN}@e2e.test`);
check('me has no password hash leaked', !JSON.stringify(me.json?.data).includes('passwordHash') && !JSON.stringify(me.json?.data).includes('password_hash'));

const patchMe = await student.req('PATCH', '/users/me', { name: `Student ${RUN} Updated` });
check('PATCH /users/me', patchMe.status === 200 && patchMe.json?.data?.user?.name === `Student ${RUN} Updated`);

const academic = await student.req('PATCH', '/users/me/academic-info', { programId, regulationId });
check('PATCH /users/me/academic-info', academic.status === 200, `status=${academic.status} body=${JSON.stringify(academic.json)}`);

const prefs = await student.req('PATCH', '/users/me/preferences', { language: 'bn', theme: 'dark' });
check('PATCH /users/me/preferences', prefs.status === 200 && prefs.json?.data?.user?.prefs?.language === 'bn');

const fcmAdd = await student.req('POST', '/users/me/fcm-tokens', { token: `fcm-token-${RUN}-0123456789` });
check('POST /users/me/fcm-tokens', [200, 201].includes(fcmAdd.status), `status=${fcmAdd.status}`);
const fcmDel = await student.req('DELETE', '/users/me/fcm-tokens', { token: `fcm-token-${RUN}-0123456789` });
check('DELETE /users/me/fcm-tokens', fcmDel.status === 200, `status=${fcmDel.status}`);

// ---------- settings ----------
const settings = await student.req('GET', '/settings/app');
check('GET /settings/app', settings.status === 200 && Array.isArray(settings.json?.data?.homepageSections));

// ---------- notifications ----------
const notifPrefs = await student.req('GET', '/notifications/preferences');
check('GET /notifications/preferences', notifPrefs.status === 200 && typeof notifPrefs.json?.data?.categories === 'object');
const notifPrefsPut = await student.req('PUT', '/notifications/preferences', {
  categories: { material: true, exam: true, community: false },
});
check('PUT /notifications/preferences', notifPrefsPut.status === 200, `status=${notifPrefsPut.status}`);
const notifList = await student.req('GET', '/notifications');
check('GET /notifications', notifList.status === 200 && Array.isArray(notifList.json?.data?.items));
const readAll = await student.req('POST', '/notifications/read-all');
check('POST /notifications/read-all', readAll.status === 200);

// ---------- library ----------
const list = await student.req('GET', '/materials?type=book&page=1&limit=10');
check('GET /materials (list + meta)', list.status === 200 && Array.isArray(list.json?.data?.items) && list.json?.meta?.total >= 1);
const found = list.json.data.items.find((m) => m._id === materialId);
check('published material visible to student', Boolean(found));

const detail = await student.req('GET', `/materials/${materialId}`);
check('GET /materials/:id (item key)', detail.status === 200 && detail.json?.data?.item?._id === materialId);

const recent = await student.req('GET', '/materials/recent');
check('GET /materials/recent', recent.status === 200 && Array.isArray(recent.json?.data?.items));

const search = await student.req('GET', `/materials?q=${encodeURIComponent('Physics Textbook')}`);
check('GET /materials?q= search', search.status === 200 && search.json?.data?.items.some((m) => m._id === materialId));

const bookmark = await student.req('POST', `/materials/${materialId}/bookmark`);
check('POST bookmark', [200, 201].includes(bookmark.status), `status=${bookmark.status}`);
const bookmarks = await student.req('GET', '/materials/bookmarks');
check('GET /materials/bookmarks contains material', bookmarks.status === 200 && bookmarks.json?.data?.items?.some((m) => m._id === materialId));
const unbookmark = await student.req('DELETE', `/materials/${materialId}/bookmark`);
check('DELETE bookmark', unbookmark.status === 200);

const report = await student.req('POST', `/materials/${materialId}/report`, { reason: 'Download link seems broken' });
check('POST material report', report.status === 200 || report.status === 201, `status=${report.status}`);

// ---------- exams ----------
const examList = await student.req('GET', '/exams');
check('GET /exams', examList.status === 200 && examList.json?.data?.items?.some((e) => e._id === examId));

const examDetail = await student.req('GET', `/exams/${examId}`);
const examData = examDetail.json?.data;
check('GET /exams/:id (exam + questions keys)', examDetail.status === 200 && examData?.exam?._id === examId && Array.isArray(examData?.questions));
check('questions have NO correctKey (server strips answers)', examData.questions.every((q) => !('correctKey' in q)), JSON.stringify(examData.questions[0] && Object.keys(examData.questions[0])));

const start = await student.req('POST', `/exams/${examId}/attempts`);
const attempt = start.json?.data;
check('POST start attempt (attemptId + deadlineAt)', [200, 201].includes(start.status) && attempt?.attemptId && Boolean(attempt?.deadlineAt), `status=${start.status}`);
check('started attempt questions stripped too', (attempt?.questions ?? []).every((q) => !('correctKey' in q)));

const answer = await student.req('PATCH', `/exams/attempts/${attempt.attemptId}/answer`, { questionId: q1Id, selectedKey: 'B' });
check('PATCH answer', answer.status === 200, `status=${answer.status} body=${JSON.stringify(answer.json)}`);
const answer2 = await student.req('PATCH', `/exams/attempts/${attempt.attemptId}/answer`, { questionId: q2Id, selectedKey: 'A' });
check('PATCH second answer (wrong on purpose)', answer2.status === 200);

const submit = await student.req('POST', `/exams/attempts/${attempt.attemptId}/submit`);
const scoring = submit.json?.data?.scoring;
check('POST submit (server-side scoring shape)', submit.status === 200 && typeof scoring?.marksObtained === 'number', `status=${submit.status} scoring=${JSON.stringify(scoring)}`);
check('scoring correct: 1 right + 1 wrong with 25% negative = 0.75', scoring?.marksObtained === 0.75, `marksObtained=${scoring?.marksObtained}`);

const resubmit = await student.req('POST', `/exams/attempts/${attempt.attemptId}/submit`);
check('double submit handled (alreadySubmitted)', resubmit.json?.data?.alreadySubmitted === true || resubmit.status === 409, `status=${resubmit.status}`);

const result = await student.req('GET', `/exams/attempts/${attempt.attemptId}/result`);
const resultData = result.json?.data;
check('GET result (percent + perQuestion)', result.status === 200 && typeof resultData?.scoring?.percent === 'number' && Array.isArray(resultData?.perQuestion));
check('result perQuestion reveals correctKey only after submit', resultData.perQuestion?.every((p) => 'correctKey' in p));

const history = await student.req('GET', '/exams/history');
check('GET /exams/history', history.status === 200 && Array.isArray(history.json?.data?.items) && history.json.data.items.length >= 1);

const stats = await student.req('GET', '/exams/stats');
check('GET /exams/stats', stats.status === 200 && stats.json?.data?.attempts >= 1, JSON.stringify(stats.json?.data));

// ---------- GPA ----------
const profiles = await student.req('GET', '/gpa/profiles');
check('GET /gpa/profiles (published only)', profiles.status === 200 && profiles.json?.data?.items?.some((p) => (p._id ?? p.id) === profileId));

const structure = await student.req('GET', `/gpa/profiles/${profileId}/structure`);
check('GET structure (grading/assessments/cgpa)', structure.status === 200 && Array.isArray(structure.json?.data?.grading?.table) && structure.json?.data?.cgpa?.strategy === 'credit_weighted');

const SEM_ID = () => Array.from({ length: 24 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
const sem = await student.req('POST', '/gpa/calculate/semester', {
  profileId,
  inputMode: 'marks',
  subjects: [
    { subjectId: SEM_ID(), code: 'MATH-1', name: 'Mathematics I', credits: 4, subjectType: 'theory', marks: { final: 75 } },
    { subjectId: SEM_ID(), code: 'PHY-1', name: 'Physics I', credits: 3, subjectType: 'theory', marks: { final: 58 } },
  ],
});
const semData = sem.json?.data;
check('POST calculate/semester (marks mode)', sem.status === 200 && typeof semData?.gpa === 'number', `status=${sem.status} body=${JSON.stringify(sem.json)}`);
check('semester result has per-subject grade/point/status', Array.isArray(semData?.subjects) && semData.subjects.every((s) => 'grade' in s && 'point' in s && 'status' in s));

const semGrade = await student.req('POST', '/gpa/calculate/semester', {
  profileId,
  inputMode: 'grades',
  subjects: [
    { subjectId: SEM_ID(), code: 'MATH-1', name: 'Mathematics I', credits: 4, subjectType: 'theory', grade: 'A' },
    { subjectId: SEM_ID(), code: 'PHY-1', name: 'Physics I', credits: 3, subjectType: 'theory', grade: 'B' },
  ],
});
check('POST calculate/semester (grades mode)', semGrade.status === 200 && semGrade.json?.data?.gpa > 0, `status=${semGrade.status}`);

const invalid = await student.req('POST', '/gpa/calculate/semester', {
  profileId,
  inputMode: 'grades',
  subjects: [{ subjectId: SEM_ID(), code: 'X', name: 'X', credits: 3, subjectType: 'theory', grade: 'Z' }],
});
check('invalid grade rejected with 400', invalid.status === 400, `status=${invalid.status}`);

const cgpa = await student.req('POST', '/gpa/calculate/cgpa', {
  profileId,
  semesterGpas: [
    { semesterNumber: 1, gpa: semData.gpa, credits: 7 },
    { semesterNumber: 2, gpa: 3.5, credits: 6 },
  ],
});
const cgpaData = cgpa.json?.data;
check('POST calculate/cgpa (credit_weighted)', cgpa.status === 200 && typeof cgpaData?.cgpa === 'number' && cgpaData?.strategy === 'credit_weighted', `status=${cgpa.status}`);

const save = await student.req('POST', '/gpa/results', {
  profileId,
  kind: 'semester',
  label: `Semester 1 (${RUN})`,
  inputs: semData.subjects,
  output: { gpa: semData.gpa },
});
check('POST /gpa/results (save history)', [200, 201].includes(save.status), `status=${save.status} body=${JSON.stringify(save.json)}`);
const savedId = save.json?.data?.id;

const gpaHistory = await student.req('GET', '/gpa/results');
check('GET /gpa/results', gpaHistory.status === 200 && Array.isArray(gpaHistory.json?.data?.items) && gpaHistory.json.data.items.length >= 1);

const target = await student.req('POST', '/gpa/target', {
  profileId,
  targetCgpa: 3.6,
  completed: [{ semesterNumber: 1, gpa: semData.gpa }],
  remainingSemesters: [2],
});
check('POST /gpa/target (estimate)', target.status === 200 && typeof target.json?.data?.requiredAverageGpa === 'number', `status=${target.status} body=${JSON.stringify(target.json)}`);

const delResult = await student.req('DELETE', `/gpa/results/${savedId}`);
check('DELETE /gpa/results/:id', delResult.status === 200, `status=${delResult.status}`);

// ---------- planner ----------
const task = await student.req('POST', '/planner/tasks', { title: `Assignment submit (${RUN})`, description: 'Physics chapter 1', dueAt: new Date(Date.now() + 86400000).toISOString() });
check('POST /planner/tasks (item key, 201)', task.status === 201 && task.json?.data?.item?._id, `status=${task.status} body=${JSON.stringify(task.json)}`);
const taskId = task.json.data.item._id;

const tasks = await student.req('GET', '/planner/tasks');
check('GET /planner/tasks (items + meta)', tasks.status === 200 && Array.isArray(tasks.json?.data?.items) && Boolean(tasks.json?.meta));

const taskDone = await student.req('PATCH', `/planner/tasks/${taskId}`, { status: 'done' });
check('PATCH task status done', taskDone.status === 200 && taskDone.json?.data?.item?.status === 'done');

const taskDel = await student.req('DELETE', `/planner/tasks/${taskId}`);
check('DELETE task', taskDel.status === 200);

const goal = await student.req('POST', '/planner/goals', { title: `GPA 3.75 this semester (${RUN})`, targetDate: new Date(Date.now() + 30 * 86400000).toISOString() });
check('POST /planner/goals', [200, 201].includes(goal.status), `status=${goal.status}`);
const goals = await student.req('GET', '/planner/goals');
check('GET /planner/goals (items key)', goals.status === 200 && Array.isArray(goals.json?.data?.items));

const routineGet = await student.req('GET', '/planner/routine');
check('GET /planner/routine', routineGet.status === 200, `status=${routineGet.status}`);

// ---------- community ----------
const accept = await student.req('POST', '/community/guidelines/accept');
check('POST /community/guidelines/accept', accept.status === 200, `status=${accept.status}`);

const post = await student.req('POST', '/community/posts', {
  title: `How to prepare for final exam? (${RUN})`,
  body: 'Semester final is coming. What is the best way to revise all subjects in two weeks?',
  type: 'question',
  tags: ['exam', 'study'],
});
check('POST /community/posts (201)', post.status === 201, `status=${post.status}`);
const postId = post.json?.data?.item?._id ?? post.json?.data?.item?.id;

const shortPost = await student.req('POST', '/community/posts', { title: 'abc', body: 'short', type: 'question', tags: [] });
check('post validation (title/body minimums) -> 400', shortPost.status === 400, `status=${shortPost.status}`);

const feed = await student.req('GET', '/community/posts');
check('GET /community/posts', feed.status === 200 && feed.json?.data?.items?.some((p) => p._id === postId));

const postDetail = await student.req('GET', `/community/posts/${postId}`);
check('GET post detail (post + comments keys)', postDetail.status === 200 && postDetail.json?.data?.post?._id === postId && Array.isArray(postDetail.json?.data?.comments));
const authorObj = postDetail.json?.data?.post?.authorId;
check('post exposes author name only (no email/phone PII)', typeof authorObj === 'object' && typeof authorObj?.name === 'string' && !JSON.stringify(authorObj).match(/email|phone|password/i), JSON.stringify(authorObj));

const comment = await student.req('POST', `/community/posts/${postId}/comments`, { text: 'Focus on previous year questions first.' });
check('POST comment', [200, 201].includes(comment.status), `status=${comment.status}`);

const like = await student.req('POST', `/community/posts/${postId}/like`);
check('POST like', like.status === 200);
const likeCount = (await student.req('GET', `/community/posts/${postId}`)).json?.data?.post?.likeCount;
check('like reflected in likeCount', likeCount >= 1, `likeCount=${likeCount}`);
const unlike = await student.req('DELETE', `/community/posts/${postId}/like`);
check('DELETE unlike', unlike.status === 200);

const communityReport = await student.req('POST', '/community/reports', { targetType: 'post', targetId: postId, reason: 'This looks like spam content' });
check('POST /community/reports', [200, 201].includes(communityReport.status), `status=${communityReport.status}`);

const guidelines = await student.req('GET', '/community/guidelines');
check('GET /community/guidelines', guidelines.status === 200);

// ---------- security: student cannot touch admin surface ----------
const adminDash = await student.req('GET', '/admin/dashboard');
check('student blocked from /admin/dashboard (403)', adminDash.status === 403, `status=${adminDash.status}`);
const adminCreate = await student.req('POST', '/materials/admin/materials', {
  type: 'book', title: 'Hacked material', payload: { externalUrl: 'https://example.com/x.pdf' },
});
check('student blocked from content creation (403)', adminCreate.status === 403, `status=${adminCreate.status}`);
const gpaAdmin = await student.req('GET', '/gpa/admin/profiles');
check('student blocked from GPA admin (403)', gpaAdmin.status === 403, `status=${gpaAdmin.status}`);

// ---------- password reset (forgot -> admin code -> reset -> login) ----------
const forgotKnown = await student.req('POST', '/auth/forgot-password', { email: STUDENT_EMAIL });
check('POST /auth/forgot-password known email (202)', forgotKnown.status === 202, `status=${forgotKnown.status}`);
const forgotUnknown = await student.req('POST', '/auth/forgot-password', { email: `ghost-${RUN}@example.com` });
check('POST /auth/forgot-password unknown email (202, no enumeration)', forgotUnknown.status === 202, `status=${forgotUnknown.status}`);

const studentsList = await admin.req('GET', `/admin/students?q=${encodeURIComponent(STUDENT_EMAIL)}`);
const resetStudentId = studentsList.json?.data?.items?.[0]?._id;
const issueReset = await admin.req('POST', `/admin/students/${resetStudentId}/password-reset`);
check('admin issues one-time reset code (200, token present)', issueReset.status === 200 && !!issueReset.json?.data?.resetToken, `status=${issueReset.status}`);
const resetCode = issueReset.json?.data?.resetToken;

const resetBad = await student.req('POST', '/auth/reset-password', { token: 'x'.repeat(43), newPassword: 'NewPass12345' });
check('reset with invalid code (400)', resetBad.status === 400, `status=${resetBad.status}`);
const resetOk = await student.req('POST', '/auth/reset-password', { token: resetCode, newPassword: 'NewPass12345' });
check('reset with valid code (200)', resetOk.status === 200, `status=${resetOk.status}`);
const resetReuse = await student.req('POST', '/auth/reset-password', { token: resetCode, newPassword: 'OtherPass12345' });
check('reset code single-use (400 on reuse)', resetReuse.status === 400, `status=${resetReuse.status}`);
const oldLogin = await student.req('POST', '/auth/login', { email: STUDENT_EMAIL, password: STUDENT_PASSWORD });
check('old password rejected after reset (401)', oldLogin.status === 401, `status=${oldLogin.status}`);
const newLogin = await student.req('POST', '/auth/login', { email: STUDENT_EMAIL, password: 'NewPass12345' });
check('login with new password (200)', newLogin.status === 200, `status=${newLogin.status}`);

// ---------- deletion request ----------
const deletion = await student.req('POST', '/users/me/deletion-request');
check('POST /users/me/deletion-request (202)', deletion.status === 202, `status=${deletion.status}`);

// ---------- summary ----------
console.log('\n=== Student flow E2E results ===');
for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
