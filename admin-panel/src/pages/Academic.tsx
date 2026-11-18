import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui';

type FieldType = 'text' | 'number' | 'boolean' | 'ref' | 'select' | 'json';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  refEntity?: string;
  options?: Array<{ value: string; label: string }>;
}

interface EntityConfig {
  key: string;
  label: string;
  fields: FieldConfig[];
  listFields: string[];
}

const REGULATION_STATUS = ['draft', 'verification', 'testing', 'approved', 'published', 'retired'].map((s) => ({ value: s, label: s }));

const ENTITIES: EntityConfig[] = [
  {
    key: 'programs', label: 'Programs',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'nameBn', label: 'Name (Bangla)', type: 'text' },
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'durationSemesters', label: 'Duration (semesters)', type: 'number' },
      { key: 'isActive', label: 'Active', type: 'boolean' }
    ],
    listFields: ['name', 'code', 'durationSemesters', 'isActive']
  },
  {
    key: 'regulations', label: 'Regulations',
    fields: [
      { key: 'programId', label: 'Program', type: 'ref', refEntity: 'programs', required: true },
      { key: 'year', label: 'Year', type: 'number', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'status', label: 'Status', type: 'select', options: REGULATION_STATUS },
      { key: 'officialRefs', label: 'Official references (JSON array)', type: 'json' }
    ],
    listFields: ['name', 'year', 'status']
  },
  {
    key: 'institutes', label: 'Institutes',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'nameBn', label: 'Name (Bangla)', type: 'text' },
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'district', label: 'District', type: 'text' },
      { key: 'type', label: 'Type', type: 'text' }
    ],
    listFields: ['name', 'code', 'district', 'type']
  },
  {
    key: 'sessions', label: 'Sessions',
    fields: [
      { key: 'programId', label: 'Program', type: 'ref', refEntity: 'programs', required: true },
      { key: 'regulationId', label: 'Regulation', type: 'ref', refEntity: 'regulations', required: true },
      { key: 'startYear', label: 'Start year', type: 'number', required: true },
      { key: 'label', label: 'Label', type: 'text', required: true }
    ],
    listFields: ['label', 'startYear']
  },
  {
    key: 'technologies', label: 'Technologies',
    fields: [
      { key: 'programId', label: 'Program', type: 'ref', refEntity: 'programs', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'nameBn', label: 'Name (Bangla)', type: 'text' },
      { key: 'code', label: 'Code', type: 'text', required: true }
    ],
    listFields: ['name', 'code']
  },
  {
    key: 'semesters', label: 'Semesters',
    fields: [
      { key: 'programId', label: 'Program', type: 'ref', refEntity: 'programs', required: true },
      { key: 'regulationId', label: 'Regulation', type: 'ref', refEntity: 'regulations', required: true },
      { key: 'number', label: 'Semester number', type: 'number', required: true },
      { key: 'cgpaWeightPercent', label: 'CGPA weight (%)', type: 'number', required: true },
      { key: 'isIndustrial', label: 'Industrial attachment', type: 'boolean' }
    ],
    listFields: ['number', 'cgpaWeightPercent', 'isIndustrial']
  },
  {
    key: 'subjects', label: 'Subjects',
    fields: [
      { key: 'programId', label: 'Program', type: 'ref', refEntity: 'programs', required: true },
      { key: 'regulationId', label: 'Regulation', type: 'ref', refEntity: 'regulations', required: true },
      { key: 'technologyId', label: 'Technology', type: 'ref', refEntity: 'technologies', required: true },
      { key: 'semesterId', label: 'Semester', type: 'ref', refEntity: 'semesters', required: true },
      { key: 'code', label: 'Subject code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'nameBn', label: 'Name (Bangla)', type: 'text' },
      { key: 'credits', label: 'Credits', type: 'number', required: true },
      { key: 'isElective', label: 'Elective', type: 'boolean' }
    ],
    listFields: ['code', 'name', 'credits', 'isElective']
  },
  {
    key: 'chapters', label: 'Chapters',
    fields: [
      { key: 'subjectId', label: 'Subject', type: 'ref', refEntity: 'subjects', required: true },
      { key: 'number', label: 'Chapter number', type: 'number', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'nameBn', label: 'Name (Bangla)', type: 'text' }
    ],
    listFields: ['number', 'name']
  }
];

interface Doc { _id: string; [key: string]: unknown }

function FormFields({ config, values, setValues }: { config: EntityConfig; values: Record<string, string | boolean>; setValues: (v: Record<string, string | boolean>) => void }) {
  return (
    <>
      {config.fields.map((f) => {
        if (f.type === 'boolean') {
          return (
            <label key={f.key} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={Boolean(values[f.key])}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              {f.label}
            </label>
          );
        }
        if (f.type === 'ref' && f.refEntity) {
          return <RefSelect key={f.key} field={f} values={values} setValues={setValues} />;
        }
        if (f.type === 'select' && f.options) {
          return (
            <div key={f.key}>
              <Select
                label={f.label}
                value={String(values[f.key] ?? '')}
                onChange={(v) => setValues({ ...values, [f.key]: v })}
                options={f.options}
                required={f.required}
              />
            </div>
          );
        }
        if (f.type === 'json') {
          return (
            <label key={f.key} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{f.label}</span>
              <textarea
                rows={3}
                value={String(values[f.key] ?? '')}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
                placeholder='[{"title": "BTEB …"}]'
              />
            </label>
          );
        }
        return (
          <div key={f.key}>
            <Input
              label={f.label}
              type={f.type === 'number' ? 'number' : 'text'}
              value={String(values[f.key] ?? '')}
              onChange={(v) => setValues({ ...values, [f.key]: v })}
              required={f.required}
            />
          </div>
        );
      })}
    </>
  );
}

