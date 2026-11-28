import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery, type ListMeta } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Pagination, Select, Spinner, Table } from '../components/ui';

const IMPORT_CATEGORIES = ['banners', 'quick_access', 'study_resources', 'upcoming_exams', 'admin_notices', 'home_config'] as const;
type ImportCategory = (typeof IMPORT_CATEGORIES)[number];

interface PreviewItemResult {
  index: number;
  action: 'create' | 'update' | 'skip' | 'invalid' | 'conflict';
  reason?: string;
}

interface PreviewSummary {
  total: number;
  valid: number;
  invalid: number;
  creates: number;
  updates: number;
  skips: number;
  conflicts: number;
}

interface ImportReport {
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  restored?: number;
  kept_modified?: Array<{ slug: string; reason: string }>;
  conflicts?: Array<{ slug: string; reason: string }>;
  startedAt?: string;
  finishedAt?: string;
}

const CATEGORY_LABELS: Record<ImportCategory, string> = {
  banners: 'Banners',
  quick_access: 'Quick Access tiles',
  study_resources: 'Study resource categories',
  upcoming_exams: 'Upcoming exams',
  admin_notices: 'Admin notices',
  home_config: 'Home configuration'
};

const SAMPLE_JSON = `{
  "category": "quick_access",
  "items": [
    {
      "slug": "quick-study",
      "titleEn": "Study",
      "titleBn": "স্টাডি",
      "icon": "menu_book_rounded",
      "route": "/library",
      "bgColor": "#E0F2F1",
      "fgColor": "#00897B",
      "displayOrder": 1
    }
  ]
}`;

function ReportTable({ report }: { report: ImportReport }) {
  const conflicts = [...(report.conflicts ?? []), ...(report.kept_modified ?? [])];
  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge tone="green">created: {report.created ?? 0}</Badge>
        <Badge tone="blue">updated: {report.updated ?? 0}</Badge>
        <Badge tone="slate">skipped: {report.skipped ?? 0}</Badge>
        <Badge tone="red">failed: {report.failed ?? 0}</Badge>
        {report.restored !== undefined ? <Badge tone="green">restored: {report.restored}</Badge> : null}
      </div>
      {conflicts.length > 0 ? (
        <Table head={['Item', 'Reason']}>
          {conflicts.map((c, i) => (
            <tr key={`${c.slug}-${i}`}>
              <td className="px-4 py-2 font-mono text-xs">{c.slug}</td>
              <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{c.reason}</td>
            </tr>
          ))}
        </Table>
      ) : null}
    </div>
  );
}

const actionTone = (action: string): 'green' | 'blue' | 'slate' | 'red' | 'amber' =>
  action === 'create' ? 'green' : action === 'update' ? 'blue' : action === 'skip' ? 'slate' : action === 'conflict' ? 'amber' : 'red';

