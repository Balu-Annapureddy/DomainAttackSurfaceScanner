import { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calendar,
  Info,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { generateHumanSecurityAssessment } from '../lib/narrativeSummary';

interface SecurityAssessmentSummaryProps {
  scan: DomainScan;
  onOpenGlossary?: (termKey: string) => void;
}

export default function SecurityAssessmentSummary({
  scan,
  onOpenGlossary,
}: SecurityAssessmentSummaryProps) {
  const [showAllChecks, setShowAllChecks] = useState(false);
  const assessment = generateHumanSecurityAssessment(scan);
  const score = assessment.score;
  const hasScore = score !== null && score !== undefined;

  const httpData = scan.categories.http?.data as {
    finalObservedUrl?: string;
  } | undefined;

  const safeFinalUrl = (() => {
    const raw = httpData?.finalObservedUrl;
    if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
      try {
        const u = new URL(raw);
        if (['http:', 'https:'].includes(u.protocol)) return u.toString();
      } catch {
        return null;
      }
    }
    return null;
  })();

  return (
    <section aria-labelledby="assessment-summary-heading" className="w-full space-y-6">
      {/* ─── Main Overview Card ─────────────────────────────────────── */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl shadow-xs overflow-hidden">
        {/* Top Header Strip */}
        <div className="bg-[var(--bg-panel-subtle)] border-b border-[var(--border-muted)] px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                Security Assessment Summary
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] text-[var(--text-secondary)] font-medium">
                Public Configuration Review
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <h1 id="assessment-summary-heading" className="text-2xl sm:text-3xl font-display italic font-normal text-[var(--text-primary)]">
                {scan.domain}
              </h1>
              {safeFinalUrl && (
                <a
                  href={safeFinalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline font-medium"
                >
                  <span>Visit Website</span>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Calendar size={13} className="text-[var(--text-muted)]" />
              <span>Assessed {assessment.formattedDate}</span>
            </span>
            {onOpenGlossary && (
              <button
                type="button"
                onClick={() => onOpenGlossary('passive_osint')}
                className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition cursor-pointer"
              >
                <HelpCircle size={13} />
                <span>How this assessment works</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── High-Level Score & Key Metrics Banner ─────────────────── */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Overall Score & Classification (5 cols) */}
          <div className="lg:col-span-5 bg-[var(--bg-panel-inset)] p-5 rounded-lg border border-[var(--border-muted)] space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-mono uppercase font-bold tracking-wider text-[var(--text-muted)]">
                Your Security Hygiene Score
              </span>
              <span className="text-xs text-[var(--text-muted)]">Scale: 0 to 100</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display italic font-normal text-[var(--text-primary)] leading-none">
                {hasScore ? score : '—'}
              </span>
              <span className="text-sm font-mono text-[var(--text-muted)]">/ 100</span>
            </div>

            {/* Score Progress Bar */}
            <div className="w-full h-1.5 bg-[var(--border-technical)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ease-out rounded-full ${
                  (score ?? 0) >= 80
                    ? 'bg-[#16a34a] dark:bg-[#52B788]'
                    : (score ?? 0) >= 60
                    ? 'bg-[var(--accent-primary)]'
                    : (score ?? 0) >= 40
                    ? 'bg-[#d97706] dark:bg-[#D08A2A]'
                    : 'bg-[#dc2626] dark:bg-[#E5534B]'
                }`}
                style={{ width: `${hasScore ? Math.min(100, Math.max(0, score ?? 0)) : 0}%` }}
              />
            </div>

            <div className="pt-1 space-y-1">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {assessment.scoreBadgeText}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {assessment.scoreExplanationShort}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] italic pt-1 border-t border-[var(--border-muted)]">
                Note: This score reflects observable public configuration hygiene. It is not an exploitability guarantee.
              </p>
            </div>
          </div>

          {/* Right Column: 3 Key Assessment Counts (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Needs Attention Card */}
            <div className="p-4 rounded-lg bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#d97706] dark:text-[#f59e0b]">
                <AlertTriangle size={15} />
                <span>Issues Identified</span>
              </div>
              <div className="text-3xl font-display italic text-[var(--text-primary)]">
                {assessment.importantFindingsCount}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {assessment.importantFindingsCount === 0
                  ? 'No critical or medium configuration weaknesses observed.'
                  : `${assessment.highCount} high and ${assessment.mediumCount} medium priority items warranting review.`}
              </p>
            </div>

            {/* Protections Confirmed Card */}
            <div className="p-4 rounded-lg bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#16a34a] dark:text-[#52B788]">
                <ShieldCheck size={15} />
                <span>Protections Active</span>
              </div>
              <div className="text-3xl font-display italic text-[var(--text-primary)]">
                {assessment.protectionsConfirmedCount}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Defensive controls (such as encryption and email records) confirmed active on this domain.
              </p>
            </div>

            {/* Unverified / Inconclusive Card */}
            <div className="p-4 rounded-lg bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                <Info size={15} />
                <span>Unverified Areas</span>
              </div>
              <div className="text-3xl font-display italic text-[var(--text-primary)]">
                {assessment.unverifiedAreasCount}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {assessment.unverifiedAreasCount === 0
                  ? 'All standard assessment checks completed successfully.'
                  : `${assessment.unverifiedAreasCount} category check${assessment.unverifiedAreasCount > 1 ? 's' : ''} timed out or was inconclusive.`}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Detailed Dynamic Narrative: What Did We Find? ──────────── */}
        <div className="border-t border-[var(--border-muted)] p-5 sm:p-6 bg-[var(--bg-panel)] space-y-5">
          {/* Section 1: What did we find? */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-primary)] font-mono">
              What We Discovered During This Assessment
            </h2>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed font-sans max-w-4xl">
              {assessment.whatWeFoundNarrative}
            </p>
          </div>

          {/* Section 2: What should the user care about? */}
          <div className="p-4 rounded-lg bg-[var(--accent-active-bg)] border border-[var(--accent-primary)]/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider font-mono">
              <span>What Should You Look At First?</span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-sans">
              {assessment.whatMattersMostNarrative}
            </p>
          </div>

          {/* Section 3: What did we check? (Collapsible / Expandable) */}
          <div className="pt-2 border-t border-[var(--border-muted)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Scope of This Assessment: What Did We Check?
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  DASS inspects only publicly observable network telemetry. It never sends intrusive exploits or accesses private data.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllChecks(!showAllChecks)}
                className="text-xs font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>{showAllChecks ? 'Show Less' : 'View All 7 Areas Checked'}</span>
                {showAllChecks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showAllChecks && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {assessment.whatWeChecked.map((chk, i) => (
                  <div
                    key={i}
                    className="p-3 bg-[var(--bg-panel-inset)] rounded-lg border border-[var(--border-muted)] space-y-1 text-xs"
                  >
                    <div className="font-bold text-[var(--text-primary)]">{chk.title}</div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">{chk.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
