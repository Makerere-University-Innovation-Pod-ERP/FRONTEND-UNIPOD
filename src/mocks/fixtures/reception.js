/**
 * Fake data for the Reception screens (Assignment 3 - Peter Arnold Mukasa).
 *
 * PLACEHOLDERS - waiting for answers (see QUESTIONS.md):
 * - the check list items (Question 4)
 * - the department list (Question 2)
 * - the stage names RECEIVED / FORWARDED (Question 3)
 */

/** Makes a date string "n days ago", so "updated recently" always has data. */
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export const receptionDepartments = [
  { id: 'dep-innovation', name: 'Innovation' },
  { id: 'dep-multimedia', name: 'Multimedia' },
  { id: 'dep-textile', name: 'Textile' },
  { id: 'dep-cnc', name: 'CNC & Carpentry' },
  { id: 'dep-telecoms', name: 'Telecoms' },
];

/** A fresh, un-ticked copy of the check list for each brief. */
function newChecklist() {
  return [
    { id: 'details', label: 'Submitter details are filled in', checked: false },
    { id: 'documents', label: 'All required documents are attached', checked: false },
    { id: 'readable', label: 'Attached documents open and can be read', checked: false },
    { id: 'category', label: 'Brief type (student / general) is correct', checked: false },
  ];
}

function submittedEntry(at, by) {
  return { id: 'h-1', at, by, action: 'SUBMITTED', destination: null, note: '' };
}

export const receptionBriefs = [
  {
    id: 'IH-26101',
    title: 'Solar Dryer for Fruit Vendors',
    category: 'general',
    submitter: { name: 'Grace Namuli', email: 'grace.namuli@example.com', type: 'public' },
    purpose: 'Help market vendors dry fruit so less of it goes to waste.',
    problemAddressed: 'Vendors throw away fruit that does not sell quickly.',
    suggestedDepartmentId: 'dep-innovation',
    documents: [
      { id: 'd-1', name: 'Project brief', status: 'ATTACHED' },
      { id: 'd-2', name: 'Supporting photos', status: 'ATTACHED' },
    ],
    stage: 'RECEIVED',
    submittedAt: daysAgo(2),
    updatedAt: daysAgo(2),
    checklist: newChecklist(),
    openRequest: null,
    forwardedTo: null,
    history: [submittedEntry(daysAgo(2), 'Grace Namuli')],
  },
  {
    id: 'IH-26102',
    title: 'Campus Lost-and-Found App',
    category: 'student',
    submitter: { name: 'Isaac Okello', email: 'isaac.okello@students.example.com', type: 'student' },
    purpose: 'Make it easy for students to report and find lost items.',
    problemAddressed: 'Lost items are reported on paper and rarely returned.',
    suggestedDepartmentId: 'dep-innovation',
    documents: [
      { id: 'd-3', name: 'Project brief', status: 'ATTACHED' },
      { id: 'd-4', name: 'Recommendation letter', status: 'MISSING' },
    ],
    stage: 'RECEIVED',
    submittedAt: daysAgo(4),
    updatedAt: daysAgo(4),
    checklist: newChecklist(),
    openRequest: null,
    forwardedTo: null,
    history: [submittedEntry(daysAgo(4), 'Isaac Okello')],
  },
  {
    id: 'IH-26103',
    title: 'Podcast Series on Local Startups',
    category: 'general',
    submitter: { name: 'Ruth Achieng', email: 'ruth.achieng@example.com', type: 'organisation' },
    purpose: 'Record stories of young founders to inspire others.',
    problemAddressed: 'Few local success stories are shared with students.',
    suggestedDepartmentId: 'dep-multimedia',
    documents: [{ id: 'd-5', name: 'Project brief', status: 'ATTACHED' }],
    stage: 'RECEIVED',
    submittedAt: daysAgo(12),
    updatedAt: daysAgo(12),
    checklist: newChecklist(),
    openRequest: null,
    forwardedTo: null,
    history: [submittedEntry(daysAgo(12), 'Ruth Achieng')],
  },
  {
    id: 'IH-26104',
    title: 'Low-cost Signal Booster',
    category: 'student',
    submitter: { name: 'Brian Ssali', email: 'brian.ssali@students.example.com', type: 'student' },
    purpose: 'Improve phone signal in rural health centres.',
    problemAddressed: 'Health workers cannot call for help because of weak signal.',
    suggestedDepartmentId: 'dep-telecoms',
    documents: [
      { id: 'd-6', name: 'Project brief', status: 'ATTACHED' },
      { id: 'd-7', name: 'Recommendation letter', status: 'MISSING' },
    ],
    stage: 'RECEIVED',
    submittedAt: daysAgo(9),
    updatedAt: daysAgo(3),
    checklist: newChecklist(),
    openRequest: {
      items: ['Recommendation letter'],
      note: 'Please upload the letter from your supervisor.',
      dueDate: daysAgo(-5).slice(0, 10),
      requestedAt: daysAgo(3),
      requestedBy: 'Reception Desk',
    },
    forwardedTo: null,
    history: [
      submittedEntry(daysAgo(9), 'Brian Ssali'),
      {
        id: 'h-2',
        at: daysAgo(3),
        by: 'Reception Desk',
        action: 'MISSING_INFO_REQUESTED',
        destination: 'Submitter',
        note: 'Recommendation letter',
      },
    ],
  },
];

/**
 * People who already have an account (used by the walk-in screen to show
 * "existing account found"). Placeholder data.
 */
export const knownSubmitterAccounts = [
  { submitterId: 'grace.n', fullName: 'Grace Namuli', email: 'grace.namuli@example.com', type: 'public' },
  { submitterId: 'isaac.o', fullName: 'Isaac Okello', email: 'isaac.okello@students.example.com', type: 'student' },
];
