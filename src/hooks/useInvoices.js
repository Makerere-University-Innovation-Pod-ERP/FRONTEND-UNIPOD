import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api-client';
import { invoicesApi } from '@/services/invoices';

export function useSubmitterInvoices(token, { page = 0, size = 25, status } = {}) {
  return useQuery({
    queryKey: ['submitter', 'invoices', page, size, status ?? null],
    queryFn: ({ signal }) => invoicesApi.listMyInvoices(token, { page, size, status }, signal),
    retry: false,
    staleTime: 30_000,
  });
}

export function useSubmitterInvoice(token, id, enabled = true) {
  return useQuery({
    queryKey: ['submitter', 'invoice', id],
    queryFn: ({ signal }) => invoicesApi.myInvoice(id, token, signal),
    enabled: Boolean(id) && enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useSubmitterReceipt(token, id, enabled = true) {
  return useQuery({
    queryKey: ['submitter', 'receipt', id],
    queryFn: ({ signal }) => invoicesApi.myReceipt(id, token, signal),
    enabled: Boolean(id) && enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useUploadSubmitterPaymentProof(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proof }) => invoicesApi.uploadMyPaymentProof(id, proof, token),
    onSuccess: (invoice, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['submitter', 'invoices'] });
      queryClient.setQueryData(['submitter', 'invoice', id], invoice);
    },
    onError: (error, { id }) => {
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['submitter', 'invoices'] });
        queryClient.invalidateQueries({ queryKey: ['submitter', 'invoice', id] });
      }
    },
  });
}

export function useInvoicesOverview(token) {
  return useQuery({
    queryKey: ['finance', 'invoices', 'overview'],
    queryFn: ({ signal }) => invoicesApi.getOverview(token, signal),
    staleTime: 1000 * 60,
  });
}

export function useVerifyInvoice(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proofId }) => invoicesApi.verifyPayment(id, proofId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'invoices', 'overview'] }),
  });
}

export function useRejectInvoice(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proofId, reason }) =>
      invoicesApi.rejectPayment(id, proofId, reason, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'invoices', 'overview'] }),
  });
}

export function useReleaseReceipt(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => invoicesApi.releaseReceipt(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'invoices', 'overview'] }),
  });
}

export function useDownloadPaymentProof(token) {
  return useMutation({
    mutationFn: ({ id }) => invoicesApi.downloadPaymentProof(id, token),
  });
}

export function useDownloadInvoiceReceipt(token) {
  return useMutation({
    mutationFn: ({ id }) => invoicesApi.downloadReceipt(id, token),
  });
}

