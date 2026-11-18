import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth';
import { hasPermission, permissionsForRole } from '../permissions';

function Probe() {
  const { permissions } = useAuth();
  return (
    <ul>
      {permissions.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

test('admin role maps to every permission', () => {
  const perms = permissionsForRole('admin');
  expect(perms).toContain('GPA_MANAGE');
  expect(perms).toContain('SETTINGS_MANAGE');
  expect(hasPermission(perms, 'MODERATE')).toBe(true);
});

test('moderator role is limited to moderation', () => {
  const perms = permissionsForRole('moderator');
  expect(perms).toEqual(['MODERATE']);
  expect(hasPermission(perms, 'GPA_MANAGE')).toBe(false);
  expect(hasPermission(perms, 'SETTINGS_MANAGE')).toBe(false);
});

test('students and unknown roles get no permissions', () => {
  expect(permissionsForRole('student')).toEqual([]);
  expect(permissionsForRole(undefined)).toEqual([]);
  expect(hasPermission([], 'MODERATE')).toBe(false);
  expect(hasPermission([], undefined)).toBe(true);
});

test('AuthProvider exposes role permissions to the UI', async () => {
  localStorage.setItem('db_admin_access_token', 'tok');
  localStorage.setItem('db_admin_user', JSON.stringify({ id: 'u1', name: 'Mod', email: 'm@x.test', role: 'moderator', status: 'active' }));
  render(
    <MemoryRouter>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(await screen.findByText('MODERATE')).toBeInTheDocument();
  expect(screen.queryByText('GPA_MANAGE')).not.toBeInTheDocument();
});
