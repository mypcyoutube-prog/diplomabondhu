import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Spinner, Table } from '../components/ui';

interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  ctaLabel: string;
  status: string;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
}

const emptyForm = { title: '', imageUrl: '', linkUrl: '', ctaLabel: '', priority: 0, startsAt: '', endsAt: '' };

export function BannersPage() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const list = useApiQuery<{ items: Banner[]; meta?: { page: number; limit: number; total: number } }>(['banners', page], `/banners/admin${buildQuery({ page, limit: 20 })}`);

  const invalidate = [['banners']];
  const createMut = useApiMutation((body: unknown) => api('/banners/admin', { method: 'POST', body }), invalidate);
  const updateMut = useApiMutation((vars: { id: string; body: unknown }) => api(`/banners/admin/${vars.id}`, { method: 'PUT', body: vars.body }), invalidate);
  const publishMut = useApiMutation((id: string) => api(`/banners/admin/${id}/publish`, { method: 'POST' }), invalidate);
  const unpublishMut = useApiMutation((id: string) => api(`/banners/admin/${id}/unpublish`, { method: 'POST' }), invalidate);
  const deleteMut = useApiMutation((id: string) => api(`/banners/admin/${id}`, { method: 'DELETE' }), invalidate);

  const act = <TVars,>(fn: () => void, mut: { mutate: (v: TVars, o?: { onError?: (e: Error) => void; onSuccess?: () => void }) => void }, vars: TVars) => {
    setActionError(null);
    mut.mutate(vars, { onError: (e: Error) => setActionError(e.message), onSuccess: fn });
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (b: Banner) => {
    setEditId(b._id);
    setForm({
      title: b.title ?? '',
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? '',
      ctaLabel: b.ctaLabel ?? '',
      priority: b.priority ?? 0,
      startsAt: b.startsAt ? b.startsAt.slice(0, 16) : '',
      endsAt: b.endsAt ? b.endsAt.slice(0, 16) : ''
    });
    setFormError(null);
    setShowForm(true);
  };

  const submit = () => {
    setFormError(null);
    const imageUrl = form.imageUrl.trim();
    if (!/^https?:\/\/\S+$/.test(imageUrl)) { setFormError('Image URL is required and must start with http:// or https://'); return; }
    if (form.linkUrl.trim() && !/^https?:\/\/\S+$/.test(form.linkUrl.trim())) { setFormError('Link URL must start with http:// or https://'); return; }
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      imageUrl,
      linkUrl: form.linkUrl.trim(),
      ctaLabel: form.ctaLabel.trim(),
      priority: Number.isFinite(form.priority) ? form.priority : 0
    };
    if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString();
    if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString();
    if (editId) {
      updateMut.mutate({ id: editId, body }, { onSuccess: () => setShowForm(false), onError: (e) => setFormError(e.message) });
    } else {
      createMut.mutate(body, { onSuccess: () => setShowForm(false), onError: (e) => setFormError(e.message) });
    }
  };

  const windowText = (b: Banner) => {
    const from = b.startsAt ? new Date(b.startsAt).toLocaleDateString() : '—';
    const to = b.endsAt ? new Date(b.endsAt).toLocaleDateString() : '∞';
    return `${from} → ${to}`;
  };

  return (
    <div>
      <PageHeader
        title="Banners"
        subtitle="Home screen banner strip shown below notices — create, publish and schedule promotional banners"
        actions={<Button onClick={openNew}>New banner</Button>}
      />

      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No banners yet. Create one and publish it to show on the student home screen." /> : (
        <Card>
          <Table head={['Banner', 'Link / CTA', 'Priority', 'Window', 'Status', 'Actions']}>
            {list.data.data.items.map((b) => (
              <tr key={b._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={b.imageUrl} alt="" className="h-10 w-20 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-navy-700" />
                    <div className="min-w-0">
                      <p className="font-medium text-navy dark:text-white">{b.title || <span className="text-slate-400">(no title)</span>}</p>
                      <p className="max-w-xs truncate text-xs text-slate-400">{b.imageUrl}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <p className="max-w-xs truncate">{b.linkUrl || <span className="text-slate-400">—</span>}</p>
                  {b.ctaLabel ? <p className="text-xs text-slate-400">CTA: {b.ctaLabel}</p> : null}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{b.priority}</td>
                <td className="px-4 py-3 text-slate-500">{windowText(b)}</td>
                <td className="px-4 py-3"><Badge tone={b.status === 'published' ? 'green' : 'amber'}>{b.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEdit(b)}>Edit</Button>
                    {b.status === 'draft'
                      ? <Button onClick={() => act(() => undefined, publishMut, b._id)}>Publish</Button>
                      : <Button variant="secondary" onClick={() => act(() => undefined, unpublishMut, b._id)}>Unpublish</Button>}
                    <Button variant="danger" onClick={() => { if (window.confirm('Delete this banner?')) act(() => undefined, deleteMut, b._id); }}>Delete</Button>
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
        <Modal title={editId ? 'Edit banner' : 'New banner'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            {formError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div> : null}
            <Input label="Title (optional)" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Input label="Image URL" type="url" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} required />
            <Input label="Link URL (optional, https)" type="url" value={form.linkUrl} onChange={(v) => setForm({ ...form, linkUrl: v })} />
            <Input label="CTA label (optional, max 40 chars)" value={form.ctaLabel} onChange={(v) => setForm({ ...form, ctaLabel: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Priority (0–1000)" type="number" value={String(form.priority)} onChange={(v) => setForm({ ...form, priority: Number(v) || 0 })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Starts at (optional)" type="datetime-local" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} />
              <Input label="Ends at (optional)" type="datetime-local" value={form.endsAt} onChange={(v) => setForm({ ...form, endsAt: v })} />
            </div>
            <p className="text-xs text-slate-500">New banners are created as draft. Publish to make them visible on the student home screen.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>{editId ? 'Save changes' : 'Create draft'}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
