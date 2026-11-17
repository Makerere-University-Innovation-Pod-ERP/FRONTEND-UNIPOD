import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cncApi } from '@/services/cnc';

const JOBS_KEY = ['cnc', 'jobs'];

export function useCncJobs(token) {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: ({ signal }) => cncApi.jobs(token, signal),
    enabled: Boolean(token),
  });
}

export function useCncPriceList(token, departmentId) {
  return useQuery({
    queryKey: ['cnc', 'prices', departmentId],
    queryFn: ({ signal }) => cncApi.priceList(departmentId, token, signal),
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 5,
  });
}

function useJobMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (job) => {
      queryClient.setQueryData(JOBS_KEY, (old) => (old
        ? (old.some((item) => item.id === job.id) ? old.map((item) => (item.id === job.id ? job : item)) : [job, ...old])
        : old));
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
    },
  });
}

export function useCreateCncJob(token) {
  return useJobMutation((job) => cncApi.create(job, token));
}

export function useQuoteCncJob(token) {
  return useJobMutation(async ({ id, quote }) => {
    await cncApi.quote(id, quote, token);
    return cncApi.moveStage(id, { stage: 'PAYMENT_GATE', notes: 'Quote sent to the customer.' }, token);
  });
}

export function useMoveCncJob(token) {
  return useJobMutation(({ id, ...change }) => cncApi.moveStage(id, change, token));
}

export function useSetFacilityStatus(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => cncApi.setFacilityStatus(id, status, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['facilities'] }),
  });
}
