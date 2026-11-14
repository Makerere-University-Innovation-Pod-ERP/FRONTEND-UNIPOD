import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpPage } from './SignUpPage';

function renderSignUp(onLogin = vi.fn()) {
  return {
    ...render(<SignUpPage onBackToSignIn={vi.fn()} onLogin={onLogin} />),
    onLogin,
  };
}

async function fillProfile(user, email, kind = 'student') {
  await user.type(screen.getByLabelText('Full name'), 'Test Person');
  await user.type(screen.getByLabelText(kind === 'student' ? 'University email' : 'Email address'), email);
  await user.type(screen.getByLabelText('Phone number'), '+256 700 000 000');
}

async function continueToStepTwo(user) {
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}

async function fillPasswordFields(user) {
  await user.type(screen.getByLabelText('Password'), 'a-secret-password');
  await user.type(screen.getByLabelText('Confirm password'), 'a-secret-password');
}

describe('Sign up', () => {
  it('shows student fields only for students and organisation fields only for organisations', async () => {
    const user = userEvent.setup();
    renderSignUp();
    expect(screen.getByLabelText('University email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Student number')).not.toBeInTheDocument();
    expect(screen.getByText('Your details')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Organisation/, { selector: 'input[type="radio"]' }));
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    await fillProfile(user, 'org@example.com', 'organisation');
    await continueToStepTwo(user);

    expect(screen.getByLabelText('Organisation name')).toBeInTheDocument();
    expect(screen.getByLabelText(/MoU reference/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Student number')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByLabelText(/Member of the public/));
    await continueToStepTwo(user);
    expect(screen.queryByLabelText('Student number')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Organisation name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('uses Enter to advance and remembers profile details when going back', async () => {
    const user = userEvent.setup();
    renderSignUp();
    await fillProfile(user, 'remember.me@example.com');
    await user.keyboard('{Enter}');

    expect(screen.getByLabelText('Student number')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Test Person');
    expect(screen.getByLabelText('University email')).toHaveValue('remember.me@example.com');
    expect(screen.getByLabelText('Phone number')).toHaveValue('+256 700 000 000');
  });

  it('will not create an account until the general rules are accepted', async () => {
    const user = userEvent.setup();
    renderSignUp();
    await user.click(screen.getByLabelText(/Member of the public/));
    await fillProfile(user, 'rules.check@example.com', 'public');
    await continueToStepTwo(user);
    await fillPasswordFields(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Accept the UniPod general rules to continue.')).toBeInTheDocument();
  });

  it('asks for the student number and course for a student', async () => {
    const user = userEvent.setup();
    renderSignUp();
    await fillProfile(user, 'student.missing@example.com');
    await continueToStepTwo(user);
    await fillPasswordFields(user);
    await user.click(screen.getByLabelText(/accept the UniPod general rules/));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter your student number.')).toBeInTheDocument();
    expect(screen.getByText('Enter your course.')).toBeInTheDocument();
  });

  it('toggles password and confirmation visibility independently', async () => {
    const user = userEvent.setup();
    renderSignUp();
    await fillProfile(user, 'visibility@example.com');
    await continueToStepTwo(user);

    const password = screen.getByLabelText('Password');
    const confirmation = screen.getByLabelText('Confirm password');
    expect(password).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show confirm password' }));
    expect(confirmation).toHaveAttribute('type', 'text');
  });

  it('creates a student account using one university email and refuses duplicate emails', async () => {
    const user = userEvent.setup();
    const { unmount, onLogin } = renderSignUp();
    await fillProfile(user, 'new.student@example.com');
    await continueToStepTwo(user);
    await user.type(screen.getByLabelText('Student number'), 'S26/0001');
    await user.type(screen.getByLabelText('Course'), 'BSc Computer Science');
    await fillPasswordFields(user);
    await user.click(screen.getByLabelText(/accept the UniPod general rules/));
    screen.getByLabelText('Confirm password').focus();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({
        roles: ['ROLE_SUBMITTER'],
        accessToken: expect.any(String),
      }));
    });
    unmount();

    renderSignUp();
    await fillProfile(user, 'new.student@example.com');
    await continueToStepTwo(user);
    await user.type(screen.getByLabelText('Student number'), 'S26/0001');
    await user.type(screen.getByLabelText('Course'), 'BSc Computer Science');
    await fillPasswordFields(user);
    await user.click(screen.getByLabelText(/accept the UniPod general rules/));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('An account with this email already exists.')).toBeInTheDocument();
  }, 10000);
});
