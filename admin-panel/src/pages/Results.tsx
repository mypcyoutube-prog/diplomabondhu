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
  fileName?: string;
  log?: string[];
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The python service flattens the preview payload at the top level once the
 *  job is done; older versions nested it under `result`. A Drive-folder job
 *  instead returns `files` — one result (or error) per PDF. */
export type ParseJobState = ParsePollState & {
  batchId?: string;
  pagesScanned?: number;
  recordCount?: number;
  warnings?: string[];
  sample?: ParsePreview['sample'];
  detail?: string;
  files?: DriveFileResult[];
  fileCount?: number;
  totalRecords?: number;
};

export type DriveFileResult = {
  fileName: string;
  batchId?: string;
  recordCount?: number;
  pagesScanned?: number;
  warnings?: string[];
  sample?: ParsePreview['sample'];
  error?: string;
};

function previewFromState(state: ParseJobState): ParsePreview {
  return {
    batchId: state.batchId ?? '',
    fileName: state.fileName ?? '',
    pagesScanned: state.pagesScanned ?? 0,
    recordCount: state.recordCount ?? 0,
    warnings: state.warnings ?? [],
    sample: state.sample ?? []
  };
}

/** Polls a parse job (file/URL/Drive) until done, streaming the terminal log. */
async function pollParseJob(
  started: { jobId: string },
  onPoll: (state: ParsePollState | null) => void
): Promise<ParseJobState> {
  onPoll({ stage: 'waiting' });
  let failures = 0;
  for (let i = 0; i < 900; i += 1) {
    await sleep(1000);
    let state: ParseJobState;
    try {
      state = await apiRaw<ParseJobState>(`/results/admin/parse-job/${started.jobId}`);
      failures = 0;
    } catch {
      failures += 1;
      if (failures >= 15) {
        onPoll(null);
        throw new Error('Lost contact with the result service while polling');
      }
      continue;
    }
    if (state.stage === 'done') {
      onPoll(null);
      return state;
    }
    if (state.stage === 'error') {
      onPoll(null);
      throw new Error(state.detail ?? 'Parsing failed');
    }
    onPoll(state);
  }
  onPoll(null);
  throw new Error('Parsing timed out');
}

