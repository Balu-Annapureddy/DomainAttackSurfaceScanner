import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WorkstationNav from '../components/WorkstationNav';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your email and password');
      return;
    }

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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md console-panel shadow-2xl p-6 font-mono text-xs">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-[var(--border-technical)] pb-3 mb-4">
            <LogIn size={15} className="text-[var(--accent-primary)]" />
            <h1 className="text-sm font-bold tracking-wider uppercase text-[var(--text-primary)]">
              OPERATOR AUTHENTICATION
            </h1>
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
              <label htmlFor="login-email" className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">
                Account Email
              </label>
              <input
                id="login-email"
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
              <label htmlFor="login-password" className="block text-[11px] text-[var(--text-secondary)] mb-1 uppercase">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="console-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="console-btn console-btn-primary w-full py-2 text-xs font-bold"
            >
              {loading ? '[AUTHENTICATING…]' : '[SIGN IN TO WORKSTATION]'}
            </button>
          </form>

          {/* Registered Benefits Callout */}
          <div className="mt-6 pt-4 border-t border-[var(--border-muted)] space-y-2 text-[11px] text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Shield size={12} className="text-[var(--accent-primary)]" />
              <span>REGISTERED OPERATOR PRIVILEGES</span>
            </div>
            <ul className="space-y-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle size={10} className="text-[var(--accent-primary)]" />
                <span>50 Scans per hour (vs. 5 for guests)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle size={10} className="text-[var(--accent-primary)]" />
                <span>Persistent server-side scan history</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle size={10} className="text-[var(--accent-primary)]" />
                <span>Multi-scan chronological perimeter comparison</span>
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
      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; </span>
        <Link to="/privacy" className="hover:text-[var(--accent-primary)]">Privacy Policy</Link>
        <span> &middot; </span>
        <Link to="/terms" className="hover:text-[var(--accent-primary)]">Terms of Use</Link>
      </footer>
    </div>
  );
}
