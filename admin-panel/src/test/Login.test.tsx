import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, beforeEach } from 'vitest';
import { LoginPage } from '../pages/Login';
import { AuthProvider } from '../auth';

function mockFetchLogin(ok: boolean, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 401,
    json: () => Promise.resolve(body)
  });
}

const baseUser = { id: 'u1', name: 'Main Admin', email: 'admin@diplomabondhu.test', role: 'admin', status: 'active' };

beforeEach(() => {
  localStorage.clear();
});

test('shows validation error for empty form', async () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/email is required/i);
});

test('rejects an invalid email format without calling the API', async () => {
  const fetchMock = mockFetchLogin(false, {});
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
  await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
  await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i);
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

test('successful admin login stores token and navigates to dashboard', async () => {
  vi.stubGlobal('fetch', mockFetchLogin(true, { success: true, data: { user: baseUser, accessToken: 'tok123' } }));
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
  await userEvent.type(screen.getByLabelText(/email/i), 'admin@diplomabondhu.test');
  await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  await waitFor(() => {
    expect(localStorage.getItem('db_admin_access_token')).toBe('tok123');
  });
  vi.unstubAllGlobals();
});

test('student accounts cannot sign in to the admin panel', async () => {
  vi.stubGlobal('fetch', mockFetchLogin(true, { success: true, data: { user: { ...baseUser, role: 'student' }, accessToken: 'tok123' } }));
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
  await userEvent.type(screen.getByLabelText(/email/i), 'student@diplomabondhu.test');
  await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/admin panel/i);
  expect(localStorage.getItem('db_admin_access_token')).toBeNull();
  vi.unstubAllGlobals();
});
