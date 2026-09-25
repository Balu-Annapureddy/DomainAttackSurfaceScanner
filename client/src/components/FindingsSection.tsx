import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldCheck, HelpCircle } from 'lucide-react';
import type { Finding, FindingSeverity } from '../../../shared/types';

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredFindings = findings.filter(
    (f) => selectedSeverity === 'ALL' || f.severity === selectedSeverity,
  );

  return (
    <div className="console-panel rounded-xl overflow-hidden shadow-sm">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header px-4 sm:px-5 py-3.5 flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span className="font-bold tracking-wide text-sm">FINDINGS &amp; HYGIENE DOSSIER</span>
          <span className="text-xs text-[var(--text-secondary)] ml-1 font-sans">
            {findings.length} RECORDED SIGNALS
          </span>
        </div>

        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {['ALL', 'high', 'medium', 'low', 'informational'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1 text-xs font-bold uppercase cursor-pointer border rounded-lg transition ${
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
            const isExpanded = expandedIds.has(finding.id);
            const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.informational;
            const Icon = sev.icon;
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

            return (
              <div key={finding.id} className="p-4 sm:p-5 bg-[var(--bg-panel)] hover:bg-[var(--accent-active-bg)]/30 transition-colors">
                <div
                  onClick={() => toggleExpand(finding.id)}
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
                    </div>

                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {finding.title}
                    </div>

                    <div className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {finding.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 rounded-lg transition"
                  >
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>

                {/* ─── Expandable Structured Dossier Pillars ────────── */}
                {isExpanded && (
                  <div className="mt-4 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-4 sm:p-5 space-y-4 text-xs rounded-xl shadow-xs">
                    {/* Pillar 1: Evidence */}
                    <div>
                      <div className="text-[11px] font-mono text-[var(--accent-primary)] uppercase font-bold mb-1 tracking-wider">
                        [01] OBSERVED EVIDENCE
                      </div>
                      <div className="text-[var(--text-primary)] text-xs sm:text-sm leading-relaxed">
                        {finding.description}
                      </div>
                    </div>

                    {/* Pillar 2: Why It Matters */}
                    {finding.whyItMatters && (
                      <div className="border-t border-[var(--border-muted)] pt-3">
                        <div className="text-[11px] font-mono text-[#d97706] dark:text-[#f59e0b] uppercase font-bold mb-1 tracking-wider">
                          [02] WHY IT MATTERS
                        </div>
                        <div className="text-[var(--text-secondary)] text-xs sm:text-sm leading-relaxed">
                          {finding.whyItMatters}
                        </div>
                      </div>
                    )}

                    {/* Pillar 3: Recommended Action */}
                    <div className="border-t border-[var(--border-muted)] pt-3">
                      <div className="text-[11px] font-mono text-[#16a34a] dark:text-[#2ee59d] uppercase font-bold mb-1 tracking-wider">
                        [03] RECOMMENDED VERIFICATION / REMEDIATION
                      </div>
                      {finding.investigationSteps && finding.investigationSteps.length > 0 ? (
                        <ul className="space-y-1.5 text-xs sm:text-sm text-[var(--text-primary)]">
                          {finding.investigationSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#16a34a] dark:text-[#2ee59d] font-bold">&bull;</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[var(--text-primary)] text-xs sm:text-sm leading-relaxed">
                          {finding.recommendation}
                        </div>
                      )}
                    </div>

                    {/* Pillar 4: Backing Probes */}
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="border-t border-[var(--border-muted)] pt-3">
                        <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase font-bold mb-1.5 tracking-wider">
                          [04] BACKING PROBES &amp; TIMESTAMPS
                        </div>
                        <div className="space-y-1.5">
                          {finding.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              className="bg-[var(--bg-panel)] border border-[var(--border-muted)] p-2.5 flex items-start justify-between gap-3 text-xs rounded-lg"
                            >
                              <div>
                                <span className="text-[var(--accent-primary)] font-bold">{ev.source}:</span>{' '}
                                <span className="text-[var(--text-secondary)]">{ev.description}</span>
                              </div>
                              <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 uppercase">
                                {ev.confidence}_CONFIDENCE
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
