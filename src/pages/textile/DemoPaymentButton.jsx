import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, LoaderCircle } from 'lucide-react';
import { request } from '@/services/api-client';
import { orderSchema } from '@/services/textile';
import { textileKeys } from '@/hooks/useTextile';
import { ErrorBanner } from './shared';

/** True only when the app runs against the MSW mock API (never against the real backend). */
export const MOCK_API_ENABLED = import.meta.env.VITE_ENABLE_MOCKS === 'true' || import.meta.env.MODE === 'textile';

/**
 * DEMO ONLY. In mock mode there are no Finance screens to confirm payment, so
 * a quoted order could never reach Scheduled. This button stands in for
 * Finance (Assignment 6). It renders nothing when the real backend is used.
 */
export function DemoPaymentButton({ token, order }) {
  const queryClient = useQueryClient();
  const confirm = useMutation({
    mutationFn: async () => orderSchema.parse(await request('/__demo__/finance/confirm-payment', { token, body: { orderId: order.id } })),
    onSuccess: (updated) => {
      queryClient.setQueryData(textileKeys.order(token, updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: textileKeys.orders(token) });
    },
  });

  if (!MOCK_API_ENABLED || order.status !== 'QUOTED' || order.payment.status === 'CONFIRMED') return null;
  return (
    <div className="tx-demo-payment">
      <button type="button" className="btn tx-ghost" disabled={confirm.isPending} onClick={() => confirm.mutateAsync().catch(() => {})}>
        {confirm.isPending ? <LoaderCircle size={14} className="spin" /> : <FlaskConical size={14} />}Simulate Finance confirming payment
      </button>
      <small>Demo data only. In the live system Finance confirms payment on its own screens.</small>
      <ErrorBanner error={confirm.error} fallback="Could not confirm the payment." />
    </div>
  );
}
