import { describe, expect, it } from 'vitest';
import { canCreateSubmission } from './auth';

describe('canCreateSubmission', () => {
  it('allows submitters and intake staff to create briefs', () => {
    expect(canCreateSubmission(['ROLE_SUBMITTER'])).toBe(true);
    expect(canCreateSubmission(['ROLE_RECEPTIONIST'])).toBe(true);
  });

  it('does not grant submission creation to unrelated roles', () => {
    expect(canCreateSubmission(['ROLE_REVIEWER'])).toBe(false);
  });
});
