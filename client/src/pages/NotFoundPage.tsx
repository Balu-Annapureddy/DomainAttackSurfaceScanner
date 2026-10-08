import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import WorkstationNav from '../components/WorkstationNav';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md console-panel p-8 text-center space-y-4 rounded-xs border border-[var(--border-technical)] font-mono">
          <div className="w-12 h-12 rounded-xs bg-[var(--bg-panel-subtle)] text-[var(--accent-primary)] flex items-center justify-center mx-auto border border-[var(--border-technical)]">
            <Compass size={24} />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              404 // RESOURCE NOT LOCATED
            </div>
            <h1 className="text-2xl font-display italic font-normal tracking-tight text-[var(--text-primary)]">
              Endpoint not found
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed pt-1">
              The requested workstation path does not exist or may have been repositioned.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="console-btn console-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xs"
            >
              <ArrowLeft size={13} />
              <span>RETURN TO CONSOLE</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border-muted)] py-4 text-center text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-panel-subtle)]">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; 404 CATCH-ALL ROUTE</span>
      </footer>
    </div>
  );
}
