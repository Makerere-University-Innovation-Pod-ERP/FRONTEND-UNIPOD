import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { partnersApi } from '@/services/partners';

const PARTNERS_OVERVIEW_KEY = ['partners', 'overview'];

export function usePartnersOverview(token) {
  return useQuery({
    queryKey: PARTNERS_OVERVIEW_KEY,
    queryFn: ({ signal }) => partnersApi.getOverview(token, signal),
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });
}

export function usePartners(token) {
  return useQuery({
    queryKey: ['partners', 'list'],
    queryFn: ({ signal }) => partnersApi.getPartners(token, signal),
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });
}

export function useCreatePartner(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => partnersApi.createPartner(body, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PARTNERS_OVERVIEW_KEY }),
  });
}

export function useRenewPartnerMOU(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, renewalDate, documentReference }) =>
      partnersApi.renewMOU(id, { renewalDate, documentReference }, token),
    onSuccess: (updatedPartner) => {
      queryClient.setQueryData(PARTNERS_OVERVIEW_KEY, (old) => {
        if (!old) return old;
        const newPartners = old.partners.map((p) => (p.id === updatedPartner.id ? updatedPartner : p));
        const dueCount = newPartners.filter((p) => p.status === 'Renewal due' || p.status === 'Expiring soon' || p.status === 'RENEWAL_DUE' || p.status === 'EXPIRING_SOON').length;
        return {
          ...old,
          partners: newPartners,
          renewalDueCount: dueCount,
        };
      });
    },
  });
}

export function useUpdatePartner(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => partnersApi.updatePartner(id, body, token),
    onSuccess: (updatedPartner) => {
      queryClient.setQueryData(PARTNERS_OVERVIEW_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          partners: old.partners.map((p) => (p.id === updatedPartner.id ? updatedPartner : p)),
        };
      });
    },
  });
}
