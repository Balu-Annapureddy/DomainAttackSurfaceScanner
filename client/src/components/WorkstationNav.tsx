import { Link, useLocation } from 'react-router-dom';
import { Shield, Sun, Moon, LogIn, UserPlus, LogOut, User, Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface WorkstationNavProps {
  onOpenGlossary?: (termKey?: string) => void;
}

export default function WorkstationNav({ onOpenGlossary }: WorkstationNavProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, quota, logout } = useAuth();
  const location = useLocation();

  const isCurrent = (path: string) => location.pathname === path;

  return (
    <nav
      aria-label="Workstation Top Navigation"
      className="border-b border-[#1d332e] bg-[var(--bg-panel)] px-4 py-2 font-mono text-xs transition-colors duration-150"
    >
      <div className="mx-auto max-w-[1720px] flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Terminal Identifier */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold tracking-wider text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Shield size={14} className="text-[var(--accent-primary)]" />
            <span>DOMAIN ATTACK SURFACE SCANNER</span>
          </Link>
          <span className="hidden lg:inline text-[10px] text-[var(--text-muted)] border-l border-[var(--border-muted)] pl-2">
            INTELLIGENCE WORKSTATION v2.0
          </span>
        </div>

        {/* Center / Navigation Links */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className={`px-2 py-0.5 rounded-xs transition-colors ${
              isCurrent('/')
                ? 'text-[var(--accent-primary)] bg-[var(--accent-active-bg)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            [CONSOLE]
          </Link>
          <Link
            to="/history"
            className={`px-2 py-0.5 rounded-xs transition-colors ${
              isCurrent('/history')
                ? 'text-[var(--accent-primary)] bg-[var(--accent-active-bg)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            [HISTORY]
          </Link>
          {onOpenGlossary && (
            <button
              type="button"
              onClick={() => onOpenGlossary('attack_surface')}
              className="px-2 py-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              [FIELD MANUAL]
            </button>
          )}
        </div>

        {/* Right Section: Quota, Auth, & Theme */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quota Badge */}
          {quota && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 border text-[11px] rounded-xs ${
                quota.isRegistered
                  ? 'border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] text-[var(--text-primary)]'
                  : 'border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-secondary)]'
              }`}
              title={
                quota.isRegistered
                  ? `Registered Quota: ${quota.used} consumed of ${quota.limit} per hour`
                  : `Guest Quota: ${quota.used} consumed of ${quota.limit} per hour. Create a free account for higher allowances!`
              }
            >
              <Activity size={11} className={quota.isRegistered ? 'text-[var(--accent-primary)]' : 'text-[#d29922]'} />
              <span>
                {quota.isRegistered ? 'QUOTA:' : 'GUEST:'} {quota.used}/{quota.limit}
              </span>
              {!quota.isRegistered && (
                <Link
                  to="/register"
                  className="text-[var(--accent-primary)] hover:underline ml-1 font-bold"
                >
                  [+50/hr]
                </Link>
              )}
            </div>
          )}

          {/* User Account Controls */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[11px] text-[var(--text-secondary)] truncate max-w-[140px]" title={user.email}>
                <User size={11} className="inline mr-1 text-[var(--accent-primary)]" />
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                className="console-btn py-0.5 px-2 text-[11px]"
                title="Log out of account"
              >
                <LogOut size={11} />
                <span className="hidden sm:inline">LOGOUT</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to="/login"
                className="console-btn py-0.5 px-2 text-[11px]"
              >
                <LogIn size={11} />
                <span>LOGIN</span>
              </Link>
              <Link
                to="/register"
                className="console-btn console-btn-primary py-0.5 px-2 text-[11px]"
              >
                <UserPlus size={11} />
                <span className="hidden sm:inline">REGISTER</span>
              </Link>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="console-btn py-0.5 px-2 text-[11px] text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            aria-label={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={11} className="text-[#eab308]" />
                <span className="hidden sm:inline">LIGHT</span>
              </>
            ) : (
              <>
                <Moon size={11} className="text-[#0ea5e9]" />
                <span className="hidden sm:inline">DARK</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
