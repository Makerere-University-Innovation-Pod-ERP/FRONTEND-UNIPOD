import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { backendApi } from '@/services/backend-api';
import { SubmissionDetailPage } from './SubmissionDetailPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SubmissionDetailPage', () => {
  it('renders when the review panel response omits the unsupported IP panel field', async () => {
    vi.spyOn(backendApi, 'caseFile').mockResolvedValue({
      submission: {
        title: 'Community solar dryer',
        category: 'general',
        stage: 'SUBMITTED',
        version: 1,
        purpose: 'Dry crops with solar energy.',
        problemAddressed: 'Farmers lack affordable dryers.',
      },
      reference: 'UNI-2026-001',
      stepper: [],
      outcome: null,
      capabilities: {
        nextStep: { enabled: false, reason: null },
        saveOutcome: { enabled: false, reason: null },
        updateDocumentStatus: { enabled: false, reason: null },
      },
      reviewPanel: {
        availability: 'AVAILABLE',
        reviewerTeam: [],
        quorumAvailable: false,
        quorumMet: false,
      },
      activity: { availability: 'AVAILABLE', items: [] },
      stageHistory: [],
      documents: [],
    });

    render(
      <MemoryRouter initialEntries={['/submissions/submission-1']}>
        <Routes>
          <Route
            path="/submissions/:id"
            element={(
              <SubmissionDetailPage
                session={{ accessToken: 'test-token', roles: ['ROLE_SUBMITTER'] }}
                onUnauthorized={vi.fn()}
              />
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Community solar dryer' })).toBeInTheDocument();
    expect(screen.getByText('No reviewers assigned')).toBeInTheDocument();
    expect(screen.queryByText('IP panel')).not.toBeInTheDocument();
  });
});
