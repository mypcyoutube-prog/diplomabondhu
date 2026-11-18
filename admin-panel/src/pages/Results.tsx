import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRaw } from '../api/client';
import { useApiMutation, useApiQuery } from '../api/hooks';
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader, Spinner, Table } from '../components/ui';

interface ResultExam {
  examId: string;
  recordCount: number;
  title?: string;
  checkCount: number;
  updatedAt?: string;
}

interface ParsePreview {
  batchId: string;
  fileName: string;
  pagesScanned: number;
  recordCount: number;
  warnings: string[];
  sample: Array<{ roll: string; gpa: number | null; name: string | null; status: string | null }>;
}

interface BatchInfo {
  batchId: string;
  fileName?: string;
  examId?: string;
  recordCount: number;
  pagesScanned?: number;
  warnings: string[];
  createdAt?: string;
}

function LiveProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
        <span>{label}</span>
        <span className="font-mono">{value} / {total} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-navy-500">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
    </div>
  );
}

interface ParsePollState {
  stage: string;
  pagesDone?: number;
  pages?: number;
  log?: string[];
  batchId?: string;
  fileName?: string;
  pagesScanned?: number;
  recordCount?: number;
  warnings?: string[];
  sample?: Array<{ roll: string; gpa: number | null; name: string | null; status: string | null }>;
}

function ParseTerminal({ lines }: { lines: string[] }) {
  const visible = lines.slice(-12);
  return (
    <div
      data-testid="parse-terminal"
      className="mt-3 max-h-56 overflow-y-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-5 text-emerald-300 dark:bg-navy-700"
    >
      <div className="mb-1 text-slate-400">— parse log (live) —</div>
      {visible.map((line, i) => (
        <div key={i} className={line.includes('WARNING') ? 'text-amber-400' : undefined}>
          {line}
        </div>
      ))}
    </div>
  );
}

interface ImportProgressState {
  stage: string;
  done?: number;
  total?: number;
}

