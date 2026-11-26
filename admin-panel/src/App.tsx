import type { ReactNode } from 'react';
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { hasPermission } from './permissions';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { LoginPage } from './pages/Login';

const DashboardPage = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.DashboardPage })));
const StudentsPage = lazy(() => import('./pages/Students').then((m) => ({ default: m.StudentsPage })));
const AcademicPage = lazy(() => import('./pages/Academic').then((m) => ({ default: m.AcademicPage })));
const MaterialsPage = lazy(() => import('./pages/Materials').then((m) => ({ default: m.MaterialsPage })));
const ExamsPage = lazy(() => import('./pages/Exams').then((m) => ({ default: m.ExamsPage })));
const ResultsPage = lazy(() => import('./pages/Results').then((m) => ({ default: m.ResultsPage })));
const GpaProfilesPage = lazy(() => import('./pages/GpaProfiles').then((m) => ({ default: m.GpaProfilesPage })));
const CommunityPage = lazy(() => import('./pages/Community').then((m) => ({ default: m.CommunityPage })));
const AnnouncementsPage = lazy(() => import('./pages/Announcements').then((m) => ({ default: m.AnnouncementsPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogs').then((m) => ({ default: m.AuditLogsPage })));
const AiSearchSettingsPage = lazy(() => import('./pages/AiSearchSettings').then((m) => ({ default: m.AiSearchSettingsPage })));
const ScheduledNotificationsPage = lazy(() => import('./pages/ScheduledNotifications').then((m) => ({ default: m.ScheduledNotificationsPage })));
const BannersPage = lazy(() => import('./pages/Banners').then((m) => ({ default: m.BannersPage })));

function Protected({ permission, children }: { permission?: string; children: ReactNode }) {
  const { user, permissions, ready } = useAuth();
  if (!ready) return <Spinner label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(permissions, permission)) {
    return <div className="p-6 text-center text-slate-500">You do not have permission to view this section.</div>;
  }
  return <>{children}</>;
}

function PageFallback() {
  return <div className="p-6"><Spinner label="Loading…" /></div>;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/students" element={<Protected permission="STUDENT_MANAGE"><StudentsPage /></Protected>} />
        <Route path="/academic" element={<Protected permission="ACADEMIC_MANAGE"><AcademicPage /></Protected>} />
        <Route path="/materials" element={<Protected permission="CONTENT_MANAGE"><MaterialsPage /></Protected>} />
        <Route path="/exams" element={<Protected permission="EXAM_MANAGE"><ExamsPage /></Protected>} />
        <Route path="/results" element={<Protected permission="CONTENT_MANAGE"><ResultsPage /></Protected>} />
        <Route path="/banners" element={<Protected permission="CONTENT_MANAGE"><BannersPage /></Protected>} />
        <Route path="/gpa" element={<Protected permission="GPA_MANAGE"><GpaProfilesPage /></Protected>} />
        <Route path="/community" element={<Protected permission="MODERATE"><CommunityPage /></Protected>} />
        <Route path="/announcements" element={<Protected permission="NOTIFY_MANAGE"><AnnouncementsPage /></Protected>} />
        <Route path="/settings" element={<Protected permission="SETTINGS_MANAGE"><SettingsPage /></Protected>} />
        <Route path="/ai-search" element={<Protected permission="SETTINGS_MANAGE"><AiSearchSettingsPage /></Protected>} />
        <Route path="/scheduled-notifications" element={<Protected permission="NOTIFY_MANAGE"><ScheduledNotificationsPage /></Protected>} />
        <Route path="/audit-logs" element={<Protected permission="AUDIT_READ"><AuditLogsPage /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
