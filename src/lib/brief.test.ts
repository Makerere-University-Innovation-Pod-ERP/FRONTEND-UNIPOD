import { beforeEach, describe, expect, it } from 'vitest';
import {
  acceptGeneralRules,
  answerInformationRequest,
  BRIEF_TYPE_LABELS,
  documentChecklist,
  getBrief,
  getOrCreateBrief,
  hasAcceptedGeneralRules,
  loadBriefs,
  missingRequiredDocuments,
  requestInformation,
  saveBrief,
  type BriefDocument,
  type BriefRecord,
} from './brief';

function documentOf(kind: BriefDocument['kind']): BriefDocument {
  return {
    id: `doc-${kind}`,
    kind,
    name: `${kind} v1`,
    fileName: null,
    fileSize: null,
    addedAt: new Date().toISOString(),
  };
}

function recordOf(overrides: Partial<BriefRecord> = {}): BriefRecord {
  return {
    submissionId: 'local-test',
    type: 'student',
    title: 'Smart irrigation',
    purpose: 'Improve water efficiency',
    problemAddressed: 'Manual schedules waste water',
    departmentId: null,
    departmentName: null,
    documents: [],
    rules: {
      general: true,
      departmentId: null,
      departmentName: null,
      departmentRules: false,
      acceptedAt: new Date().toISOString(),
    },
    infoRequests: [],
    submittedAt: new Date().toISOString(),
    trackingReference: null,
    localOnly: true,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('brief requirement matrix', () => {
  it('requires different documents for each brief type', () => {
    expect(missingRequiredDocuments('student', [])).toEqual(['Project brief', 'Student identification']);
    expect(missingRequiredDocuments('general', [])).toEqual(['Project brief']);
    expect(missingRequiredDocuments('service', [])).toEqual(['Service request letter']);
  });

  it('marks a required document as present once it is attached', () => {
    const checklist = documentChecklist('student', [
      documentOf('Project brief'),
      documentOf('Student identification'),
    ]);
    expect(checklist.filter((item) => item.required).every((item) => item.present)).toBe(true);
    expect(missingRequiredDocuments('student', [
      documentOf('Project brief'),
      documentOf('Student identification'),
    ])).toEqual([]);
  });

  it('keeps optional documents out of the blocking list', () => {
    const checklist = documentChecklist('service', [documentOf('Service request letter')]);
    expect(checklist.find((item) => item.kind === 'Budget or quotation')?.required).toBe(false);
    expect(missingRequiredDocuments('service', [documentOf('Service request letter')])).toEqual([]);
  });
});

describe('local brief store', () => {
  it('saves, reads and lists a brief by submission id', () => {
    const record = recordOf();
    expect(saveBrief(record)).toBe(true);
    expect(getBrief(record.submissionId)?.title).toBe('Smart irrigation');
    expect(Object.keys(loadBriefs())).toContain(record.submissionId);
  });

  it('creates a minimal brief for a staff-registered case', () => {
    const brief = getOrCreateBrief('case-123', { category: 'general', title: 'Campus map' });
    expect(brief.type).toBe('general');
    expect(brief.title).toBe('Campus map');
    expect(brief.localOnly).toBe(false);
  });

  it('stores an information request and the submitter reply', () => {
    saveBrief(recordOf());
    const request = requestInformation('local-test', {
      message: 'Please clarify the intended users.',
      items: ['Name the user group', 'Add a timeline'],
      requestedBy: 'Reception',
    });
    expect(getBrief('local-test')?.infoRequests[0].status).toBe('OPEN');
    expect(getBrief('local-test')?.infoRequests[0].items).toHaveLength(2);

    const updated = answerInformationRequest('local-test', request.id, 'Smallholder farmers in Wakiso.', 'Student');
    expect(updated?.infoRequests[0].status).toBe('ANSWERED');
    expect(updated?.infoRequests[0].response).toContain('Wakiso');
  });

  it('records general rules acceptance once', () => {
    expect(hasAcceptedGeneralRules()).toBe(false);
    acceptGeneralRules();
    expect(hasAcceptedGeneralRules()).toBe(true);
  });

  it('labels every supported brief type', () => {
    expect(BRIEF_TYPE_LABELS.student).toBe('Student project');
    expect(BRIEF_TYPE_LABELS.general).toBe('General innovation');
    expect(BRIEF_TYPE_LABELS.service).toBe('Service request');
  });
});
