import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Shield,
  Sun,
  Moon,
  LogIn,
  UserPlus,
  LogOut,
  User,
  Activity,
  BookOpen,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface WorkstationNavProps {
  onOpenGlossary?: (termKey?: string) => void;
}

export default function WorkstationNav({ onOpenGlossary }: WorkstationNavProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, quota, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isCurrent = (path: string) => location.pathname === path;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <>
      {user && !user.emailVerified && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs text-amber-800 dark:text-amber-200 font-sans flex items-center justify-center gap-2">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span>Account unverified (5 scans/hr guest limit). <strong>Verify your email to unlock 50/hr</strong>.</span>
          <Link to="/verify" className="underline font-bold text-[var(--accent-primary)] hover:text-[var(--accent-hover)] ml-1">
            Verify email &rarr;
          </Link>
        </div>
      )}

      <nav
        aria-label="Workstation Top Navigation"
        className="border-b border-[var(--border-technical)] bg-[var(--bg-panel)] px-4 sm:px-6 py-2.5 font-sans text-xs transition-colors duration-150 sticky top-0 z-50 shadow-xs"
      >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
        {/* Brand & Workstation Status Identifier */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-active-bg)] text-[var(--accent-primary)] flex items-center justify-center border border-[var(--accent-primary)] border-opacity-30 group-hover:scale-105 transition-transform">
              <Shield size={17} />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight leading-tight">DAS Scanner</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono leading-none">Attack Surface OSINT</span>
            </div>
          </Link>
          
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] border-l border-[var(--border-muted)] pl-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium">Passive Recon Online</span>
          </div>
        </div>

        {/* Center / Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isCurrent('/')
                ? 'text-[var(--accent-primary)] bg-[var(--accent-active-bg)] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-subtle)]'
            }`}
          >
            Console
          </Link>
          <Link
            to="/history"
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isCurrent('/history')
                ? 'text-[var(--accent-primary)] bg-[var(--accent-active-bg)] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-subtle)]'
            }`}
          >
            History
          </Link>
          {onOpenGlossary && (
            <button
              type="button"
              onClick={() => onOpenGlossary('attack_surface')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-subtle)] cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <BookOpen size={13} className="text-[var(--accent-primary)]" />
              <span>Field Manual</span>
            </button>
          )}
        </div>

        {/* Right Section: Quota, Auth, Theme, & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quota Badge (Always Visible) */}
          {quota && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 border text-xs rounded-full shadow-xs ${
                quota.isRegistered
                  ? 'border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] text-[var(--text-primary)]'
                  : 'border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-secondary)]'
              }`}
              title={
                quota.isRegistered
                  ? `Registered Quota: ${quota.used} consumed of ${quota.limit} per hour`
                  : `Guest Quota: ${quota.used} consumed of ${quota.limit} per hour.`
              }
            >
              <Activity size={12} className={quota.isRegistered ? 'text-[var(--accent-teal)]' : 'text-amber-500'} />
              <span className="font-mono text-[11px] font-semibold">
                {quota.used}/{quota.limit}
              </span>
              {!quota.isRegistered && (
                <Link
                  to="/register"
                  className="hidden sm:inline text-[var(--accent-primary)] hover:underline ml-0.5 font-bold text-[10px]"
                >
                  +50
                </Link>
              )}
            </div>
          )}

          {/* Desktop User Account Controls */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] truncate max-w-[140px]" title={user.email}>
                  <User size={12} className="inline mr-1 text-[var(--accent-primary)]" />
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="console-btn py-1 px-2.5 text-xs flex items-center gap-1"
                  title="Log out of account"
                >
                  <LogOut size={12} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/login"
                  className="console-btn py-1 px-2.5 text-xs flex items-center gap-1"
                >
                  <LogIn size={12} />
                  <span>Login</span>
                </Link>
                <Link
                  to="/register"
                  className="console-btn-primary py-1 px-3 text-xs rounded-lg flex items-center gap-1 font-semibold"
                >
                  <UserPlus size={12} />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Theme Toggle Button (Always Visible) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="console-btn py-1 px-2.5 text-xs text-[var(--text-primary)] hover:border-[var(--accent-primary)] flex items-center gap-1"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            aria-label={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={13} className="text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon size={13} className="text-sky-500" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden console-btn p-1.5 text-[var(--text-primary)] hover:border-[var(--accent-primary)] cursor-pointer"
            aria-label="Toggle navigation drawer"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ─── Mobile Off-Canvas Drawer ────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-in Drawer */}
          <aside className="fixed inset-y-0 right-0 w-72 max-w-[85vw] bg-[var(--bg-panel)] border-l border-[var(--border-technical)] shadow-2xl p-6 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-muted)]">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-[var(--accent-primary)]" />
                  <span className="font-extrabold text-sm text-[var(--text-primary)]">Workstation Nav</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col space-y-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isCurrent('/')
                      ? 'bg-[var(--accent-active-bg)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Console Dashboard
                </Link>
                <Link
                  to="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isCurrent('/history')
                      ? 'bg-[var(--accent-active-bg)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Recon History
                </Link>
                {onOpenGlossary && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenGlossary('attack_surface');
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--text-primary)] text-left cursor-pointer transition-all"
                  >
                    <BookOpen size={16} className="text-[var(--accent-primary)]" />
                    <span>Field Manual</span>
                  </button>
                )}
              </nav>

              {/* Legal / Policy Links */}
              <div className="pt-4 border-t border-[var(--border-muted)] space-y-1 text-xs">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">Documentation &amp; Legal</div>
                <Link to="/privacy" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)]">
                  Privacy Policy
                </Link>
                <Link to="/terms" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)]">
                  Terms of Use
                </Link>
                <Link to="/security" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[var(--text-secondary)] hover:text-[var(--accent-primary)]">
                  Security Disclosure
                </Link>
              </div>
            </div>

            {/* Drawer Footer: User Profile / Auth */}
            <div className="pt-6 border-t border-[var(--border-muted)] space-y-3">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                    <User size={14} className="text-[var(--accent-primary)]" />
                    <span className="font-semibold truncate">{user.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void logout();
                    }}
                    className="w-full console-btn py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full console-btn py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <LogIn size={14} />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full console-btn-primary py-2 text-xs flex items-center justify-center gap-2 font-bold rounded-lg"
                  >
                    <UserPlus size={14} />
                    <span>Register Free (+50/hr)</span>
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </nav>
    </>
  );
}
