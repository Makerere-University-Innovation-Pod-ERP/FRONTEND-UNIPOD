import { useEffect } from 'react';
import { ApiError } from '@/services/api-client';

/** Signs the user out when the backend says their session has expired (401). */
export function useSignOutOn401(error, onUnauthorized) {
  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) onUnauthorized();
  }, [error, onUnauthorized]);
}

export function categoryLabel(category) {
  return category === 'student' ? 'Student project' : 'General innovation';
}
