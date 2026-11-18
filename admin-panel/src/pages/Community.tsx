import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui';

interface Post {
  _id: string;
  authorId: string;
  text: string;
  status: string;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  createdAt: string;
}

export function CommunityPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [reportsPage, setReportsPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const posts = useApiQuery<{ items: Post[] }>(
    ['community', 'posts', page, status],
    `/community/admin/posts${buildQuery({ page, limit: 20, status: status || undefined })}`
  );
  const reports = useApiQuery<{ items: Array<{ _id: string; postId: string; reporterId: string; reason: string; status: string; createdAt: string }> }>(
    ['community', 'reports', reportsPage],
    `/community/admin/reports${buildQuery({ page: reportsPage, limit: 20 })}`
  );

  const invalidate = [['community', 'posts'], ['community', 'reports'], ['admin', 'dashboard']];
  const moderate = useApiMutation((v: { id: string; action: string; reason?: string }) => api(`/community/admin/posts/${v.id}/moderate`, { method: 'POST', body: { action: v.action, reason: v.reason } }), invalidate);

  const act = (id: string, action: string) => {
    setActionError(null);
    moderate.mutate(
      { id, action },
      { onError: (e) => setActionError(e.message) }
    );
  };

  return (
    <div>
      <PageHeader title="Community Moderation" subtitle="Review reported content and moderate posts" />

      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold text-navy dark:text-white">Reports</h2>
        {reports.isLoading ? <Spinner label="Loading reports…" /> :
        reports.isError ? <ErrorState message={reports.error.message} onRetry={() => void reports.refetch()} /> :
        !reports.data?.data.items.length ? <p className="text-sm text-slate-500">No reports.</p> : (
          <>
            <Table head={['Reason', 'Post', 'Status', 'Date']}>
              {reports.data.data.items.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.reason}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{String(r.postId).slice(-8)}</td>
                  <td className="px-4 py-3"><Badge tone={r.status === 'open' ? 'amber' : 'slate'}>{r.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </Table>
            <div className="px-4 pb-4">
              <Pagination page={reportsPage} limit={reports.data.meta?.limit ?? 20} total={reports.data.meta?.total ?? 0} onPage={setReportsPage} />
            </div>
          </>
        )}
      </Card>

      <Card className="mb-4 p-4">
        <div className="max-w-xs">
          <Select
            label="Post status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: '', label: 'All' },
              { value: 'visible', label: 'Visible' },
              { value: 'hidden', label: 'Hidden' },
              { value: 'removed', label: 'Removed' }
            ]}
          />
        </div>
      </Card>

      {posts.isLoading ? <Spinner /> : posts.isError ? <ErrorState message={posts.error.message} onRetry={() => void posts.refetch()} /> :
      !posts.data?.data.items.length ? <EmptyState message="No posts." /> : (
        <Card>
          <Table head={['Post', 'Likes', 'Comments', 'Reports', 'Status', 'Actions']}>
            {posts.data.data.items.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="max-w-sm px-4 py-3 text-slate-600 dark:text-slate-300"><p className="truncate">{p.text}</p></td>
                <td className="px-4 py-3 text-slate-500">{p.likeCount}</td>
                <td className="px-4 py-3 text-slate-500">{p.commentCount}</td>
                <td className="px-4 py-3 text-slate-500">{p.reportCount}</td>
                <td className="px-4 py-3"><Badge tone={p.status === 'visible' ? 'green' : p.status === 'removed' ? 'red' : 'amber'}>{p.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {p.status !== 'hidden' ? <Button variant="secondary" onClick={() => act(p._id, 'hide')}>Hide</Button> : null}
                    {p.status !== 'removed' ? <Button variant="danger" onClick={() => act(p._id, 'remove')}>Remove</Button> : null}
                    {p.status !== 'visible' ? <Button onClick={() => act(p._id, 'restore')}>Restore</Button> : null}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-4 pb-4">
            <Pagination page={page} limit={posts.data.meta?.limit ?? 20} total={posts.data.meta?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      )}
    </div>
  );
}
