import { describe, expect, it } from 'vitest';
import { isFactFindingOfficer, isReviewer } from './permissions';

describe('permissions', () => {
  it('recognizes a fact-finding officer role', () => {
    expect(isFactFindingOfficer(['ROLE_FACT_FINDING_OFFICER'])).toBe(true);
    expect(isFactFindingOfficer(['ROLE_REVIEWER'])).toBe(false);
    expect(isFactFindingOfficer([])).toBe(false);
  });

  it('recognizes a reviewer role', () => {
    expect(isReviewer(['ROLE_REVIEWER'])).toBe(true);
    expect(isReviewer(['ROLE_FACT_FINDING_OFFICER'])).toBe(false);
    expect(isReviewer([])).toBe(false);
  });

  it('is not fooled by a role appearing as a substring of another', () => {
    expect(isReviewer(['ROLE_REVIEWER_COORDINATOR'])).toBe(false);
  });
});
