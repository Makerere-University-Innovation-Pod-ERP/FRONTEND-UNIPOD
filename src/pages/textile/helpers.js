import { useEffect } from 'react';
import { ApiError } from '@/services/api-client';

/** Signs the user out when any of the given query/mutation errors is a 401. */
export function useUnauthorizedRedirect(onUnauthorized, ...errors) {
  const unauthorized = errors.some((error) => error instanceof ApiError && error.status === 401);
  useEffect(() => {
    if (unauthorized) onUnauthorized();
  }, [unauthorized, onUnauthorized]);
}

export function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export const PHOTO_ACCEPT = 'image/jpeg,image/png';
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export function validatePhoto(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Choose a JPG or PNG image.';
  if (file.size > MAX_PHOTO_BYTES) return 'The photo must be 15 MB or smaller.';
  return '';
}

export function formatDateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
