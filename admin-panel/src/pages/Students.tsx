import { useState } from 'react';
import { useApiMutation, useApiQuery, buildQuery } from '../api/hooks';
import { api } from '../api/client';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Pagination, Select, Spinner, Table } from '../components/ui';

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  profile?: { institute?: string; program?: string };
  createdAt: string;
  lastLoginAt?: string;
}

interface StudentDetail {
  student: Student & { profile?: Record<string, unknown> };
  auditHistory: Array<{ _id: string; action: string; at: string }>;
}

export function StudentsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [resetFor, setResetFor] = useState<Student | null>(null);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [resetExpiry, setResetExpiry] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useApiQuery<{ items: Student[] }>(
    ['admin', 'students', page, q, status],
    `/admin/students${buildQuery({ page, limit: 20, q: q || undefined, status: status || undefined })}`
  );
  const detail = useApiQuery<StudentDetail>(['admin', 'student', detailId], detailId ? `/admin/students/${detailId}` : null);

  const invalidate = [['admin', 'students'], ['admin', 'dashboard'], ['admin', 'student', detailId]];
  const suspend = useApiMutation(
    () => api(`/admin/students/${suspendId}/suspend`, { method: 'POST', body: { reason: suspendReason } }),
    invalidate
  );
  const reactivate = useApiMutation(
    (id: string) => api(`/admin/students/${id}/reactivate`, { method: 'POST' }),
    invalidate
  );
  const issueReset = useApiMutation(
    (id: string) => api<{ resetToken: string; expiresInMinutes: number }>(`/admin/students/${id}/password-reset`, { method: 'POST' }),
    []
  );

  const openResetModal = (s: Student) => {
    setActionError(null);
    setResetCode(null);
    setResetExpiry(null);
    setResetFor(s);
  };

  const meta = list.data?.meta;

  return (
    <div>
      <PageHeader title="Students" subtitle="Search, review and manage student accounts" />
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Input label="Search by email" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="student@example.com" />
          </div>
          <div className="w-44">
            <Select
              label="Status"
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: '', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' }
              ]}
            />
          </div>
        </div>
      </Card>

      {actionError ? <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}

      {list.isLoading ? <Spinner /> : list.isError ? <ErrorState message={list.error.message} onRetry={() => void list.refetch()} /> :
      !list.data?.data.items.length ? <EmptyState message="No students found." /> : (
        <Card>
          <Table head={['Name', 'Email', 'Status', 'Joined', 'Last Login', 'Actions']}>
            {list.data.data.items.map((s) => (
              <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-medium text-navy dark:text-white">{s.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.email}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.status === 'active' ? 'green' : 'red'}>{s.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-500">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setDetailId(s._id)}>Details</Button>
                    <Button variant="ghost" onClick={() => openResetModal(s)}>Reset password</Button>
                    {s.status === 'active' ? (
                      <Button variant="danger" onClick={() => { setSuspendId(s._id); setSuspendReason(''); }}>Suspend</Button>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setActionError(null);
                          reactivate.mutate(s._id, { onError: (e) => setActionError(e.message) });
                        }}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-4 pb-4">
            <Pagination page={page} limit={meta?.limit ?? 20} total={meta?.total ?? 0} onPage={setPage} />
          </div>
        </Card>
      )}

      {suspendId ? (
        <Modal title="Suspend student" onClose={() => setSuspendId(null)}>
          <div className="space-y-4">
            <Input label="Reason" value={suspendReason} onChange={setSuspendReason} placeholder="Why is this account being suspended?" required />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setSuspendId(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={!suspendReason.trim() || suspend.isPending}
                onClick={() => {
                  setActionError(null);
                  suspend.mutate(undefined, {
                    onSuccess: () => setSuspendId(null),
                    onError: (e) => setActionError(e.message)
                  });
                }}
              >
                Suspend
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}

      {resetFor ? (
        <Modal title={`Password reset — ${resetFor.name}`} onClose={() => setResetFor(null)}>
          <div className="space-y-4 text-sm">
            {resetCode ? (
              <>
                <p className="text-slate-600 dark:text-slate-300">
                  One-time reset code for <span className="font-medium">{resetFor.email}</span>. Give it to the student
                  through a verified channel (phone call / in person). It works once and expires in {resetExpiry} minutes.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs dark:bg-navy-700 dark:text-slate-200">{resetCode}</code>
                  <Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(resetCode); }}>Copy</Button>
                </div>
                <p className="text-xs text-slate-400">This code is shown only once and is stored hashed on the server.</p>
              </>
            ) : (
              <>
                <p className="text-slate-600 dark:text-slate-300">
                  Generates a one-time reset code for <span className="font-medium">{resetFor.email}</span>. Any previous
                  pending code is voided, and all their sessions are revoked when the code is used.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setResetFor(null)}>Cancel</Button>
                  <Button
                    disabled={issueReset.isPending}
                    onClick={() => {
                      setActionError(null);
                      issueReset.mutate(resetFor._id, {
                        onSuccess: (res) => {
                          setResetCode(res.data.resetToken);
                          setResetExpiry(res.data.expiresInMinutes);
                        },
                        onError: (e) => setActionError(e.message)
                      });
                    }}
                  >
                    Generate code
                  </Button>
                </div>
              </>
            )}
            {actionError ? <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{actionError}</div> : null}
          </div>
        </Modal>
      ) : null}

      {detailId ? (
        <Modal title="Student details" onClose={() => setDetailId(null)}>
          {detail.isLoading ? <Spinner /> : detail.isError ? <ErrorState message={detail.error.message} /> : null}
          {detail.data ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-navy dark:text-white">{detail.data.data.student.name}</p>
                <p className="text-slate-500 dark:text-slate-300">{detail.data.data.student.email}</p>
                <p className="text-slate-500 dark:text-slate-300">{detail.data.data.student.phone ?? 'No phone'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">Institute: <span className="font-normal">{detail.data.data.student.profile?.institute ?? '—'}</span></p>
                <p className="font-medium text-slate-700 dark:text-slate-200">Program: <span className="font-normal">{detail.data.data.student.profile?.program ?? '—'}</span></p>
              </div>
              <div>
                <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">Recent admin activity</p>
                {detail.data.data.auditHistory.length === 0 ? (
                  <p className="text-slate-500">No audit entries.</p>
                ) : (
                  <ul className="list-inside list-disc text-slate-600 dark:text-slate-300">
                    {detail.data.data.auditHistory.map((a) => (
                      <li key={a._id}>{a.action} — {new Date(a.at).toLocaleString()}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
