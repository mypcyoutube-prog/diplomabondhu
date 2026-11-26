import { useEffect, useState } from 'react';
import { useApiMutation, useApiQuery } from '../api/hooks';
import { api } from '../api/client';
import { Button, Card, ErrorState, Input, PageHeader, Spinner } from '../components/ui';

interface DriveKeyState {
  configured: boolean;
  keyMasked: string | null;
}

function DriveKeyCard() {
  const keyState = useApiQuery<DriveKeyState>(['drive-key'], '/results/admin/drive-key');
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const saveMut = useApiMutation((apiKey: string | null) =>
    api<DriveKeyState>('/results/admin/drive-key', { method: 'PUT', body: { apiKey } }),
    [['drive-key']]);

  const save = (apiKey: string | null) => {
    setMsg(null);
    setErr(null);
    saveMut.mutate(apiKey, {
      onSuccess: (d) => {
        setValue('');
        setMsg(apiKey ? 'Drive API key saved (stored on the server, never shown here again).' : 'Drive API key removed.');
        void keyState.refetch();
        void d;
      },
      onError: (e) => setErr(e.message)
    });
  };

  return (
    <Card className="p-5 lg:col-span-2">
      <h2 className="mb-2 font-semibold text-navy dark:text-white">Google Drive API key (result PDF ingest)</h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Lets the admin panel pull every result PDF from a shared Drive folder link
        (folder must be shared as “Anyone with the link”). The key is stored on the
        server only — after saving it is masked and never shown again.
      </p>
      {keyState.isLoading && <Spinner />}
      {keyState.data && (
        <p className="mb-3 text-sm">
          {keyState.data.data.configured ? (
            <span className="font-medium text-emerald-700 dark:text-emerald-300">Key configured ({keyState.data.data.keyMasked})</span>
          ) : (
            <span className="text-slate-500">No key set yet.</span>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[280px] flex-1">
          <Input label="Paste API key (AIzaSy…)" value={value} onChange={setValue} />
        </div>
        <Button onClick={() => save(value.trim())} disabled={saveMut.isPending || value.trim().length < 20}>
          Save key
        </Button>
        {keyState.data?.data.configured && (
          <Button variant="secondary" onClick={() => save(null)} disabled={saveMut.isPending}>Remove key</Button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
    </Card>
  );
}

interface AppSettingsData {
  branding: { appName: string; logoUrl?: string };
  homepageSections: Array<{ key: string; visible: boolean; order: number; customizable?: boolean }>;
  featureFlags: Record<string, unknown>;
  maintenanceMode: boolean;
  supportInfo: { email?: string; phone?: string; url?: string };
  legal: { privacyPolicy?: string; terms?: string };
  versionInfo: { latestAppVersion?: string; notes?: string };
}

export function SettingsPage() {
  const settings = useApiQuery<AppSettingsData>(['settings'], '/settings/app');
  const [form, setForm] = useState<AppSettingsData | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data && !form) setForm(structuredClone(settings.data.data));
  }, [settings.data, form]);

  const saveMut = useApiMutation((body: Partial<AppSettingsData>) => api('/admin/settings', { method: 'PUT', body }), [['settings'], ['admin', 'dashboard']]);

  const save = () => {
    if (!form) return;
    setSaveError(null);
    setSaved(false);
    saveMut.mutate(
      {
        branding: { appName: form.branding.appName, ...(form.branding.logoUrl ? { logoUrl: form.branding.logoUrl } : {}) },
        homepageSections: form.homepageSections,
        featureFlags: form.featureFlags,
        maintenanceMode: form.maintenanceMode,
        supportInfo: form.supportInfo,
        legal: form.legal,
        versionInfo: form.versionInfo
      },
      {
        onSuccess: () => setSaved(true),
        onError: (e) => setSaveError(e.message)
      }
    );
  };

  if (settings.isLoading) return <Spinner />;
  if (settings.isError) return <ErrorState message={settings.error.message} onRetry={() => void settings.refetch()} />;
  if (!form) return null;

  const setSection = (key: string, patch: Partial<{ visible: boolean; order: number; customizable?: boolean }>) => {
    setForm({
      ...form,
      homepageSections: form.homepageSections.map((s) => (s.key === key ? { ...s, ...patch } : s))
    });
  };

  const setFlag = (key: string, value: boolean) => {
    setForm({ ...form, featureFlags: { ...form.featureFlags, [key]: value } });
  };

  return (
    <div>
      <PageHeader
        title="App Settings"
        subtitle="Branding, homepage sections, feature flags, maintenance mode, support and legal"
        actions={<Button onClick={save} disabled={saveMut.isPending}>{saveMut.isPending ? 'Saving…' : 'Save changes'}</Button>}
      />

      {saveError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{saveError}</div> : null}
      {saved ? <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">Settings saved.</div> : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-navy dark:text-white">Branding</h2>
          <div className="space-y-3">
            <Input label="App name" value={form.branding.appName} onChange={(v) => setForm({ ...form, branding: { ...form.branding, appName: v } })} />
            <Input label="Logo URL" value={form.branding.logoUrl ?? ''} onChange={(v) => setForm({ ...form, branding: { ...form.branding, logoUrl: v } })} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-navy dark:text-white">Operations</h2>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={form.maintenanceMode}
              onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
              className="h-4 w-4"
            />
            Maintenance mode (students see a maintenance screen)
          </label>
          <div className="mt-4 space-y-3">
            <Input label="Support email" value={form.supportInfo.email ?? ''} onChange={(v) => setForm({ ...form, supportInfo: { ...form.supportInfo, email: v } })} />
            <Input label="Support phone" value={form.supportInfo.phone ?? ''} onChange={(v) => setForm({ ...form, supportInfo: { ...form.supportInfo, phone: v } })} />
            <Input label="Latest app version" value={form.versionInfo.latestAppVersion ?? ''} onChange={(v) => setForm({ ...form, versionInfo: { ...form.versionInfo, latestAppVersion: v } })} />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-navy dark:text-white">Homepage sections</h2>
          <div className="space-y-2">
            {form.homepageSections.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-navy-700">
                <label className="flex items-center gap-2 text-sm" title="Visible on the student homepage">
                  <input type="checkbox" checked={s.visible} onChange={(e) => setSection(s.key, { visible: e.target.checked })} className="h-4 w-4" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">{s.key}</span>
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300" title="Students may hide or reorder this section">
                  <input
                    type="checkbox"
                    checked={s.customizable !== false}
                    onChange={(e) => setSection(s.key, { customizable: e.target.checked })}
                    className="h-4 w-4"
                  />
                  customizable
                </label>
                <input
                  type="number"
                  value={s.order}
                  min={0}
                  max={100}
                  onChange={(e) => setSection(s.key, { order: Number(e.target.value) })}
                  className="w-20 rounded border border-slate-300 px-2 py-1 text-sm dark:border-navy-700 dark:bg-navy-600 dark:text-white"
                  aria-label={`${s.key} order`}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-navy dark:text-white">Feature flags</h2>
          <div className="space-y-2">
            {Object.entries(form.featureFlags).map(([key, value]) => (
              <label key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-navy-700">
                <span className="font-medium text-slate-700 dark:text-slate-200">{key}</span>
                {typeof value === 'boolean' ? (
                  <input type="checkbox" checked={value} onChange={(e) => setFlag(key, e.target.checked)} className="h-4 w-4" />
                ) : (
                  <span className="text-slate-500">{String(value)}</span>
                )}
              </label>
            ))}
          </div>
        </Card>

        <DriveKeyCard />

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-navy dark:text-white">Legal</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Privacy policy</span>
              <textarea
                rows={6}
                value={form.legal.privacyPolicy ?? ''}
                onChange={(e) => setForm({ ...form, legal: { ...form.legal, privacyPolicy: e.target.value } })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Terms and conditions</span>
              <textarea
                rows={6}
                value={form.legal.terms ?? ''}
                onChange={(e) => setForm({ ...form, legal: { ...form.legal, terms: e.target.value } })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal dark:border-navy-700 dark:bg-navy-700 dark:text-white"
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}
