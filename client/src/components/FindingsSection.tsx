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
    <div className="console-panel rounded-xs">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span>FINDINGS & SECURITY HYGIENE DOSSIER</span>
          <span className="text-[11px] text-[var(--text-secondary)] ml-2">
            {findings.length} RECORDED SIGNALS
          </span>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1 font-mono text-xs">
          {['ALL', 'high', 'medium', 'low', 'informational'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer border rounded-xs ${
                selectedSeverity === sev
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-active-bg)] text-[var(--accent-primary)]'
                  : 'border-[var(--border-muted)] bg-[var(--bg-panel-inset)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Epistemology Bar ───────────────────────────────────────── */}
      <div className="border-b border-[var(--border-muted)] bg-[var(--bg-panel-subtle)] px-3 py-1.5 text-[10px] font-mono text-[var(--text-secondary)] flex items-center justify-between">
        <span>
          <strong className="text-[var(--text-primary)]">EPISTEMOLOGY NOTICE:</strong> <em>“We did not observe X” &ne; “X does not exist.”</em> Missing evidence represents an unobserved public control, not a confirmed vulnerability.
        </span>
        {onOpenGlossary && (
          <button
            type="button"
            onClick={() => onOpenGlossary('passive_osint')}
            className="text-[var(--accent-primary)] hover:underline shrink-0 ml-2 cursor-pointer"
          >
            [?] GUIDE
          </button>
        )}
      </div>

      {/* ─── Findings Records List ──────────────────────────────────── */}
      <div className="divide-y divide-[var(--border-muted)] bg-[var(--bg-panel)]">
        {filteredFindings.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs">
            <ShieldCheck size={28} className="mx-auto text-[#16a34a] dark:text-[#2ee59d] mb-2" />
            <div className="font-bold text-[var(--text-primary)]">
              NO HYGIENE WEAKNESSES OBSERVED
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">
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
              <div key={finding.id} className="p-3 bg-[var(--bg-panel)] hover:bg-[var(--accent-active-bg)]/40 transition-colors">
                <div
                  onClick={() => toggleExpand(finding.id)}
                  className="cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 font-mono">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className={`px-1.5 py-0.5 border font-bold flex items-center gap-1 rounded-xs ${sev.borderClass} ${sev.textClass}`}>
                        <Icon size={10} />
                        [{sev.label}]
                      </span>
                      <span className={`px-1.5 py-0.5 border font-bold rounded-xs ${statusBorder}`}>
                        STATUS: {statusLabel}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        CATEGORY: {finding.category.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[var(--text-primary)]">
                      {finding.title}
                    </div>

                    <div className="text-[11px] text-[var(--text-secondary)] font-sans line-clamp-2">
                      {finding.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="border border-[var(--border-muted)] bg-[var(--bg-panel-inset)] p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 rounded-xs"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* ─── Expandable Structured Dossier Pillars ────────── */}
                {isExpanded && (
                  <div className="mt-3 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-3 font-mono text-xs rounded-xs">
                    {/* Pillar 1: Evidence */}
                    <div>
                      <div className="text-[10px] text-[var(--accent-primary)] uppercase font-bold mb-0.5">
                        [01] OBSERVED EVIDENCE
                      </div>
                      <div className="text-[var(--text-primary)] text-xs font-sans leading-relaxed">
                        {finding.description}
                      </div>
                    </div>

                    {/* Pillar 2: Why It Matters */}
                    {finding.whyItMatters && (
                      <div className="border-t border-[var(--border-muted)] pt-2">
                        <div className="text-[10px] text-[#d97706] dark:text-[#f59e0b] uppercase font-bold mb-0.5">
                          [02] WHY IT MATTERS
                        </div>
                        <div className="text-[var(--text-secondary)] text-xs font-sans leading-relaxed">
                          {finding.whyItMatters}
                        </div>
                      </div>
                    )}

                    {/* Pillar 3: Recommended Action */}
                    <div className="border-t border-[var(--border-muted)] pt-2">
                      <div className="text-[10px] text-[#16a34a] dark:text-[#2ee59d] uppercase font-bold mb-0.5">
                        [03] RECOMMENDED VERIFICATION / REMEDIATION
                      </div>
                      {finding.investigationSteps && finding.investigationSteps.length > 0 ? (
                        <ul className="space-y-1 text-xs text-[var(--text-primary)] font-sans">
                          {finding.investigationSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#16a34a] dark:text-[#2ee59d] font-mono">&bull;</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[var(--text-primary)] text-xs font-sans leading-relaxed">
                          {finding.recommendation}
                        </div>
                      )}
                    </div>

                    {/* Pillar 4: Backing Probes */}
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="border-t border-[var(--border-muted)] pt-2">
                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold mb-1">
                          [04] BACKING PROBES & TIMESTAMPS
                        </div>
                        <div className="space-y-1">
                          {finding.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              className="bg-[var(--bg-panel)] border border-[var(--border-muted)] p-1.5 flex items-start justify-between gap-2 text-[11px] rounded-xs"
                            >
                              <div>
                                <span className="text-[var(--accent-primary)] font-bold">{ev.source}:</span>{' '}
                                <span className="text-[var(--text-secondary)]">{ev.description}</span>
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)] shrink-0 uppercase">
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
