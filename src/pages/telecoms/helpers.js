import { useEffect } from 'react';
import { ApiError } from '@/services/api-client';

export function useUnauthorizedRedirect(onUnauthorized, ...errors) {
  const unauthorized = errors.some((error) => error instanceof ApiError && error.status === 401);
  useEffect(() => {
    if (unauthorized) onUnauthorized();
  }, [unauthorized, onUnauthorized]);
}

export function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
