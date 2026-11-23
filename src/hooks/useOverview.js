import { useQuery } from '@tanstack/react-query';
import { financeOverviewApi } from '@/services/overview';

export function useFinanceOverview(token) {
  return useQuery({
    queryKey: ['finance', 'overview'],
    queryFn: ({ signal }) => financeOverviewApi.getOverview(token, signal),
    staleTime: 1000 * 60,
  });
}