export function HomeImportExportTab() {
  const [category, setCategory] = useState<ImportCategory>('quick_access');
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ summary: PreviewSummary; items: PreviewItemResult[]; token: string } | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ status: string; batchId: string; report?: ImportReport } | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [rollbackBatchId, setRollbackBatchId] = useState('');
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [rollbackReport, setRollbackReport] = useState<ImportReport | null>(null);

  const previewMut = useApiMutation((body: unknown) => api<{ preview: { summary: PreviewSummary; items: PreviewItemResult[] }; token: string }>('/home/import/preview', { method: 'POST', body }), []);
  const confirmMut = useApiMutation((token: string) => api<{ status: string; batchId: string; report?: ImportReport }>('/home/import/confirm', { method: 'POST', body: { token } }), [['home', 'quick_access'], ['home', 'study_resources'], ['home', 'configuration'], ['home', 'import-history']]);
  const rollbackMut = useApiMutation((batchId: string) => api<ImportReport>(`/home/import/rollback/${batchId}`, { method: 'POST' }), [['home', 'quick_access'], ['home', 'study_resources'], ['home', 'configuration'], ['home', 'import-history']]);

  const runPreview = () => {
    setParseError(null);
    setConfirmError(null);
    setConfirmed(null);
    setPreview(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setParseError('The text is not valid JSON.');
      return;
    }
    const obj = parsed as { category?: string; items?: unknown[] };
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.items)) {
      setParseError('JSON must look like {"category": "...", "items": [ … ]} — see the example.');
      return;
    }
    if (!IMPORT_CATEGORIES.includes(obj.category as ImportCategory)) {
      setParseError(`"category" must be one of: ${IMPORT_CATEGORIES.join(', ')}.`);
      return;
    }
    if (obj.items.length > 500) {
      setParseError('Maximum 500 documents per import batch.');
      return;
    }
    previewMut.mutate(
      { category: obj.category, items: obj.items },
      {
        onSuccess: (d) => setPreview({ summary: d.data.preview.summary, items: d.data.preview.items, token: d.data.token }),
        onError: (e: Error) => setParseError(e.message)
      }
    );
  };

  const runConfirm = () => {
    if (!preview) return;
    setConfirmError(null);
    confirmMut.mutate(
      preview.token,
      { onSuccess: (d) => { setConfirmed(d.data); setPreview(null); setJsonText(''); }, onError: (e: Error) => setConfirmError(e.message) }
    );
  };

  const runExport = async () => {
    setExported(null);
    try {
      const { data } = await api<{ category: string; count: number; items: unknown[] }>(`/home/import/export?category=${category}`);
      const blob = new Blob([JSON.stringify({ category: data.category, items: data.items }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `home-${category}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(`Exported ${data.count} items as home-${category}-export.json`);
    } catch (e) {
      setExported(null);
      setParseError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const runRollback = () => {
    setRollbackError(null);
    setRollbackReport(null);
    if (!/^[0-9a-fA-F]{24}$/.test(rollbackBatchId.trim())) { setRollbackError('Batch ID must be a 24-character hex id from Import History.'); return; }
    rollbackMut.mutate(
      rollbackBatchId.trim(),
      { onSuccess: (d) => setRollbackReport(d.data), onError: (e: Error) => setRollbackError(e.message) }
    );
  };

  const busy = previewMut.isPending || confirmMut.isPending || rollbackMut.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <div className="space-y-4 p-4">
          <h3 className="font-bold text-navy dark:text-white">JSON Import</h3>
          <p className="text-sm text-slate-500">Upload or paste JSON. Preview is read-only and shows exactly what will be created, updated or skipped. Nothing is written until you confirm. Max 500 documents per batch; binary image data is rejected.</p>
          <Select
            label="Category"
            value={category}
            onChange={(v) => setCategory(v as ImportCategory)}
            options={IMPORT_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">JSON file</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1024 * 1024) { setParseError('File is larger than 1 MB; split the import into smaller batches.'); return; }
                setJsonText(await file.text());
              }}
              className="w-full text-sm text-slate-600 dark:text-slate-300"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">…or paste JSON</span>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder={SAMPLE_JSON}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 dark:border-navy-700 dark:bg-navy-700 dark:text-white"
            />
          </label>
          {parseError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{parseError}</div> : null}
          <div className="flex gap-2">
            <Button onClick={runPreview} disabled={busy || !jsonText.trim()}>Preview import</Button>
            <Button variant="secondary" onClick={runExport} disabled={busy}>Export {CATEGORY_LABELS[category]}</Button>
          </div>
          {exported ? <p className="text-sm text-green-700" role="status">{exported}</p> : null}
        </div>
      </Card>

      {preview ? (
        <Card>
          <div className="space-y-3 p-4">
            <h3 className="font-bold text-navy dark:text-white">Import preview</h3>
            <div className="flex flex-wrap gap-2">
              <Badge tone="green">create: {preview.summary.creates}</Badge>
              <Badge tone="blue">update: {preview.summary.updates}</Badge>
              <Badge tone="slate">skip: {preview.summary.skips}</Badge>
              <Badge tone="amber">conflict: {preview.summary.conflicts}</Badge>
              <Badge tone="red">invalid: {preview.summary.invalid}</Badge>
            </div>
            <Table head={['#', 'Action', 'Reason']}>
              {preview.items.map((i) => (
                <tr key={i.index}>
                  <td className="px-4 py-2 text-slate-500">{i.index + 1}</td>
                  <td className="px-4 py-2"><Badge tone={actionTone(i.action)}>{i.action}</Badge></td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{i.reason ?? '—'}</td>
                </tr>
              ))}
            </Table>
            {confirmError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{confirmError}</div> : null}
            <p className="text-xs text-slate-500">Confirming writes the batch to the database. If data changed after this preview, the backend rejects it with “data changed” and you must preview again. You can roll the batch back from Import History afterwards.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreview(null)}>Cancel</Button>
              <Button onClick={runConfirm} disabled={confirmMut.isPending}>Confirm import</Button>
            </div>
          </div>
        </Card>
      ) : null}

      {confirmed ? (
        <Card>
          <div className="space-y-2 p-4">
            <h3 className="font-bold text-navy dark:text-white">Import {confirmed.status.replace('_', ' ')}</h3>
            <p className="text-sm text-slate-500">Batch ID: <span className="font-mono">{confirmed.batchId}</span></p>
            {confirmed.report ? <ReportTable report={confirmed.report} /> : null}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="space-y-3 p-4">
          <h3 className="font-bold text-navy dark:text-white">Rollback a batch</h3>
          <p className="text-sm text-slate-500">Soft-deletes documents this batch created (only if untouched since import) and restores updated documents to their pre-import state. Other admins’ later changes are never overwritten — they are reported as conflicts.</p>
          <div className="flex items-end gap-2">
            <input
              value={rollbackBatchId}
              onChange={(e) => setRollbackBatchId(e.target.value)}
              placeholder="Batch ID (24 hex chars)"
              className="w-72 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 dark:border-navy-700 dark:bg-navy-700 dark:text-white"
            />
            <Button variant="danger" onClick={runRollback} disabled={busy}>Rollback</Button>
          </div>
          {rollbackError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{rollbackError}</div> : null}
          {rollbackReport ? <ReportTable report={rollbackReport} /> : null}
        </div>
      </Card>
    </div>
  );
}

interface HistoryItem {
  _id: string;
  batchId: string;
  category: string;
  status: string;
  report: ImportReport;
  createdAt: string;
  finishedAt?: string;
}

export function HomeHistoryTab() {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<HistoryItem | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const list = useApiQuery<{ items: HistoryItem[]; meta?: ListMeta }>(['home', 'import-history', page], `/home/import/history${buildQuery({ page, limit: 20 })}`);

  const openDetail = async (batchId: string) => {
    setDetailError(null);
    try {
      const { data } = await api<HistoryItem>(`/home/import/history/${batchId}`);
      setDetail(data);
    } catch (e) {
      setDetail(null);
      setDetailError(e instanceof Error ? e.message : 'Failed to load batch');
    }
  };

  const statusTone = (s: string): 'green' | 'amber' | 'red' | 'slate' =>
    s === 'completed' ? 'green' : s === 'partially_completed' ? 'amber' : s === 'failed' ? 'red' : 'slate';

  return (
    <div>
      {detailError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{detailError}</div> : null}
      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No imports have been run yet." /> : (
        <Card>
          <Table head={['Batch', 'Category', 'Status', 'Created / Updated / Failed', 'When', 'Actions']}>
            {list.data.data.items.map((h) => (
              <tr key={h._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-mono text-xs text-navy dark:text-white">{h.batchId}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[h.category as ImportCategory] ?? h.category}</td>
                <td className="px-4 py-3"><Badge tone={statusTone(h.status)}>{h.status.replace('_', ' ')}</Badge></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{h.report?.created ?? 0} / {h.report?.updated ?? 0} / {h.report?.failed ?? 0}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(h.finishedAt ?? h.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void openDetail(h.batchId)}>Details</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-4 pb-4">
            <Pagination page={page} limit={list.data.meta?.limit ?? 20} total={list.data.meta?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      )}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Batch details" onClick={() => setDetail(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-navy-600" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy dark:text-white">Batch {detail.batchId}</h2>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
            </div>
            <p className="mb-2 text-sm text-slate-500">Category: {CATEGORY_LABELS[detail.category as ImportCategory] ?? detail.category} · Status: {detail.status}</p>
            <ReportTable report={detail.report} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface RecoveryToken {
  _id: string;
  jti: string;
  batchId?: string | null;
  category: string;
  status: string;
  startedAt?: string | null;
  lastError?: string | null;
}

export function HomeRecoveryTab() {
  const list = useApiQuery<{ stuckProcessing: RecoveryToken[]; recoveryRequired: RecoveryToken[] }>(['home', 'recovery'], '/home/recovery');
  const [actionError, setActionError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ImportReport | null>(null);

  const resolveMut = useApiMutation((batchId: string) => api<ImportReport>(`/home/recovery/${batchId}/resolve`, { method: 'POST' }), [['home', 'recovery'], ['home', 'import-history']]);

  const resolve = (batchId: string) => {
    setActionError(null);
    setResolved(null);
    resolveMut.mutate(batchId, { onSuccess: (d) => setResolved(d.data), onError: (e: Error) => setActionError(e.message) });
  };

  const rows = (tokens: RecoveryToken[], kind: 'stuck' | 'required') =>
    tokens.map((t) => (
      <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
        <td className="px-4 py-3 font-mono text-xs text-navy dark:text-white">{t.batchId ?? '—'}</td>
        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[t.category as ImportCategory] ?? t.category}</td>
        <td className="px-4 py-3"><Badge tone={kind === 'required' ? 'red' : 'amber'}>{t.status}</Badge></td>
        <td className="px-4 py-3 text-xs text-slate-500">{t.startedAt ? new Date(t.startedAt).toLocaleString() : '—'}</td>
        <td className="px-4 py-3 max-w-xs break-words text-xs text-slate-500">{t.lastError ?? '—'}</td>
        <td className="px-4 py-3">
          <Button variant="secondary" disabled={resolveMut.isPending} onClick={() => t.batchId && resolve(t.batchId)}>Recover</Button>
        </td>
      </tr>
    ));

  const stuck = list.data?.data.stuckProcessing ?? [];
  const required = list.data?.data.recoveryRequired ?? [];

  return (
    <div className="space-y-6">
      {actionError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}
      {resolved ? (
        <Card>
          <div className="p-4">
            <h3 className="mb-1 font-bold text-navy dark:text-white">Recovery result</h3>
            <ReportTable report={resolved} />
          </div>
        </Card>
      ) : null}
      <Card>
        <div className="p-4">
          <h3 className="mb-2 font-bold text-navy dark:text-white">Stuck processing (older than 5 minutes)</h3>
          {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
          stuck.length === 0 ? <EmptyState message="No stuck imports. Every batch is either finished or already recovered." /> : (
            <Table head={['Batch', 'Category', 'Status', 'Started', 'Last error', 'Actions']}>{rows(stuck, 'stuck')}</Table>
          )}
        </div>
      </Card>
      <Card>
        <div className="p-4">
          <h3 className="mb-2 font-bold text-navy dark:text-white">Recovery required (needs manual action)</h3>
          {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
          required.length === 0 ? <EmptyState message="Nothing needs manual recovery." /> : (
            <Table head={['Batch', 'Category', 'Status', 'Started', 'Last error', 'Actions']}>{rows(required, 'required')}</Table>
          )}
        </div>
      </Card>
      <p className="text-xs text-slate-500">The backend Reaper automatically retries stuck imports every 2 minutes. Use “Recover” for manual retries; recovery failures stay listed here and are never auto-deleted.</p>
    </div>
  );
}
