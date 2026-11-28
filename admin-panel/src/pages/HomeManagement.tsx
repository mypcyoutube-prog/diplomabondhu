import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery, type ListMeta } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui';
import { HomeImportExportTab, HomeHistoryTab, HomeRecoveryTab } from './HomeManagementData';

interface HomeItem {
  _id: string;
  slug: string;
  titleEn: string;
  titleBn: string;
  subtitleEn?: string;
  subtitleBn?: string;
  icon: string;
  route: string;
  bgColor: string;
  fgColor: string;
  materialTypes?: string[];
  displayOrder: number;
  status: string;
  scheduledAt?: string | null;
  visibility: boolean;
  archived: boolean;
  deletedAt?: string | null;
}

interface SectionConfig {
  _id: string;
  key: string;
  visible: boolean;
  displayOrder: number;
  maxItems: number;
}

interface Welcome {
  messageEn: string;
  messageBn: string;
  visible: boolean;
}

const ICON_SUGGESTIONS = [
  'menu_book_rounded', 'quiz_rounded', 'functions_rounded', 'groups_rounded', 'campaign_rounded',
  'auto_stories_rounded', 'edit_note_rounded', 'play_circle_rounded', 'folder_special_rounded',
  'home_rounded', 'notifications_rounded', 'person_rounded', 'search_rounded', 'settings_rounded',
  'book_rounded', 'bookmarks_rounded', 'calendar_today_rounded', 'event_rounded', 'school_rounded'
];

const ROUTE_SUGGESTIONS = [
  '/library', '/exams', '/gpa/cgpa', '/gpa/history', '/community', '/notices', '/subjects',
  '/planner', '/results/checker', '/bookmarks', '/workspace', '/study-plan', '/notifications',
  '/profile', '/settings', '/dashboard-customize'
];

const MATERIAL_TYPES = ['book', 'note', 'video', 'past_question', 'subject_material'];

const TABS = [
  { key: 'quick_access', label: 'Quick Access' },
  { key: 'study_resources', label: 'Study Resources' },
  { key: 'sections', label: 'Sections' },
  { key: 'welcome', label: 'Welcome' },
  { key: 'import', label: 'Import / Export' },
  { key: 'history', label: 'Import History' },
  { key: 'recovery', label: 'Recovery' }
] as const;

type TabKey = (typeof TABS)[number]['key'];

function IconDatalist({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {ICON_SUGGESTIONS.map((i) => <option key={i} value={i} />)}
    </datalist>
  );
}

