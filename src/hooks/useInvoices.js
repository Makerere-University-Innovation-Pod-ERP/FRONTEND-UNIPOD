import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/services/api-client';
import { getAccountIdentity } from '@/lib/auth';
import { invoicesApi } from '@/services/invoices';

const submitterInvoicesKey = (token) => [
  'submitter',
  'invoices',
  getAccountIdentity(token),
];
const submitterInvoiceKey = (token, id) => [
  'submitter',
  'invoice',
  getAccountIdentity(token),
  id,
];
const submitterReceiptKey = (token, id) => [
  'submitter',
  'receipt',
  getAccountIdentity(token),
  id,
];

export function useSubmitterInvoices(token, { page = 0, size = 25, status } = {}) {
  return useQuery({
    queryKey: [...submitterInvoicesKey(token), page, size, status ?? null],
    queryFn: ({ signal }) => invoicesApi.listMyInvoices(token, { page, size, status }, signal),
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000,
  });
}

export function useSubmitterInvoice(token, id, enabled = true) {
  return useQuery({
    queryKey: submitterInvoiceKey(token, id),
    queryFn: ({ signal }) => invoicesApi.myInvoice(id, token, signal),
    enabled: Boolean(token && id) && enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useSubmitterReceipt(token, id, enabled = true) {
  return useQuery({
    queryKey: submitterReceiptKey(token, id),
    queryFn: ({ signal }) => invoicesApi.myReceipt(id, token, signal),
    enabled: Boolean(token && id) && enabled,
    retry: false,
    staleTime: 30_000,
  });
}

export function useUploadSubmitterPaymentProof(token) {
  const queryClient = useQueryClient();
  const invoicesKey = submitterInvoicesKey(token);
  return useMutation({
    mutationFn: ({ id, proof }) => invoicesApi.uploadMyPaymentProof(id, proof, token),
    onSuccess: (invoice, { id }) => {
      queryClient.invalidateQueries({ queryKey: invoicesKey });
      queryClient.setQueryData(submitterInvoiceKey(token, id), invoice);
    },
    onError: (error, { id }) => {
      if (error instanceof ApiError && error.status === 409) {
        queryClient.invalidateQueries({ queryKey: invoicesKey });
        queryClient.invalidateQueries({ queryKey: submitterInvoiceKey(token, id) });
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

