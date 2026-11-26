import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { hasPermission } from '../permissions';

interface NavItem {
  to: string;
  label: string;
  permission?: string;
}

const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Dashboard' }]
  },
  {
    section: 'People',
    items: [{ to: '/students', label: 'Students', permission: 'STUDENT_MANAGE' }]
  },
  {
    section: 'Academics',
    items: [
      { to: '/academic', label: 'Academic Structure', permission: 'ACADEMIC_MANAGE' },
      { to: '/gpa', label: 'CGPA Profiles', permission: 'GPA_MANAGE' }
    ]
  },
  {
    section: 'Content',
    items: [
      { to: '/materials', label: 'Study Materials', permission: 'CONTENT_MANAGE' },
      { to: '/exams', label: 'Exams & Questions', permission: 'EXAM_MANAGE' },
      { to: '/results', label: 'BTEB Results', permission: 'CONTENT_MANAGE' },
      { to: '/banners', label: 'Home Banners', permission: 'CONTENT_MANAGE' }
    ]
  },
  {
    section: 'Community',
    items: [{ to: '/community', label: 'Moderation', permission: 'MODERATE' }]
  },
  {
    section: 'Communication',
    items: [
      { to: '/announcements', label: 'Announcements', permission: 'NOTIFY_MANAGE' },
      { to: '/scheduled-notifications', label: 'Scheduled & Delivery', permission: 'NOTIFY_MANAGE' }
    ]
  },
  {
    section: 'System',
    items: [
      { to: '/settings', label: 'App Settings', permission: 'SETTINGS_MANAGE' },
      { to: '/ai-search', label: 'AI & Search', permission: 'SETTINGS_MANAGE' },
      { to: '/audit-logs', label: 'Audit Logs', permission: 'AUDIT_READ' }
    ]
  }
];

export function Layout() {
  const { user, permissions, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-700">
      <header className="sticky top-0 z-40 flex items-center justify-between bg-navy px-4 py-3 text-white shadow md:px-6">
        <div className="flex items-center gap-3">
          <button className="rounded p-1 hover:bg-navy-600 md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            ☰
          </button>
          <span className="text-lg font-bold tracking-tight">
            DiplomaBondhu <span className="text-teal">Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">
            {user?.name} <span className="text-slate-300">({user?.role})</span>
          </span>
          <button onClick={handleSignOut} className="rounded-lg bg-navy-600 px-3 py-1.5 font-medium hover:bg-navy-700">
            Logout
          </button>
        </div>
      </header>
      <div className="flex">
        <aside
          className={`${menuOpen ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-30 mt-14 w-64 overflow-y-auto bg-white p-4 shadow-lg md:sticky md:top-14 md:mt-0 md:block md:h-[calc(100vh-3.5rem)] md:shadow-none dark:bg-navy-600`}
        >
          <nav aria-label="Admin navigation">
            {NAV.map((group) => {
              const visible = group.items.filter((i) => hasPermission(permissions, i.permission));
              if (visible.length === 0) return null;
              return (
                <div key={group.section} className="mb-4">
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.section}</p>
                  {visible.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `mb-0.5 block rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-teal/10 text-teal'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-navy-700'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
