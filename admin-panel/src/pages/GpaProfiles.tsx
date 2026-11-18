import { useState } from 'react';
import { useApiMutation, useApiQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Spinner, Table } from '../components/ui';

interface Profile {
  _id: string;
  regulationId: string;
  version: number;
  status: string;
  data: unknown;
  verification?: { sourceRefs?: Array<{ title: string; url?: string; note?: string }> };
  testRun?: { passed: boolean; runAt: string; results: Array<{ name: string; passed: boolean; detail?: string }> };
  updatedAt: string;
}

interface Doc { _id: string; name?: string; label?: string }

const STATUS_TONE: Record<string, 'slate' | 'green' | 'red' | 'amber' | 'blue'> = {
  draft: 'slate',
  verification: 'blue',
  testing: 'blue',
  approved: 'amber',
  published: 'green',
  retired: 'red'
};

const NEXT_ACTIONS: Record<string, string[]> = {
  draft: ['verification'],
  verification: ['testing', 'draft'],
  testing: ['approved', 'verification'],
  approved: ['published', 'testing'],
  published: ['retired'],
  retired: []
};

export function GpaProfilesPage() {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [regulationId, setRegulationId] = useState('');
  const [dataJson, setDataJson] = useState('');
  const [sourceRefsJson, setSourceRefsJson] = useState('[]');
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ passed: boolean; checks: Array<{ name: string; passed: boolean; detail?: string }> } | null>(null);

  const list = useApiQuery<{ items: Profile[] }>(['gpa', 'admin', 'profiles'], '/gpa/admin/profiles');
  const detail = useApiQuery<Profile>(['gpa', 'profile', detailId], detailId ? `/gpa/admin/profiles/${detailId}` : null);
  const regulations = useApiQuery<{ items: Doc[] }>(['academic', 'regulations'], '/academic/regulations?limit=100');

  const invalidate = [['gpa', 'admin', 'profiles'], ['gpa', 'profile', detailId], ['admin', 'dashboard']];
  const createMut = useApiMutation((body: unknown) => api('/gpa/admin/profiles', { method: 'POST', body }), [['gpa', 'admin', 'profiles']]);
  const transitionMut = useApiMutation((v: { id: string; to: string }) => api(`/gpa/admin/profiles/${v.id}/transition`, { method: 'POST', body: { to: v.to } }), invalidate);
  const testRunMut = useApiMutation(
    (id: string) => api<{ passed: boolean; checks: Array<{ name: string; passed: boolean; detail?: string }> }>(`/gpa/admin/profiles/${id}/test-run`, { method: 'POST' }),
    invalidate
  );
  const showTestResult = (res: { data: { passed: boolean; checks: Array<{ name: string; passed: boolean; detail?: string }> } }) => setTestResult(res.data);

  const run = <TVars,>(fn: () => void, mut: { mutate: (v: TVars, o?: { onError?: (e: Error) => void; onSuccess?: () => void }) => void }, vars: TVars) => {
    setActionError(null);
    mut.mutate(vars, { onError: (e: Error) => setActionError(e.message), onSuccess: fn });
  };

  const submitCreate = () => {
    setFormError(null);
    let data: unknown;
    let refs: unknown;
    try {
      data = JSON.parse(dataJson);
    } catch {
      setFormError('Profile data is not valid JSON');
      return;
    }
    try {
      refs = JSON.parse(sourceRefsJson);
    } catch {
      setFormError('Source references are not valid JSON');
      return;
    }
    if (!regulationId) { setFormError('Select a regulation'); return; }
    createMut.mutate(
      { regulationId, data, verification: { sourceRefs: refs } },
      { onSuccess: () => setShowCreate(false), onError: (e) => setFormError(e.message) }
    );
  };

  return (
    <div>
      <PageHeader
        title="GPA Calculation Profiles"
        subtitle="Draft → Verification → Testing → Approval → Publish workflow. Unverified profiles can never go live."
        actions={<Button onClick={() => setShowCreate(true)}>New profile</Button>}
      />

      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No calculation profiles yet." /> : (
        <Card>
          <Table head={['Regulation', 'Version', 'Status', 'Test Run', 'Updated', 'Actions']}>
            {list.data.data.items.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">{String(p.regulationId).slice(-8)}</td>
                <td className="px-4 py-3 text-slate-500">v{p.version}</td>
                <td className="px-4 py-3"><Badge tone={STATUS_TONE[p.status] ?? 'slate'}>{p.status}</Badge></td>
                <td className="px-4 py-3">
                  {p.testRun ? <Badge tone={p.testRun.passed ? 'green' : 'red'}>{p.testRun.passed ? 'passed' : 'failed'}</Badge> : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(p.updatedAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => setDetailId(p._id)}>View</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setActionError(null);
                        testRunMut.mutate(p._id, {
                          onSuccess: showTestResult,
                          onError: (e: Error) => setActionError(e.message)
                        });
                      }}
                    >
                      Test run
                    </Button>
                    {(NEXT_ACTIONS[p.status] ?? []).map((to) => (
                      <Button key={to} variant={to === 'published' ? 'primary' : 'secondary'} onClick={() => run(() => undefined, transitionMut, { id: p._id, to })}>
                        → {to}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {testResult ? (
        <Modal title={`Test run: ${testResult.passed ? 'ALL PASSED' : 'FAILURES FOUND'}`} onClose={() => setTestResult(null)}>
          <ul className="space-y-2 text-sm">
            {testResult.checks.map((c) => (
              <li key={c.name} className="flex items-start gap-2">
                <span className={c.passed ? 'text-emerald-600' : 'text-red-600'}>{c.passed ? '✓' : '✗'}</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {c.name}
                  {c.detail ? <span className="block text-xs text-slate-400">{c.detail}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}

      {detailId ? (
        <Modal title="Profile detail" onClose={() => setDetailId(null)}>
          {detail.isLoading ? <Spinner /> : detail.isError ? <ErrorState message={detail.error.message} /> : null}
          {detail.data ? (
            <div className="space-y-3 text-sm">
              <p>
                <Badge tone={STATUS_TONE[detail.data.data.status] ?? 'slate'}>{detail.data.data.status}</Badge>{' '}
                <span className="text-slate-500">v{detail.data.data.version}</span>
              </p>
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">Verification sources</p>
                {(detail.data.data.verification?.sourceRefs ?? []).length === 0 ? (
                  <p className="text-slate-500">No official sources recorded.</p>
                ) : (
                  <ul className="list-inside list-disc text-slate-600 dark:text-slate-300">
                    {detail.data.data.verification?.sourceRefs?.map((s, i) => (
                      <li key={i}>{s.title}{s.url ? <> — <span className="break-all">{s.url}</span></> : null}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Profile data</p>
                <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(detail.data.data.data, null, 2)}</pre>
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}

      {showCreate ? (
        <Modal title="New calculation profile" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            {formError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div> : null}
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Regulation <span className="text-red-500">*</span></span>
              <select
                value={regulationId}
                onChange={(e) => setRegulationId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
              >
                <option value="">Select…</option>
                {(regulations.data?.data.items ?? []).map((r) => (
                  <option key={r._id} value={r._id}>{r.name ?? r._id}</option>
                ))}
              </select>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Profile data JSON <span className="text-red-500">*</span>{' '}
                <span className="font-normal text-slate-400">(grading table, assessments, pass rules, CGPA strategy)</span>
              </span>
              <textarea
                rows={10}
                value={dataJson}
                onChange={(e) => setDataJson(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
                placeholder='{"grading": {"scale": 4, "table": […]}, "assessments": {…}, "passRules": {…}, "cgpa": {…}}'
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Official source references (JSON array)</span>
              <textarea
                rows={3}
                value={sourceRefsJson}
                onChange={(e) => setSourceRefsJson(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
                placeholder='[{"title": "BTEB 2016 Grading Circular", "url": "https://…", "note": "verified by owner"}]'
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={submitCreate} disabled={createMut.isPending}>Create draft</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
