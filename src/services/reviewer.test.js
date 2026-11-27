import { describe, expect, it } from 'vitest';
import { makeMockToken } from '@/mocks/jwt';
import { submissions } from '@/mocks/fixtures/submissions';
import { reviewerApi } from './reviewer';

describe('reviewer queue', () => {
  it('only returns cases assigned to the authenticated reviewer', async () => {
    const token = makeMockToken(['ROLE_REVIEWER'], 'Dr. Miriam Nsubuga');
    const caseFile = submissions.find((item) => item.id === 'IH-26031');
    const originalReviewer = caseFile.assignedReviewerSubject;
    caseFile.assignedReviewerSubject = 'Another Reviewer';

    try {
      const assigned = await reviewerApi.assigned(token);

      expect(assigned.length).toBeGreaterThan(0);
      expect(assigned.map((item) => item.id)).not.toContain(caseFile.id);
    } finally {
      caseFile.assignedReviewerSubject = originalReviewer;
    }
  });

  it('rejects users without reviewer identity', async () => {
    const token = makeMockToken(['ROLE_SUBMITTER'], 'brian.s', 'submitter@unipod.test');

    await expect(reviewerApi.assigned(token)).rejects.toMatchObject({ status: 401 });
  });
});
