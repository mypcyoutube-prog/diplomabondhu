import { useApiQuery } from '../api/hooks';
import { Badge, Card, ErrorState, PageHeader, Spinner } from '../components/ui';

interface DashboardData {
  students: { total: number; newRegistrations7d: number; activeLast30d: number; suspended: number };
  content: { materials: number; publishedMaterials: number };
  exams: { total: number };
  community: { visiblePosts: number; openReports: number };
  systemHealth: { status: string };
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: 'green' | 'red' }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-300">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${tone === 'red' ? 'text-red-600' : 'text-navy dark:text-white'}`}>{value}</p>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useApiQuery<DashboardData>(['admin', 'dashboard'], '/admin/dashboard');

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (!data) return null;

  const d = data.data;
  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={d.students.total} />
        <StatCard label="New Registrations (7d)" value={d.students.newRegistrations7d} />
        <StatCard label="Active Students (30d)" value={d.students.activeLast30d} />
        <StatCard label="Suspended" value={d.students.suspended} tone={d.students.suspended > 0 ? 'red' : undefined} />
        <StatCard label="Study Materials" value={`${d.content.publishedMaterials} / ${d.content.materials} published`} />
        <StatCard label="Exams" value={d.exams.total} />
        <StatCard label="Community Posts" value={d.community.visiblePosts} />
        <StatCard label="Open Reports" value={d.community.openReports} tone={d.community.openReports > 0 ? 'red' : undefined} />
      </div>
      <Card className="mt-6 p-5">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-300">System Health</p>
        <div className="mt-2">
          <Badge tone={d.systemHealth.status === 'ok' ? 'green' : 'red'}>API: {d.systemHealth.status}</Badge>
        </div>
      </Card>
    </div>
  );
}
