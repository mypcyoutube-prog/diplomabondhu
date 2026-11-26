import { useEffect, useState } from 'react';
import { useApiMutation, useApiQuery } from '../api/hooks';
import { api } from '../api/client';
import { Button, Card, ErrorState, PageHeader, Spinner } from '../components/ui';

interface AiStatus {
  provider: string;
  configured: boolean;
  planDailyLimit: number;
}

interface SearchAnalytics {
  topQueries: Array<{ q: string; count: number; avgResults: number }>;
  zeroResultQueries: string[];
}

interface SynonymConfig {
  groups: string[][];
}

function SynonymsCard() {
  const config = useApiQuery<SynonymConfig>(['search-synonyms'], '/search/admin/config');
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (config.data && !draft) {
      setDraft(config.data.data.groups.map((g) => g.join(', ')).join('\n'));
    }
  }, [config.data, draft]);

  const saveMut = useApiMutation((groups: string[][]) =>
    api<SynonymConfig>('/search/admin/config', { method: 'PUT', body: { groups } }),
  [['search-synonyms'], ['settings']]);

  const save = () => {
    setMsg(null);
    setErr(null);
    const groups = draft
      .split('\n')
      .map((line) => line.split(',').map((w) => w.trim()).filter((w) => w.length > 0))
      .filter((g) => g.length >= 2);
    if (draft.trim().length > 0 && groups.length === 0) {
      setErr('Each synonym group needs at least 2 comma-separated words.');
      return;
    }
    saveMut.mutate(groups, {
      onSuccess: () => {
        setMsg(`Saved ${groups.length} synonym group(s).`);
        void config.refetch();
      },
      onError: (e) => setErr(e.message)
    });
  };

  return (
    <Card className="p-5">
      <h2 className="mb-2 font-semibold text-navy dark:text-white">Search synonyms</h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        One group per line, comma separated. Every word in a group expands the search
        (e.g. <code>gpa, grade point</code>).
      </p>
      {config.isLoading && <Spinner />}
      {config.isError && <ErrorState message={config.error.message} onRetry={() => void config.refetch()} />}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-navy-700 dark:bg-navy-600 dark:text-white"
        aria-label="Synonym groups"
      />
      <div className="mt-3">
        <Button onClick={save} disabled={saveMut.isPending || config.isLoading}>
          {saveMut.isPending ? 'Saving\u2026' : 'Save synonyms'}
        </Button>
      </div>
      {msg && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300" role="status">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600" role="alert">{err}</p>}
    </Card>
  );
}

export function AiSearchSettingsPage() {
  const status = useApiQuery<AiStatus>(['ai-status'], '/ai/status');
  const analytics = useApiQuery<SearchAnalytics>(['search-analytics'], '/search/admin/analytics');

  return (
    <div>
      <PageHeader
        title="AI & Search"
        subtitle="AI study plan status, search analytics and synonym configuration"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-2 font-semibold text-navy dark:text-white">AI study plan provider</h2>
          {status.isLoading && <Spinner />}
          {status.isError && <ErrorState message={status.error.message} onRetry={() => void status.refetch()} />}
          {status.data && (
            <div className="space-y-2 text-sm">
              <p>
                Status:{' '}
                {status.data.data.configured ? (
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">Configured</span>
                ) : (
                  <span className="font-medium text-amber-600">Not configured (students see a disabled state)</span>
                )}
              </p>
              <p>Provider: <span className="font-medium">{status.data.data.provider}</span></p>
              <p>Daily plan limit per student: <span className="font-medium">{status.data.data.planDailyLimit}</span></p>
              <p className="text-slate-500 dark:text-slate-300">
                Configure via backend environment variables: <code>AI_PROVIDER</code>, <code>AI_API_KEY</code>,
                <code> AI_MODEL</code>. Keys are never exposed to clients.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 font-semibold text-navy dark:text-white">Search analytics</h2>
          {analytics.isLoading && <Spinner />}
          {analytics.isError && <ErrorState message={analytics.error.message} onRetry={() => void analytics.refetch()} />}
          {analytics.data && (
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="mb-1 font-medium text-slate-700 dark:text-slate-200">Top queries</h3>
                {analytics.data.data.topQueries.length === 0 ? (
                  <p className="text-slate-500">No search history yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {analytics.data.data.topQueries.map((t) => (
                      <li key={t.q} className="flex justify-between rounded bg-slate-50 px-2 py-1 dark:bg-navy-700">
                        <span className="font-medium">{t.q}</span>
                        <span className="text-slate-500">{t.count} searches · avg {t.avgResults} results</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-1 font-medium text-slate-700 dark:text-slate-200">Zero-result queries</h3>
                {analytics.data.data.zeroResultQueries.length === 0 ? (
                  <p className="text-slate-500">None.</p>
                ) : (
                  <ul className="list-inside list-disc text-slate-600 dark:text-slate-300">
                    {analytics.data.data.zeroResultQueries.map((q) => <li key={q}>{q}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>

        <SynonymsCard />
      </div>
    </div>
  );
}
