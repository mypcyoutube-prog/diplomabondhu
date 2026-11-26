import { useApiQuery } from '../api/hooks';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table } from '../components/ui';

interface Announcement {
  _id: string;
  title: string;
  category: string;
  status: string;
  scheduledAt?: string;
  createdAt: string;
}

interface DeliveryStats {
  total: number;
  unread: number;
  byCategory: Record<string, number>;
  scheduledAnnouncements: number;
}

export function ScheduledNotificationsPage() {
  const stats = useApiQuery<DeliveryStats>(['delivery-stats'], '/notifications/admin/delivery-stats');
  const announcements = useApiQuery<{ items: Announcement[] }>(
    ['announcements', 'scheduled'],
    '/notifications/admin/announcements?limit=100',
  );

  const scheduled = (announcements.data?.data.items ?? [])
    .filter((a) => a.scheduledAt && a.status === 'draft')
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));

  return (
    <div>
      <PageHeader
        title="Scheduled Notifications"
        subtitle="Delivery statistics and upcoming scheduled announcements"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          {stats.isLoading ? (
            <Spinner />
          ) : stats.isError ? (
            <ErrorState message={stats.error.message} onRetry={() => void stats.refetch()} />
          ) : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-300">Total notifications</p>
              <p className="text-2xl font-bold text-navy dark:text-white">{stats.data?.data.total ?? 0}</p>
            </>
          )}
        </Card>
        <Card className="p-4">
          {stats.isLoading ? (
            <Spinner />
          ) : stats.isError ? null : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-300">Unread</p>
              <p className="text-2xl font-bold text-navy dark:text-white">{stats.data?.data.unread ?? 0}</p>
            </>
          )}
        </Card>
        <Card className="p-4">
          {stats.isLoading ? (
            <Spinner />
          ) : stats.isError ? null : (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-300">Scheduled announcements</p>
              <p className="text-2xl font-bold text-navy dark:text-white">
                {stats.data?.data.scheduledAnnouncements ?? 0}
              </p>
            </>
          )}
        </Card>
      </div>

      {stats.data && (
        <Card className="mb-6 p-5">
          <h2 className="mb-2 font-semibold text-navy dark:text-white">By category</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.data.data.byCategory).length === 0 ? (
              <p className="text-sm text-slate-500">No notifications yet.</p>
            ) : (
              Object.entries(stats.data.data.byCategory).map(([cat, n]) => (
                <span key={cat} className="rounded-full bg-slate-100 px-3 py-1 text-sm dark:bg-navy-700">
                  {cat}: <span className="font-semibold">{n}</span>
                </span>
              ))
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-navy dark:text-white">Upcoming scheduled announcements</h2>
        {announcements.isLoading && <Spinner />}
        {announcements.isError && (
          <ErrorState message={announcements.error.message} onRetry={() => void announcements.refetch()} />
        )}
        {announcements.data && scheduled.length === 0 && (
          <EmptyState message="No scheduled announcements. Create one from the Announcements page with a schedule time." />
        )}
        {announcements.data && scheduled.length > 0 && (
          <Table head={['Title', 'Category', 'Scheduled for', 'Status']}>
            {scheduled.map((a) => (
              <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-navy-700">
                <td className="px-4 py-3 font-medium text-navy dark:text-white">{a.title}</td>
                <td className="px-4 py-3">
                  <Badge tone="blue">{a.category}</Badge>
                </td>
                <td className="px-4 py-3">{new Date(a.scheduledAt as string).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Badge tone="amber">{a.status}</Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
