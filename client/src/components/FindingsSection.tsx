import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react';
import type { Finding, FindingSeverity } from '../../../shared/types';
import FindingDetailPanel from './FindingDetailPanel';

interface FindingsSectionProps {
  findings: Finding[];
  onOpenGlossary?: (termKey: string) => void;
  sectionNumber?: string;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; borderClass: string; textClass: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  high: {
    label: 'HIGH',
    borderClass: 'border-[#dc2626]/40 bg-[#fee2e2]/40 dark:border-[#ef4444]/40 dark:bg-[#ef4444]/15',
    textClass: 'text-[#dc2626] dark:text-[#ef4444]',
    icon: AlertCircle,
  },
  medium: {
    label: 'MEDIUM',
    borderClass: 'border-[#d97706]/40 bg-[#fef3c7]/50 dark:border-[#eab308]/40 dark:bg-[#eab308]/15',
    textClass: 'text-[#d97706] dark:text-[#eab308]',
    icon: AlertTriangle,
  },
  low: {
    label: 'LOW',
    borderClass: 'border-[var(--accent-primary)]/40 bg-[var(--accent-active-bg)]',
    textClass: 'text-[var(--accent-primary)]',
    icon: Info,
  },
  informational: {
    label: 'INFO',
    borderClass: 'border-[var(--border-muted)] bg-[var(--bg-panel-inset)]',
    textClass: 'text-[var(--text-secondary)]',
    icon: HelpCircle,
  },
};

