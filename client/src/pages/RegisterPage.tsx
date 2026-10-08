import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Shield, CheckCircle, AlertTriangle, Lock, Eye, EyeOff, Loader2, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WorkstationNav from '../components/WorkstationNav';
import { ACCOUNTS_ENABLED } from '../config';
import AccountsPausedCard from '../components/AccountsPausedCard';

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  if (!ACCOUNTS_ENABLED) {
    return <AccountsPausedCard title="Registration Temporarily Paused" />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    } else {
      setEmailError(null);
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
      await register(email, password);
      setRegisteredEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col">
        <WorkstationNav />

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-[460px] console-panel p-6 sm:p-8 rounded-xs font-mono text-xs border border-[var(--border-technical)] bg-[var(--bg-panel)] text-center">
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xs bg-[var(--bg-panel-subtle)] text-[var(--accent-primary)] flex items-center justify-center mx-auto border border-[var(--border-technical)]">
                <Mail size={24} />
              </div>

              <div>
                <span className="text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block">
                  REGISTRATION COMPLETE
                </span>
                <h1 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-1">
                  Check your inbox
                </h1>
                <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
                  We sent a verification link to <strong className="text-[var(--text-primary)] font-mono">{registeredEmail}</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-[var(--bg-panel-inset)] border border-[var(--border-technical)] rounded-xs text-left text-[11px] space-y-1.5 font-sans">
                <div className="font-bold flex items-center gap-1.5 text-[var(--accent-primary)]">
                  <Shield size={14} />
                  <span>UNVERIFIED ACCOUNT STATUS</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Click the confirmation link in your email to unlock your full registered allocation of <strong>50 scans/hour</strong> and persistent cloud history.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  to="/history"
                  className="console-btn console-btn-primary w-full h-[40px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-xs"
                >
                  <span>Continue without verifying (5 scans/hr)</span>
                  <ArrowRight size={14} />
                </Link>

                <div className="pt-1">
                  <Link
                    to="/verify"
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] underline font-mono"
                  >
                    Need another link? Open verification console
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center bg-[var(--bg-canvas)]">
          <span>DOMAIN ATTACK SURFACE SCANNER &middot; </span>
          <Link to="/privacy" className="hover:text-[var(--accent-primary)]">Privacy Policy</Link>
          <span> &middot; </span>
          <Link to="/terms" className="hover:text-[var(--accent-primary)]">Terms of Use</Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] console-panel p-6 sm:p-8 rounded-xs font-mono text-xs border border-[var(--border-technical)] bg-[var(--bg-panel)]">
          {/* Header */}
          <div className="border-b border-[var(--border-technical)] pb-3 mb-4">
            <div className="flex items-center gap-1.5 text-[var(--accent-primary)] text-xs font-bold uppercase tracking-wider mb-1 font-mono">
              <UserPlus size={14} />
              <span>ACCOUNT CREATION</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)]">
              Register workstation account
            </h1>
          </div>

          {/* Data Minimization Notice */}
          <div className="mb-4 p-2.5 bg-[var(--bg-panel-subtle)] border border-[var(--border-technical)] rounded-xs text-[11px] text-[var(--text-secondary)] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <Lock size={12} className="text-[var(--accent-primary)]" />
              <span>PRIVACY &amp; DATA MINIMIZATION NOTICE</span>
            </div>
            <p className="text-[10px] leading-relaxed">
              We only store your email and a salted password hash (Scrypt). We do not collect phone numbers, real names, or intrusive tracking profiles.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 border border-[var(--sev-high)] bg-[var(--bg-panel-subtle)] text-[var(--sev-high)] rounded-xs flex items-start gap-2 text-xs"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="reg-email" className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase">
                Account Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="analyst@organization.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                className={`console-input h-10 ${
                  emailError ? 'border-[var(--sev-high)] focus:border-[var(--sev-high)] ring-1 ring-[var(--sev-high)]' : ''
                }`}
              />
              {emailError && (
                <span className="text-[10px] text-[var(--sev-high)] mt-1 block font-mono">
                  {emailError}
                </span>
              )}
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <input
                  id="reg-password"
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
              <label htmlFor="reg-confirm-password" className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
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
              disabled={loading}
              className="console-btn console-btn-primary w-full h-[44px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer mt-2 rounded-xs"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>CREATING ACCOUNT…</span>
                </>
              ) : (
                <span>CREATE FREE ACCOUNT</span>
              )}
            </button>

            {/* Persistent Link to Terms/Privacy */}
            <p className="text-center text-[10px] text-[var(--text-muted)] pt-1">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="underline hover:text-[var(--accent-primary)]">Terms</Link> and{' '}
              <Link to="/privacy" className="underline hover:text-[var(--accent-primary)]">Privacy Policy</Link>.
            </p>
          </form>

          {/* Benefits */}
          <div className="mt-5 pt-3 border-t border-[var(--border-muted)] space-y-1.5 text-[11px] text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Shield size={12} className="text-[var(--accent-primary)]" />
              <span>INSTANT OPERATOR PRIVILEGES</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <CheckCircle size={11} className="text-[var(--accent-primary)] shrink-0" />
              <span>50 scans/hour quota allocation</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <CheckCircle size={11} className="text-[var(--accent-primary)] shrink-0" />
              <span>Persistent cloud scan history &amp; comparison</span>
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-4 pt-3 border-t border-[var(--border-muted)] text-center text-[11px]">
            <span className="text-[var(--text-muted)]">Already have an account? </span>
            <Link to="/login" className="text-[var(--accent-primary)] hover:underline font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center bg-[var(--bg-canvas)]">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; </span>
        <Link to="/privacy" className="hover:text-[var(--accent-primary)]">Privacy Policy</Link>
        <span> &middot; </span>
        <Link to="/terms" className="hover:text-[var(--accent-primary)]">Terms of Use</Link>
      </footer>
    </div>
  );
}
