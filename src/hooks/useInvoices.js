import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/services/invoices';

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

