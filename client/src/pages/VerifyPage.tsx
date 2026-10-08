import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ShieldCheck, ArrowRight, Loader2, Mail } from 'lucide-react';
import { verifyEmailToken, resendVerification } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import WorkstationNav from '../components/WorkstationNav';
import { ACCOUNTS_ENABLED } from '../config';
import AccountsPausedCard from '../components/AccountsPausedCard';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const statusParam = searchParams.get('status');

  const { user, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(Boolean(token && !statusParam));
  const [verified, setVerified] = useState(statusParam === 'success');
  const [error, setError] = useState<string | null>(statusParam === 'error' ? 'Invalid or expired verification link.' : null);
  const [inputEmail, setInputEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const isVerified = statusParam === 'success' || verified;
  const isError = statusParam === 'error' || (Boolean(token) && Boolean(error));
  const isLoading = loading && !isVerified && !isError;
  const isNeutral = !isLoading && !isVerified && !isError;

  useEffect(() => {
    if (!ACCOUNTS_ENABLED) return;
    if (token && !statusParam) {
      let isMounted = true;
      verifyEmailToken(token)
        .then(() => {
          if (isMounted) {
            setVerified(true);
            void refreshAuth();
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Verification failed');
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [token, statusParam, refreshAuth]);

  const handleResend = async () => {
    const targetEmail = user?.email || inputEmail.trim();
    if (!targetEmail) {
      setResendError('Please enter the email address for your operator account.');
      return;
    }
    try {
      setResending(true);
      setResendMessage(null);
      setResendError(null);
      await resendVerification(targetEmail);
      setResendMessage('A fresh verification link has been dispatched to your email address.');
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Unable to resend email');
    } finally {
      setResending(false);
    }
  };

  if (!ACCOUNTS_ENABLED) {
    return <AccountsPausedCard title="Email Verification Paused" />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] console-panel p-6 sm:p-8 rounded-xs font-mono text-xs border border-[var(--border-technical)] bg-[var(--bg-panel)] text-center">
          {isLoading ? (
            <div className="space-y-4 py-8" data-testid="verify-loading">
              <Loader2 size={32} className="animate-spin text-[var(--accent-primary)] mx-auto" />
              <h1 className="text-xl font-display italic font-normal text-[var(--text-primary)]">
                Verifying operator credentials…
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-sans">
                Validating cryptographic token against the authentication registry.
              </p>
            </div>
          ) : isVerified ? (
            <div className="space-y-5" data-testid="verify-success">
              <div className="w-12 h-12 rounded-xs bg-[var(--bg-panel-subtle)] text-[var(--accent-primary)] flex items-center justify-center mx-auto border border-[var(--border-technical)]">
                <CheckCircle size={24} />
              </div>

              <div>
                <span className="text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block">
                  IDENTITY CONFIRMED
                </span>
                <h1 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-1">
                  Email successfully verified
                </h1>
                <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
                  Your operator account is now fully activated. Your quota allocation is upgraded to <strong>50 scans/hour</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-[var(--bg-panel-inset)] border border-[var(--border-technical)] rounded-xs text-left text-[11px] space-y-1.5 font-sans">
                <div className="font-bold flex items-center gap-1.5 text-[var(--accent-primary)]">
                  <ShieldCheck size={14} />
                  <span>UNLOCKED CAPABILITIES</span>
                </div>
                <ul className="space-y-1 text-[11px] text-[var(--text-secondary)] list-disc pl-4">
                  <li>50 high-budget scans per hour</li>
                  <li>Persistent cloud recon archives</li>
                  <li>Cross-scan telemetry comparison</li>
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  to="/history"
                  className="console-btn console-btn-primary w-full h-[40px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 rounded-xs"
                >
                  <span>LAUNCH WORKSTATION CONSOLE</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : isNeutral ? (
            <div className="space-y-5" data-testid="verify-neutral">
              <div className="w-12 h-12 rounded-xs bg-[var(--bg-panel-subtle)] text-[var(--accent-primary)] flex items-center justify-center mx-auto border border-[var(--border-technical)]">
                <Mail size={24} />
              </div>

              <div>
                <span className="text-[11px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block">
                  EMAIL VERIFICATION
                </span>
                <h1 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-1">
                  Confirm your email address
                </h1>
                <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
                  We sent a verification link to your registered email address. Click the link to activate your 50 scans/hour quota.
                </p>
              </div>

              {user?.email ? (
                <div className="p-3 bg-[var(--bg-panel-subtle)] border border-[var(--border-technical)] rounded-xs text-left text-xs font-mono text-[var(--text-secondary)]">
                  <div className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Active Account</div>
                  <div className="text-[var(--text-primary)] font-bold truncate mt-0.5">{user.email}</div>
                  <div className="text-[10px] text-[var(--sev-medium)] mt-1">Status: Pending Verification</div>
                </div>
              ) : (
                <div className="text-left space-y-1">
                  <label htmlFor="verify-email-input" className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                    Account Email
                  </label>
                  <input
                    id="verify-email-input"
                    type="email"
                    placeholder="analyst@organization.com"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="console-input h-10 w-full"
                  />
                </div>
              )}

              {resendMessage && (
                <div role="status" className="p-3 border border-[var(--accent-primary)] bg-[var(--bg-panel-subtle)] text-[var(--text-primary)] rounded-xs text-left text-[11px]">
                  {resendMessage}
                </div>
              )}

              {resendError && (
                <div role="alert" className="p-3 border border-[var(--sev-high)] bg-[var(--bg-panel-subtle)] text-[var(--sev-high)] rounded-xs text-left text-[11px]">
                  {resendError}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="console-btn console-btn-primary w-full h-[40px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer rounded-xs"
                >
                  <Mail size={13} />
                  <span>{resending ? 'DISPATCHING LINK…' : 'RESEND VERIFICATION LINK'}</span>
                </button>

                {user ? (
                  <Link
                    to="/history"
                    className="console-btn w-full h-[38px] text-xs font-semibold flex items-center justify-center gap-2 rounded-xs"
                  >
                    <span>CONTINUE TO WORKSTATION (5 SCANS/HR)</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="console-btn w-full h-[38px] text-xs font-semibold flex items-center justify-center gap-2 rounded-xs"
                  >
                    <span>RETURN TO LOGIN</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5" data-testid="verify-error">
              <div className="w-12 h-12 rounded-xs bg-[var(--bg-panel-subtle)] text-[var(--sev-medium)] flex items-center justify-center mx-auto border border-[var(--border-technical)]">
                <AlertTriangle size={24} />
              </div>

              <div>
                <span className="text-[11px] font-bold text-[var(--sev-medium)] uppercase tracking-wider block">
                  VERIFICATION EXPIRED OR INVALID
                </span>
                <h1 className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-1">
                  Unable to verify email
                </h1>
                <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
                  {error || 'The verification link you clicked may have expired (24h limit) or already been utilized.'}
                </p>
              </div>

              {!user && (
                <div className="text-left space-y-1">
                  <label htmlFor="resend-error-email" className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase">
                    Account Email
                  </label>
                  <input
                    id="resend-error-email"
                    type="email"
                    placeholder="analyst@organization.com"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    className="console-input h-10 w-full"
                  />
                </div>
              )}

              {resendMessage && (
                <div role="status" className="p-3 border border-[var(--accent-primary)] bg-[var(--bg-panel-subtle)] text-[var(--text-primary)] rounded-xs text-left text-[11px]">
                  {resendMessage}
                </div>
              )}

              {resendError && (
                <div role="alert" className="p-3 border border-[var(--sev-high)] bg-[var(--bg-panel-subtle)] text-[var(--sev-high)] rounded-xs text-left text-[11px]">
                  {resendError}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="console-btn console-btn-primary w-full h-[40px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer rounded-xs"
                >
                  <Mail size={13} />
                  <span>{resending ? 'DISPATCHING LINK…' : 'RESEND VERIFICATION LINK'}</span>
                </button>

                <Link
                  to="/login"
                  className="console-btn w-full h-[38px] text-xs font-semibold flex items-center justify-center gap-2 rounded-xs"
                >
                  <span>RETURN TO LOGIN</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center bg-[var(--bg-canvas)]">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; OPERATOR VERIFICATION</span>
      </footer>
    </div>
  );
}
