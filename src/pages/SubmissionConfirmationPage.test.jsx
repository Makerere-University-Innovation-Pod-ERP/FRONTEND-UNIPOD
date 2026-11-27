import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { saveBrief } from '@/lib/brief';
import { SubmissionConfirmationPage } from './SubmissionConfirmationPage';

function localBrief(overrides = {}) {
  return {
    submissionId: 'local-brief-1',
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/submissions/local-brief-1/confirmation']}>
      <Routes>
        <Route
          path="/submissions/:id/confirmation"
          element={<SubmissionConfirmationPage token="test-token" roles={[]} onUnauthorized={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('SubmissionConfirmationPage', () => {
  it('identifies a local-only brief as not yet received by reception', () => {
    saveBrief(localBrief());
    renderPage();

    expect(screen.getByText('Brief saved in this browser.')).toBeInTheDocument();
    expect(screen.getByText(/local record, not a backend case/i)).toBeInTheDocument();
    expect(screen.getByText('Smart irrigation')).toBeInTheDocument();
    expect(screen.getByText(/Not sent to reception yet/i)).toBeInTheDocument();
  });
});
