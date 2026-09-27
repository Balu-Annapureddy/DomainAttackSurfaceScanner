import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ShieldCheck, ArrowRight, Loader2, Mail } from 'lucide-react';
import { verifyEmailToken, resendVerification } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import WorkstationNav from '../components/WorkstationNav';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const statusParam = searchParams.get('status');

  const { user, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(Boolean(token && !statusParam));
  const [verified, setVerified] = useState(statusParam === 'success');
  const [error, setError] = useState<string | null>(statusParam === 'error' ? 'Invalid or expired verification link.' : null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
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
    try {
      setResending(true);
      setResendMessage(null);
      await resendVerification(user?.email);
      setResendMessage('A fresh verification link has been dispatched to your email address.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-panel-subtle)] workstation-grid-bg text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] console-panel shadow-2xl p-6 sm:p-8 rounded-xl font-mono text-xs border border-[var(--border-technical)] bg-[var(--bg-panel)] text-center">
          {loading ? (
            <div className="space-y-4 py-8">
              <Loader2 size={36} className="animate-spin text-[var(--accent-primary)] mx-auto" />
              <h1 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                VERIFYING OPERATOR CREDENTIALS…
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-sans">
                Validating verification cryptographic token against secure registry.
              </p>
            </div>
          ) : verified ? (
            <div className="space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle size={32} />
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                  IDENTITY CONFIRMED
                </span>
                <h1 className="text-lg font-extrabold text-[var(--text-primary)] mt-1">
                  Email Successfully Verified
                </h1>
                <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
                  Your operator account is now fully activated. Your sliding-window scan quota has been upgraded to <strong>50 scans/hour</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-[var(--bg-panel-inset)] border border-[var(--border-technical)] rounded-lg text-left text-[11px] space-y-1.5 font-sans">
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
                  className="console-btn console-btn-primary w-full h-[44px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2"
                >
                  <span>LAUNCH WORKSTATION CONSOLE</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                <AlertTriangle size={32} />
              </div>

              <div>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                  VERIFICATION EXPIRED OR INVALID
                </span>
                <h1 className="text-lg font-extrabold text-[var(--text-primary)] mt-1">
                  Unable to Verify Email
                </h1>
                <p className="text-xs text-[var(--text-secondary)] font-sans mt-2 leading-relaxed">
                  {error || 'The verification link you clicked may have expired (24h limit) or already been utilized.'}
                </p>
              </div>

              {resendMessage && (
                <div className="p-3 border border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-left text-[11px]">
                  {resendMessage}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="console-btn console-btn-primary w-full h-[42px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail size={13} />
                  <span>{resending ? 'DISPATCHING LINK…' : 'RESEND VERIFICATION LINK'}</span>
                </button>

                <Link
                  to="/login"
                  className="console-btn w-full h-[40px] text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <span>RETURN TO LOGIN</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center bg-[var(--bg-canvas)]">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; OPERATOR VERIFICATION</span>
      </footer>
    </div>
  );
}
