import type { AppNotification } from '@/services/notifications';

export const notifications: AppNotification[] = [
  { id: 'n1', title: 'Fact-finding assessment needed', body: '3 submissions are waiting for an assessment.', link: '/fact-finding/queue', createdAt: '2026-10-18', read: false },
  { id: 'n2', title: 'New case assigned', body: 'Low-cost Water Quality Alert was assigned to you for review.', link: '/reviewer/workspace', createdAt: '2026-10-17', read: false },
  { id: 'n3', title: 'Refinement resolved', body: 'Maternal Health Follow-up Platform moved back to review.', link: '/submissions/IH-26029', createdAt: '2026-10-14', read: true },
];
