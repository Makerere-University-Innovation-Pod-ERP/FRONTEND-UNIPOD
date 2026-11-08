import type { FactFindingCase, FactFindingQueueItem } from '@/services/fact-finding';

export const factFindingQueue: FactFindingQueueItem[] = [
  {
    id: 'IH-26030',
    code: null,
    title: 'Community Waste-to-Energy Initiative',
    category: 'general',
    stage: 'FACT_FINDING',
    receivedAt: '2026-10-07',
    updatedAt: '2026-10-16',
    reason: 'Awaiting completeness and relevance assessment',
  },
  {
    id: 'IH-26025',
    code: null,
    title: 'Accessible Market Price Bulletin',
    category: 'general',
    stage: 'FACT_FINDING',
    receivedAt: '2026-09-27',
    updatedAt: '2026-10-13',
    reason: 'Supporting evidence not yet reviewed',
  },
  {
    id: 'IH-26020',
    code: 'STU-2026-007',
    title: 'Rainwater Harvesting Design Kit',
    category: 'student',
    stage: 'RECEIVED',
    receivedAt: '2026-10-18',
    updatedAt: '2026-10-18',
    reason: 'Newly received, fact-finding not started',
  },
];

export const factFindingCases: Record<string, FactFindingCase> = Object.fromEntries(
  factFindingQueue.map((item) => [
    item.id,
    {
      id: item.id,
      code: item.code,
      title: item.title,
      category: item.category,
      purpose: item.category === 'student'
        ? 'Demonstrate a classroom-ready rainwater capture planning kit.'
        : 'Pilot a safe, community-run organic waste to biogas conversion.',
      problemAddressed: item.category === 'student'
        ? 'Practical rainwater planning tools are limited in local classrooms.'
        : 'Markets lack a reliable pathway for organic waste.',
      stage: item.stage,
      receivedAt: item.receivedAt,
      updatedAt: item.updatedAt,
      documents: [
        { id: `doc-${item.id}-1`, name: 'Project brief', status: 'Submitted', createdAt: item.receivedAt },
      ],
      stageHistory: [
        { toStage: 'RECEIVED', changedBy: 'Martha Akello', changedAt: item.receivedAt ?? item.updatedAt, note: null },
      ],
      checklist: [
        { id: 'title', label: 'Title is clear', checked: true, note: '' },
        { id: 'purpose', label: 'Purpose is defined', checked: true, note: '' },
        { id: 'evidence', label: 'Evidence is adequate', checked: false, note: '' },
        { id: 'category', label: 'Category is correct', checked: false, note: '' },
        { id: 'documents', label: 'Required documents present', checked: false, note: 'Awaiting supporting evidence.' },
      ],
      assessment: '',
      nextAction: {
        recommendation: 'Forward to sector once evidence is confirmed',
        options: ['Forward to sector', 'Request refinement', 'Keep in fact-finding'],
      },
    } satisfies FactFindingCase,
  ]),
);
