import { useQuery } from '@tanstack/react-query';
import { financeOverviewApi } from '@/services/overview';
import { initialFinanceOverview } from '@/mocks/fixtures/overview';

export function useFinanceOverview(token) {
  return useQuery({
    queryKey: ['finance', 'overview'],
    queryFn: ({ signal }) => financeOverviewApi.getOverview(token, signal),
    initialData: initialFinanceOverview,
    staleTime: 1000 * 60,
  });
}

