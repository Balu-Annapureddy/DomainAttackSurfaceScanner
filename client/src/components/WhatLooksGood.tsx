import { ShieldCheck, Lock, Globe, Mail, Shield } from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { getConfirmedProtectionsDetailed } from '../lib/narrativeSummary';

interface WhatLooksGoodProps {
  scan: DomainScan;
}

export default function WhatLooksGood({ scan }: WhatLooksGoodProps) {
  const protections = getConfirmedProtectionsDetailed(scan);

  if (protections.length === 0) {
    return (
      <section aria-labelledby="good-heading" className="w-full">
        <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl p-5 text-center space-y-2">
          <div className="text-xs text-[var(--text-muted)] font-mono">
            CONFIRMED DEFENSIVE CONTROLS
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            No confirmed defensive controls (such as active HTTPS enforcement, security headers, or email authentication records) were observed during this scan.
          </p>
        </div>
      </section>
    );
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'website security':
      case 'headers':
        return Lock;
      case 'certificates':
        return ShieldCheck;
      case 'email protection':
        return Mail;
      case 'domain & dns':
        return Globe;
      default:
        return Shield;
    }
  };

  return (
    <section aria-labelledby="good-heading" className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[var(--border-technical)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#52B788]">
              Confirmed Defenses
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] text-[var(--text-secondary)] font-medium">
              {protections.length} Protection{protections.length === 1 ? '' : 's'} Active
            </span>
          </div>
          <h2 id="good-heading" className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-0.5">
            What Looks Good
          </h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] max-w-md">
          These protective controls were successfully observed during the scan, confirming foundational security best practices.
        </p>
      </div>

      {/* Grid of Confirmed Protections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {protections.map((p, i) => {
          const Icon = getCategoryIcon(p.category);
          return (
            <div
              key={i}
              className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs hover:border-[#16a34a]/50 transition-colors"
            >
              <div className="p-2 rounded-lg bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788] shrink-0 mt-0.5">
                <Icon size={18} />
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                    {p.title}
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider shrink-0 bg-[var(--bg-panel-inset)] px-2 py-0.5 rounded-sm border border-[var(--border-muted)]">
                    {p.category}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {p.plainExplanation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
