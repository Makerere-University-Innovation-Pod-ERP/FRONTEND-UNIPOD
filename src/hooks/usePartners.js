import { useQuery } from '@tanstack/react-query';
import { partnersApi } from '@/services/partners';

const PARTNERS_OVERVIEW_KEY = ['partners', 'overview'];

export function usePartnersOverview(token) {
  return useQuery({
    queryKey: PARTNERS_OVERVIEW_KEY,
    queryFn: ({ signal }) => partnersApi.getOverview(token, signal),
  });
}

export function usePartners(token) {
  return useQuery({
    queryKey: ['partners', 'list'],
    queryFn: ({ signal }) => partnersApi.getPartners(token, signal),
  });
}

