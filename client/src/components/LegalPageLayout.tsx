import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Shield, BookOpen } from 'lucide-react';
import WorkstationNav from './WorkstationNav';

export interface TocItem {
  id: string;
  title: string;
}

interface LegalPageLayoutProps {
  category?: string;
  title: string;
  effectiveDate?: string;
  lastUpdated?: string;
  badge?: string;
  toc?: TocItem[];
  children: ReactNode;
}

export default function LegalPageLayout({
  category = 'LEGAL & COMPLIANCE // DISCLOSURE',
  title,
  effectiveDate = 'SEPTEMBER 25, 2026',
  lastUpdated = 'SEPTEMBER 25, 2026',
  badge = 'COMPLIANT ARCHITECTURE',
  toc = [],
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {/* Masthead */}
        <header className="border-b border-[var(--border-technical)] pb-6 mb-8 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-primary)] mb-1 uppercase tracking-wider">
            <Shield size={14} />
            <span>{category}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] font-sans">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-2">
            <span>EFFECTIVE: {effectiveDate}</span>
            <span>&middot;</span>
            <span>LAST UPDATED: {lastUpdated}</span>
            <span>&middot;</span>
            <span className="console-tag console-tag-cyan text-[10px]">{badge}</span>
          </div>
        </header>

        {/* Layout with Optional Table of Contents */}
        <div className="lg:grid lg:grid-cols-[240px_1fr] gap-8">
          {toc.length > 0 && (
            <aside className="mb-6 lg:mb-0">
              <div className="sticky top-6 console-panel p-4 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-muted)] pb-2 mb-2">
                  <BookOpen size={12} className="text-[var(--accent-primary)]" />
                  <span>TABLE OF CONTENTS</span>
                </div>
                <nav className="flex flex-wrap lg:flex-col gap-1 text-[11px]">
                  {toc.map((item, idx) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="px-2 py-1.5 rounded hover:bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] text-[var(--text-secondary)] transition truncate block"
                    >
                      <span className="text-[var(--text-muted)] mr-1.5 font-mono">{String(idx + 1).padStart(2, '0')}.</span>
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Prose Content: max 65-75ch line length */}
          <article className="max-w-[72ch] space-y-8 font-sans text-sm leading-relaxed text-[var(--text-primary)]">
            {children}
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-muted)] py-6 px-4 font-mono text-xs text-[var(--text-muted)] text-center bg-[var(--bg-panel-subtle)] mt-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>DOMAIN ATTACK SURFACE SCANNER</span>
          <div className="flex flex-wrap justify-center gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition">Privacy</Link>
            <Link to="/terms" className="hover:text-[var(--accent-primary)] transition">Terms</Link>
            <Link to="/cookies" className="hover:text-[var(--accent-primary)] transition">Cookies</Link>
            <Link to="/security" className="hover:text-[var(--accent-primary)] transition">Security</Link>
            <Link to="/billing" className="hover:text-[var(--accent-primary)] transition">Billing</Link>
          </div>
          <span className="text-[10px]">PASSIVE OSINT RECONNAISSANCE</span>
        </div>
      </footer>
    </div>
  );
}
