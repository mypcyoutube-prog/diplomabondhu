import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui';

interface Question {
  _id: string;
  text: string;
  textBn?: string;
  options: Array<{ key: string; text: string }>;
  correctKey: string;
  explanation?: string;
  marks: number;
  status: string;
}

interface Exam {
  _id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  durationSec: number;
  marksPerQuestion: number;
  negativeMarkPercent: number;
  shuffle: boolean;
  questionIds: string[];
  attemptCount?: number;
}

interface Doc { _id: string; name?: string; code?: string }

const EXAM_TYPES = ['chapter', 'subject', 'semester', 'model', 'previous'].map((t) => ({ value: t, label: t }));

function RefSelect({ label, entity, value, onChange }: { label: string; entity?: string; value: string; onChange: (v: string) => void }) {
  const list = useApiQuery<{ items: Doc[] }>(['academic', entity ?? 'none'], entity ? `/academic/${entity}?limit=100` : null);
  const options = [
    { value: '', label: '— none —' },
    ...(list.data?.data.items ?? []).map((d) => ({ value: d._id, label: String(d.name ?? d.code ?? d._id) }))
  ];
  return <Select label={label} value={value} onChange={onChange} options={options} />;
}

export function ExamsPage() {
  const [tab, setTab] = useState<'questions' | 'exams'>('questions');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const [qForm, setQForm] = useState({ text: '', textBn: '', optionA: '', optionB: '', optionC: '', optionD: '', correctKey: 'A', explanation: '', marks: '1', subjectId: '', chapterId: '' });
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [showQForm, setShowQForm] = useState(false);

  const [eForm, setEForm] = useState({ title: '', description: '', type: 'model', durationSec: '600', marksPerQuestion: '1', negativeMarkPercent: '0', shuffle: true, scheduledAt: '', questionIds: '', programId: '', regulationId: '', technologyId: '', semesterId: '', subjectId: '', chapterId: '' });
  const [editingE, setEditingE] = useState<Exam | null>(null);
  const [showEForm, setShowEForm] = useState(false);

  const questions = useApiQuery<{ items: Question[] }>(
    ['exams', 'questions', page, status],
    `/exams/admin/questions${buildQuery({ page, limit: 20, status: status || undefined })}`
  );
  const exams = useApiQuery<{ items: Exam[] }>(
    ['exams', 'admin', page, status],
    tab === 'exams' ? `/exams/admin/exams${buildQuery({ page, limit: 20, status: status || undefined })}` : null,
    tab === 'exams'
  );

  const invalidate = [['exams', 'questions'], ['exams', 'admin'], ['admin', 'dashboard']];
  const createQ = useApiMutation((body: unknown) => api('/exams/admin/questions', { method: 'POST', body }), invalidate);
  const updateQ = useApiMutation((body: unknown) => api(`/exams/admin/questions/${editingQ!._id}`, { method: 'PUT', body }), invalidate);
  const deleteQ = useApiMutation((id: string) => api(`/exams/admin/questions/${id}`, { method: 'DELETE' }), invalidate);
  const createE = useApiMutation((body: unknown) => api('/exams/admin/exams', { method: 'POST', body }), invalidate);
  const updateE = useApiMutation((body: unknown) => api(`/exams/admin/exams/${editingE!._id}`, { method: 'PUT', body }), invalidate);
  const publishQ = useApiMutation((id: string) => api(`/exams/admin/questions/${id}/publish`, { method: 'POST' }), invalidate);
  const unpublishQ = useApiMutation((id: string) => api(`/exams/admin/questions/${id}/unpublish`, { method: 'POST' }), invalidate);
  const publishE = useApiMutation((id: string) => api(`/exams/admin/exams/${id}/publish`, { method: 'POST' }), invalidate);
  const closeE = useApiMutation((id: string) => api(`/exams/admin/exams/${id}/close`, { method: 'POST' }), invalidate);
  const deleteE = useApiMutation((id: string) => api(`/exams/admin/exams/${id}`, { method: 'DELETE' }), invalidate);

  const run = <TVars,>(fn: () => void, mut: { mutate: (v: TVars, o?: { onError?: (e: Error) => void; onSuccess?: () => void }) => void }, vars: TVars) => {
    setActionError(null);
    mut.mutate(vars, { onError: (e: Error) => setActionError(e.message), onSuccess: fn });
  };

  const openQForm = (q?: Question) => {
    if (q) {
      const opt = (k: string) => q.options.find((o) => o.key === k)?.text ?? '';
      setQForm({ text: q.text, textBn: q.textBn ?? '', optionA: opt('A'), optionB: opt('B'), optionC: opt('C'), optionD: opt('D'), correctKey: q.correctKey, explanation: q.explanation ?? '', marks: String(q.marks), subjectId: '', chapterId: '' });
      setEditingQ(q);
    } else {
      setQForm({ text: '', textBn: '', optionA: '', optionB: '', optionC: '', optionD: '', correctKey: 'A', explanation: '', marks: '1', subjectId: '', chapterId: '' });
      setEditingQ(null);
    }
    setShowQForm(true);
  };

  const submitQuestion = () => {
    setActionError(null);
    const options = [
      { key: 'A', text: qForm.optionA },
      { key: 'B', text: qForm.optionB },
      { key: 'C', text: qForm.optionC },
      { key: 'D', text: qForm.optionD }
    ].filter((o) => o.text.trim());
    if (qForm.text.trim().length < 3) { setActionError('Question text is required (min 3 chars)'); return; }
    if (options.length < 2) { setActionError('At least 2 options are required'); return; }
    if (!options.some((o) => o.key === qForm.correctKey)) { setActionError('Correct answer must match one of the filled options'); return; }
    const body: Record<string, unknown> = { text: qForm.text.trim(), options, correctKey: qForm.correctKey, marks: Number(qForm.marks) || 1 };
    if (qForm.textBn) body.textBn = qForm.textBn.trim();
    if (qForm.explanation) body.explanation = qForm.explanation.trim();
    if (qForm.subjectId) body.subjectId = qForm.subjectId;
    if (qForm.chapterId) body.chapterId = qForm.chapterId;
    const mut = editingQ ? updateQ : createQ;
    mut.mutate(body, { onSuccess: () => setShowQForm(false), onError: (e: Error) => setActionError(e.message) });
  };

  const openEForm = (e?: Exam) => {
    if (e) {
      setEForm({ title: e.title, description: e.description ?? '', type: e.type, durationSec: String(e.durationSec), marksPerQuestion: String(e.marksPerQuestion), negativeMarkPercent: String(e.negativeMarkPercent), shuffle: e.shuffle, scheduledAt: '', questionIds: e.questionIds.join(', '), programId: '', regulationId: '', technologyId: '', semesterId: '', subjectId: '', chapterId: '' });
      setEditingE(e);
    } else {
      setEForm({ title: '', description: '', type: 'model', durationSec: '600', marksPerQuestion: '1', negativeMarkPercent: '0', shuffle: true, scheduledAt: '', questionIds: '', programId: '', regulationId: '', technologyId: '', semesterId: '', subjectId: '', chapterId: '' });
      setEditingE(null);
    }
    setShowEForm(true);
  };

  const submitExam = () => {
    setActionError(null);
    const ids = eForm.questionIds.split(/[\s,]+/).filter(Boolean);
    if (eForm.title.trim().length < 3) { setActionError('Title is required (min 3 chars)'); return; }
    if (ids.length < 1) { setActionError('At least one question ID is required'); return; }
    const body: Record<string, unknown> = {
      title: eForm.title.trim(),
      type: eForm.type,
      questionIds: ids,
      durationSec: Number(eForm.durationSec),
      marksPerQuestion: Number(eForm.marksPerQuestion),
      negativeMarkPercent: Number(eForm.negativeMarkPercent),
      shuffle: eForm.shuffle,
      hierarchyRefs: {}
    };
    for (const k of ['programId', 'regulationId', 'technologyId', 'semesterId', 'subjectId', 'chapterId']) {
      const v = eForm[k as keyof typeof eForm];
      if (typeof v === 'string' && v) (body.hierarchyRefs as Record<string, string>)[k] = v;
    }
    if (eForm.description) body.description = eForm.description.trim();
    if (eForm.scheduledAt) body.scheduledAt = eForm.scheduledAt;
    const mut = editingE ? updateE : createE;
    mut.mutate(body, { onSuccess: () => setShowEForm(false), onError: (e: Error) => setActionError(e.message) });
  };

  return (
    <div>
      <PageHeader
        title="Exams & Questions"
        subtitle="MCQ question bank and exam management"
        actions={
          <>
            <Button variant="secondary" onClick={() => setTab('questions')}>Questions</Button>
            <Button variant="secondary" onClick={() => setTab('exams')}>Exams</Button>
            {tab === 'questions'
              ? <Button onClick={() => openQForm()}>New question</Button>
              : <Button onClick={() => openEForm()}>New exam</Button>}
          </>
        }
      />
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1 dark:bg-navy-700">
        {(['questions', 'exams'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? 'bg-white text-navy shadow dark:bg-navy-600 dark:text-white' : 'text-slate-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      <Card className="mb-4 p-4">
        <div className="max-w-xs">
          <Select
            label="Status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[{ value: '', label: 'All' }, { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'closed', label: 'Closed' }]}
          />
        </div>
      </Card>

      {tab === 'questions' ? (
        questions.isLoading ? <Spinner /> : questions.isError ? <ErrorState message={questions.error.message} onRetry={() => void questions.refetch()} /> :
        !questions.data?.data.items.length ? <EmptyState message="No questions yet." /> : (
          <Card>
            <Table head={['Question', 'Marks', 'Status', 'Actions']}>
              {questions.data.data.items.map((q) => (
                <tr key={q._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                  <td className="max-w-md px-4 py-3 text-slate-600 dark:text-slate-300">
                    <p className="truncate">{q.text}</p>
                    <p className="mt-0.5 text-xs text-slate-400">Correct: {q.correctKey}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{q.marks}</td>
                  <td className="px-4 py-3"><Badge tone={q.status === 'published' ? 'green' : 'amber'}>{q.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => openQForm(q)}>Edit</Button>
                      {q.status === 'draft' ? <Button onClick={() => run(() => undefined, publishQ, q._id)}>Publish</Button> : <Button variant="secondary" onClick={() => run(() => undefined, unpublishQ, q._id)}>Unpublish</Button>}
                      <Button variant="danger" onClick={() => { if (window.confirm('Delete this question?')) run(() => undefined, deleteQ, q._id); }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="px-4 pb-4">
              <Pagination page={page} limit={questions.data.meta?.limit ?? 20} total={questions.data.meta?.total ?? 0} onPage={setPage} />
            </div>
          </Card>
        )
      ) : (
        exams.isLoading ? <Spinner /> : exams.isError ? <ErrorState message={exams.error.message} onRetry={() => void exams.refetch()} /> :
        !exams.data?.data.items.length ? <EmptyState message="No exams yet." /> : (
          <Card>
            <Table head={['Title', 'Type', 'Questions', 'Duration', 'Status', 'Actions']}>
              {exams.data.data.items.map((e) => (
                <tr key={e._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                  <td className="px-4 py-3 font-medium text-navy dark:text-white">{e.title}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.type}</td>
                  <td className="px-4 py-3 text-slate-500">{e.questionIds.length}</td>
                  <td className="px-4 py-3 text-slate-500">{Math.round(e.durationSec / 60)} min</td>
                  <td className="px-4 py-3"><Badge tone={e.status === 'published' ? 'green' : e.status === 'closed' ? 'red' : 'amber'}>{e.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" onClick={() => openEForm(e)}>Edit</Button>
                      {e.status === 'draft' || e.status === 'scheduled' ? <Button onClick={() => run(() => undefined, publishE, e._id)}>Publish</Button> : null}
                      {e.status === 'published' ? <Button variant="secondary" onClick={() => run(() => undefined, closeE, e._id)}>Close</Button> : null}
                      {e.status !== 'published' ? <Button variant="danger" onClick={() => { if (window.confirm('Delete this exam?')) run(() => undefined, deleteE, e._id); }}>Delete</Button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
            <div className="px-4 pb-4">
              <Pagination page={page} limit={exams.data.meta?.limit ?? 20} total={exams.data.meta?.total ?? 0} onPage={setPage} />
            </div>
          </Card>
        )
      )}

      {showQForm ? (
        <Modal title={editingQ ? 'Edit question' : 'New question'} onClose={() => setShowQForm(false)}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Question text <span className="text-red-500">*</span></span>
              <textarea rows={3} value={qForm.text} onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white" />
            </label>
            <Input label="Question text (Bangla)" value={qForm.textBn} onChange={(v) => setQForm({ ...qForm, textBn: v })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Option A" value={qForm.optionA} onChange={(v) => setQForm({ ...qForm, optionA: v })} />
              <Input label="Option B" value={qForm.optionB} onChange={(v) => setQForm({ ...qForm, optionB: v })} />
              <Input label="Option C" value={qForm.optionC} onChange={(v) => setQForm({ ...qForm, optionC: v })} />
              <Input label="Option D" value={qForm.optionD} onChange={(v) => setQForm({ ...qForm, optionD: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Correct answer" value={qForm.correctKey} onChange={(v) => setQForm({ ...qForm, correctKey: v })}
                options={['A', 'B', 'C', 'D'].map((k) => ({ value: k, label: k }))} />
              <Input label="Marks" type="number" value={qForm.marks} onChange={(v) => setQForm({ ...qForm, marks: v })} />
            </div>
            <Input label="Explanation (shown after submission)" value={qForm.explanation} onChange={(v) => setQForm({ ...qForm, explanation: v })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RefSelect label="Subject" entity="subjects" value={qForm.subjectId} onChange={(v) => setQForm({ ...qForm, subjectId: v })} />
              <RefSelect label="Chapter" entity="chapters" value={qForm.chapterId} onChange={(v) => setQForm({ ...qForm, chapterId: v })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowQForm(false)}>Cancel</Button>
              <Button onClick={submitQuestion} disabled={createQ.isPending || updateQ.isPending}>{editingQ ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {showEForm ? (
        <Modal title={editingE ? 'Edit exam' : 'New exam'} onClose={() => setShowEForm(false)}>
          <div className="space-y-4">
            <Input label="Title" value={eForm.title} onChange={(v) => setEForm({ ...eForm, title: v })} required />
            <Input label="Description" value={eForm.description} onChange={(v) => setEForm({ ...eForm, description: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={eForm.type} onChange={(v) => setEForm({ ...eForm, type: v })} options={EXAM_TYPES} />
              <Input label="Duration (seconds)" type="number" value={eForm.durationSec} onChange={(v) => setEForm({ ...eForm, durationSec: v })} />
              <Input label="Marks per question" type="number" value={eForm.marksPerQuestion} onChange={(v) => setEForm({ ...eForm, marksPerQuestion: v })} />
              <Input label="Negative marking (%)" type="number" value={eForm.negativeMarkPercent} onChange={(v) => setEForm({ ...eForm, negativeMarkPercent: v })} />
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Question IDs (comma separated) <span className="text-red-500">*</span></span>
              <textarea rows={2} value={eForm.questionIds} onChange={(e) => setEForm({ ...eForm, questionIds: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
                placeholder="507f1f77bcf86cd799439011, 507f…" />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={eForm.shuffle} onChange={(e) => setEForm({ ...eForm, shuffle: e.target.checked })} className="h-4 w-4" />
              Shuffle questions
            </label>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-navy-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Hierarchy</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <RefSelect label="Program" entity="programs" value={eForm.programId} onChange={(v) => setEForm({ ...eForm, programId: v })} />
                <RefSelect label="Regulation" entity="regulations" value={eForm.regulationId} onChange={(v) => setEForm({ ...eForm, regulationId: v })} />
                <RefSelect label="Semester" entity="semesters" value={eForm.semesterId} onChange={(v) => setEForm({ ...eForm, semesterId: v })} />
                <RefSelect label="Subject" entity="subjects" value={eForm.subjectId} onChange={(v) => setEForm({ ...eForm, subjectId: v })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowEForm(false)}>Cancel</Button>
              <Button onClick={submitExam} disabled={createE.isPending || updateE.isPending}>{editingE ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
