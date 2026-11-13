import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpPage } from './SignUpPage';

function renderSignUp() {
  return render(<SignUpPage onBackToSignIn={vi.fn()} />);
}

async function fillCommonFields(user, email) {
  await user.type(screen.getByLabelText('Full name'), 'Test Person');
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText('Password'), 'secret-pass');
  await user.type(screen.getByLabelText('Confirm password'), 'secret-pass');
}

describe('Sign up (mock)', () => {
  it('shows student fields only for students and organisation fields only for organisations', async () => {
    const user = userEvent.setup();
    renderSignUp();
    expect(screen.getByLabelText('Student number')).toBeInTheDocument();
    expect(screen.getByLabelText('University email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Organisation name')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Organisation/, { selector: 'input[type="radio"]' }));
    expect(screen.getByLabelText('Organisation name')).toBeInTheDocument();
    expect(screen.getByLabelText(/MoU reference/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Student number')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/Member of the public/));
    expect(screen.queryByLabelText('Student number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Organisation name')).not.toBeInTheDocument();
  });

  it('will not create an account until the general rules are accepted', async () => {
    const user = userEvent.setup();
    renderSignUp();
    await user.click(screen.getByLabelText(/Member of the public/));
    await fillCommonFields(user, 'rules.check@example.com');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Accept the UniPod general rules to continue.')).toBeInTheDocument();
    expect(screen.queryByText(/You're signed up/)).not.toBeInTheDocument();
  });

  it('asks for the student number and course for a student', async () => {
    const user = userEvent.setup();
    renderSignUp();
    await fillCommonFields(user, 'student.missing@example.com');
    await user.click(screen.getByLabelText(/accept the UniPod general rules/));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter your student number.')).toBeInTheDocument();
    expect(screen.getByText('Enter your course.')).toBeInTheDocument();
  });

  it('creates a student account, then refuses the same email a second time', async () => {
    const user = userEvent.setup();
    const { unmount } = renderSignUp();
    await fillCommonFields(user, 'new.student@example.com');
    await user.type(screen.getByLabelText('Student number'), 'S26/0001');
    await user.type(screen.getByLabelText('Course'), 'BSc Computer Science');
    await user.click(screen.getByLabelText(/accept the UniPod general rules/));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/You're signed up/)).toBeInTheDocument();
    unmount();

    renderSignUp();
    await fillCommonFields(user, 'new.student@example.com');
    await user.type(screen.getByLabelText('Student number'), 'S26/0001');
    await user.type(screen.getByLabelText('Course'), 'BSc Computer Science');
    await user.click(screen.getByLabelText(/accept the UniPod general rules/));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
  });
});
