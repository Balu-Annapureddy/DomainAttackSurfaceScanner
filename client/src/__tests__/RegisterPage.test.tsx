// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import * as api from '../lib/api';

vi.mock('../config', () => ({
  ACCOUNTS_ENABLED: true,
}));

vi.mock('../lib/api', () => ({
  getAuthStatus: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  deleteAccount: vi.fn(),
  verifyEmailToken: vi.fn(),
  resendVerification: vi.fn(),
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/history" element={<div>Workstation History Console</div>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('RegisterPage confirmation flow', () => {
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

  it('renders registration form and transitions to confirmation screen upon registration', async () => {
    vi.mocked(api.registerUser).mockResolvedValue({
      user: {
        id: 'user-xyz',
        email: 'operator@cybersec.org',
        createdAt: new Date().toISOString(),
        emailVerified: false,
      },
      quota: {
        used: 0,
        limit: 5,
        remaining: 5,
        resetsInSeconds: 3600,
        isRegistered: true,
      },
    });

    renderRegisterPage();

    expect(screen.getByText(/REGISTER WORKSTATION ACCOUNT/i)).toBeDefined();

    const emailInput = screen.getByLabelText(/Account Email/i);
    const passwordInput = screen.getByLabelText(/^Password/i);
    const confirmPasswordInput = screen.getByLabelText(/^Confirm Password$/i);
    const submitBtn = screen.getByRole('button', { name: /CREATE FREE ACCOUNT/i });

    fireEvent.change(emailInput, { target: { value: 'operator@cybersec.org' } });
    fireEvent.change(passwordInput, { target: { value: 'Secur3Password!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Secur3Password!' } });

    fireEvent.click(submitBtn);

    // After registration, verify confirmation screen displays the email and instructions
    await waitFor(() => {
      expect(screen.getByText(/REGISTRATION COMPLETE/i)).toBeDefined();
    });

    expect(screen.getByText(/Check Your Inbox/i)).toBeDefined();
    expect(screen.getAllByText(/operator@cybersec.org/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/We sent a verification link to/i)).toBeDefined();

    // Verify secondary link to history
    const continueLink = screen.getByRole('link', { name: /Continue without verifying \(5 scans\/hr\)/i });
    expect(continueLink).toBeDefined();
    expect(continueLink.getAttribute('href')).toBe('/history');
  });
});
