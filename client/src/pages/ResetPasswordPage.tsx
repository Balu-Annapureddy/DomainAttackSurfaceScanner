import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle, AlertTriangle, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { resetPassword } from '../lib/api';
import WorkstationNav from '../components/WorkstationNav';
import { ACCOUNTS_ENABLED } from '../config';
import AccountsPausedCard from '../components/AccountsPausedCard';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!ACCOUNTS_ENABLED) {
    return <AccountsPausedCard title="Password Reset Paused" />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!token) {
      setError('Password reset token is missing from the URL. Please verify your recovery link.');
      return;
    }

    if (!password || password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    } else {
      setConfirmPasswordError(null);
    }

    if (hasError) return;

    try {
      setLoading(true);
      setError(null);
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] console-panel p-6 sm:p-8 rounded-xs font-mono text-xs border border-[var(--border-technical)] bg-[var(--bg-panel)]">
          {/* Header */}
          <div className="border-b border-[var(--border-technical)] pb-3 mb-5">
            <div className="flex items-center gap-1.5 text-[var(--accent-primary)] text-xs font-bold uppercase tracking-wider mb-1 font-mono">
              <Lock size={14} />
              <span>SECURITY CREDENTIALS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)]">
              Establish new password
            </h1>
          </div>

          {!token && (
            <div
              role="alert"
              className="mb-4 p-3 border border-[var(--sev-medium)] bg-[var(--bg-panel-subtle)] text-[var(--sev-medium)] rounded-xs flex items-start gap-2 text-xs"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Reset token is missing from this link. Please request a new recovery link.</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 border border-[var(--sev-high)] bg-[var(--bg-panel-subtle)] text-[var(--sev-high)] rounded-xs flex items-start gap-2 text-xs"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="p-4 border border-[var(--accent-primary)] bg-[var(--bg-panel-subtle)] text-[var(--text-primary)] rounded-xs flex items-start gap-3">
                <CheckCircle size={18} className="shrink-0 mt-0.5 text-[var(--accent-primary)]" />
                <div className="space-y-1">
                  <span className="font-bold block text-[var(--text-primary)]">CREDENTIALS UPDATED</span>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    Your password has been changed successfully. All previous active sessions across all devices have been terminated.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="console-btn console-btn-primary w-full h-[40px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 rounded-xs"
                >
                  <span>SIGN IN WITH NEW PASSWORD</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                Specify a strong password with at least 8 characters. Resetting your password will automatically log out all active sessions.
              </p>

              <div>
                <label htmlFor="new-password" className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className={`console-input h-10 pr-10 ${
                      passwordError ? 'border-[var(--sev-high)] focus:border-[var(--sev-high)] ring-1 ring-[var(--sev-high)]' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passwordError && (
                  <span className="text-[10px] text-[var(--sev-high)] mt-1 block font-mono">
                    {passwordError}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError(null);
                    }}
                    className={`console-input h-10 pr-10 ${
                      confirmPasswordError ? 'border-[var(--sev-high)] focus:border-[var(--sev-high)] ring-1 ring-[var(--sev-high)]' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <span className="text-[10px] text-[var(--sev-high)] mt-1 block font-mono">
                    {confirmPasswordError}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !token}
                className="console-btn console-btn-primary w-full h-[44px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer mt-2 rounded-xs"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>UPDATING CREDENTIALS…</span>
                  </>
                ) : (
                  <span>RESET &amp; SECURE ACCOUNT</span>
                )}
              </button>

              <div className="pt-3 border-t border-[var(--border-muted)] text-center text-[11px]">
                <Link to="/forgot-password" className="text-[var(--accent-primary)] hover:underline">
                  Request a new recovery link
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center bg-[var(--bg-canvas)]">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; ACCOUNT CREDENTIAL MANAGEMENT</span>
      </footer>
    </div>
  );
}
