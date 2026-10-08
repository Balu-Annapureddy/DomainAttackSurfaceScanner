import { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { getPrioritizedAttentionList } from '../lib/narrativeSummary';

interface WhatNeedsAttentionProps {
  scan: DomainScan;
  onOpenGlossary?: (termKey: string) => void;
}

export default function WhatNeedsAttention({ scan, onOpenGlossary }: WhatNeedsAttentionProps) {
  const attentionItems = getPrioritizedAttentionList(scan);
  const [expandedId, setExpandedId] = useState<string | null>(
    attentionItems.length > 0 && attentionItems[0] ? attentionItems[0].id : null,
  );

  if (attentionItems.length === 0) {
    return (
      <section aria-labelledby="attention-heading" className="w-full">
        <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl p-6 text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788] mb-1">
            <CheckCircle2 size={28} />
          </div>
          <h2 id="attention-heading" className="text-lg font-bold text-[var(--text-primary)]">
            No Security Weaknesses Observed
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            All publicly observable controls for this domain—including encryption, certificate validity, and DNS settings—matched expected defense standards.
          </p>
        </div>
      </section>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section aria-labelledby="attention-heading" className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[var(--border-technical)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              Priority Action Items
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] text-[var(--text-secondary)] font-medium">
              {attentionItems.length} Item{attentionItems.length === 1 ? '' : 's'} to Review
            </span>
          </div>
          <h2 id="attention-heading" className="text-xl sm:text-2xl font-display italic font-normal text-[var(--text-primary)] mt-0.5">
            What Needs Your Attention
          </h2>
        </div>
        <div className="flex flex-col sm:items-end gap-1">
          <p className="text-xs text-[var(--text-muted)] max-w-md">
            Issues are prioritized by potential impact. Addressing higher-priority items first will yield the greatest security improvement.
          </p>
          {onOpenGlossary && (
            <button
              type="button"
              onClick={() => onOpenGlossary('passive_osint')}
              className="text-xs text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <HelpCircle size={12} />
              <span>How findings are verified</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {attentionItems.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          const isHigh = item.severity === 'high';
          const isMedium = item.severity === 'medium';

          return (
            <div
              key={item.id}
              className={`bg-[var(--bg-panel)] border rounded-xl overflow-hidden transition-all duration-200 ${
                isHigh
                  ? 'border-red-300 dark:border-red-900/60 shadow-xs'
                  : isMedium
                  ? 'border-amber-300 dark:border-amber-900/60'
                  : 'border-[var(--border-technical)]'
              }`}
            >
              {/* Card Header Clickable Row */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="w-full p-4 sm:p-5 flex items-start justify-between gap-4 text-left cursor-pointer hover:bg-[var(--bg-panel-subtle)] transition"
                aria-expanded={isExpanded}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5 shrink-0">
                    {isHigh ? (
                      <ShieldAlert className="text-red-600 dark:text-red-400" size={18} />
                    ) : isMedium ? (
                      <AlertTriangle className="text-amber-600 dark:text-amber-400" size={18} />
                    ) : (
                      <Info className="text-blue-600 dark:text-blue-400" size={18} />
                    )}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${item.severityBadgeColor}`}>
                        {item.severity.toUpperCase()} PRIORITY
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-mono">
                        Item #{idx + 1}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] leading-snug">
                      {item.title}
                    </h3>

                    {!isExpanded && (
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed pt-0.5">
                        {item.whatWeFound}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 p-1 rounded-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Expanded Card Details */}
              {isExpanded && (
                <div className="border-t border-[var(--border-muted)] p-5 sm:p-6 bg-[var(--bg-panel-inset)] space-y-4 text-xs sm:text-sm">
                  {/* 1. What We Found */}
                  <div className="space-y-1">
                    <div className="font-bold text-[var(--text-primary)] font-mono text-[11px] uppercase tracking-wider">
                      What Was Observed
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {item.whatWeFound}
                    </p>
                  </div>

                  {/* 2. What This Means */}
                  <div className="space-y-1">
                    <div className="font-bold text-[var(--text-primary)] font-mono text-[11px] uppercase tracking-wider">
                      What This Means In Plain English
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {item.whatThisMeans}
                    </p>
                  </div>

                  {/* 3. Why It Matters & Potential Risk */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-muted)] space-y-1">
                      <div className="font-bold text-[var(--text-primary)] font-mono text-[11px] uppercase tracking-wider">
                        Why This Matters
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {item.whyThisMatters}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-muted)] space-y-1">
                      <div className="font-bold text-[var(--text-primary)] font-mono text-[11px] uppercase tracking-wider">
                        How Serious Is This?
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {item.howSeriousIsIt}
                      </p>
                    </div>
                  </div>

                  {/* 4. Recommended Action */}
                  <div className="p-4 rounded-lg bg-[var(--accent-active-bg)] border border-[var(--accent-primary)]/30 space-y-1.5">
                    <div className="font-bold text-[var(--accent-primary)] font-mono text-xs uppercase tracking-wider">
                      Recommended Action
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-medium">
                      {item.whatYouShouldDo}
                    </p>
                  </div>

                  {/* 5. How DASS Discovered This (Evidence) */}
                  <div className="pt-2 border-t border-[var(--border-muted)] text-xs text-[var(--text-muted)] space-y-1">
                    <div className="font-mono text-[10px] uppercase font-bold text-[var(--text-muted)]">
                      Evidence Source
                    </div>
                    <p className="font-mono text-[11px] text-[var(--text-secondary)] bg-[var(--bg-panel)] p-2 rounded-sm border border-[var(--border-muted)]">
                      {item.howWeKnow}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
