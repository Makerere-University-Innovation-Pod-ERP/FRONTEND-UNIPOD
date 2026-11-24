import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cncApi } from '@/services/cnc';

const JOBS_KEY = ['cnc', 'jobs'];

export const cncKeys = {
  jobs: JOBS_KEY,
  prices: (departmentId) => ['cnc', 'prices', departmentId],
  stock: (token) => ['cnc', 'stock', token],
  stockMovements: (token) => ['cnc', 'stock-movements', token],
};

export function useCncJobs(token) {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: ({ signal }) => cncApi.jobs(token, signal),
    enabled: Boolean(token),
  });
}

export function useCncPriceList(token, departmentId) {
  return useQuery({
    queryKey: cncKeys.prices(departmentId),
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

export function useCncStock(token) {
  return useQuery({
    queryKey: cncKeys.stock(token),
    queryFn: ({ signal }) => cncApi.stock(token, signal),
    enabled: Boolean(token),
  });
}

export function useCncStockMovements(token) {
  return useQuery({
    queryKey: cncKeys.stockMovements(token),
    queryFn: ({ signal }) => cncApi.stockMovements(token, signal),
    enabled: Boolean(token),
  });
}

function useStockMutation(token, mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cncKeys.stock(token) });
      queryClient.invalidateQueries({ queryKey: cncKeys.stockMovements(token) });
    },
  });
}

export function useRegisterCncStockItem(token) {
  return useStockMutation(token, (item) => cncApi.registerStockItem(item, token));
}

export function useRecordCncStockMovement(token) {
  return useStockMutation(token, (body) => cncApi.recordStockMovement(body, token));
}

export function useUpdateCncStockMinimum(token) {
  return useStockMutation(token, ({ id, minimum }) => cncApi.updateStockMinimum(id, minimum, token));
}
