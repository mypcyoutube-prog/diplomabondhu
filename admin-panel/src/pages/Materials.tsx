import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui';

interface Material {
  _id: string;
  type: string;
  title: string;
  titleBn?: string;
  description?: string;
  status: string;
  viewCount: number;
  downloadCount: number;
  downloadAllowed: boolean;
  hierarchyRefs: Record<string, string>;
  payload: { fileUrl?: string; externalUrl?: string; examYear?: number };
}

interface Report {
  _id: string;
  materialId: string;
  reporterId: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface Doc { _id: string; name?: string; label?: string; code?: string }

const TYPES = ['book', 'note', 'video', 'past_question', 'subject_material'].map((t) => ({ value: t, label: t.replace('_', ' ') }));

function useOptions(entity: string | undefined) {
  return useApiQuery<{ items: Doc[] }>(
    ['academic', entity ?? 'none'],
    entity ? `/academic/${entity}?limit=100` : null
  );
}

function RefSelect({ label, entity, value, onChange, required }: { label: string; entity?: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  const list = useOptions(entity);
  const options = [
    { value: '', label: required ? 'Select…' : '— none —' },
    ...(list.data?.data.items ?? []).map((d) => ({ value: d._id, label: String(d.name ?? d.label ?? d.code ?? d._id) }))
  ];
  return <Select label={label} value={value} onChange={onChange} options={options} required={required} />;
}

export function MaterialsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: 'book', title: '', titleBn: '', description: '', fileUrl: '', externalUrl: '',
    examYear: '', downloadAllowed: false,
    programId: '', regulationId: '', technologyId: '', semesterId: '', subjectId: '', chapterId: ''
  });

  const list = useApiQuery<{ items: Material[] }>(
    ['materials', 'admin', page, type],
    `/materials/admin/materials${buildQuery({ page, limit: 20, type: type || undefined })}`
  );
  const reports = useApiQuery<{ items: Report[] }>(['materials', 'reports'], '/materials/admin/materials/reports?status=open');

  const invalidate = [['materials', 'admin'], ['materials', 'reports'], ['admin', 'dashboard']];
  const createMut = useApiMutation((body: unknown) => api('/materials/admin/materials', { method: 'POST', body }), invalidate);
  const updateMut = useApiMutation((body: unknown) => api(`/materials/admin/materials/${editing!._id}`, { method: 'PUT', body }), invalidate);
  const publishMut = useApiMutation((id: string) => api(`/materials/admin/materials/${id}/publish`, { method: 'POST' }), invalidate);
  const unpublishMut = useApiMutation((id: string) => api(`/materials/admin/materials/${id}/unpublish`, { method: 'POST' }), invalidate);
  const deleteMut = useApiMutation((id: string) => api(`/materials/admin/materials/${id}`, { method: 'DELETE' }), invalidate);
  const resolveMut = useApiMutation(
    (v: { reportId: string; status: string }) => api(`/materials/admin/materials/reports/${v.reportId}/resolve`, { method: 'POST', body: { status: v.status } }),
    invalidate
  );

  const openCreate = () => {
    setForm({ type: 'book', title: '', titleBn: '', description: '', fileUrl: '', externalUrl: '', examYear: '', downloadAllowed: false, programId: '', regulationId: '', technologyId: '', semesterId: '', subjectId: '', chapterId: '' });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (m: Material) => {
    setForm({
      type: m.type, title: m.title, titleBn: m.titleBn ?? '', description: m.description ?? '',
      fileUrl: m.payload?.fileUrl ?? '', externalUrl: m.payload?.externalUrl ?? '',
      examYear: m.payload?.examYear ? String(m.payload.examYear) : '',
      downloadAllowed: m.downloadAllowed,
      programId: m.hierarchyRefs?.programId ?? '', regulationId: m.hierarchyRefs?.regulationId ?? '',
      technologyId: m.hierarchyRefs?.technologyId ?? '', semesterId: m.hierarchyRefs?.semesterId ?? '',
      subjectId: m.hierarchyRefs?.subjectId ?? '', chapterId: m.hierarchyRefs?.chapterId ?? ''
    });
    setEditing(m);
    setFormError(null);
  };

  const submit = () => {
    setFormError(null);
    if (!form.title.trim() || form.title.trim().length < 2) { setFormError('Title is required (min 2 chars)'); return; }
    if (!form.fileUrl && !form.externalUrl) { setFormError('File URL or External URL is required'); return; }
    const hierarchyRefs: Record<string, string> = {};
    for (const k of ['programId', 'regulationId', 'technologyId', 'semesterId', 'subjectId', 'chapterId']) {
      const v = form[k as keyof typeof form];
      if (typeof v === 'string' && v) hierarchyRefs[k] = v;
    }
    const payload: Record<string, unknown> = {};
    if (form.fileUrl) payload.fileUrl = form.fileUrl;
    if (form.externalUrl) payload.externalUrl = form.externalUrl;
    if (form.examYear) payload.examYear = Number(form.examYear);
    const body: Record<string, unknown> = {
      type: form.type, title: form.title.trim(), hierarchyRefs, payload, downloadAllowed: form.downloadAllowed
    };
    if (form.titleBn) body.titleBn = form.titleBn.trim();
    if (form.description) body.description = form.description.trim();
    if (form.examYear && Number.isNaN(Number(form.examYear))) { setFormError('Exam year must be a number'); return; }

    const mut = editing ? updateMut : createMut;
    mut.mutate(body, {
      onSuccess: () => { setShowForm(false); setEditing(null); },
      onError: (e) => setFormError(e.message)
    });
  };

  const run = <TVars,>(fn: () => void, mut: { mutate: (v: TVars, o?: { onError?: (e: Error) => void; onSuccess?: () => void }) => void }, vars: TVars) => {
    setActionError(null);
    mut.mutate(vars, { onError: (e: Error) => setActionError(e.message), onSuccess: fn });
  };

  return (
    <div>
      <PageHeader
        title="Study Materials"
        subtitle="Manage books, notes, videos, past questions and subject materials"
        actions={<Button onClick={openCreate}>New material</Button>}
      />

      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-navy dark:text-white">Open content reports</h2>
        {reports.isLoading ? <Spinner label="Loading reports…" /> :
        reports.isError ? <ErrorState message={reports.error.message} /> :
        !reports.data?.data.items.length ? <p className="text-sm text-slate-500">No open reports.</p> : (
          <Table head={['Reason', 'Reported at', 'Actions']}>
            {reports.data.data.items.map((r) => (
              <tr key={r._id}>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.reason}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => run(() => undefined, resolveMut, { reportId: r._id, status: 'resolved' })}>Resolve</Button>
                    <Button variant="ghost" onClick={() => run(() => undefined, resolveMut, { reportId: r._id, status: 'dismissed' })}>Dismiss</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="mb-4 p-4">
        <div className="max-w-xs">
          <Select label="Type" value={type} onChange={(v) => { setType(v); setPage(1); }} options={[{ value: '', label: 'All types' }, ...TYPES]} />
        </div>
      </Card>

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No materials found." /> : (
        <Card>
          <Table head={['Title', 'Type', 'Status', 'Views', 'Downloads', 'Actions']}>
            {list.data.data.items.map((m) => (
              <tr key={m._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-medium text-navy dark:text-white">{m.title}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{m.type.replace('_', ' ')}</td>
                <td className="px-4 py-3"><Badge tone={m.status === 'published' ? 'green' : 'amber'}>{m.status}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{m.viewCount}</td>
                <td className="px-4 py-3 text-slate-500">{m.downloadCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => openEdit(m)}>Edit</Button>
                    {m.status === 'published' ? (
                      <Button variant="secondary" onClick={() => run(() => undefined, unpublishMut, m._id)}>Unpublish</Button>
                    ) : (
                      <Button onClick={() => run(() => undefined, publishMut, m._id)}>Publish</Button>
                    )}
                    <Button variant="danger" onClick={() => { if (window.confirm('Delete this material?')) run(() => undefined, deleteMut, m._id); }}>Delete</Button>
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

      {showForm ? (
        <Modal title={editing ? 'Edit material' : 'New material'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <div className="space-y-4">
            {formError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div> : null}
            <Select label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} required />
            <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <Input label="Title (Bangla)" value={form.titleBn} onChange={(v) => setForm({ ...form, titleBn: v })} />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
              />
            </label>
            <Input label="File URL (uploaded PDF)" value={form.fileUrl} onChange={(v) => setForm({ ...form, fileUrl: v })} placeholder="https://cdn.example.com/file.pdf" />
            <Input label="External URL" value={form.externalUrl} onChange={(v) => setForm({ ...form, externalUrl: v })} placeholder="https://…" />
            <Input label="Exam year (past questions)" type="number" value={form.examYear} onChange={(v) => setForm({ ...form, examYear: v })} />
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={form.downloadAllowed} onChange={(e) => setForm({ ...form, downloadAllowed: e.target.checked })} className="h-4 w-4" />
              Download allowed
            </label>
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-navy-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Hierarchy</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <RefSelect label="Program" entity="programs" value={form.programId} onChange={(v) => setForm({ ...form, programId: v })} />
                <RefSelect label="Regulation" entity="regulations" value={form.regulationId} onChange={(v) => setForm({ ...form, regulationId: v })} />
                <RefSelect label="Technology" entity="technologies" value={form.technologyId} onChange={(v) => setForm({ ...form, technologyId: v })} />
                <RefSelect label="Semester" entity="semesters" value={form.semesterId} onChange={(v) => setForm({ ...form, semesterId: v })} />
                <RefSelect label="Subject" entity="subjects" value={form.subjectId} onChange={(v) => setForm({ ...form, subjectId: v })} />
                <RefSelect label="Chapter" entity="chapters" value={form.chapterId} onChange={(v) => setForm({ ...form, chapterId: v })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>{editing ? 'Save changes' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
