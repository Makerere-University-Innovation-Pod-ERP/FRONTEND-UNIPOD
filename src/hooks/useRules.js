import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '@/services/rules';

const RULES_KEY = ['rules', 'list'];

// token gates fetching the same way every other hook in this app does
// (only once signed in); rulesApi itself is a local, browser-persisted store
// with no backend call to authenticate (see services/rules.js).
export function useRules(token) {
  return useQuery({
    queryKey: RULES_KEY,
    queryFn: () => rulesApi.list(),
    enabled: Boolean(token),
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => rulesApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}

export function useUpdateRule(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => rulesApi.update(id, body, token),
    onSuccess: (updated) => {
      queryClient.setQueryData(RULES_KEY, (old) => (old ?? []).map((item) => (item.id === updated.id ? updated : item)));
    },
  });
}

export function useRetireRule(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => rulesApi.retire(id, token),
    onSuccess: (updated) => {
      queryClient.setQueryData(RULES_KEY, (old) => (old ?? []).map((item) => (item.id === updated.id ? updated : item)));
    },
  });
}
