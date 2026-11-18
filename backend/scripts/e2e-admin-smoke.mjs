const BASE = 'http://127.0.0.1:4100/api/v1';
const RUN = Date.now().toString(36);
let cookie = '';
let accessToken = '';
const results = [];
function check(name, cond, extra = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}
async function req(method, path, body, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

const login = await req('POST', '/auth/login', { email: 'admin@diplomabondhu.test', password: 'AdminPass123' }, false);
check('admin login', login.status === 200 && login.json?.data?.accessToken, `status=${login.status}`);
accessToken = login.json?.data?.accessToken;
check('refresh cookie issued', cookie.includes('refreshToken='));

const dash = await req('GET', '/admin/dashboard');
check('admin dashboard', dash.status === 200 && dash.json?.data?.students, `status=${dash.status}`);

const prog = await req('POST', '/academic/admin/programs', { name: `Diploma in Engineering ${RUN}`, code: `DIP-${RUN}`, durationSemesters: 8, isActive: true });
check('create program', [200, 201].includes(prog.status), `status=${prog.status} body=${JSON.stringify(prog.json)}`);
const programId = prog.json?.data?.item?._id ?? prog.json?.data?._id;

const reg = await req('POST', '/academic/admin/regulations', { programId, year: 2022, name: `Regulation 2022 (${RUN})`, status: 'draft', officialRefs: [] });
check('create regulation', [200, 201].includes(reg.status), `status=${reg.status}`);
const regulationId = reg.json?.data?.item?._id ?? reg.json?.data?._id;

const profile = await req('POST', '/gpa/admin/profiles', {
  regulationId,
  data: {
    grading: { scale: 4, table: [
      { minPercent: 80, maxPercent: 100, grade: 'A+', point: 4 },
      { minPercent: 70, maxPercent: 79, grade: 'A', point: 3.75 },
      { minPercent: 60, maxPercent: 69, grade: 'A-', point: 3.5 },
      { minPercent: 50, maxPercent: 59, grade: 'B', point: 3 },
      { minPercent: 40, maxPercent: 49, grade: 'C', point: 2 },
      { minPercent: 33, maxPercent: 39, grade: 'D', point: 1 },
      { minPercent: 0, maxPercent: 32, grade: 'F', point: 0 }
    ]},
    assessments: { default: [{ key: 'final', label: 'Final Exam', maxMarks: 100, weightPercent: 100 }] },
    passRules: { minSubjectGrade: 'D' },
    cgpa: { strategy: 'credit_weighted', semesterWeights: [1,2,3,4,5,6,7,8].map((n) => ({ semesterNumber: n, percent: 12.5 })), classBands: [{ minCgpa: 3.5, label: 'First Class' }] },
    special: {}
  },
  verification: { sourceRefs: [{ title: 'BTEB 2022 grading rules (placeholder — must be replaced with verified doc)' }] }
});
check('create GPA profile draft', [200, 201].includes(profile.status), `status=${profile.status}`);
const profileId = profile.json?.data?.id;

const testRun = await req('POST', `/gpa/admin/profiles/${profileId}/test-run`);
check('profile test-run', testRun.status === 200 && testRun.json?.data?.passed === true, JSON.stringify(testRun.json?.data ?? testRun.json));

const early = await req('POST', `/gpa/admin/profiles/${profileId}/transition`, { to: 'published' });
check('draft cannot jump straight to published', early.status >= 400, `status=${early.status}`);

const toVerification = await req('POST', `/gpa/admin/profiles/${profileId}/transition`, { to: 'verification' });
check('draft → verification (no test evidence gate)', toVerification.status === 200, `status=${toVerification.status}`);

const before = cookie;
const refresh = await req('POST', '/auth/refresh', {}, true);
check('refresh via httpOnly cookie', refresh.status === 200 && !!refresh.json?.data?.accessToken, `status=${refresh.status}`);
accessToken = refresh.json?.data?.accessToken ?? accessToken;

const stuEmail = `stu-${RUN}@diplomabondhu.test`;
const stu = await req('POST', '/auth/register', { name: 'Test Student', email: stuEmail, password: 'StudentPass123' }, false);
check('student registration (for announcement targeting)', [200, 201].includes(stu.status), `status=${stu.status}`);

const ann = await req('POST', '/notifications/admin/announcements', { title: `Welcome ${RUN}`, body: 'DiplomaBondhu admin panel e2e check', category: 'announcement', targeting: { all: true } });
check('create announcement', [200, 201].includes(ann.status), `status=${ann.status}`);
const annId = ann.json?.data?.item?._id ?? ann.json?.data?._id;
const pub = await req('POST', `/notifications/admin/announcements/${annId}/publish`);
check('publish announcement', [200, 201].includes(pub.status), `status=${pub.status}`);

const logs = await req('GET', '/admin/audit-logs?limit=50');
const actions = (logs.json?.data?.items ?? []).map((i) => i.action);
check('audit trail captures actions', actions.includes('gpa.profile.test_run') && actions.includes('academic.EducationProgram.created'), actions.slice(0, 5).join(','));

const noAuth = await fetch(`${BASE}/admin/dashboard`);
check('dashboard requires auth', noAuth.status === 401, `status=${noAuth.status}`);

await req('POST', '/auth/logout', {}, true);
const refreshAfterLogout = await req('POST', '/auth/refresh', {}, false);
check('after logout refresh token rejected', [400, 401].includes(refreshAfterLogout.status), `status=${refreshAfterLogout.status}`);

console.log(results.join('\n'));
