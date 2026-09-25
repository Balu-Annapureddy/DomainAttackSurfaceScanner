import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Shield, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WorkstationNav from '../components/WorkstationNav';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide an email and password');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await register(email, password);
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md console-panel shadow-2xl p-6 font-mono text-xs">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--border-technical)] pb-3 mb-4">
            <UserPlus size={15} className="text-[var(--accent-primary)]" />
            <h1 className="text-sm font-bold tracking-wider uppercase text-[var(--text-primary)]">
              REGISTER WORKSTATION ACCOUNT
            </h1>
          </div>

          {/* Data Minimization Notice */}
          <div className="mb-4 p-2.5 bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] text-[11px] text-[var(--text-secondary)] space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <Lock size={11} className="text-[var(--accent-primary)]" />
              <span>PRIVACY & DATA MINIMIZATION NOTICE</span>
            </div>
            <p>
              We only store your email and a cryptographically salted password hash (Scrypt). We do not collect phone numbers, real names, or billing info.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 border border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444] flex items-start gap-2 text-xs"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-email" className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">
                Account Email
              </label>
              <input
                id="reg-email"
                type="email"
                required
                autoComplete="email"
                placeholder="analyst@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="console-input"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">
                Password (min 8 characters)
              </label>
              <input
                id="reg-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="console-input"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">
                Confirm Password
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="console-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="console-btn console-btn-primary w-full py-2 text-xs font-bold"
            >
              {loading ? '[CREATING ACCOUNT…]' : '[CREATE FREE ACCOUNT]'}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-5 pt-3 border-t border-[var(--border-muted)] space-y-1 text-[11px] text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Shield size={12} className="text-[var(--accent-primary)]" />
              <span>INSTANT BENEFITS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={10} className="text-[var(--accent-primary)]" />
              <span>Higher scan quota: 50 scans per hour</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle size={10} className="text-[var(--accent-primary)]" />
              <span>Persistent cloud scan history and comparison</span>
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
      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; </span>
        <Link to="/privacy" className="hover:text-[var(--accent-primary)]">Privacy Policy</Link>
        <span> &middot; </span>
        <Link to="/terms" className="hover:text-[var(--accent-primary)]">Terms of Use</Link>
      </footer>
    </div>
  );
}
