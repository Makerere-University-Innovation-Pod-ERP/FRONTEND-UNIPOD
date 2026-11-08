import type { CaseFile, Sector, Submission } from '@/services/backend-api';

export const sectors: Sector[] = [
  { id: 'sec-1', name: 'Technical Assessment', active: true },
  { id: 'sec-2', name: 'Research & Innovation', active: true },
  { id: 'sec-3', name: 'Academic Department', active: true },
  { id: 'sec-4', name: 'Intellectual Property', active: true },
];

export const submissions: Submission[] = [
  { id: 'IH-26031', code: 'STU-2026-001', category: 'student', title: 'Smart Irrigation Monitoring System', purpose: 'Improve water efficiency for local growers.', problemAddressed: 'Manual irrigation schedules do not account for changing soil moisture.', registeredBy: 'Sarah Kintu', submitterId: 'lydia.n', receivingOfficer: 'Martha Akello', assignedReviewerSubject: 'Dr. Miriam Nsubuga', studentNumber: 'S24/1048', programme: 'BSc Agricultural Engineering', supervisor: 'Dr. Isaac Mugisha', recommendationLetterStatus: 'verified', responsibleSectorId: 'sec-1', responsibleSectorName: 'Technical Assessment', stage: 'UNDER_REVIEW', receivedAt: '2026-10-08', forwardedAt: '2026-10-17', createdAt: '2026-10-08', updatedAt: '2026-10-17', version: 3 },
  { id: 'IH-26030', code: null, category: 'general', title: 'Community Waste-to-Energy Initiative', purpose: 'Reduce landfill waste and create local energy.', problemAddressed: 'Markets lack a reliable pathway for organic waste.', registeredBy: 'Sarah Kintu', submitterId: null, receivingOfficer: 'Martha Akello', assignedReviewerSubject: null, studentNumber: null, programme: null, supervisor: null, recommendationLetterStatus: null, responsibleSectorId: null, responsibleSectorName: null, stage: 'FACT_FINDING', receivedAt: '2026-10-07', forwardedAt: null, createdAt: '2026-10-07', updatedAt: '2026-10-16', version: 1 },
  { id: 'IH-26029', code: 'STU-2026-002', category: 'student', title: 'Maternal Health Follow-up Platform', purpose: 'Improve continuity of postnatal care.', problemAddressed: 'Follow-up visits can be missed when records are fragmented.', registeredBy: 'Sarah Kintu', submitterId: 'brian.s', receivingOfficer: 'Martha Akello', assignedReviewerSubject: 'Dr. Miriam Nsubuga', studentNumber: 'S23/0872', programme: 'BSc Information Systems', supervisor: 'Ms. Joan Nakato', recommendationLetterStatus: 'submitted', responsibleSectorId: 'sec-3', responsibleSectorName: 'Academic Department', stage: 'REFINEMENT_REQUESTED', receivedAt: '2026-10-05', forwardedAt: '2026-10-11', createdAt: '2026-10-05', updatedAt: '2026-10-16', version: 2 },
  { id: 'IH-26028', code: null, category: 'general', title: 'Solar-Powered Cold Storage', purpose: 'Extend shelf life and improve market access.', problemAddressed: 'Post-harvest losses rise where cold storage is unavailable.', registeredBy: 'Joseph Lwanga', submitterId: null, receivingOfficer: 'Martha Akello', assignedReviewerSubject: null, studentNumber: null, programme: null, supervisor: null, recommendationLetterStatus: null, responsibleSectorId: null, responsibleSectorName: null, stage: 'FORWARDED', receivedAt: '2026-10-03', forwardedAt: '2026-10-15', createdAt: '2026-10-03', updatedAt: '2026-10-15', version: 1 },
  { id: 'IH-26025', code: null, category: 'general', title: 'Accessible Market Price Bulletin', purpose: 'Support more informed selling decisions.', problemAddressed: 'Price updates are often delayed or inaccessible.', registeredBy: 'Joseph Lwanga', submitterId: null, receivingOfficer: 'Martha Akello', assignedReviewerSubject: null, studentNumber: null, programme: null, supervisor: null, recommendationLetterStatus: null, responsibleSectorId: null, responsibleSectorName: null, stage: 'FACT_FINDING', receivedAt: '2026-09-27', forwardedAt: null, createdAt: '2026-09-27', updatedAt: '2026-10-13', version: 1 },
  { id: 'IH-26024', code: 'STU-2026-005', category: 'student', title: 'Low-cost Water Quality Alert', purpose: 'Make early water-quality concerns easier to flag.', problemAddressed: 'Routine testing is not always available close to source.', registeredBy: 'Sarah Kintu', submitterId: 'david.k', receivingOfficer: 'Martha Akello', assignedReviewerSubject: 'Dr. Miriam Nsubuga', studentNumber: 'S23/0926', programme: 'BSc Environmental Science', supervisor: 'Dr. Jane Kasaija', recommendationLetterStatus: 'verified', responsibleSectorId: 'sec-2', responsibleSectorName: 'Research & Innovation', stage: 'UNDER_REVIEW', receivedAt: '2026-09-24', forwardedAt: '2026-10-01', createdAt: '2026-09-24', updatedAt: '2026-10-12', version: 2 },
  { id: 'IH-26026', code: 'STU-2026-004', category: 'student', title: 'Digital Heritage Preservation Project', purpose: 'Preserve and respectfully share local heritage.', problemAddressed: 'Valuable histories can be lost without consent-led preservation.', registeredBy: 'Joseph Lwanga', submitterId: 'noah.k', receivingOfficer: 'Martha Akello', assignedReviewerSubject: 'Dr. Miriam Nsubuga', studentNumber: 'S22/0641', programme: 'BA History', supervisor: 'Dr. Lydia Busingye', recommendationLetterStatus: 'verified', responsibleSectorId: 'sec-2', responsibleSectorName: 'Research & Innovation', stage: 'COMPLETED', receivedAt: '2026-09-29', forwardedAt: '2026-10-02', createdAt: '2026-09-29', updatedAt: '2026-10-14', version: 4 },
  { id: 'IH-26020', code: 'STU-2026-007', category: 'student', title: 'Rainwater Harvesting Design Kit', purpose: 'Demonstrate accessible climate adaptation.', problemAddressed: 'Practical planning tools are limited in local classrooms.', registeredBy: 'Joseph Lwanga', submitterId: 'mark.w', receivingOfficer: 'Martha Akello', assignedReviewerSubject: null, studentNumber: 'S22/0713', programme: 'BSc Civil Engineering', supervisor: 'Eng. Sarah Tendo', recommendationLetterStatus: 'not_required', responsibleSectorId: null, responsibleSectorName: null, stage: 'RECEIVED', receivedAt: '2026-10-18', forwardedAt: null, createdAt: '2026-10-18', updatedAt: '2026-10-18', version: 1 },
];

