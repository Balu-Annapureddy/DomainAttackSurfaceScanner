// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VerifyPage from '../pages/VerifyPage';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  getAuthStatus: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  deleteAccount: vi.fn(),
  verifyEmailToken: vi.fn(),
  resendVerification: vi.fn(),
}));

function renderVerifyPage(initialUrl: string) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/history" element={<div>Workstation History Console</div>} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('VerifyPage states and workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAuthStatus).mockResolvedValue({
      user: null,
      quota: {
        used: 0,
        limit: 5,
        remaining: 5,
        resetsInSeconds: 3600,
        isRegistered: false,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders neutral state when navigated to without token or status parameter', async () => {
    renderVerifyPage('/verify');

    expect(await screen.findByTestId('verify-neutral')).toBeDefined();
    expect(screen.getByText(/EMAIL VERIFICATION/i)).toBeDefined();
    expect(screen.getByText(/Confirm Your Email Address/i)).toBeDefined();
    expect(screen.getByText(/We sent a verification link to your registered email address/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /RESEND VERIFICATION LINK/i })).toBeDefined();

    // Must NOT display error or expired state
    expect(screen.queryByTestId('verify-error')).toBeNull();
    expect(screen.queryByText(/VERIFICATION EXPIRED OR INVALID/i)).toBeNull();
  });

  it('renders verified state when status=success query parameter is present', async () => {
    renderVerifyPage('/verify?status=success');

    expect(await screen.findByTestId('verify-success')).toBeDefined();
    expect(screen.getByText(/IDENTITY CONFIRMED/i)).toBeDefined();
    expect(screen.getByText(/Email Successfully Verified/i)).toBeDefined();
    expect(screen.getByText(/LAUNCH WORKSTATION CONSOLE/i)).toBeDefined();
    expect(screen.queryByTestId('verify-neutral')).toBeNull();
    expect(screen.queryByTestId('verify-error')).toBeNull();
  });

  it('renders error state when status=error query parameter is explicitly provided', async () => {
    renderVerifyPage('/verify?status=error');

    expect(await screen.findByTestId('verify-error')).toBeDefined();
    expect(screen.getByText(/VERIFICATION EXPIRED OR INVALID/i)).toBeDefined();
    expect(screen.getByText(/Unable to Verify Email/i)).toBeDefined();
    expect(screen.queryByTestId('verify-neutral')).toBeNull();
    expect(screen.queryByTestId('verify-success')).toBeNull();
  });

  it('handles active token verification lifecycle: shows loading then verified state on success', async () => {
    let resolveVerify: (value: { success: boolean; message: string }) => void = () => {};
    const verifyPromise = new Promise<{ success: boolean; message: string }>((resolve) => {
      resolveVerify = resolve;
    });
    vi.mocked(api.verifyEmailToken).mockReturnValue(verifyPromise);

    renderVerifyPage('/verify?token=sample-crypto-token-12345');

    // Should initially show loading state
    expect(screen.getByTestId('verify-loading')).toBeDefined();
    expect(screen.getByText(/VERIFYING OPERATOR CREDENTIALS…/i)).toBeDefined();

    // Resolve the verification API call
    resolveVerify({ success: true, message: 'Email verified' });

    // Transition to verified success state
    await waitFor(() => {
      expect(screen.getByTestId('verify-success')).toBeDefined();
    });
    expect(screen.getByText(/Email Successfully Verified/i)).toBeDefined();
  });

  it('handles active token verification rejection: transitions to error state with server message', async () => {
    vi.mocked(api.verifyEmailToken).mockRejectedValue(new Error('Invalid or expired verification token'));

    renderVerifyPage('/verify?token=corrupted-or-expired-token');

    await waitFor(() => {
      expect(screen.getByTestId('verify-error')).toBeDefined();
    });
    expect(screen.getByText(/Unable to Verify Email/i)).toBeDefined();
    expect(screen.getByText(/Invalid or expired verification token/i)).toBeDefined();
  });

  it('allows resending verification email from neutral state and shows success message', async () => {
    vi.mocked(api.resendVerification).mockResolvedValue({
      success: true,
      message: 'If an unverified account exists with this email, a fresh verification link has been sent.',
    });

    renderVerifyPage('/verify');

    expect(await screen.findByTestId('verify-neutral')).toBeDefined();

    const emailInput = screen.getByLabelText(/Account Email/i);
    fireEvent.change(emailInput, { target: { value: 'analyst@domain.com' } });

    const resendBtn = screen.getByRole('button', { name: /RESEND VERIFICATION LINK/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(screen.getByText(/A fresh verification link has been dispatched to your email address./i)).toBeDefined();
    });
    expect(api.resendVerification).toHaveBeenCalledWith('analyst@domain.com');
  });
});