export function ResultsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsePreview | null>(null);
  const [examId, setExamId] = useState('');
  const [title, setTitle] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<string | null>(null);
  const [parsePoll, setParsePoll] = useState<ParsePollState | null>(null);
  const [importPoll, setImportPoll] = useState<ImportProgressState | null>(null);

  const exams = useApiQuery<{ exams: ResultExam[] }>(['results', 'meta'], '/results/meta');
  const batches = useQuery({
    queryKey: ['results', 'batches'],
    queryFn: () => apiRaw<{ batches: BatchInfo[] }>('/results/admin/batches')
  });

  const invalidate = [['results', 'meta'], ['results', 'batches']];

  const parseMut = useApiMutation(async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const started = await apiRaw<{ jobId: string }>('/results/admin/parse-job', {
      method: 'POST',
      body: form
    });
    setParsePoll({ stage: 'waiting' });
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    let failures = 0;
    for (let i = 0; i < 900; i += 1) {
      await sleep(1000);
      let state: ParsePollState & { result?: ParsePreview; detail?: string };
      try {
        state = await apiRaw<ParsePollState & { result?: ParsePreview; detail?: string }>(
          `/results/admin/parse-job/${started.jobId}`
        );
        failures = 0;
      } catch {
        failures += 1;
        if (failures >= 15) {
          setParsePoll(null);
          throw new Error('Lost contact with the result service while polling');
        }
        continue;
      }
      if (state.stage === 'done') {
        setParsePoll(null);
        // The python service flattens the preview payload at the top level;
        // older versions nested it under `result`.
        const preview = state.result ?? {
          batchId: state.batchId ?? '',
          fileName: state.fileName ?? '',
          pagesScanned: state.pagesScanned ?? 0,
          recordCount: state.recordCount ?? 0,
          warnings: state.warnings ?? [],
          sample: state.sample ?? []
        };
        return preview;
      }
      if (state.stage === 'error') {
        setParsePoll(null);
        throw new Error(state.detail ?? 'Parsing failed');
      }
      setParsePoll(state);
    }
    setParsePoll(null);
    throw new Error('Parsing timed out');
  }, invalidate);

  const importMut = useApiMutation((vars: { batchId: string; examId: string; title?: string }) =>
    apiRaw<{ examId: string; total: number; inserted: number; updated: number }>('/results/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vars)
    }), invalidate);

  function handleUpload() {
    setUploadError(null);
    setImported(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadError('Choose a PDF file first');
      return;
    }
    parseMut.mutate(file, {
      onSuccess: (data) => setPreview(data),
      onError: (err) => setUploadError(err.message)
    });
  }

  function startImportPolling(batchId: string) {
    setImportPoll({ stage: 'waiting' });
    let failures = 0;
    const interval = setInterval(async () => {
      try {
        const state = await apiRaw<ImportProgressState>(`/results/admin/import-progress/${batchId}`);
        failures = 0;
        setImportPoll(state);
        if (state.stage === 'finished') clearInterval(interval);
      } catch {
        failures += 1;
        if (failures >= 15) clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }

  function handleImport() {
    if (!preview) return;
    setImportError(null);
    setImported(null);
    const stopPolling = startImportPolling(preview.batchId);
    importMut.mutate(
      { batchId: preview.batchId, examId: examId.trim(), title: title.trim() || undefined },
      {
        onSuccess: (data) => {
          setImported(`Imported ${data.inserted} new / ${data.updated} updated records into ${data.examId}`);
          setPreview(null);
          setExamId('');
          setTitle('');
          if (fileRef.current) fileRef.current.value = '';
          stopPolling();
          setImportPoll(null);
        },
        onError: (err) => {
          setImportError(err.message);
          stopPolling();
          setImportPoll(null);
        }
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="BTEB Result Checker"
        subtitle="Upload published BTEB result PDFs — one PDF per program + semester (use a unique exam ID like eng-7th-2022reg-2026, eng-8th-2022reg-2026). Students search by roll number and see every published exam they appear in. Results are shown with a non-official disclaimer."
      />

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">1. Upload result PDF</h2>
        <div className="flex flex-wrap items-end gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="rounded border border-slate-300 p-2 text-sm dark:bg-navy-600 dark:text-slate-100"
          />
          <Button onClick={handleUpload} disabled={parseMut.isPending}>
            {parseMut.isPending ? 'Parsing…' : 'Parse PDF'}
          </Button>
        </div>
        {parsePoll && (
          <LiveProgressBar
            value={parsePoll.pagesDone ?? 0}
            total={parsePoll.pages ?? 0}
            label={parsePoll.stage === 'waiting' ? 'Starting PDF parser…' : 'Parsing PDF pages…'}
          />
        )}
        {parsePoll && parsePoll.stage !== 'done' && <ParseTerminal lines={parsePoll.log ?? []} />}
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}

        {preview && (
          <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-navy-600">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="blue">batch {preview.batchId.slice(0, 8)}…</Badge>
              <Badge tone="slate">{preview.fileName}</Badge>
              <Badge tone="green">{preview.recordCount} records</Badge>
              <Badge tone="slate">{preview.pagesScanned} pages</Badge>
            </div>
            {preview.warnings.length > 0 && (
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">Warnings ({preview.warnings.length})</p>
                <p className="mt-0.5 text-xs">
                  Each warning is a record the parser REFUSED to store because the PDF text looked
                  malformed — it was thrown away (never shown to students) instead of risking wrong
                  data. Page number + the offending text show exactly why it was discarded.
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {preview.warnings.slice(0, 20).map((w, i) => <li key={i}>{w}</li>)}
                  {preview.warnings.length > 20 && <li>… and {preview.warnings.length - 20} more</li>}
                </ul>
              </div>
            )}
            <Table head={['Roll', 'Name', 'GPA', 'Status']}>
              {preview.sample.map((r) => (
                <tr key={r.roll}>
                  <td className="px-3 py-2 font-mono">{r.roll}</td>
                  <td className="px-3 py-2">{r.name ?? '—'}</td>
                  <td className="px-3 py-2">{r.gpa ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Badge tone={r.status === 'fail' ? 'red' : r.status === 'referred' ? 'amber' : 'green'}>{r.status ?? '—'}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Exam ID (unique: program-semester-regulation-year, e.g. eng-7th-2022reg-2026)"
                value={examId}
                onChange={setExamId}
                required
              />
              <Input
                label="Display title (optional)"
                value={title}
                onChange={setTitle}
              />
            </div>
            {importPoll && (
              <LiveProgressBar
                value={importPoll.done ?? 0}
                total={importPoll.total ?? preview.recordCount}
                label={importPoll.stage === 'waiting' ? 'Starting import…' : 'Importing records into MongoDB…'}
              />
            )}
            {importError && <p className="text-sm text-red-600">{importError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={importMut.isPending || !examId.trim()}>
                {importMut.isPending ? 'Importing…' : `Confirm import (${preview.recordCount} records)`}
              </Button>
              <Button variant="secondary" onClick={() => setPreview(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {imported && <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">{imported}</p>}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">2. Imported examinations</h2>
        {exams.isLoading && <Spinner />}
        {exams.isError && <ErrorState message={exams.error.message} onRetry={() => void exams.refetch()} />}
        {exams.data && exams.data.data.exams.length === 0 && (
          <EmptyState message="No result sets imported yet. Upload a result PDF above to make results available to students." />
        )}
        {exams.data && exams.data.data.exams.length > 0 && (
          <Table head={['Exam ID', 'Title', 'Records', 'Checks', 'Updated']}>
            {exams.data.data.exams.map((e) => (
              <tr key={e.examId}>
                <td className="px-3 py-2 font-mono text-sm">{e.examId}</td>
                <td className="px-3 py-2">{e.title ?? '—'}</td>
                <td className="px-3 py-2">{e.recordCount}</td>
                <td className="px-3 py-2">{e.checkCount}</td>
                <td className="px-3 py-2 text-sm text-slate-500">{e.updatedAt ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">3. Parsed batches</h2>
        {batches.isLoading && <Spinner />}
        {batches.isError && <ErrorState message={(batches.error as Error).message} onRetry={() => void batches.refetch()} />}
        {batches.data && batches.data.batches.length === 0 && <EmptyState message="No parsed batches stored." />}
        {batches.data && batches.data.batches.length > 0 && (
          <Table head={['Batch', 'File', 'Exam ID', 'Records', 'Parsed at']}>
            {batches.data.batches.map((b) => (
              <tr key={b.batchId}>
                <td className="px-3 py-2 font-mono text-sm">{b.batchId.slice(0, 12)}…</td>
                <td className="px-3 py-2">{b.fileName ?? '—'}</td>
                <td className="px-3 py-2">{b.examId ? <Badge tone="green">{b.examId}</Badge> : <Badge tone="amber">not imported</Badge>}</td>
                <td className="px-3 py-2">{b.recordCount}</td>
                <td className="px-3 py-2 text-sm text-slate-500">{b.createdAt ?? '—'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