function RefSelect({ field, values, setValues }: { field: FieldConfig; values: Record<string, string | boolean>; setValues: (v: Record<string, string | boolean>) => void }) {
  const list = useApiQuery<{ items: Doc[] }>(['academic', field.refEntity!], `/academic/${field.refEntity}?limit=100`);
  const options = [
    { value: '', label: field.required ? 'Select…' : '— none —' },
    ...(list.data?.data.items ?? []).map((d) => ({
      value: d._id,
      label: String(d.name ?? d.label ?? d.code ?? d._id)
    }))
  ];
  return (
    <div>
      <Select
        label={field.label}
        value={String(values[field.key] ?? '')}
        onChange={(v) => setValues({ ...values, [field.key]: v })}
        options={options}
        required={field.required}
      />
      {list.isError ? <p className="mt-1 text-xs text-red-600">Failed to load {field.refEntity}</p> : null}
    </div>
  );
}

function buildBody(config: EntityConfig, values: Record<string, string | boolean>): Record<string, unknown> | string {
  const body: Record<string, unknown> = {};
  for (const f of config.fields) {
    const raw = values[f.key];
    if (raw === undefined || raw === '') continue;
    if (f.type === 'number') {
      const n = Number(raw);
      if (Number.isNaN(n)) return `${f.label} must be a number`;
      body[f.key] = n;
    } else if (f.type === 'boolean') {
      body[f.key] = Boolean(raw);
    } else if (f.type === 'json') {
      try {
        body[f.key] = raw ? JSON.parse(String(raw)) : [];
      } catch {
        return `${f.label} is not valid JSON`;
      }
    } else {
      body[f.key] = raw;
    }
  }
  return body;
}

export function AcademicPage() {
  const [entityKey, setEntityKey] = useState(ENTITIES[0].key);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const config = ENTITIES.find((e) => e.key === entityKey)!;
  const list = useApiQuery<{ items: Doc[] }>(['academic', entityKey, page], `/academic/${entityKey}${buildQuery({ page, limit: 20 })}`);

  const invalidate = [['academic', entityKey]];
  const createMut = useApiMutation((body: unknown) => api(`/academic/admin/${entityKey}`, { method: 'POST', body }), invalidate);
  const updateMut = useApiMutation((body: unknown) => api(`/academic/admin/${entityKey}/${editing!._id}`, { method: 'PATCH', body }), invalidate);
  const deleteMut = useApiMutation((id: string) => api(`/academic/admin/${entityKey}/${id}`, { method: 'DELETE' }), invalidate);

  const openCreate = () => {
    setValues({});
    setFormError(null);
    setCreating(true);
  };
  const openEdit = (doc: Doc) => {
    const v: Record<string, string | boolean> = {};
    for (const f of config.fields) {
      const val = doc[f.key];
      if (f.type === 'boolean') v[f.key] = Boolean(val);
      else if (f.type === 'json') v[f.key] = val ? JSON.stringify(val, null, 2) : '';
      else if (val !== undefined && val !== null) v[f.key] = String(val);
      else v[f.key] = '';
    }
    setValues(v);
    setFormError(null);
    setEditing(doc);
  };

  const submit = () => {
    setFormError(null);
    const parsed = buildBody(config, values);
    if (typeof parsed === 'string') {
      setFormError(parsed);
      return;
    }
    const mut = creating ? createMut : updateMut;
    mut.mutate(parsed, {
      onSuccess: () => {
        setCreating(false);
        setEditing(null);
      },
      onError: (e) => setFormError(e.message)
    });
  };

  const renderCell = (doc: Doc, key: string) => {
    const val = doc[key];
    if (typeof val === 'boolean') return <Badge tone={val ? 'green' : 'slate'}>{String(val)}</Badge>;
    if (val === undefined || val === null || val === '') return '—';
    if (key === 'status') return <Badge tone={val === 'published' ? 'green' : val === 'retired' ? 'red' : 'amber'}>{String(val)}</Badge>;
    if (key.endsWith('Id') && typeof val === 'object' && val !== null) {
      const obj = val as { name?: string; label?: string; code?: string };
      return String(obj.name ?? obj.label ?? obj.code ?? '—');
    }
    return String(val);
  };

  return (
    <div>
      <PageHeader
        title="Academic Structure"
        subtitle="Programs, regulations, institutes, sessions, technologies, semesters, subjects and chapters"
        actions={<Button onClick={openCreate}>New {config.label.replace(/s$/, '')}</Button>}
      />
      <Card className="mb-4 p-4">
        <div className="max-w-xs">
          <Select
            label="Entity"
            value={entityKey}
            onChange={(v) => { setEntityKey(v); setPage(1); }}
            options={ENTITIES.map((e) => ({ value: e.key, label: e.label }))}
          />
        </div>
      </Card>

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message={`No ${config.label.toLowerCase()} yet.`} /> : (
        <Card>
          <Table head={[...config.listFields, 'Actions']}>
            {list.data.data.items.map((doc) => (
              <tr key={doc._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                {config.listFields.map((f) => (
                  <td key={f} className="px-4 py-3 text-slate-600 dark:text-slate-300">{renderCell(doc, f)}</td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => openEdit(doc)}>Edit</Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('Delete this item? This is a soft delete.')) {
                          deleteMut.mutate(doc._id);
                        }
                      }}
                    >
                      Delete
                    </Button>
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

      {creating || editing ? (
        <Modal title={creating ? `New ${config.label.replace(/s$/, '')}` : `Edit ${config.label.replace(/s$/, '')}`} onClose={() => { setCreating(false); setEditing(null); }}>
          <div className="space-y-4">
            {formError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div> : null}
            <FormFields config={config} values={values} setValues={setValues} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
                {creating ? 'Create' : 'Save changes'}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