function RouteDatalist({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {ROUTE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
    </datalist>
  );
}

interface ItemForm {
  slug: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  icon: string;
  route: string;
  bgColor: string;
  fgColor: string;
  displayOrder: string;
  materialTypes: string[];
}

const emptyItemForm: ItemForm = {
  slug: '', titleEn: '', titleBn: '', subtitleEn: '', subtitleBn: '',
  icon: '', route: '', bgColor: '#E0F2F1', fgColor: '#00695C', displayOrder: '0', materialTypes: ['book']
};

function statusTone(status: string): 'green' | 'amber' | 'slate' {
  if (status === 'published') return 'green';
  if (status === 'scheduled') return 'amber';
  return 'slate';
}

function ContentListTab({ category }: { category: 'quick_access' | 'study_resources' }) {
  const base = category === 'quick_access' ? '/home/quick-access' : '/home/study-resources';
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyItemForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useApiQuery<{ items: HomeItem[]; meta?: ListMeta }>(
    ['home', category, page, status, q],
    `${base}${buildQuery({ page, limit: 20, status: status || undefined, q: q || undefined })}`
  );

  const invalidate = [['home', category]];
  const createMut = useApiMutation((body: unknown) => api(base, { method: 'POST', body }), invalidate);
  const updateMut = useApiMutation((vars: { id: string; body: unknown }) => api(`${base}/${vars.id}`, { method: 'PUT', body: vars.body }), invalidate);
  const actionMut = useApiMutation((vars: { id: string; action: string; body?: unknown }) => api(`${base}/${vars.id}/${vars.action}`, { method: 'POST', body: vars.body }), invalidate);
  const deleteMut = useApiMutation((id: string) => api(`${base}/${id}`, { method: 'DELETE' }), invalidate);
  const reorderMut = useApiMutation((body: unknown) => api(`${base}/reorder`, { method: 'POST', body }), invalidate);

  const busy = createMut.isPending || updateMut.isPending || actionMut.isPending || deleteMut.isPending || reorderMut.isPending;

  const act = (vars: { id: string; action: string; body?: unknown }) => {
    setActionError(null);
    actionMut.mutate(vars, { onError: (e: Error) => setActionError(e.message) });
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyItemForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (item: HomeItem) => {
    setEditId(item._id);
    setForm({
      slug: item.slug,
      titleEn: item.titleEn ?? '',
      titleBn: item.titleBn ?? '',
      subtitleEn: item.subtitleEn ?? '',
      subtitleBn: item.subtitleBn ?? '',
      icon: item.icon,
      route: item.route,
      bgColor: item.bgColor ?? '#E0F2F1',
      fgColor: item.fgColor ?? '#00695C',
      displayOrder: String(item.displayOrder ?? 0),
      materialTypes: item.materialTypes ?? ['book']
    });
    setFormError(null);
    setShowForm(true);
  };

  const submit = () => {
    setFormError(null);
    if (!/^[a-z0-9][a-z0-9-]{1,78}$/.test(form.slug.trim())) { setFormError('Slug must be lowercase letters, numbers and dashes (2-80 chars).'); return; }
    if (!form.titleEn.trim() || !form.titleBn.trim()) { setFormError('Both Bangla and English titles are required.'); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(form.bgColor) || !/^#[0-9a-fA-F]{6}$/.test(form.fgColor)) { setFormError('Colors must be hex like #E0F2F1.'); return; }
    if (category === 'study_resources' && form.materialTypes.length === 0) { setFormError('Select at least one material type.'); return; }
    const body: Record<string, unknown> = {
      slug: form.slug.trim(),
      titleEn: form.titleEn.trim(),
      titleBn: form.titleBn.trim(),
      icon: form.icon.trim(),
      route: form.route.trim(),
      bgColor: form.bgColor,
      fgColor: form.fgColor,
      displayOrder: Number(form.displayOrder) || 0
    };
    if (form.subtitleEn.trim()) body.subtitleEn = form.subtitleEn.trim();
    if (form.subtitleBn.trim()) body.subtitleBn = form.subtitleBn.trim();
    if (category === 'study_resources') body.materialTypes = form.materialTypes;
    if (editId) {
      updateMut.mutate({ id: editId, body }, { onSuccess: () => setShowForm(false), onError: (e: Error) => setFormError(e.message) });
    } else {
      createMut.mutate(body, { onSuccess: () => setShowForm(false), onError: (e: Error) => setFormError(e.message) });
    }
  };

  const move = (item: HomeItem, direction: -1 | 1) => {
    const items = [...(list.data?.data.items ?? [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = items.findIndex((i) => i._id === item._id);
    const swapWith = items[idx + direction];
    if (!swapWith) return;
    reorderMut.mutate(
      { items: [{ id: item._id, displayOrder: swapWith.displayOrder }, { id: swapWith._id, displayOrder: item.displayOrder }] },
      { onError: (e: Error) => setActionError(e.message) }
    );
  };

  const toggleMaterialType = (t: string) => {
    setForm((f) => ({
      ...f,
      materialTypes: f.materialTypes.includes(t) ? f.materialTypes.filter((x) => x !== t) : [...f.materialTypes, t]
    }));
  };

  const isResource = category === 'study_resources';

  return (
    <div>
      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-56"><Input label="Search" value={q} onChange={setQ} placeholder="Title or slug…" /></div>
        <div className="w-44">
          <Select
            label="Filter"
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'All (active)' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'archived', label: 'Archived' }
            ]}
          />
        </div>
        <div className="ml-auto"><Button onClick={openNew}>New {isResource ? 'category' : 'tile'}</Button></div>
      </div>

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message={`No ${isResource ? 'study resource categories' : 'quick access tiles'} here yet. Create one, then publish it for students.`} /> : (
        <Card>
          <Table head={['Item', 'Icon / Route', isResource ? 'Material types' : 'Subtitle', 'Order', 'Status', 'Visible', 'Actions']}>
            {list.data.data.items.map((item) => (
              <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3">
                  <p className="font-medium text-navy dark:text-white">{item.titleEn} <span className="text-slate-400">· {item.titleBn}</span></p>
                  <p className="text-xs text-slate-400">{item.slug}</p>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold" style={{ backgroundColor: item.bgColor, color: item.fgColor }}>▲</span>
                  <p className="mt-1 font-mono text-xs text-slate-500">{item.icon}</p>
                  <p className="font-mono text-xs text-slate-400">{item.route}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {isResource
                    ? (item.materialTypes ?? []).join(', ')
                    : (item.subtitleEn || item.subtitleBn || <span className="text-slate-400">—</span>)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="w-6 text-center text-slate-600 dark:text-slate-300">{item.displayOrder}</span>
                    <Button variant="secondary" disabled={busy} onClick={() => move(item, -1)}>&uarr;</Button>
                    <Button variant="secondary" disabled={busy} onClick={() => move(item, 1)}>&darr;</Button>
                  </div>
                </td>
                <td className="px-4 py-3"><Badge tone={statusTone(item.status)}>{item.status}</Badge>{item.archived ? <Badge tone="slate">archived</Badge> : null}</td>
                <td className="px-4 py-3"><Badge tone={item.visibility ? 'green' : 'slate'}>{item.visibility ? 'shown' : 'hidden'}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEdit(item)}>Edit</Button>
                    {item.status === 'published'
                      ? <Button variant="secondary" onClick={() => act({ id: item._id, action: 'unpublish' })}>Unpublish</Button>
                      : <Button onClick={() => act({ id: item._id, action: 'publish' })}>Publish</Button>}
                    <Button variant="secondary" onClick={() => act({ id: item._id, action: 'visibility', body: { visible: !item.visibility } })}>{item.visibility ? 'Hide' : 'Show'}</Button>
                    {item.archived
                      ? <Button variant="secondary" onClick={() => act({ id: item._id, action: 'unarchive' })}>Unarchive</Button>
                      : <Button variant="secondary" onClick={() => act({ id: item._id, action: 'archive' })}>Archive</Button>}
                    <Button variant="danger" onClick={() => { if (window.confirm(`Soft-delete “${item.titleEn}”? You can restore it later.`)) deleteMut.mutate(item._id, { onError: (e: Error) => setActionError(e.message) }); }}>Delete</Button>
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
        <Modal title={editId ? 'Edit item' : `New ${isResource ? 'study resource category' : 'quick access tile'}`} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            {formError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div> : null}
            <IconDatalist id="icon-list" />
            <RouteDatalist id="route-list" />
            <Input label="Slug (unique id)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="quick-study" required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Title (English)" value={form.titleEn} onChange={(v) => setForm({ ...form, titleEn: v })} required />
              <Input label="Title (Bangla)" value={form.titleBn} onChange={(v) => setForm({ ...form, titleBn: v })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Subtitle (English)" value={form.subtitleEn} onChange={(v) => setForm({ ...form, subtitleEn: v })} />
              <Input label="Subtitle (Bangla)" value={form.subtitleBn} onChange={(v) => setForm({ ...form, subtitleBn: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Icon (Material icon name)" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} list="icon-list" placeholder="menu_book_rounded" required />
              <Input label="Route (whitelisted)" value={form.route} onChange={(v) => setForm({ ...form, route: v })} list="route-list" placeholder="/library" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Background color" value={form.bgColor} onChange={(v) => setForm({ ...form, bgColor: v })} placeholder="#E0F2F1" />
              <Input label="Icon color" value={form.fgColor} onChange={(v) => setForm({ ...form, fgColor: v })} placeholder="#00897B" />
              <Input label="Display order" type="number" value={form.displayOrder} onChange={(v) => setForm({ ...form, displayOrder: v })} />
            </div>
            {isResource ? (
              <fieldset>
                <legend className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Material types (count comes from real published materials)</legend>
                <div className="flex flex-wrap gap-2">
                  {MATERIAL_TYPES.map((t) => (
                    <label key={t} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${form.materialTypes.includes(t) ? 'border-teal bg-teal/10 text-teal' : 'border-slate-300 text-slate-600 dark:border-navy-700 dark:text-slate-300'}`}>
                      <input type="checkbox" className="sr-only" checked={form.materialTypes.includes(t)} onChange={() => toggleMaterialType(t)} />
                      {t}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}
            <p className="text-xs text-slate-500">Unknown icons and routes are rejected by the backend whitelist. New items start as draft — publish to show them on the student home screen.</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={busy}>{editId ? 'Save changes' : 'Create draft'}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function SectionsTab() {
  const list = useApiQuery<{ items: SectionConfig[] }>(['home', 'configuration'], '/home/configuration');
  const [actionError, setActionError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ key: '', visible: true, displayOrder: '0', maxItems: '10' });
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = [['home', 'configuration']];
  const upsertMut = useApiMutation((body: unknown) => api('/home/configuration', { method: 'POST', body }), invalidate);
  const updateMut = useApiMutation((vars: { id: string; body: unknown }) => api(`/home/configuration/${vars.id}`, { method: 'PUT', body: vars.body }), invalidate);
  const deleteMut = useApiMutation((id: string) => api(`/home/configuration/${id}`, { method: 'DELETE' }), invalidate);

  const openNew = () => { setEditId(null); setForm({ key: '', visible: true, displayOrder: '0', maxItems: '10' }); setFormError(null); setShowForm(true); };
  const openEdit = (cfg: SectionConfig) => {
    setEditId(cfg._id);
    setForm({ key: cfg.key, visible: cfg.visible, displayOrder: String(cfg.displayOrder ?? 0), maxItems: String(cfg.maxItems ?? 10) });
    setFormError(null);
    setShowForm(true);
  };

  const submit = () => {
    setFormError(null);
    if (!/^[a-z_]{2,40}$/.test(form.key.trim())) { setFormError('Section key must be lowercase letters/underscores (e.g. quick_access).'); return; }
    const body: Record<string, unknown> = {
      key: form.key.trim(),
      visible: form.visible,
      displayOrder: Number(form.displayOrder) || 0,
      maxItems: Number(form.maxItems) || 10
    };
    if (editId) {
      updateMut.mutate({ id: editId, body }, { onSuccess: () => setShowForm(false), onError: (e: Error) => setFormError(e.message) });
    } else {
      upsertMut.mutate(body, { onSuccess: () => setShowForm(false), onError: (e: Error) => setFormError(e.message) });
    }
  };

  return (
    <div>
      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}
      <div className="mb-4 flex justify-end"><Button onClick={openNew}>Add / override section</Button></div>
      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No section overrides. All home sections use their defaults until you add one." /> : (
        <Card>
          <Table head={['Section key', 'Visible', 'Order', 'Max items', 'Actions']}>
            {list.data.data.items.map((cfg) => (
              <tr key={cfg._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-mono text-sm text-navy dark:text-white">{cfg.key}</td>
                <td className="px-4 py-3"><Badge tone={cfg.visible ? 'green' : 'slate'}>{cfg.visible ? 'shown' : 'hidden'}</Badge></td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{cfg.displayOrder}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{cfg.maxItems}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEdit(cfg)}>Edit</Button>
                    <Button variant="secondary" onClick={() => updateMut.mutate({ id: cfg._id, body: { visible: !cfg.visible } }, { onError: (e: Error) => setActionError(e.message) })}>{cfg.visible ? 'Hide' : 'Show'}</Button>
                    <Button variant="danger" onClick={() => { if (window.confirm(`Remove the override for “${cfg.key}”? The section falls back to its default.`)) deleteMut.mutate(cfg._id, { onError: (e: Error) => setActionError(e.message) }); }}>Remove</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {showForm ? (
        <Modal title={editId ? 'Edit section override' : 'New section override'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            {formError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div> : null}
            <Input label="Section key" value={form.key} onChange={(v) => setForm({ ...form, key: v })} placeholder="quick_access" required />
            <Select label="Visible" value={form.visible ? 'yes' : 'no'} onChange={(v) => setForm({ ...form, visible: v === 'yes' })} options={[{ value: 'yes', label: 'Shown' }, { value: 'no', label: 'Hidden' }]} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Display order" type="number" value={form.displayOrder} onChange={(v) => setForm({ ...form, displayOrder: v })} />
              <Input label="Max items" type="number" value={form.maxItems} onChange={(v) => setForm({ ...form, maxItems: v })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={submit} disabled={upsertMut.isPending || updateMut.isPending}>{editId ? 'Save changes' : 'Create override'}</Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function WelcomeTab() {
  const list = useApiQuery<Welcome>(['home', 'welcome'], '/home/welcome');
  const [messageEn, setMessageEn] = useState('');
  const [messageBn, setMessageBn] = useState('');
  const [visible, setVisible] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const saveMut = useApiMutation((body: unknown) => api('/home/welcome', { method: 'PUT', body }), [['home', 'welcome'], ['home', 'content']]);

  if (list.data?.data && !loaded) {
    setMessageEn(list.data.data.messageEn ?? '');
    setMessageBn(list.data.data.messageBn ?? '');
    setVisible(list.data.data.visible ?? true);
    setLoaded(true);
  }

  const submit = () => {
    setSaveError(null);
    setSaved(false);
    saveMut.mutate(
      { messageEn: messageEn.trim(), messageBn: messageBn.trim(), visible },
      { onSuccess: () => setSaved(true), onError: (e: Error) => setSaveError(e.message) }
    );
  };

  return (
    <div className="max-w-xl">
      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> : (
        <Card>
          <div className="space-y-4 p-4">
            <p className="text-sm text-slate-500">Welcome text shown on the student home card. Student names always come from their authenticated profile — never set them here. Saving requires the Settings permission.</p>
            {saveError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{saveError}</div> : null}
            {saved ? <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700" role="status">Welcome configuration saved.</div> : null}
            <Input label="Message (English)" value={messageEn} onChange={setMessageEn} placeholder="Welcome back!" />
            <Input label="Message (Bangla)" value={messageBn} onChange={setMessageBn} placeholder="স্বাগতম!" />
            <Select label="Visibility" value={visible ? 'yes' : 'no'} onChange={(v) => setVisible(v === 'yes')} options={[{ value: 'yes', label: 'Shown' }, { value: 'no', label: 'Hidden' }]} />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={saveMut.isPending}>Save welcome configuration</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function HomeManagementPage() {
  const [tab, setTab] = useState<TabKey>('quick_access');

  return (
    <div>
      <PageHeader
        title="Home Management"
        subtitle="Everything on the student home screen — tiles, resource categories, section visibility, welcome text and JSON import/export"
      />
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-navy-700" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t.key ? 'bg-teal text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-navy-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'quick_access' ? <ContentListTab category="quick_access" /> : null}
      {tab === 'study_resources' ? <ContentListTab category="study_resources" /> : null}
      {tab === 'sections' ? <SectionsTab /> : null}
      {tab === 'welcome' ? <WelcomeTab /> : null}
      {tab === 'import' ? <HomeImportExportTab /> : null}
      {tab === 'history' ? <HomeHistoryTab /> : null}
      {tab === 'recovery' ? <HomeRecoveryTab /> : null}
    </div>
  );
}
