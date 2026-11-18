import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { api } from './client';

export interface ListMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export type ApiQueryResult<T> = UseQueryResult<{ data: T; meta?: ListMeta }, Error>;

export function useApiQuery<T>(key: unknown[], path: string | null, enabled = true): ApiQueryResult<T> {
  return useQuery({
    queryKey: key,
    queryFn: () => {
      if (!path) throw new Error('disabled');
      return api<T>(path);
    },
    enabled: enabled && !!path
  });
}

export function useApiMutation<TResult, TVars = void>(
  fn: (vars: TVars) => Promise<TResult>,
  invalidateKeys: unknown[][] = []
) {
  const qc = useQueryClient();
  return useMutation<TResult, Error, TVars>({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of invalidateKeys) {
        void qc.invalidateQueries({ queryKey: key });
      }
    }
  });
}

export function mutationFn(path: string, method: string, body?: unknown) {
  return () => api(path, { method, body });
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}
