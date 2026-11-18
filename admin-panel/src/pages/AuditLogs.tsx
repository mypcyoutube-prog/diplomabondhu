import { useState } from 'react';
import { useApiQuery, buildQuery } from '../api/hooks';
import { Card, EmptyState, ErrorState, Input, PageHeader, Pagination, Spinner, Table } from '../components/ui';

interface AuditEntry {
  _id: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  at: string;
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');

  const list = useApiQuery<{ items: AuditEntry[] }>(
    ['audit', page, action],
    `/admin/audit-logs${buildQuery({ page, limit: 30, action: action || undefined })}`
  );

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every privileged admin action is recorded here" />
      <Card className="mb-4 p-4">
        <div className="max-w-xs">
          <Input label="Filter by action" value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="e.g. student.suspended" />
        </div>
      </Card>

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No audit entries found." /> : (
        <Card>
          <Table head={['Action', 'Actor', 'Target', 'IP', 'Time']}>
            {list.data.data.items.map((e) => (
              <tr key={e._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-medium text-navy dark:text-white">{e.action}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{String(e.actorId).slice(-8)}</td>
                <td className="px-4 py-3 text-slate-500">{e.targetType ? `${e.targetType} ${String(e.targetId ?? '').slice(-8)}` : '—'}</td>
                <td className="px-4 py-3 text-slate-500">{e.ip ?? '—'}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(e.at).toLocaleString()}</td>
              </tr>
            ))}
          </Table>
          <div className="px-4 pb-4">
            <Pagination page={page} limit={list.data.meta?.limit ?? 30} total={list.data.meta?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}
