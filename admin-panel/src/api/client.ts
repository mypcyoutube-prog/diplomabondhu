export interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: { page?: number; limit?: number; total?: number; [key: string]: unknown };
  error?: { code: string; message: string; details?: unknown };
}

const BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let getAccessToken: () => string | null = () => null;
let setAccessToken: (t: string | null) => void = () => {};
let handleAuthFailure: () => void = () => {};

export function configureAuthHooks(
  getter: () => string | null,
  setter: (t: string | null) => void,
  onFailure: () => void
): void {
  getAccessToken = getter;
  setAccessToken = setter;
  handleAuthFailure = onFailure;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  skipRefresh?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions, token: string | null): Promise<{ data: T; meta?: Envelope<T>['meta'] }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json || !json.success) {
    const err = json?.error;
    throw new ApiError(res.status, err?.code ?? 'INTERNAL', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return { data: json.data, meta: json.meta };
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: Envelope<T>['meta'] }> {
  try {
    return await rawRequest<T>(path, options, getAccessToken());
  } catch (err) {
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      !options.skipRefresh &&
      !path.startsWith('/auth/')
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return rawRequest<T>(path, options, refreshed);
      }
      handleAuthFailure();
    }
    throw err;
  }
}

export async function apiRaw<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });
  const json = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = (json as Envelope<unknown> | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'INTERNAL', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return json as T;
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await rawRequest<{ accessToken: string }>('/auth/refresh', { method: 'POST', body: {}, skipRefresh: true }, null);
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; accessToken: string }> {
  const { data } = await rawRequest<{ user: AuthUser; accessToken: string }>('/auth/login', { method: 'POST', body: { email, password }, skipRefresh: true }, null);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await rawRequest('/auth/logout', { method: 'POST', body: {}, skipRefresh: true }, getAccessToken());
  } catch {
    // best effort; local session is cleared regardless
  }
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
}
