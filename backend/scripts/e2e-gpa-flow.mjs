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
accessToken = login.json?.data?.accessToken;
check('admin login', login.status === 200);

const prog = await req('POST', '/academic/admin/programs', { name: `Textile ${RUN}`, code: `TX-${RUN}`, durationSemesters: 8, isActive: true });
const programId = prog.json?.data?.item?._id;
const reg = await req('POST', '/academic/admin/regulations', { programId, year: 2016, name: `Reg 2016 (${RUN})`, status: 'draft', officialRefs: [{ title: 'BTEB 2016 grading circular (placeholder)' }] });
const regulationId = reg.json?.data?.item?._id;
check('program + regulation created', !!programId && !!regulationId);

const profile = await req('POST', '/gpa/admin/profiles', {
  regulationId,
  data: {
    grading: { scale: 4, table: [
      { minPercent: 80, maxPercent: 100, grade: 'A+', point: 4 },
      { minPercent: 75, maxPercent: 79.99, grade: 'A', point: 3.75 },
      { minPercent: 70, maxPercent: 74.99, grade: 'A-', point: 3.5 },
      { minPercent: 65, maxPercent: 69.99, grade: 'B+', point: 3.25 },
      { minPercent: 60, maxPercent: 64.99, grade: 'B', point: 3 },
      { minPercent: 55, maxPercent: 59.99, grade: 'B-', point: 2.75 },
      { minPercent: 50, maxPercent: 54.99, grade: 'C+', point: 2.5 },
      { minPercent: 45, maxPercent: 49.99, grade: 'C', point: 2.25 },
      { minPercent: 40, maxPercent: 44.99, grade: 'D', point: 2 },
      { minPercent: 0, maxPercent: 39.99, grade: 'F', point: 0 }
    ]},
    assessments: { theory: [{ key: 'final', label: 'Final Exam', maxMarks: 100, weightPercent: 100 }] },
    passRules: { minSubjectGrade: 'D' },
    cgpa: { strategy: 'credit_weighted', semesterWeights: [1,2,3,4,5,6,7,8].map((n) => ({ semesterNumber: n, percent: 12.5 })), classBands: [{ minCgpa: 3.5, label: 'First Class' }] },
    special: {}
  },
  verification: { sourceRefs: [{ title: 'BTEB 2016 grading rules (placeholder — replace with verified doc)' }] }
});
const profileId = profile.json?.data?.id;
check('GPA profile draft created', [200, 201].includes(profile.status) && !!profileId, `status=${profile.status}`);

const testRun = await req('POST', `/gpa/admin/profiles/${profileId}/test-run`);
check('test-run passes', testRun.json?.data?.passed === true, JSON.stringify(testRun.json?.data?.checks?.filter((c) => !c.passed) ?? []));

const blocked = await req('POST', `/gpa/admin/profiles/${profileId}/transition`, { to: 'published' });
check('draft → published blocked', blocked.status >= 400, `status=${blocked.status}`);

for (const to of ['verification', 'testing', 'approved', 'published']) {
  const t = await req('POST', `/gpa/admin/profiles/${profileId}/transition`, { to });
  check(`transition → ${to}`, t.status === 200, `status=${t.status}`);
}

cookie = ''; accessToken = '';
const stuEmail = `stu2-${RUN}@diplomabondhu.test`;
const reg2 = await req('POST', '/auth/register', { name: 'Flow Student', email: stuEmail, password: 'StudentPass123' }, false);
check('student registered', [200, 201].includes(reg2.status));
const stuLogin = await req('POST', '/auth/login', { email: stuEmail, password: 'StudentPass123' }, false);
accessToken = stuLogin.json?.data?.accessToken;
check('student login', stuLogin.status === 200);

const sid = '507f1f77bcf86cd799439011';
const calc = await req('POST', '/gpa/calculate/semester', {
  profileId,
  inputMode: 'marks',
  subjects: [
    { subjectId: sid, code: 'Math-1', name: 'Mathematics-1', credits: 3, subjectType: 'theory', marks: { final: 85 } },
    { subjectId: '507f1f77bcf86cd799439012', code: 'Phy-1', name: 'Physics-1', credits: 3, subjectType: 'theory', marks: { final: 72 } },
    { subjectId: '507f1f77bcf86cd799439013', code: 'Eng-1', name: 'English-1', credits: 2, subjectType: 'theory', marks: { final: 40 } }
  ]
});
check('semester GPA calculation (marks mode)', calc.status === 200, JSON.stringify(calc.json?.error ?? {}));
const gpa = calc.json?.data?.gpa;
check('GPA value plausible', typeof gpa === 'number' && gpa >= 2 && gpa <= 4, `gpa=${gpa}`);
check('subject breakdown included', Array.isArray(calc.json?.data?.subjects) && calc.json.data.subjects.length === 3);

const gradeMode = await req('POST', '/gpa/calculate/semester', {
  profileId,
  inputMode: 'grades',
  subjects: [
    { subjectId: sid, code: 'Math-1', name: 'Mathematics-1', credits: 3, subjectType: 'theory', grade: 'A+' },
    { subjectId: '507f1f77bcf86cd799439012', code: 'Phy-1', name: 'Physics-1', credits: 3, subjectType: 'theory', grade: 'A' },
    { subjectId: '507f1f77bcf86cd799439013', code: 'Eng-1', name: 'English-1', credits: 2, subjectType: 'theory', grade: 'C' }
  ]
});
check('semester GPA calculation (grade mode)', gradeMode.status === 200, JSON.stringify(gradeMode.json?.error ?? {}));

const cgpa = await req('POST', '/gpa/calculate/cgpa', {
  profileId,
  semesterGpas: [
    { semesterNumber: 1, gpa: gpa ?? 0, credits: 20 },
    { semesterNumber: 2, gpa: 3.5, credits: 20 }
  ]
});
check('CGPA calculation', cgpa.status === 200, JSON.stringify(cgpa.json?.data ?? cgpa.json?.error ?? {}));

const saved = await req('POST', '/gpa/results', { kind: 'semester', profileId, inputs: { inputMode: 'marks' }, output: calc.json?.data ?? {}, label: `Semester 1 (${RUN})` });
check('save result to history', [200, 201].includes(saved.status), `status=${saved.status}`);
const history = await req('GET', '/gpa/results');
check('result history retrievable', history.status === 200 && (history.json?.data?.items?.length ?? 0) >= 1);

console.log(results.join('\n'));
