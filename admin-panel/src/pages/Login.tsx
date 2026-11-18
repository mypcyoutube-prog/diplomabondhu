import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Button, Card, Input } from '../components/ui';

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address';
    if (!password) return 'Password is required';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-center text-2xl font-bold text-navy dark:text-white">
          DiplomaBondhu <span className="text-teal">Admin</span>
        </h1>
        <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-300">Sign in with your admin account</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200" role="alert">
              {error}
            </div>
          ) : null}
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="admin@example.com" required />
          <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
          <Button type="submit" disabled={submitting} className="w-full justify-center">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Admin accounts are created only via backend seed. There is no public registration.
        </p>
      </Card>
    </div>
  );
}
