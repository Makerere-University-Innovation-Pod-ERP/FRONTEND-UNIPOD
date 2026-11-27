import { useQuery } from '@tanstack/react-query';
import { getAccountIdentity } from '@/lib/auth';
import { backendApi } from '@/services/backend-api';

/**
 * GET /me/capabilities (Assignment 4) — reports which self-service modules
 * (BRIEFS, SERVICE_REQUESTS, INVOICES, BOOKINGS) are actually available to the
 * signed-in submitter, so the nav/tab bar can reflect it instead of always
 * showing all four. Shared between the sidebar (BackendWorkspace) and
 * MySubmissionsPage's own "Account access" panel via TanStack Query's cache.
 */
export function useSubmitterCapabilities(token, enabled = true) {
  return useQuery({
    queryKey: ['submitter', 'capabilities', getAccountIdentity(token)],
    queryFn: ({ signal }) => backendApi.submitterCapabilities(token, signal),
    enabled: Boolean(token) && enabled,
    staleTime: 1000 * 60,
  });
}
