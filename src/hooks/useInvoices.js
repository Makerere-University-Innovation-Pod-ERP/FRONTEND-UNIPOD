import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/services/invoices';
import { initialInvoicesOverview } from '@/mocks/fixtures/invoices';

export function useInvoicesOverview(token) {
  return useQuery({
    queryKey: ['finance', 'invoices', 'overview'],
    queryFn: ({ signal }) => invoicesApi.getOverview(token, signal),
    initialData: initialInvoicesOverview,
    staleTime: 1000 * 60,
  });
}

export function useVerifyInvoice(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => invoicesApi.verifyPayment(id, token),
    onSuccess: (updatedInvoice) => {
      queryClient.setQueryData(['finance', 'invoices', 'overview'], (old) => {
        if (!old) return old;
        const newInvoices = old.invoices.map((inv) =>
          inv.id === updatedInvoice.id ? updatedInvoice : inv,
        );
        const awaitingCount = newInvoices.filter(
          (inv) => inv.status === 'Awaiting verification' || inv.status === 'Pending evidence',
        ).length;
        const receiptedCount = newInvoices.filter((inv) => inv.status === 'Receipted').length;

        return {
          ...old,
          invoices: newInvoices,
          metrics: old.metrics.map((m) => {
            if (m.id === 'awaiting') return { ...m, value: awaitingCount };
            if (m.id === 'receipted') return { ...m, value: receiptedCount };
            return m;
          }),
        };
      });
    },
  });
}

export function useReleaseReceipt(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => invoicesApi.releaseReceipt(id, token),
    onSuccess: (updatedInvoice) => {
      queryClient.setQueryData(['finance', 'invoices', 'overview'], (old) => {
        if (!old) return old;
        const newInvoices = old.invoices.map((inv) =>
          inv.id === updatedInvoice.id ? updatedInvoice : inv,
        );
        const awaitingCount = newInvoices.filter(
          (inv) => inv.status === 'Awaiting verification' || inv.status === 'Pending evidence',
        ).length;
        const receiptedCount = newInvoices.filter((inv) => inv.status === 'Receipted').length;

        return {
          ...old,
          invoices: newInvoices,
          metrics: old.metrics.map((m) => {
            if (m.id === 'awaiting') return { ...m, value: awaitingCount };
            if (m.id === 'receipted') return { ...m, value: receiptedCount };
            return m;
          }),
        };
      });
    },
  });
}

export function useRecordEvidence(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentReference }) =>
      invoicesApi.recordEvidence(id, paymentReference, token),
    onSuccess: (updatedInvoice) => {
      queryClient.setQueryData(['finance', 'invoices', 'overview'], (old) => {
        if (!old) return old;
        const newInvoices = old.invoices.map((inv) =>
          inv.id === updatedInvoice.id ? updatedInvoice : inv,
        );
        return {
          ...old,
          invoices: newInvoices,
        };
      });
    },
  });
}

