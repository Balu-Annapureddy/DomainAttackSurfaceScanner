import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, ArrowLeft, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { forgotPassword } from '../lib/api';
import WorkstationNav from '../components/WorkstationNav';
import { ACCOUNTS_ENABLED } from '../config';
import AccountsPausedCard from '../components/AccountsPausedCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ACCOUNTS_ENABLED) {
    return <AccountsPausedCard title="Password Recovery Paused" />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError(null);

    try {
      setLoading(true);
      setError(null);
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit recovery request');
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
            <KeyRound size={16} className="text-[var(--accent-primary)]" />
            <h1 className="text-sm font-bold tracking-wider uppercase text-[var(--text-primary)]">
              PASSWORD RECOVERY
            </h1>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 border border-[#dc2626] dark:border-[#ff4d5e] bg-[#dc2626]/10 dark:bg-[#ff4d5e]/10 text-[#dc2626] dark:text-[#ff4d5e] rounded-lg flex items-start gap-2 text-xs"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="space-y-4">
              <div className="p-4 border border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-start gap-3">
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">RECOVERY INSTRUCTIONS DISPATCHED</span>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    If an operator account exists for <strong className="font-mono">{email}</strong>, a secure password reset link has been dispatched. The link is valid for 1 hour.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Be sure to check your spam/junk folder if the email does not appear in your inbox within a few minutes.
              </p>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="console-btn console-btn-primary w-full h-[40px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={13} />
                  <span>RETURN TO LOGIN</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans">
                Enter your registered operator email address. We will transmit a time-limited token to reset your credentials.
              </p>

              <div>
                <label htmlFor="recovery-email" className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 uppercase">
                  Account Email
                </label>
                <div className="relative">
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="analyst@organization.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    className={`console-input h-10 pr-9 ${
                      emailError ? 'border-[#dc2626] focus:border-[#dc2626] ring-1 ring-[#dc2626]' : ''
                    }`}
                  />
                  <Mail size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
                {emailError && (
                  <span className="text-[10px] text-[#dc2626] dark:text-[#ff4d5e] mt-1 block font-mono">
                    {emailError}
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
                    <span>DISPATCHING RECOVERY LINK…</span>
                  </>
                ) : (
                  <span>SEND PASSWORD RESET LINK</span>
                )}
              </button>

              <div className="pt-3 border-t border-[var(--border-muted)] text-center text-[11px]">
                <Link to="/login" className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 font-bold">
                  <ArrowLeft size={12} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center bg-[var(--bg-canvas)]">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; ACCOUNT RECOVERY</span>
      </footer>
    </div>
  );
}
