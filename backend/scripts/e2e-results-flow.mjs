// E2E: BTEB result checker flow against live services.
// Covers: admin PDF upload -> parse preview -> import -> student roll check ->
// not-found / validation / RBAC checks. Python result-service must be running.
// Prereqs:
//   - Node API on 127.0.0.1:4100 with RESULT_SERVICE_URL=http://127.0.0.1:8300
//     and RESULT_SERVICE_TOKEN=e2e-token, same MONGODB_URI as the python service
//   - result-service on 127.0.0.1:8300 with RESULT_SERVICE_TOKEN=e2e-token
//   - admin seeded (admin@diplomabondhu.test / AdminPass123)
// Run: node scripts/e2e-results-flow.mjs

import { execFileSync } from 'node:child_process';

const BASE = process.env.E2E_BASE ?? 'http://127.0.0.1:4100/api/v1';
const PDF_PATH = process.env.E2E_PDF ?? '/tmp/e2e-result.pdf';
const RUN = Date.now().toString(36);
const EXAM_ID = `e2e-eng-3rd-${RUN}`;
const results = [];

function check(name, cond, extra = '') {
  const line = `${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`;
  results.push(line);
  console.log(line);
  if (!cond) process.exitCode = 1;
}

// 1. generate a synthetic BTEB-style result PDF (4 students, one failed)
execFileSync('python3', ['-c', `
import sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
c = canvas.Canvas("${PDF_PATH}", pagesize=A4)
rows = [
    ("Roll", "Registration", "Name", "GPA", "Result"),
    ("410123", "1040123456", "Student One", "3.75", "PASS"),
    ("410124", "1040123457", "Student Two", "3.50", "PASS"),
    ("410125", "1040123458", "Student Three", "2.00", "FAIL"),
    ("410126", "1040123459", "Student Four", "4.00", "PASS"),
]
y = 800
c.setFont("Helvetica", 10)
for row in rows:
    x = 60
    for cell in row:
        c.drawString(x, y, cell)
        x += 110
    y -= 20
c.save()
print("pdf written")
`], { stdio: 'inherit' });

function makeClient() {
  let accessToken = '';
  return {
    setToken(t) { accessToken = t; },
    async req(method, path, body, rawBody, contentType) {
      const headers = { 'Content-Type': contentType ?? 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: rawBody ?? (body ? JSON.stringify(body) : undefined),
      });
      let json = null;
      try { json = await res.json(); } catch { /* no body */ }
      return { status: res.status, json };
    },
  };
}

const admin = makeClient();
const student = makeClient();

// 2. admin login
const adminLogin = await admin.req('POST', '/auth/login', {
  email: 'admin@diplomabondhu.test',
  password: 'AdminPass123',
});
check('admin login', adminLogin.status === 200 && adminLogin.json?.data?.accessToken, `status=${adminLogin.status}`);
admin.setToken(adminLogin.json.data.accessToken);

// 3. upload + parse the PDF through the Node proxy to the python service
const pdfBytes = (await import('node:fs')).readFileSync(PDF_PATH);
const form = new FormData();
form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'sample.pdf');
const parseRes = await fetch(`${BASE}/results/admin/parse`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${adminLogin.json.data.accessToken}` },
  body: form,
});
const parsed = await parseRes.json().catch(() => null);
check('parse PDF via proxy', parseRes.status === 200 && parsed?.batchId, `status=${parseRes.status} recordCount=${parsed?.recordCount}`);
check('parse found 4 records', parsed?.recordCount === 4, `recordCount=${parsed?.recordCount}`);
check('parse sample has GPA', parsed?.sample?.[0]?.gpa === 3.75, `gpa=${parsed?.sample?.[0]?.gpa}`);
const batchId = parsed?.batchId;

// 4. list batches before import
const batchesRes = await admin.req('GET', '/results/admin/batches');
const batchListed = batchesRes.json?.batches?.some((b) => b.batchId === batchId);
check('batches list includes parsed batch', batchesRes.status === 200 && batchListed, `status=${batchesRes.status}`);

// 5. import with examId
const importRes = await admin.req('POST', '/results/admin/import', {
  batchId,
  examId: EXAM_ID,
  title: 'E2E Diploma in Engineering 3rd Semester',
});
check('import batch', importRes.status === 200 && importRes.json?.inserted === 4, `status=${importRes.status} body=${JSON.stringify(importRes.json)}`);

// 6. meta lists the new exam
const metaRes = await admin.req('GET', '/results/meta');
const listedExam = metaRes.json?.data?.exams?.find((e) => e.examId === EXAM_ID);
check('meta lists imported exam', metaRes.status === 200 && listedExam?.recordCount === 4, `recordCount=${listedExam?.recordCount}`);

// 7. student registers and checks the result
const reg = await student.req('POST', '/auth/register', {
  name: 'Result Student', email: `result-${RUN}@d.test`, password: 'Password123',
});
check('student register', reg.status === 201 || reg.status === 200, `status=${reg.status}`);
student.setToken(reg.json?.data?.accessToken);

const checkRes = await student.req('GET', `/results/check?examId=${EXAM_ID}&roll=410123`);
check('student checks result by roll', checkRes.status === 200 && checkRes.json?.data?.gpa === 3.75, `gpa=${checkRes.json?.data?.gpa}`);
check('result includes name', checkRes.json?.data?.name === 'Student One', `name=${checkRes.json?.data?.name}`);
check('result includes disclaimer', typeof checkRes.json?.data?.disclaimer === 'string' && checkRes.json.data.disclaimer.includes('not an official BTEB service'));

// 8. failed student row
const failRes = await student.req('GET', `/results/check?examId=${EXAM_ID}&roll=410125`);
check('failed status returned', failRes.status === 200 && failRes.json?.data?.status === 'fail', `status=${failRes.json?.data?.status}`);

// 9. not found + validation
const missRes = await student.req('GET', `/results/check?examId=${EXAM_ID}&roll=999999`);
check('unknown roll -> 404', missRes.status === 404, `status=${missRes.status}`);
const badRes = await student.req('GET', `/results/check?examId=${EXAM_ID}&roll=abc`);
check('malformed roll -> 400', badRes.status === 400, `status=${badRes.status}`);

// 10. RBAC: student cannot touch admin proxy routes
const forbidden = await student.req('GET', '/results/admin/batches');
check('student blocked from admin batches', forbidden.status === 403, `status=${forbidden.status}`);

// 11. audit trail: import was recorded
const auditRes = await admin.req('GET', '/admin/audit-logs?action=results.import');
const auditHit = JSON.stringify(auditRes.json).includes(EXAM_ID);
check('import written to audit log', auditRes.status === 200 && auditHit, `status=${auditRes.status}`);

// 12. unauthenticated access blocked
const anon = await fetch(`${BASE}/results/meta`);
check('unauthenticated meta -> 401', anon.status === 401, `status=${anon.status}`);

console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} checks passed`);
