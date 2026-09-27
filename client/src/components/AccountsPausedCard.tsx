import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import WorkstationNav from './WorkstationNav';

interface AccountsPausedCardProps {
  title?: string;
}

export default function AccountsPausedCard({ title = 'Accounts Temporarily Paused' }: AccountsPausedCardProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-panel-subtle)] workstation-grid-bg text-[var(--text-primary)] font-sans flex flex-col">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] console-panel shadow-2xl p-6 sm:p-8 rounded-xl font-mono text-xs border border-[var(--border-technical)] bg-[var(--bg-panel)] text-center">
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
              <ShieldAlert size={32} />
            </div>

            <div>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                MAINTENANCE &middot; ONBOARDING PAUSED
              </span>
              <h1 className="text-lg font-extrabold text-[var(--text-primary)] mt-1">
                {title}
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-sans mt-3 leading-relaxed">
                Accounts are temporarily paused while we finish setting up email delivery — check back soon.
              </p>
            </div>

            <div className="p-3.5 bg-[var(--bg-panel-inset)] border border-[var(--border-technical)] rounded-lg text-left text-[11px] space-y-1 font-sans">
              <div className="font-bold text-[var(--text-primary)]">Public Reconnaissance Active</div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Passive reconnaissance and domain exposure inspection remain available without an account under the standard 5 scans/hour quota.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/"
                className="console-btn console-btn-primary w-full h-[44px] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                <span>RETURN TO SCANNER CONSOLE</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border-muted)] py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] text-center bg-[var(--bg-canvas)]">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; OPERATOR CONSOLE</span>
      </footer>
    </div>
  );
}
