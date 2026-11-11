import { z } from 'zod';
import { request } from './api-client';

export const metricCardSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  subtext: z.string(),
  variant: z.enum(['default', 'forest', 'burgundy']).default('default'),
  icon: z.string().optional(),
});

export const pipelineStageSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number(),
});

export const attentionItemSchema = z.object({
  id: z.string(),
  index: z.string(),
  title: z.string(),
  subtext: z.string(),
  category: z.string().optional(),
  sector: z.string().optional(),
  code: z.string().optional(),
});

export const incomeDataSchema = z.object({
  amountFormatted: z.string(),
  amount: z.number(),
  currency: z.string(),
  subtext: z.string(),
  bars: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      color: z.string(),
    })
  ),
});

export const facilityItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  bookings: z.number(),
  capacity: z.number(),
  percentage: z.number(),
});

export const recentActivitySchema = z.object({
  id: z.string(),
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  actionSuffix: z.string().optional(),
  timestamp: z.string(),
});

export const financeOverviewSchema = z.object({
  eyebrow: z.string(),
  greeting: z.string(),
  subtitle: z.string(),
  metrics: z.array(metricCardSchema),
  pipelineStages: z.array(pipelineStageSchema),
  needsAttention: z.array(attentionItemSchema),
  income: incomeDataSchema,
  facilities: z.array(facilityItemSchema),
  recentActivities: z.array(recentActivitySchema),
});

export const financeOverviewApi = {
  async getOverview(token, signal) {
    const data = await request('/finance/overview', { token, signal });
    return financeOverviewSchema.parse(data);
  },
};
