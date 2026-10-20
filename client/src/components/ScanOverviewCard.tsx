import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Shield,
  HelpCircle,
  Lock,
  Globe,
  Mail,
  FileCode,
  Cpu,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { getHumanScoreBreakdown } from '../lib/narrativeSummary';

interface ScanOverviewCardProps {
  scan: DomainScan;
  onOpenGlossary?: (termKey: string) => void;
  isGuidedMode?: boolean;
}

export default function ScanOverviewCard({ scan, onOpenGlossary }: ScanOverviewCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(true);
  const score = scan.score ?? 0;
  const hasScore = scan.score !== undefined && scan.score !== null;
  const breakdown = scan.scoreBreakdown;
  const humanCategories = useMemo(() => getHumanScoreBreakdown(scan), [scan]);

  const scoreClassification = useMemo(() => {
    if (score >= 80) return 'Strong — Following core security best practices';
    if (score >= 60) return 'Good, but improvements are recommended';
    if (score >= 40) return 'Attention Needed — Meaningful configuration gaps observed';
    return 'Urgent Review Recommended — Essential defenses missing';
  }, [score]);

  const getCategoryIcon = (label: string) => {
    switch (label) {
      case 'TLS Hygiene':
        return Lock;
      case 'HTTPS Enforcement':
        return Lock;
      case 'Web Security Headers':
        return FileCode;
      case 'Email Security':
        return Mail;
      case 'DNSSEC Hygiene':
        return Globe;
      case 'Network Exposure':
        return Cpu;
      default:
        return Shield;
    }
  };

  return (
    <section aria-labelledby="score-breakdown-heading" className="w-full space-y-4">
      {/* ─── Score Breakdown & Transparency Card ─────────────────────── */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl overflow-hidden shadow-xs">
        {/* Header Strip */}
        <div className="p-4 sm:px-6 bg-[var(--bg-panel-subtle)] border-b border-[var(--border-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                Score Explanation
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] text-[var(--text-secondary)] font-medium">
                Version {breakdown?.scoringVersion ?? 1}
              </span>
            </div>
            <h2 id="score-breakdown-heading" className="text-lg sm:text-xl font-display italic font-normal text-[var(--text-primary)]">
              How Your Score Was Calculated
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setBreakdownOpen(!breakdownOpen)}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:underline flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>{breakdownOpen ? 'Collapse Details' : 'Expand Score Details'}</span>
            {breakdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Score Summary Banner */}
        <div className="p-5 sm:p-6 bg-[var(--bg-panel)] border-b border-[var(--border-muted)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-display italic font-normal text-[var(--text-primary)]">
                {hasScore ? score : '—'}
              </span>
              <span className="text-sm font-mono text-[var(--text-muted)]">/ 100 Points</span>
              <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] ml-2">
                — {scoreClassification}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Every domain begins with 100 points. Points are only deducted when a specific security control was definitively checked and observed missing or weak. Incomplete checks never reduce your score.
            </p>
          </div>

          <div className="p-3 bg-[var(--bg-panel-inset)] rounded-lg border border-[var(--border-muted)] text-xs text-[var(--text-muted)] max-w-sm space-y-1">
            <div className="font-bold text-[var(--text-primary)] flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <HelpCircle size={13} className="text-[var(--accent-primary)]" />
                <span>What this score means</span>
              </div>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('external_hygiene_score')}
                  className="text-[11px] text-[var(--accent-primary)] hover:underline cursor-pointer"
                >
                  Manual
                </button>
              )}
            </div>
            <p className="leading-relaxed">
              A score of {hasScore ? score : 100}/100 indicates external configuration posture. It does not imply the website is {hasScore ? score : 100}% secure or free from internal application bugs.
            </p>
          </div>
        </div>

        {/* 6 Category Dimension Cards */}
        {breakdownOpen && (
          <div className="p-5 sm:p-6 space-y-6 bg-[var(--bg-panel-inset)]">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Evaluation Across 6 Core Security Dimensions
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {humanCategories.map((cat, idx) => {
                const Icon = getCategoryIcon(cat.technicalLabel);
                const deductionPercent = Math.round((cat.deducted / cat.maxDeduction) * 100);
                const scorePercent = 100 - deductionPercent;

                return (
                  <div
                    key={idx}
                    className="bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-2xs"
                  >
                    <div className="space-y-2">
                      {/* Title & Icon */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${cat.isClean ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788]' : 'bg-[#d97706]/10 text-[#d97706] dark:text-[#D08A2A]'}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                              {cat.title}
                            </h3>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              Technical: {cat.technicalLabel}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-sm shrink-0 border ${
                            cat.isClean
                              ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788]'
                              : 'border-[#d97706]/30 bg-[#d97706]/10 text-[#d97706] dark:text-[#D08A2A]'
                          }`}
                        >
                          {cat.isClean ? 'NO DEDUCTION' : `−${cat.deducted} PTS`}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[var(--bg-panel-inset)] h-1.5 rounded-full overflow-hidden border border-[var(--border-muted)]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            scorePercent >= 80
                              ? 'bg-[#16a34a] dark:bg-[#52B788]'
                              : scorePercent >= 50
                              ? 'bg-[#d97706] dark:bg-[#D08A2A]'
                              : 'bg-[#dc2626] dark:bg-[#E5534B]'
                          }`}
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>

                      {/* What was observed */}
                      <div className="space-y-1 text-xs">
                        <div className="font-bold text-[var(--text-primary)]">What was observed:</div>
                        <p className="text-[var(--text-secondary)] leading-relaxed">{cat.whatWasObserved}</p>
                      </div>

                      {/* Why it affected score */}
                      <div className="space-y-1 text-xs pt-1 border-t border-[var(--border-muted)]">
                        <div className="font-bold text-[var(--text-muted)] text-[11px]">Why this matters:</div>
                        <p className="text-[var(--text-secondary)] leading-relaxed">{cat.whyItAffectedScore}</p>
                      </div>
                    </div>

                    {/* What would improve it */}
                    <div className="pt-2 border-t border-[var(--border-muted)] text-xs bg-[var(--bg-panel-inset)] p-2.5 rounded-lg space-y-0.5">
                      <span className="font-bold text-[var(--accent-primary)] block text-[11px]">
                        How to improve:
                      </span>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{cat.whatWouldImproveIt}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Deductions Summary Footer */}
            {breakdown && breakdown.totalDeducted > 0 && (
              <div className="p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-[var(--text-primary)]">
                    Total Deductions Assessed: −{breakdown.totalDeducted} Points
                  </span>
                  <p className="text-[var(--text-secondary)]">
                    Addressing the priority items highlighted above will bring your score closer to 100/100.
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono font-bold text-sm text-[var(--accent-primary)]">
                  Final Score: {score}/100
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
