export const ROLE_FACT_FINDING_OFFICER = 'ROLE_FACT_FINDING_OFFICER';
export const ROLE_REVIEWER = 'ROLE_REVIEWER';

export function isFactFindingOfficer(roles: string[]): boolean {
  return roles.includes(ROLE_FACT_FINDING_OFFICER);
}

export function isReviewer(roles: string[]): boolean {
  return roles.includes(ROLE_REVIEWER);
}

/**
 * Reviewers can view and decide on their assigned cases but never assign
 * reviewers to a case — that is an Innovation Coordinator / Sector Officer
 * action (Assignment 2 / 5). The Review Workspace must show this control as
 * visibly disabled with this reason, not hide it, per the team's shared
 * engineering standard for restricted actions.
 */
export const REVIEWER_CANNOT_ASSIGN_REASON = 'Reviewers cannot assign reviewers to a case.';