export default function FindingsSection({
  findings,
  onOpenGlossary,
  sectionNumber = '07',
}: FindingsSectionProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedDetailFinding, setSelectedDetailFinding] = useState<Finding | null>(null);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedIds(new Set(findings.map((f) => f.id)));
  };

  const expandAll = () => {
    setCollapsedIds(new Set());
  };

  const filteredFindings = findings.filter(
    (f) => selectedSeverity === 'ALL' || f.severity === selectedSeverity,
  );

  return (
    <div className="console-panel rounded-xl overflow-hidden shadow-sm">
      {/* ─── Workstation Report Header ─────────────────────────────── */}
      <div className="dossier-header px-4 sm:px-5 py-3.5 flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold tracking-wide text-sm">DETAILED FINDINGS &amp; HYGIENE EVALUATION</span>
          <span className="text-xs text-[var(--text-secondary)] ml-1 font-sans">
            {findings.length} RECORDED SIGNALS (EXPANDED BY DEFAULT)
          </span>
        </div>

        {/* Action Controls: Severity Filters + Expand/Collapse All */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 border-r border-[var(--border-muted)] pr-2 mr-1">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded text-[var(--accent-primary)] hover:bg-[var(--accent-active-bg)] cursor-pointer"
              title="Expand all findings"
            >
              EXPAND ALL
            </button>
            <span className="text-[var(--text-muted)]">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Collapse all findings"
            >
              COLLAPSE ALL
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'high', 'medium', 'low', 'informational'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 text-xs font-bold uppercase cursor-pointer border rounded-lg transition ${
                  selectedSeverity === sev
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white shadow-xs'
                    : 'border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-technical)]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Epistemology Bar ───────────────────────────────────────── */}
      <div className="border-b border-[var(--border-muted)] bg-[var(--bg-panel-subtle)] px-4 sm:px-5 py-2.5 text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="leading-relaxed">
          <strong className="text-[var(--text-primary)]">EPISTEMOLOGY NOTICE:</strong> <em>“We did not observe X” &ne; “X does not exist.”</em> Missing evidence represents an unobserved public control, not a confirmed vulnerability.
        </span>
        {onOpenGlossary && (
          <button
            type="button"
            onClick={() => onOpenGlossary('passive_osint')}
            className="text-[var(--accent-primary)] font-bold hover:underline shrink-0 cursor-pointer"
          >
            [?] GUIDE
          </button>
        )}
      </div>

      {/* ─── Findings Records List ──────────────────────────────────── */}
      <div className="divide-y divide-[var(--border-muted)] bg-[var(--bg-panel)]">
        {filteredFindings.length === 0 ? (
          <div className="p-10 text-center text-xs">
            <ShieldCheck size={32} className="mx-auto text-[#16a34a] dark:text-[#2ee59d] mb-2" />
            <div className="font-bold text-sm text-[var(--text-primary)]">
              NO HYGIENE WEAKNESSES OBSERVED
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              All inspected categories demonstrated expected public configurations.
            </div>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = !collapsedIds.has(finding.id);
            const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.informational;
            const Icon = sev.icon;
            const analysis = finding.analysis;
            const obsStatus =
              finding.observationStatus ??
              (finding.title.toLowerCase().includes('missing') ||
              finding.title.toLowerCase().includes('not observed')
                ? 'not_observed'
                : 'observed');

            let statusBorder = 'border-[var(--border-muted)] text-[var(--text-secondary)]';
            let statusLabel = 'NOT OBSERVED';

            if (obsStatus === 'observed') {
              statusBorder = 'border-[#16a34a]/40 bg-[#16a34a]/10 text-[#16a34a] dark:text-[#2ee59d]';
              statusLabel = 'OBSERVED';
            } else if (obsStatus === 'not_observed') {
              statusBorder = 'border-[#d97706]/40 bg-[#d97706]/10 text-[#d97706] dark:text-[#f59e0b]';
              statusLabel = 'NOT OBSERVED';
            } else if (obsStatus === 'check_failed') {
              statusBorder = 'border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-muted)]';
              statusLabel = 'CHECK FAILED (UNVERIFIED)';
            } else if (obsStatus === 'not_applicable') {
              statusBorder = 'border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-muted)]';
              statusLabel = 'NOT APPLICABLE';
            }

            const borderSeverityClass =
              finding.severity === 'high'
                ? 'border-l-4 border-l-[var(--sev-critical)]'
                : finding.severity === 'medium'
                ? 'border-l-4 border-l-[var(--sev-medium)]'
                : 'border-l-4 border-l-[var(--sev-low)]';

            return (
              <div key={finding.id} className={`p-4 sm:p-5 bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-subtle)] transition-colors ${borderSeverityClass}`}>
                <div
                  onClick={() => toggleCollapse(finding.id)}
                  className="cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 border font-bold flex items-center gap-1 rounded-md text-[11px] ${sev.borderClass} ${sev.textClass}`}>
                        <Icon size={12} />
                        {sev.label}
                      </span>
                      <span className={`px-2 py-0.5 border font-bold rounded-md text-[11px] ${statusBorder}`}>
                        STATUS: {statusLabel}
                      </span>
                      <span className="text-[var(--text-muted)] text-[11px] font-mono">
                        CATEGORY: {finding.category.toUpperCase()}
                      </span>
                      <span className="text-[var(--accent-primary)] text-[11px] font-mono">
                        CONFIDENCE: {(finding.confidence || 'high').toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      {finding.title}
                    </div>

                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {finding.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(finding.id);
                    }}
                    className="border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 rounded-lg transition cursor-pointer"
                    title={isExpanded ? 'Collapse this finding' : 'Expand full detail'}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* ─── Full Technical Detail Rendered Inline by Default ────────── */}
                {isExpanded && (
                  <div className="mt-4 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-4 sm:p-6 space-y-5 text-xs rounded-xl shadow-xs animate-in fade-in duration-200">
                    {/* [01] What is this? */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-mono text-[var(--accent-primary)] uppercase font-bold tracking-wider">
                        [01] WHAT IS THIS?
                      </div>
                      <p className="text-[var(--text-primary)] text-xs sm:text-sm leading-relaxed">
                        {analysis?.whatIsThis || finding.description}
                      </p>
                    </div>

                    {/* [02] What was observed? */}
                    <div className="border-t border-[var(--border-muted)] pt-3 space-y-1">
                      <div className="text-[11px] font-mono text-[#d97706] dark:text-[#f59e0b] uppercase font-bold tracking-wider">
                        [02] WHAT WAS OBSERVED?
                      </div>
                      <div className="p-3 bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-lg text-[var(--text-primary)] font-mono text-xs leading-relaxed">
                        {analysis?.whatWasObserved || finding.description}
                      </div>
                    </div>

                    {/* [03] How was it discovered? */}
                    <div className="border-t border-[var(--border-muted)] pt-3 space-y-1">
                      <div className="text-[11px] font-mono text-[var(--text-secondary)] uppercase font-bold tracking-wider">
                        [03] HOW WAS IT DISCOVERED?
                      </div>
                      <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                        {analysis?.howDiscovered || 'Passively discovered by querying public protocol configurations and response telemetry without intrusive packets.'}
                      </p>
                    </div>

                    {/* [04] Raw evidence & probes */}
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="border-t border-[var(--border-muted)] pt-3 space-y-2">
                        <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-bold tracking-wider">
                          [04] EVIDENCE &amp; TELEMETRY PROBES
                        </div>
                        <div className="space-y-1.5">
                          {finding.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              className="bg-[var(--bg-panel)] border border-[var(--border-muted)] p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs rounded-lg"
                            >
                              <div>
                                <span className="text-[var(--accent-primary)] font-bold font-mono">{ev.source}:</span>{' '}
                                <span className="text-[var(--text-secondary)]">{ev.description}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-[var(--text-muted)]">
                                {ev.observedAt && <span>{new Date(ev.observedAt).toISOString().slice(0, 19)}Z</span>}
                                <span className="uppercase px-1.5 py-0.5 rounded bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] font-bold">
                                  {ev.confidence}_CONFIDENCE
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* [05] Technical Explanation */}
                    {(analysis?.technicalExplanation || finding.whyItMatters) && (
                      <div className="border-t border-[var(--border-muted)] pt-3 space-y-1">
                        <div className="text-[11px] font-mono text-[var(--text-primary)] uppercase font-bold tracking-wider">
                          [05] TECHNICAL EXPLANATION
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                          {analysis?.technicalExplanation || finding.whyItMatters}
                        </p>
                      </div>
                    )}

                    {/* [06] Why does it matter? */}
                    {(analysis?.whyItMatters || finding.whyItMatters) && (
                      <div className="border-t border-[var(--border-muted)] pt-3 space-y-1">
                        <div className="text-[11px] font-mono text-[#d97706] dark:text-[#f59e0b] uppercase font-bold tracking-wider">
                          [06] WHY DOES IT MATTER?
                        </div>
                        <p className="text-[var(--text-primary)] text-xs leading-relaxed">
                          {analysis?.whyItMatters || finding.whyItMatters}
                        </p>
                      </div>
                    )}

                    {/* [07] Realistic Security Impact */}
                    {analysis?.securityImpact && (
                      <div className="border-t border-[var(--border-muted)] pt-3 space-y-1">
                        <div className="text-[11px] font-mono text-[#dc2626] dark:text-[#ef4444] uppercase font-bold tracking-wider">
                          [07] REALISTIC SECURITY IMPACT
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">
                          {analysis.securityImpact}
                        </p>
                      </div>
                    )}

                    {/* [08] Potential Abuse Scenario */}
                    {analysis?.potentialAbuse && (
                      <div className="border-t border-[var(--border-muted)] pt-3 space-y-1">
                        <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-bold tracking-wider">
                          [08] POTENTIAL ABUSE SCENARIO
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed italic">
                          {analysis.potentialAbuse}
                        </p>
                      </div>
                    )}

                    {/* [09] Recommended Remediation */}
                    <div className="border-t border-[var(--border-muted)] pt-3 space-y-2">
                      <div className="text-[11px] font-mono text-[#16a34a] dark:text-[#2ee59d] uppercase font-bold tracking-wider">
                        [09] RECOMMENDED REMEDIATION
                      </div>
                      <div className="p-3 bg-[var(--bg-panel)] border border-[#16a34a]/30 rounded-lg text-xs leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                        {analysis?.remediation || finding.recommendation}
                      </div>
                      {finding.investigationSteps && finding.investigationSteps.length > 0 && (
                        <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4 mt-2">
                          {finding.investigationSteps.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* [10] Safe Validation */}
                    {analysis?.safeValidation && (
                      <div className="border-t border-[var(--border-muted)] pt-3 space-y-1">
                        <div className="text-[11px] font-mono text-[var(--accent-primary)] uppercase font-bold tracking-wider">
                          [10] SAFE VALIDATION COMMAND
                        </div>
                        <div className="p-3 bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-lg text-xs font-mono text-[var(--text-primary)] leading-relaxed">
                          {analysis.safeValidation}
                        </div>
                      </div>
                    )}

                    {/* [11] Standards & Citations */}
                    {analysis?.references && analysis.references.length > 0 && (
                      <div className="border-t border-[var(--border-muted)] pt-3 space-y-1.5">
                        <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-bold tracking-wider">
                          [11] STANDARDS &amp; CITATIONS
                        </div>
                        <ul className="space-y-1 text-xs">
                          {analysis.references.map((ref, idx) => (
                            <li key={idx}>
                              <a
                                href={ref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--accent-primary)] hover:underline font-mono break-all"
                              >
                                {ref}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Footer drawer launcher */}
                    <div className="border-t border-[var(--border-muted)] pt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-[var(--text-muted)] font-mono">
                        FINDING_ID: {finding.id}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailFinding(finding);
                        }}
                        className="console-btn py-1 px-3 text-xs font-bold text-[var(--accent-primary)] flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>OPEN IN FOCUSED DRAWER</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ─── Finding Detail Drawer ─────────────────────────────────── */}
      <FindingDetailPanel
        finding={selectedDetailFinding}
        onClose={() => setSelectedDetailFinding(null)}
        onOpenGlossary={onOpenGlossary}
      />
    </div>
  );
}
