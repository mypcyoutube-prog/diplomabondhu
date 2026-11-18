import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { hasPermission } from './permissions';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { StudentsPage } from './pages/Students';
import { AcademicPage } from './pages/Academic';
import { MaterialsPage } from './pages/Materials';
import { ExamsPage } from './pages/Exams';
import { ResultsPage } from './pages/Results';
import { GpaProfilesPage } from './pages/GpaProfiles';
import { CommunityPage } from './pages/Community';
import { AnnouncementsPage } from './pages/Announcements';
import { SettingsPage } from './pages/Settings';
import { AuditLogsPage } from './pages/AuditLogs';

function Protected({ permission, children }: { permission?: string; children: ReactNode }) {
  const { user, permissions, ready } = useAuth();
  if (!ready) return <Spinner label="Checking session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(permissions, permission)) {
    return <div className="p-6 text-center text-slate-500">You do not have permission to view this section.</div>;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/students" element={<Protected permission="STUDENT_MANAGE"><StudentsPage /></Protected>} />
        <Route path="/academic" element={<Protected permission="ACADEMIC_MANAGE"><AcademicPage /></Protected>} />
        <Route path="/materials" element={<Protected permission="CONTENT_MANAGE"><MaterialsPage /></Protected>} />
        <Route path="/exams" element={<Protected permission="EXAM_MANAGE"><ExamsPage /></Protected>} />
        <Route path="/results" element={<Protected permission="CONTENT_MANAGE"><ResultsPage /></Protected>} />
        <Route path="/gpa" element={<Protected permission="GPA_MANAGE"><GpaProfilesPage /></Protected>} />
        <Route path="/community" element={<Protected permission="MODERATE"><CommunityPage /></Protected>} />
        <Route path="/announcements" element={<Protected permission="NOTIFY_MANAGE"><AnnouncementsPage /></Protected>} />
        <Route path="/settings" element={<Protected permission="SETTINGS_MANAGE"><SettingsPage /></Protected>} />
        <Route path="/audit-logs" element={<Protected permission="AUDIT_READ"><AuditLogsPage /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