const stageHistoryFor = (submission: Submission): CaseFile['stageHistory'] => [
  { fromStage: null, toStage: 'RECEIVED', changedBy: submission.receivingOfficer ?? 'Reception', changedAt: submission.receivedAt ?? submission.createdAt, note: null },
  ...(submission.stage !== 'RECEIVED' && submission.stage !== 'DRAFT'
    ? [{ fromStage: 'RECEIVED', toStage: submission.stage, changedBy: submission.registeredBy, changedAt: submission.updatedAt, note: null }]
    : []),
];

export function toCaseFile(submission: Submission): CaseFile {
  return {
    submission,
    currentStage: submission.stage,
    reference: submission.code,
    documents: [{ id: `doc-${submission.id}`, name: 'Project brief', status: 'Verified', createdAt: submission.createdAt }],
    stageHistory: stageHistoryFor(submission),
    stepper: ['RECEIVED', 'REGISTERED', 'FACT_FINDING', 'UNDER_REVIEW', 'FORWARDED', 'COMPLETED'].map((stage) => ({
      stage,
      state: stage === submission.stage ? 'current' : 'pending',
    })),
    outcome: submission.stage === 'COMPLETED' ? { status: 'COMPLETED', decision: 'Approved', note: null } : null,
    capabilities: {
      nextStep: { enabled: true, reason: null },
      saveOutcome: { enabled: submission.stage === 'COMPLETED', reason: submission.stage === 'COMPLETED' ? null : 'Outcome is recorded once review concludes.' },
      updateDocumentStatus: { enabled: true, reason: null },
    },
    transitionOptions: { allowedTransitions: nextStagesFor(submission.stage) },
  };
}

function nextStagesFor(stage: string): string[] {
  const flow: Record<string, string[]> = {
    DRAFT: ['RECEIVED'],
    RECEIVED: ['REGISTERED'],
    REGISTERED: ['FACT_FINDING'],
    FACT_FINDING: ['FORWARDED', 'REFINEMENT_REQUESTED'],
    FORWARDED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['REFINEMENT_REQUESTED', 'FURTHER_HANDLING', 'COMPLETED'],
    REFINEMENT_REQUESTED: ['UNDER_REVIEW'],
    FURTHER_HANDLING: ['COMPLETED'],
  };
  return flow[stage] ?? [];
}
