export const ROLE_FACT_FINDING_OFFICER = 'ROLE_FACT_FINDING_OFFICER';
export const ROLE_REVIEWER = 'ROLE_REVIEWER';
export const ROLE_INNOVATION_COORDINATOR = 'ROLE_INNOVATION_COORDINATOR';
export const ROLE_TEXTILE_DOMAIN_OWNER = 'ROLE_TEXTILE_DOMAIN_OWNER';

export function isFactFindingOfficer(roles) {
  return roles.includes(ROLE_FACT_FINDING_OFFICER);
}

export function isReviewer(roles) {
  return roles.includes(ROLE_REVIEWER);
}

/** Textile Operations (customer orders, stock, machines, workshop bookings). */
export function isTextileDomainOwner(roles) {
  return roles.includes(ROLE_TEXTILE_DOMAIN_OWNER);
}

/**
 * The Innovation Coordinator owns reviewer assignment and the decision
 * pipeline (Assignment 2) — the counterpart to REVIEWER_CANNOT_ASSIGN_REASON
 * below. Frontend gating is a usability affordance, never a security
 * boundary: the backend remains the authorization authority.
 */
export function isInnovationCoordinator(roles) {
  return roles.includes(ROLE_INNOVATION_COORDINATOR);
}

export const COORDINATOR_ONLY_REASON =
  'The coordinator workspace is only available to innovation coordinators.';

/**
 * Reviewers can view and decide on their assigned cases but never assign
 * reviewers to a case — that is an Innovation Coordinator / Sector Officer
 * action (Assignment 2 / 5). The Review Workspace must show this control as
 * visibly disabled with this reason, not hide it, per the team's shared
 * engineering standard for restricted actions.
 */
export const REVIEWER_CANNOT_ASSIGN_REASON = 'Reviewers cannot assign reviewers to a case.';
