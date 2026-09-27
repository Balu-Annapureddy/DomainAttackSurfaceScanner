// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import VerifyPage from '../pages/VerifyPage';
import WorkstationNav from '../components/WorkstationNav';
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

describe('Accounts Frozen / Maintenance Mode', () => {
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

  const pausedMessageRegex = /Accounts are temporarily paused while we finish setting up email delivery — check back soon/i;

  it('renders paused maintenance message on /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(pausedMessageRegex)).toBeDefined();
    expect(screen.queryByLabelText(/Password/i)).toBeNull();
  });

  it('renders paused maintenance message on /register', () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(pausedMessageRegex)).toBeDefined();
    expect(screen.queryByLabelText(/Account Email/i)).toBeNull();
  });

  it('renders paused maintenance message on /forgot-password', () => {
    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(pausedMessageRegex)).toBeDefined();
  });

  it('renders paused maintenance message on /reset-password', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=some-token']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(pausedMessageRegex)).toBeDefined();
  });

  it('renders paused maintenance message on /verify', () => {
    render(
      <MemoryRouter initialEntries={['/verify']}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/verify" element={<VerifyPage />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(pausedMessageRegex)).toBeDefined();
  });

  it('hides Login and Register buttons in WorkstationNav when accounts are disabled', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <AuthProvider>
            <WorkstationNav />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /^Login$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Register$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Register Free/i })).toBeNull();
  });
});
