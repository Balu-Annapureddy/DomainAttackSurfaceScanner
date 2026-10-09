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
  ShieldCheck,
  AlertTriangle,
  Cookie,
  Share2,
  Database,
  Sliders,
  RotateCcw,
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
  const [showCustomWeighting, setShowCustomWeighting] = useState(false);
  const [weights, setWeights] = useState<Record<string, number>>({});

  const score = scan.score ?? 0;
  const hasScore = scan.score !== undefined && scan.score !== null;
  const breakdown = scan.scoreBreakdown;
  const humanCategories = useMemo(() => getHumanScoreBreakdown(scan), [scan]);

  const handleWeightChange = (technicalLabel: string, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [technicalLabel]: value,
    }));
  };

  const handleResetWeights = () => {
    setWeights({});
  };

  const personalized = useMemo(() => {
    let totalWeightedDeduction = 0;
    for (const cat of humanCategories) {
      const multiplier = weights[cat.technicalLabel] ?? 1.0;
      totalWeightedDeduction += cat.deducted * multiplier;
    }
    const computedScore = Math.min(100, Math.max(0, Math.round(100 - totalWeightedDeduction)));
    return {
      score: computedScore,
      totalDeducted: Math.round(totalWeightedDeduction),
      isModified: Object.values(weights).some((w) => w !== 1.0),
    };
  }, [humanCategories, weights]);

  const scoreClassification = useMemo(() => {
    const activeScore = showCustomWeighting ? personalized.score : score;
    if (activeScore >= 80) return 'Strong — Following core security best practices';
    if (activeScore >= 60) return 'Good, but improvements are recommended';
    if (activeScore >= 40) return 'Attention Needed — Meaningful configuration gaps observed';
    return 'Urgent Review Recommended — Essential defenses missing';
  }, [score, showCustomWeighting, personalized.score]);

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
      case 'Certificate Chain Correctness':
        return ShieldCheck;
      case 'Subdomain Takeover Risk':
        return AlertTriangle;
      case 'Domain & WHOIS Hygiene':
        return Globe;
      case 'Cookie Security':
        return Cookie;
      case 'CORS Misconfiguration':
        return Share2;
      case 'Breach Exposure':
        return Database;
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
                Version {breakdown?.scoringVersion ?? 2}
              </span>
            </div>
            <h2 id="score-breakdown-heading" className="text-lg sm:text-xl font-display italic font-normal text-[var(--text-primary)]">
              How Your Score Was Calculated
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowCustomWeighting(!showCustomWeighting)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
                showCustomWeighting
                  ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]'
                  : 'bg-[var(--bg-panel)] border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'
              }`}
              title="Locally adjust dimension multipliers for custom risk priorities"
            >
              <Sliders size={13} />
              <span>{showCustomWeighting ? 'Hide Adjustments' : 'Adjust Weighting'}</span>
            </button>

            <button
              type="button"
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline flex items-center gap-1.5 cursor-pointer ml-1"
            >
              <span>{breakdownOpen ? 'Collapse Details' : 'Expand Score Details'}</span>
              {breakdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Score Summary Banner */}
        <div className="p-5 sm:p-6 bg-[var(--bg-panel)] border-b border-[var(--border-muted)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            {showCustomWeighting ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-display italic font-normal text-[var(--accent-primary)]">
                    {personalized.score}
                  </span>
                  <span className="text-sm font-mono text-[var(--text-muted)]">/ 100 Points</span>
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] ml-2">
                    — Your view: {personalized.score}/100 (default: {hasScore ? score : '—'}/100)
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[11px] font-medium">
                  <span>Custom risk priorities applied locally in your browser. Canonical fixed score is {score}/100.</span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-display italic font-normal text-[var(--text-primary)]">
                  {hasScore ? score : '—'}
                </span>
                <span className="text-sm font-mono text-[var(--text-muted)]">/ 100 Points</span>
                <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] ml-2">
                  — {scoreClassification}
                </span>
              </div>
            )}
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Every domain begins with 100 points across 12 evaluation dimensions. Points are deducted only when a specific security control was definitively checked and observed missing or weak. Incomplete checks never reduce your score.
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

        {/* 12 Category Dimension Cards */}
        {breakdownOpen && (
          <div className="p-5 sm:p-6 space-y-6 bg-[var(--bg-panel-inset)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Evaluation Across {humanCategories.length} Core Security Dimensions
              </div>
              {showCustomWeighting && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">Personalized weighting active</span>
                  <button
                    type="button"
                    onClick={handleResetWeights}
                    className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Reset multipliers</span>
                  </button>
                </div>
              )}
            </div>

            {showCustomWeighting && (
              <div className="p-3.5 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-technical)] text-xs text-[var(--text-secondary)] space-y-1">
                <span className="font-bold text-[var(--text-primary)] block">
                  Interactive Personal Weighting (Client-Side Only)
                </span>
                <p className="leading-relaxed">
                  Use the sliders on each dimension below to adjust multipliers (0.5× to 2.0×) for your organization’s risk appetite. This lets you emphasize areas like email protection or takeover risk without altering the canonical score reported to others.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {humanCategories.map((cat, idx) => {
                const Icon = getCategoryIcon(cat.technicalLabel);
                const multiplier = showCustomWeighting ? (weights[cat.technicalLabel] ?? 1.0) : 1.0;
                const effectiveDeduction = showCustomWeighting ? Math.round(cat.deducted * multiplier) : cat.deducted;
                const deductionPercent = Math.min(100, Math.round((effectiveDeduction / cat.maxDeduction) * 100));
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
                          {cat.isClean ? 'NO DEDUCTION' : `−${effectiveDeduction} PTS`}
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
                        {cat.notes && cat.notes.length > 1 ? (
                          <ul className="space-y-1 text-[var(--text-secondary)] leading-relaxed list-disc list-inside pl-0.5">
                            {cat.notes.map((note, noteIdx) => (
                              <li key={noteIdx}>{note}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[var(--text-secondary)] leading-relaxed">{cat.whatWasObserved}</p>
                        )}
                      </div>

                      {/* Why it affected score */}
                      <div className="space-y-1 text-xs pt-1 border-t border-[var(--border-muted)]">
                        <div className="font-bold text-[var(--text-muted)] text-[11px]">Why this matters:</div>
                        <p className="text-[var(--text-secondary)] leading-relaxed">{cat.whyItAffectedScore}</p>
                      </div>
                    </div>

                    {/* Weighting Slider (when enabled) */}
                    {showCustomWeighting && (
                      <div className="pt-2 border-t border-[var(--border-muted)] space-y-1 bg-[var(--bg-panel-subtle)] p-2 rounded-lg">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--text-muted)]">Custom Multiplier:</span>
                          <span className="font-mono font-bold text-[var(--accent-primary)]">
                            {multiplier.toFixed(1)}×
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={multiplier}
                          onChange={(e) => handleWeightChange(cat.technicalLabel, parseFloat(e.target.value))}
                          className="w-full accent-[var(--accent-primary)] h-1 cursor-pointer"
                        />
                        {cat.deducted > 0 && multiplier !== 1.0 && (
                          <div className="text-[10px] text-[var(--text-muted)] text-right font-mono">
                            Base: −{cat.deducted} pts → Adjusted: −{effectiveDeduction} pts
                          </div>
                        )}
                      </div>
                    )}

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
                    {showCustomWeighting
                      ? `Personalized Deductions: −${personalized.totalDeducted} Points (Canonical: −${breakdown.totalDeducted})`
                      : `Total Deductions Assessed: −${breakdown.totalDeducted} Points`}
                  </span>
                  <p className="text-[var(--text-secondary)]">
                    Addressing the priority items highlighted above will bring your score closer to 100/100.
                  </p>
                </div>
                <div className="text-right shrink-0 font-mono font-bold text-sm text-[var(--accent-primary)]">
                  {showCustomWeighting ? `Your view: ${personalized.score}/100` : `Final Score: ${score}/100`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
