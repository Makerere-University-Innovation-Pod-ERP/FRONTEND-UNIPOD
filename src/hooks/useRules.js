import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '@/services/rules';

const RULES_KEY = ['rules', 'list'];

export function useRules(token) {
  return useQuery({
    queryKey: RULES_KEY,
    queryFn: ({ signal }) => rulesApi.list(token, signal),
    enabled: Boolean(token),
  });
}

export function useCreateRule(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => rulesApi.create(body, token),
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
