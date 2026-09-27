import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Shield, CheckCircle, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WorkstationNav from '../components/WorkstationNav';
import { ACCOUNTS_ENABLED } from '../config';
import AccountsPausedCard from '../components/AccountsPausedCard';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isVerifiedSuccess = searchParams.get('verified') === 'true';
  const isVerifiedError = searchParams.get('verified') === 'false';

  if (!ACCOUNTS_ENABLED) {
    return <AccountsPausedCard title="Operator Login Paused" />;
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

    if (!password) {
      setPasswordError('Password cannot be empty');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) return;

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-panel-subtle)] workstation-grid-bg text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px] console-panel shadow-2xl p-6 sm:p-8 rounded-xl font-mono text-xs border border-[var(--border-technical)] bg-[var(--bg-panel)]">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--border-technical)] pb-3 mb-5">
            <LogIn size={16} className="text-[var(--accent-primary)]" />
            <h1 className="text-sm font-bold tracking-wider uppercase text-[var(--text-primary)]">
              OPERATOR AUTHENTICATION
            </h1>
          </div>

          {isVerifiedSuccess && (
            <div
              role="status"
              className="mb-4 p-3 border border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-start gap-2 text-xs"
            >
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>Email verified successfully! You can now log in to access your 50 scans/hr quota allocation.</span>
            </div>
          )}

          {isVerifiedError && (
            <div
              role="alert"
              className="mb-4 p-3 border border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-start gap-2 text-xs"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Verification link is invalid or has expired. You can sign in and request a new verification email.</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 border border-[#dc2626] dark:border-[#ff4d5e] bg-[#dc2626]/10 dark:bg-[#ff4d5e]/10 text-[#dc2626] dark:text-[#ff4d5e] rounded-lg flex items-start gap-2 text-xs"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase">
                Account Email
              </label>
              <input
                id="login-email"
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
                  emailError ? 'border-[#dc2626] focus:border-[#dc2626] ring-1 ring-[#dc2626]' : ''
                }`}
              />
              {emailError && (
                <span className="text-[10px] text-[#dc2626] dark:text-[#ff4d5e] mt-1 block font-mono">
                  {emailError}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] text-[var(--accent-primary)] hover:underline font-mono"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className={`console-input h-10 pr-10 ${
                    passwordError ? 'border-[#dc2626] focus:border-[#dc2626] ring-1 ring-[#dc2626]' : ''
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
                <span className="text-[10px] text-[#dc2626] dark:text-[#ff4d5e] mt-1 block font-mono">
                  {passwordError}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="console-btn console-btn-primary w-full h-[44px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>AUTHENTICATING…</span>
                </>
              ) : (
                <span>SIGN IN TO WORKSTATION</span>
              )}
            </button>

            {/* Terms and Privacy persistent link */}
            <p className="text-center text-[10px] text-[var(--text-muted)] pt-1">
              By authenticating, you acknowledge our{' '}
              <Link to="/terms" className="underline hover:text-[var(--accent-primary)]">Terms</Link> and{' '}
              <Link to="/privacy" className="underline hover:text-[var(--accent-primary)]">Privacy Policy</Link>.
            </p>
          </form>

          {/* Registered Benefits Callout */}
          <div className="mt-6 pt-4 border-t border-[var(--border-muted)] space-y-2 text-[11px] text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Shield size={12} className="text-[var(--accent-primary)]" />
              <span>REGISTERED OPERATOR PRIVILEGES</span>
            </div>
            <ul className="space-y-1.5 text-[10px]">
              <li className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-[var(--accent-teal)] shrink-0" />
                <span>50 Scans per hour (vs. 5 for guests)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-[var(--accent-teal)] shrink-0" />
                <span>Persistent server-side scan history &amp; comparison</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-[var(--accent-teal)] shrink-0" />
                <span>Encrypted session tokens &amp; telemetry exports</span>
              </li>
            </ul>
          </div>

          {/* Register Link */}
          <div className="mt-4 pt-3 border-t border-[var(--border-muted)] text-center text-[11px]">
            <span className="text-[var(--text-muted)]">No account yet? </span>
            <Link to="/register" className="text-[var(--accent-primary)] hover:underline font-bold">
              Register for Free
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
