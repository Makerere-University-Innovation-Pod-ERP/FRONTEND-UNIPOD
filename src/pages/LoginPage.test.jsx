import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { backendApi } from '@/services/backend-api';
import { LoginPage } from './LoginPage';

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('LoginPage password visibility', () => {
  it('toggles the password between hidden and visible', async () => {
    const user = userEvent.setup();
    render(<LoginPage onLogin={vi.fn()} onCreateAccount={vi.fn()} />);
    const password = screen.getByLabelText('Password');

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('moves from email to password on Enter and submits when both are filled', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const login = vi.spyOn(backendApi, 'login').mockResolvedValue({
      tokenType: 'Bearer',
      accessToken: 'mock-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      mustChangePassword: false,
    });
    render(<LoginPage onLogin={onLogin} onCreateAccount={vi.fn()} />);
    const email = screen.getByLabelText('Email address');
    const password = screen.getByLabelText('Password');

    await user.type(email, 'person@example.test{Enter}');
    expect(password).toHaveFocus();
    await user.type(password, 'valid-password{Enter}');

    await waitFor(() => expect(login).toHaveBeenCalledWith('person@example.test', 'valid-password'));
    expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'mock-token' }));
  });

  it('requests a password reset and shows the same confirmation message', async () => {
    const user = userEvent.setup();
    render(<LoginPage onLogin={vi.fn()} onCreateAccount={vi.fn()} />);
    await user.type(screen.getByLabelText('Email address'), 'reset@example.test');
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(screen.getByLabelText('Email address')).toHaveValue('reset@example.test');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText('If an account exists for that email, a password reset link is on its way.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(screen.getByLabelText('Email address')).toHaveValue('reset@example.test');
  });
});
