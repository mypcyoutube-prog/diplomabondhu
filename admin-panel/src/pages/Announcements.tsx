import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui';

interface Announcement {
  _id: string;
  title: string;
  body: string;
  category: string;
  source?: 'admin' | 'bteb';
  pdfUrl?: string;
  targeting: { all: boolean; programIds: string[]; technologyIds: string[]; semesterIds: string[] };
  status: string;
  scheduledAt?: string;
  createdAt: string;
}

interface Doc { _id: string; name?: string; code?: string }

const CATEGORIES = ['announcement', 'academic', 'exam', 'material', 'system'].map((c) => ({ value: c, label: c }));

export function AnnouncementsPage() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', body: '', category: 'announcement', source: 'admin', pdfUrl: '', all: true, scheduledAt: '', programIds: [] as string[], technologyIds: [] as string[], semesterIds: [] as string[] });

  const list = useApiQuery<{ items: Announcement[] }>(['announcements', page], `/notifications/admin/announcements${buildQuery({ page, limit: 20 })}`);
  const programs = useApiQuery<{ items: Doc[] }>(['academic', 'programs'], '/academic/programs?limit=100');
  const technologies = useApiQuery<{ items: Doc[] }>(['academic', 'technologies'], '/academic/technologies?limit=100');
  const semesters = useApiQuery<{ items: Doc[] }>(['academic', 'semesters'], '/academic/semesters?limit=100');

  const invalidate = [['announcements'], ['admin', 'dashboard']];
  const createMut = useApiMutation((body: unknown) => api('/notifications/admin/announcements', { method: 'POST', body }), invalidate);
  const publishMut = useApiMutation((id: string) => api(`/notifications/admin/announcements/${id}/publish`, { method: 'POST' }), invalidate);
  const deleteMut = useApiMutation((id: string) => api(`/notifications/admin/announcements/${id}`, { method: 'DELETE' }), invalidate);

  const act = <TVars,>(fn: () => void, mut: { mutate: (v: TVars, o?: { onError?: (e: Error) => void; onSuccess?: () => void }) => void }, vars: TVars) => {
    setActionError(null);
    mut.mutate(vars, { onError: (e: Error) => setActionError(e.message), onSuccess: fn });
  };

  const toggleId = (listIds: string[], id: string) =>
    listIds.includes(id) ? listIds.filter((x) => x !== id) : [...listIds, id];

  const submit = () => {
    setFormError(null);
    if (form.title.trim().length < 3) { setFormError('Title is required (min 3 chars)'); return; }
    if (form.body.trim().length < 3) { setFormError('Body is required (min 3 chars)'); return; }
    if (!form.all && form.programIds.length === 0 && form.technologyIds.length === 0 && form.semesterIds.length === 0) {
      setFormError('Select at least one target or choose "all students"');
      return;
    }
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      source: form.source,
      targeting: {
        all: form.all,
        programIds: form.all ? [] : form.programIds,
        technologyIds: form.all ? [] : form.technologyIds,
        semesterIds: form.all ? [] : form.semesterIds
      }
    };
    if (form.scheduledAt) body.scheduledAt = form.scheduledAt;
    if (form.pdfUrl.trim()) body.pdfUrl = form.pdfUrl.trim();
    createMut.mutate(body, { onSuccess: () => setShowForm(false), onError: (e) => setFormError(e.message) });
  };

  const multiSelect = (label: string, ids: string[], docs: Doc[] | undefined, onToggle: (id: string) => void) => (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <select
        multiple
        size={4}
        value={ids}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
          for (const id of selected) if (!ids.includes(id)) onToggle(id);
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
      >
        {(docs ?? []).map((d) => (
          <option key={d._id} value={d._id}>{d.name ?? d._id}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Targeted announcements for students (all, program, department or semester)"
        actions={<Button onClick={() => setShowForm(true)}>New announcement</Button>}
      />

      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No announcements yet." /> : (
        <Card>
          <Table head={['Title', 'Category', 'Source', 'Audience', 'Status', 'Created', 'Actions']}>
            {list.data.data.items.map((a) => (
              <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-medium text-navy dark:text-white">
                  {a.title}
                  <p className="max-w-md truncate text-xs font-normal text-slate-400">{a.body}</p>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.category}</td>
                <td className="px-4 py-3"><Badge tone={a.source === 'bteb' ? 'blue' : 'slate'}>{a.source ?? 'admin'}</Badge></td>
                <td className="px-4 py-3 text-slate-500">
                  {a.targeting.all ? 'All students' : `${a.targeting.programIds.length}P / ${a.targeting.technologyIds.length}T / ${a.targeting.semesterIds.length}S`}
                </td>
                <td className="px-4 py-3"><Badge tone={a.status === 'published' ? 'green' : 'amber'}>{a.status}</Badge></td>
                <td className="px-4 py-3 text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {a.status === 'draft' ? <Button onClick={() => act(() => undefined, publishMut, a._id)}>Publish</Button> : null}
                    {a.status === 'draft' ? <Button variant="danger" onClick={() => { if (window.confirm('Delete this announcement?')) act(() => undefined, deleteMut, a._id); }}>Delete</Button> : null}
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
        <Modal title="New announcement" onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            {formError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div> : null}
            <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Body <span className="text-red-500">*</span></span>
              <textarea
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
              <Select
                label="Source"
                value={form.source}
                onChange={(v) => setForm({ ...form, source: v })}
                options={[{ value: 'admin', label: 'DiplomaBondhu admin' }, { value: 'bteb', label: 'BTEB official' }]}
              />
              <Input label="Official PDF / source link (optional)" value={form.pdfUrl} onChange={(v) => setForm({ ...form, pdfUrl: v })} />
              <Input label="Schedule for later (optional)" type="datetime-local" value={form.scheduledAt} onChange={(v) => setForm({ ...form, scheduledAt: v })} />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={form.all} onChange={(e) => setForm({ ...form, all: e.target.checked })} className="h-4 w-4" />
              Send to all students
            </label>
            {!form.all ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {multiSelect('Programs', form.programIds, programs.data?.data.items, (id) => setForm({ ...form, programIds: toggleId(form.programIds, id) }))}
                {multiSelect('Departments', form.technologyIds, technologies.data?.data.items, (id) => setForm({ ...form, technologyIds: toggleId(form.technologyIds, id) }))}
                {multiSelect('Semesters', form.semesterIds, semesters.data?.data.items, (id) => setForm({ ...form, semesterIds: toggleId(form.semesterIds, id) }))}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending}>Create draft</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
