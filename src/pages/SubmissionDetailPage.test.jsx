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
      stepper: [
        { stage: 'SUBMITTED', state: 'CURRENT' },
        { stage: 'FORWARDED', state: 'UPCOMING' },
      ],
      outcome: null,
      capabilities: {
        nextStep: { enabled: false, reason: 'Staff role required.' },
        saveOutcome: { enabled: false, reason: 'Coordinator role required.' },
        updateDocumentStatus: { enabled: false, reason: 'Coordinator role required.' },
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
                session={{ accessToken: 'test-token', roles: ['ROLE_REVIEWER'] }}
                onUnauthorized={vi.fn()}
              />
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Community solar dryer' })).toBeInTheDocument();
    expect(screen.getAllByText('Dry crops with solar energy.').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('region', { name: 'Pipeline progress' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your idea, in motion' })).toBeInTheDocument();
    expect(screen.getByText('0 of 2 milestones complete')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Up next')).toBeInTheDocument();
    expect(screen.getByText('Project overview')).toBeInTheDocument();
    expect(screen.getByText('Registration')).toBeInTheDocument();
    expect(screen.getByText('Assignment')).toBeInTheDocument();
    expect(screen.getByText('No reviewers assigned')).toBeInTheDocument();
    expect(screen.queryByText('IP panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Case permissions' })).not.toBeInTheDocument();
    expect(screen.queryByText('Your role can view this case but cannot make workflow changes.')).not.toBeInTheDocument();
  });

  it('loads a submitter\'s own brief through the dedicated /me/submissions/{id} endpoint', async () => {
    const caseFileSpy = vi.spyOn(backendApi, 'caseFile');
    vi.spyOn(backendApi, 'submitterSubmissionDetail').mockResolvedValue({
      submission: {
        title: 'Smart Irrigation Monitoring System',
        category: 'student',
        stage: 'SUBMITTED',
        version: 1,
        purpose: 'Improve water efficiency.',
        problemAddressed: 'Manual schedules are imprecise.',
      },
      reference: 'STU-2026-001',
      stepper: [],
      outcome: null,
      capabilities: {
        nextStep: { enabled: false, reason: null },
        saveOutcome: { enabled: false, reason: null },
        updateDocumentStatus: { enabled: false, reason: null },
      },
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

    expect(await screen.findByRole('heading', { name: 'Smart Irrigation Monitoring System' })).toBeInTheDocument();
    expect(backendApi.submitterSubmissionDetail).toHaveBeenCalledWith('test-token', 'submission-1', expect.any(AbortSignal));
    expect(caseFileSpy).not.toHaveBeenCalled();
  });
});