export function ResultsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [driveInput, setDriveInput] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [queue, setQueue] = useState<ParsePreview[]>([]);
  const [examIds, setExamIds] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [importErrors, setImportErrors] = useState<Record<string, string>>({});
  const [importedMsgs, setImportedMsgs] = useState<string[]>([]);
  const [parsePoll, setParsePoll] = useState<ParsePollState | null>(null);
  const [importPoll, setImportPoll] = useState<ImportProgressState | null>(null);

  const exams = useApiQuery<{ exams: ResultExam[] }>(['results', 'meta'], '/results/meta');
  const batches = useQuery({
    queryKey: ['results', 'batches'],
    queryFn: () => apiRaw<{ batches: BatchInfo[] }>('/results/admin/batches')
  });

  const invalidate = [['results', 'meta'], ['results', 'batches']];

  const fileMut = useApiMutation(async (file: File): Promise<ParsePreview> => {
    const form = new FormData();
    form.append('file', file);
    return previewFromState(await pollParseJob(await apiRaw<{ jobId: string }>('/results/admin/parse-job', {
      method: 'POST',
      body: form
    }), setParsePoll));
  }, invalidate);

  const urlMut = useApiMutation(async (url: string): Promise<ParsePreview> =>
    previewFromState(await pollParseJob(await apiRaw<{ jobId: string }>('/results/admin/parse-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    }), setParsePoll)),
  invalidate);

  const driveMut = useApiMutation(async (folderUrl: string): Promise<ParseJobState> =>
    pollParseJob(await apiRaw<{ jobId: string }>('/results/admin/parse-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderUrl })
    }), setParsePoll),
  invalidate);

  const importMut = useApiMutation((vars: { batchId: string; examId: string; title?: string }) =>
    apiRaw<{ examId: string; total: number; inserted: number; updated: number }>('/results/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vars)
    }), invalidate);

  async function handleFiles() {
    setUploadError(null);
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) {
      setUploadError('Choose at least one PDF file first');
      return;
    }
    const collected: ParsePreview[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        collected.push(await fileMut.mutateAsync(file));
      } catch (err) {
        errors.push(`${file.name}: ${(err as Error).message}`);
        break;
      }
    }
    enqueuePreviews(collected, errors);
    if (collected.length > 0 && fileRef.current) fileRef.current.value = '';
  }

  function enqueuePreviews(previews: ParsePreview[], errors: string[]) {
    if (previews.length > 0) {
      setQueue((q) => [...previews, ...q]);
      for (const p of previews) {
        setExamIds((m) => ({ ...m, [p.batchId]: m[p.batchId] ?? '' }));
      }
    }
    if (errors.length > 0) setUploadError(errors.join('\n'));
  }

  function handleParseDrive() {
    setUploadError(null);
    const folderUrl = driveInput.trim();
    if (!folderUrl) {
      setUploadError('Paste the Drive folder link first');
      return;
    }
    driveMut.mutate(folderUrl, {
      onSuccess: (done) => {
        const previews = (done.files ?? [])
          .filter((f) => !f.error && f.batchId)
          .map((f) => ({
            batchId: f.batchId!,
            fileName: f.fileName,
            pagesScanned: f.pagesScanned ?? 0,
            recordCount: f.recordCount ?? 0,
            warnings: f.warnings ?? [],
            sample: f.sample ?? []
          }));
        const errors = (done.files ?? []).filter((f) => f.error).map((f) => `${f.fileName}: ${f.error}`);
        enqueuePreviews(previews, errors);
        setDriveInput('');
      },
      onError: (err) => setUploadError(err.message)
    });
  }

  function handleParseUrl() {
    setUploadError(null);
    const url = urlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      setUploadError('Paste a full http(s) link to the PDF file');
      return;
    }
    urlMut.mutate(url, {
      onSuccess: (preview) => {
        setQueue((q) => [preview, ...q]);
        setExamIds((m) => ({ ...m, [preview.batchId]: m[preview.batchId] ?? '' }));
        setUrlInput('');
      },
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

  function handleImport(item: ParsePreview) {
    const examId = (examIds[item.batchId] ?? '').trim();
    setImportErrors((m) => ({ ...m, [item.batchId]: '' }));
    if (!examId) {
      setImportErrors((m) => ({ ...m, [item.batchId]: 'Type an Exam ID first' }));
      return;
    }
    const stopPolling = startImportPolling(item.batchId);
    importMut.mutate(
      { batchId: item.batchId, examId, title: (titles[item.batchId] ?? '').trim() || undefined },
      {
        onSuccess: (data) => {
          setImportedMsgs((msgs) => [`Imported ${data.inserted} new / ${data.updated} updated records into ${data.examId}`, ...msgs].slice(0, 5));
          setQueue((q) => q.filter((p) => p.batchId !== item.batchId));
          stopPolling();
          setImportPoll(null);
        },
        onError: (err) => {
          setImportErrors((m) => ({ ...m, [item.batchId]: err.message }));
          stopPolling();
          setImportPoll(null);
        }
      }
    );
  }

  function removeFromQueue(batchId: string) {
    setQueue((q) => q.filter((p) => p.batchId !== batchId));
  }

  const busy = fileMut.isPending || urlMut.isPending || driveMut.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="BTEB Result Checker"
        subtitle="Upload published BTEB result PDFs — files or a direct download link, one PDF per program + semester (use a unique exam ID like eng-7th-2022reg-2026, eng-8th-2022reg-2026). Students search by roll number and see every published exam they appear in. Results are shown with a non-official disclaimer."
      />

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">1. Add result PDFs</h2>
        <div className="flex flex-wrap items-end gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="rounded border border-slate-300 p-2 text-sm dark:bg-navy-600 dark:text-slate-100"
          />
          <Button onClick={() => void handleFiles()} disabled={busy}>
            {fileMut.isPending ? 'Parsing…' : 'Parse file(s)'}
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Multiple files allowed — they are parsed one by one; each becomes a separate batch you review and import individually.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4 dark:border-navy-500">
          <div className="min-w-[320px] flex-1">
            <Input
              label="…or paste a direct PDF download link (https://…,.pdf)"
              value={urlInput}
              onChange={setUrlInput}
            />
          </div>
          <Button onClick={handleParseUrl} disabled={busy}>
            {urlMut.isPending ? 'Parsing…' : 'Parse from link'}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4 dark:border-navy-500">
          <div className="min-w-[320px] flex-1">
            <Input
              label="…or paste a Google Drive FOLDER link with several result PDFs (folder must be 'Anyone with the link'; needs a Drive API key — set it in Settings)"
              value={driveInput}
              onChange={setDriveInput}
            />
          </div>
          <Button onClick={handleParseDrive} disabled={busy}>
            {driveMut.isPending ? 'Parsing…' : 'Parse Drive folder'}
          </Button>
        </div>
        {parsePoll && (
          <>
            <LiveProgressBar
              value={parsePoll.pagesDone ?? 0}
              total={parsePoll.pages ?? 0}
              label={parsePoll.stage === 'waiting' ? 'Starting…' : parsePoll.stage === 'downloading' ? 'Downloading PDF…' : parsePoll.stage === 'parsing' ? `Parsing ${parsePoll.fileName ?? ''}…` : 'Working…'}
            />
            {parsePoll.stage !== 'done' && <ParseTerminal lines={parsePoll.log ?? []} />}
          </>
        )}
        {uploadError && <pre className="mt-2 whitespace-pre-wrap text-sm text-red-600">{uploadError}</pre>}

        {queue.map((item) => (
          <div key={item.batchId} className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-navy-600">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="blue">batch {item.batchId.slice(0, 8)}…</Badge>
              <Badge tone="slate">{item.fileName}</Badge>
              <Badge tone="green">{item.recordCount} records</Badge>
              <Badge tone="slate">{item.pagesScanned} pages</Badge>
            </div>
            {item.warnings.length > 0 && (
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium">Warnings ({item.warnings.length})</p>
                <p className="mt-0.5 text-xs">
                  Each warning is a record the parser REFUSED to store because the PDF text looked
                  malformed — it was thrown away (never shown to students) instead of risking wrong
                  data. Page number + the offending text show exactly why it was discarded.
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {item.warnings.slice(0, 20).map((w, i) => <li key={i}>{w}</li>)}
                  {item.warnings.length > 20 && <li>… and {item.warnings.length - 20} more</li>}
                </ul>
              </div>
            )}
            <Table head={['Roll', 'Name', 'GPA', 'Status']}>
              {item.sample.map((r) => (
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
                value={examIds[item.batchId] ?? ''}
                onChange={(v) => setExamIds((m) => ({ ...m, [item.batchId]: v }))}
                required
              />
              <Input
                label="Display title (optional)"
                value={titles[item.batchId] ?? ''}
                onChange={(v) => setTitles((m) => ({ ...m, [item.batchId]: v }))}
              />
            </div>
            {importPoll && importPoll.stage !== 'finished' && importMut.isPending && (
              <LiveProgressBar
                value={importPoll.done ?? 0}
                total={importPoll.total ?? item.recordCount}
                label={importPoll.stage === 'waiting' ? 'Starting import…' : 'Importing records into MongoDB…'}
              />
            )}
            {importErrors[item.batchId] && <p className="text-sm text-red-600">{importErrors[item.batchId]}</p>}
            <div className="flex gap-2">
              <Button onClick={() => handleImport(item)} disabled={importMut.isPending || !(examIds[item.batchId] ?? '').trim()}>
                {importMut.isPending ? 'Importing…' : `Confirm import (${item.recordCount} records)`}
              </Button>
              <Button variant="secondary" onClick={() => removeFromQueue(item.batchId)}>Remove</Button>
            </div>
          </div>
        ))}

        {importedMsgs.length > 0 && (
          <div className="mt-3 space-y-1">
            {importedMsgs.map((m, i) => (
              <p key={i} className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{m}</p>
            ))}
          </div>
        )}
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
