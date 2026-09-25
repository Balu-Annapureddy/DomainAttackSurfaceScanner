import { Link, useLocation } from 'react-router-dom';
import { Shield, Sun, Moon, LogIn, UserPlus, LogOut, User, Activity, BookOpen } from 'lucide-react';
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
      className="border-b border-[var(--border-technical)] bg-[var(--bg-panel)] px-4 sm:px-6 py-2.5 font-sans text-xs transition-colors duration-150 sticky top-0 z-50 shadow-xs"
    >
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Workstation Status Identifier */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold tracking-tight text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-[var(--accent-active-bg)] text-[var(--accent-primary)] flex items-center justify-center border border-[var(--accent-primary)] border-opacity-30 group-hover:scale-105 transition-transform">
              <Shield size={16} />
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

        {/* Center / Navigation Links */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isCurrent('/')
                ? 'text-[var(--accent-primary)] bg-[var(--accent-active-bg)] font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-subtle)]'
            }`}
          >
            Console
          </Link>
          <Link
            to="/history"
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-subtle)] cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <BookOpen size={13} className="text-[var(--accent-primary)]" />
              <span>Field Manual</span>
            </button>
          )}
        </div>

        {/* Right Section: Quota, Auth, & Theme */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quota Badge */}
          {quota && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 border text-xs rounded-md shadow-xs ${
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
              <Activity size={12} className={quota.isRegistered ? 'text-[var(--accent-primary)]' : 'text-amber-500'} />
              <span className="font-mono text-[11px]">
                {quota.used}/{quota.limit}
              </span>
              {!quota.isRegistered && (
                <Link
                  to="/register"
                  className="text-[var(--accent-primary)] hover:underline ml-1 font-bold text-[10px]"
                >
                  +50/hr
                </Link>
              )}
            </div>
          )}

          {/* User Account Controls */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-xs text-[var(--text-secondary)] truncate max-w-[140px]" title={user.email}>
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
                <span className="hidden sm:inline">Logout</span>
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
                className="console-btn-primary py-1 px-3 text-xs rounded-md flex items-center gap-1 font-semibold"
              >
                <UserPlus size={12} />
                <span className="hidden sm:inline">Register</span>
              </Link>
            </div>
          )}

          {/* Theme Toggle Button */}
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
        </div>
      </div>
    </nav>
  );
}
