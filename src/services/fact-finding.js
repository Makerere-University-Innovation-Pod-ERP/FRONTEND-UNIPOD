import { z } from 'zod';
import { backendApi } from './backend-api';

/**
 * A FACT_FINDING_OFFICER works the real case-file aggregate (GET /cases/{id},
 * the same one Assignment 2's coordinator pipeline uses) rather than a
 * bespoke fact-finding resource — the backend has no separate checklist or
 * assessment concept. "Completeness and relevance" is assessed against the
 * case's real documents, and the officer's next action is one of exactly two
 * real transitions: POST /cases/{id}/fact-finding/complete (advances the
 * case into review) or POST /cases/{id}/transitions with
 * to_stage: 'IMPROVEMENT_REQUESTED' (sent back for changes).
 */

const FACT_FINDING_QUEUE_STAGES = ['FORWARDED', 'FACT_FINDING'];

export const factFindingQueueItemSchema = z.object({
  id: z.string(),
  code: z.string().nullable(),
  title: z.string(),
  category: z.enum(['student', 'general']),
  stage: z.string(),
  receivedAt: z.string().nullable(),
  updatedAt: z.string(),
  reason: z.string(),
});

function reasonFor(stage) {
  return stage === 'FORWARDED'
    ? 'Newly forwarded, fact-finding not started'
    : 'Fact-finding in progress';
}

export const factFindingApi = {
  queue: async (token, signal) => {
    const pages = await Promise.all(
      FACT_FINDING_QUEUE_STAGES.map((stage) => backendApi.submissions(token, { stage, size: 100 }, signal)),
    );
    const items = pages
      .flatMap((page) => page.items)
      .map((item) => factFindingQueueItemSchema.parse({
        id: item.id,
        code: item.code,
        title: item.title,
        category: item.category,
        stage: item.stage,
        receivedAt: item.receivedAt,
        updatedAt: item.updatedAt,
        reason: reasonFor(item.stage),
      }));
    return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },
  caseFile: (token, id, signal) =>
    backendApi.caseFile(token, id, signal),
  completeFactFinding: (token, id, body) =>
    backendApi.completeFactFinding(token, id, body),
  requestImprovement: (token, id, body) =>
    backendApi.transition(token, id, { ...body, to_stage: 'IMPROVEMENT_REQUESTED' }),
};
