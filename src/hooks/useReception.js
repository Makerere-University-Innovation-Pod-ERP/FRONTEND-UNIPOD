import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { receptionApi } from '@/services/reception';

export const receptionKeys = {
  all: ['reception'],
  home: (token, search) => ['reception', 'home', token, search],
  missing: (token, search) => ['reception', 'missing', token, search],
  brief: (token, id) => ['reception', 'brief', token, id],
  departments: (token) => ['reception', 'departments', token],
};

export function useReceptionHome(token, search) {
  return useQuery({
    queryKey: receptionKeys.home(token, search),
    queryFn: ({ signal }) => receptionApi.home(token, search, signal),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useMissingDocuments(token, search) {
  return useQuery({
    queryKey: receptionKeys.missing(token, search),
    queryFn: ({ signal }) => receptionApi.missingDocuments(token, search, signal),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useReceptionBrief(token, id) {
  return useQuery({
    queryKey: receptionKeys.brief(token, id),
    queryFn: ({ signal }) => receptionApi.brief(token, id, signal),
    enabled: Boolean(token && id),
  });
}

export function useDepartments(token) {
  return useQuery({
    queryKey: receptionKeys.departments(token),
    queryFn: ({ signal }) => receptionApi.departments(token, signal),
    enabled: Boolean(token),
  });
}

/** Shared by the three actions: save the new brief and refresh the lists. */
function useBriefAction(token, id, action) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => action(token, id, body),
    onSuccess: (updated) => {
      queryClient.setQueryData(receptionKeys.brief(token, id), updated);
      void queryClient.invalidateQueries({ queryKey: ['reception', 'home'] });
      void queryClient.invalidateQueries({ queryKey: ['reception', 'missing'] });
    },
  });
}

export function useAddComment(token, id) {
  return useBriefAction(token, id, receptionApi.addComment);
}

export function useAskForMissingInfo(token, id) {
  return useBriefAction(token, id, receptionApi.askForMissingInfo);
}

export function useForwardBrief(token, id) {
  return useBriefAction(token, id, receptionApi.forward);
}

/** Walk-in: find the person's account, or create a minimal one. */
export function useFindOrCreateWalkInAccount(token) {
  return useMutation({
    mutationFn: (body) => receptionApi.findOrCreateWalkInAccount(token, body),
  });
}
