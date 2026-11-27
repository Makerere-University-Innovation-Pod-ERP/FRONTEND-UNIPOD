import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getBrief, saveBrief } from '@/lib/brief';
import { SubmitterBriefPage } from './SubmitterBriefPage';

const SESSION = { accessToken: 'test-token', subject: 'Student One', roles: ['ROLE_SUBMITTER'] };

function localBrief(overrides = {}) {
  return {
    submissionId: 'local-brief-2',
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
    infoRequests: [{
      id: 'info-1',
      requestedBy: 'Reception',
      requestedAt: new Date().toISOString(),
      message: 'Please clarify the intended users.',
      items: [{ id: 'item-1', label: 'Name the user group', done: false }],
      status: 'OPEN',
      response: null,
      respondedAt: null,
      respondedBy: null,
    }],
    submittedAt: new Date().toISOString(),
    trackingReference: null,
    localOnly: true,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/submissions/local-brief-2']}>
      <Routes>
        <Route
          path="/submissions/:id"
          element={<SubmitterBriefPage session={SESSION} onUnauthorized={vi.fn()} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('SubmitterBriefPage', () => {
  it('answers a local information request and stores the reply', async () => {
    const user = userEvent.setup();
    saveBrief(localBrief());
    renderPage();

    expect(screen.getByText(/stored in this browser only/i)).toBeInTheDocument();
    expect(screen.getByText('Please clarify the intended users.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Your reply'), 'Smallholder farmers in Wakiso.');
    await user.click(screen.getByRole('button', { name: /send reply/i }));

    expect(screen.getByText(/Smallholder farmers in Wakiso/)).toBeInTheDocument();
    expect(getBrief('local-brief-2')?.infoRequests[0].status).toBe('ANSWERED');
  });
});
