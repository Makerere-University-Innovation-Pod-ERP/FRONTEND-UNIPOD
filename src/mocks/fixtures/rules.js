/**
 * Seed data for the Department Rules Manager (Assignment 12). The GENERAL
 * rules migrate the copy that used to be hardcoded directly in
 * NewSubmissionPage.jsx's wizard step and ReviewerCaseFile.jsx's reference
 * panel. The SECTOR rules give the manager something real to show for
 * "department-specific" rules even though no consuming screen is wired to a
 * sector yet (a submission has no sector until Reception/Fact-finding
 * forwards it — see Section 9 of the assignment doc for this kind of
 * flagged, not-yet-confirmed assumption).
 */
export const initialRules = [
  {
    id: 'rule-general-1',
    title: 'Originality and attribution',
    body: 'Work must be original or properly attributed. Submissions must not infringe existing intellectual property.',
    scope: 'GENERAL',
    scopeId: null,
    mustAccept: true,
    version: 1,
    published: true,
    updatedAt: '2026-09-01',
  },
  {
    id: 'rule-general-2',
    title: 'Good-faith participation',
    body: 'All participants must engage in good faith with the review process.',
    scope: 'GENERAL',
    scopeId: null,
    mustAccept: true,
    version: 1,
    published: true,
    updatedAt: '2026-09-01',
  },
  {
    id: 'rule-general-3',
    title: 'Impartial review',
    body: 'Reviews must be impartial and evidence-based; conflicts of interest must be declared before a decision is recorded.',
    scope: 'GENERAL',
    scopeId: null,
    mustAccept: false,
    version: 1,
    published: true,
    updatedAt: '2026-09-01',
  },
  {
    id: 'rule-sector-1',
    title: 'Technical Assessment turnaround',
    body: 'Technical Assessment aims to respond to every forwarded brief within 5 working days; briefs lacking a working prototype description may be sent back for more detail.',
    scope: 'SECTOR',
    scopeId: 'sec-1',
    mustAccept: false,
    version: 1,
    published: true,
    updatedAt: '2026-09-10',
  },
  {
    id: 'rule-sector-2',
    title: 'Intellectual Property screening',
    body: 'Intellectual Property screening requires a signed disclosure form before any patent or utility-model discussion begins.',
    scope: 'SECTOR',
    scopeId: 'sec-4',
    mustAccept: true,
    version: 1,
    published: true,
    updatedAt: '2026-09-10',
  },
];
