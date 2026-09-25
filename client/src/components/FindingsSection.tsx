import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldCheck, HelpCircle } from 'lucide-react';
import type { Finding, FindingSeverity } from '../../../shared/types';

interface FindingsSectionProps {
  findings: Finding[];
  onOpenGlossary?: (termKey: string) => void;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; tagClass: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  high: {
    label: 'HIGH',
    tagClass: 'console-tag-coral',
    icon: AlertCircle,
  },
  medium: {
    label: 'MEDIUM',
    tagClass: 'console-tag-amber',
    icon: AlertTriangle,
  },
  low: {
    label: 'LOW',
    tagClass: 'console-tag-cyan',
    icon: Info,
  },
  informational: {
    label: 'INFO',
    tagClass: 'console-tag',
    icon: HelpCircle,
  },
};

export default function FindingsSection({ findings, onOpenGlossary }: FindingsSectionProps) {
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
    <div className="console-panel overflow-hidden space-y-0">
      {/* ─── Control Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 border-b border-[#1f2735] p-4 sm:flex-row sm:items-center sm:justify-between bg-[#111620]">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#d29922] font-bold">[FINDINGS]</span>
            <span className="font-bold text-[#e6edf3]">SECURITY HYGIENE & CONFIGURATION RECORDS</span>
          </div>
          <p className="text-xs text-[#9aa5b8] mt-0.5">
            {findings.length} recorded configuration signal{findings.length === 1 ? '' : 's'} • Evidence-backed, passive observations
          </p>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          {['ALL', 'high', 'medium', 'low', 'informational'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition border ${
                selectedSeverity === sev
                  ? 'border-[#388bfd] bg-[#162030] text-[#58a6ff]'
                  : 'border-[#1f2735] bg-[#0d121a] text-[#9aa5b8] hover:text-[#e6edf3]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Passive Rule Banner ───────────────────────────────────── */}
      <div className="border-b border-[#1f2735] bg-[#0d121a] px-4 py-2 text-[11px] font-mono text-[#9aa5b8] flex items-center justify-between">
        <span>
          <strong className="text-[#e6edf3]">EPISTEMOLOGY NOTICE:</strong> <em>“We did not observe X” ≠ “X does not exist.”</em> Unobserved headers or records represent passive gaps, not confirmed exploitable vulnerabilities.
        </span>
        {onOpenGlossary && (
          <button
            type="button"
            onClick={() => onOpenGlossary('passive_osint')}
            className="text-[#58a6ff] hover:underline shrink-0 ml-3"
          >
            [?] EXPLAIN
          </button>
        )}
      </div>

      {/* ─── Findings Record Stream ─────────────────────────────────── */}
      <div className="divide-y divide-[#1f2735]">
        {filteredFindings.length === 0 ? (
          <div className="p-8 text-center font-mono">
            <ShieldCheck size={32} className="mx-auto text-[#3fb950] mb-2" />
            <span className="font-bold text-sm text-[#e6edf3] block">
              NO CONFIGURATION WEAKNESSES IDENTIFIED
            </span>
            <span className="text-xs text-[#9aa5b8] block mt-1">
              All inspected categories demonstrated expected public security configurations and standard headers.
            </span>
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

            let statusTagClass = 'console-tag';
            let statusLabel = 'NOT OBSERVED';

            if (obsStatus === 'observed') {
              statusTagClass = 'console-tag-phosphor';
              statusLabel = 'OBSERVED';
            } else if (obsStatus === 'not_observed') {
              statusTagClass = 'console-tag-amber';
              statusLabel = 'NOT OBSERVED';
            } else if (obsStatus === 'check_failed') {
              statusTagClass = 'console-tag';
              statusLabel = 'CHECK FAILED (UNVERIFIED)';
            } else if (obsStatus === 'not_applicable') {
              statusTagClass = 'console-tag';
              statusLabel = 'NOT APPLICABLE';
            }

            return (
              <div key={finding.id} className="p-4 transition hover:bg-[#121722]">
                {/* Header Summary Row */}
                <div
                  onClick={() => toggleExpand(finding.id)}
                  className="cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className={`console-tag ${sev.tagClass}`}>
                        <Icon size={11} />
                        {sev.label}
                      </span>
                      <span className={`console-tag ${statusTagClass}`}>
                        STATUS // {statusLabel}
                      </span>
                      <span className="console-tag">
                        CATEGORY // {finding.category.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-mono text-sm font-bold text-[#e6edf3]">
                      {finding.title}
                    </h3>

                    <p className="text-xs text-[#9aa5b8] leading-relaxed">
                      {finding.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="console-btn py-1 px-2 text-xs text-[#9aa5b8] shrink-0"
                    title={isExpanded ? 'Collapse record' : 'Expand intelligence dossier'}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {/* ─── Expanded Dossier Pillars ───────────────────────── */}
                {isExpanded && (
                  <div className="mt-4 console-panel-inset p-4 space-y-4 font-mono text-xs border border-[#1f2735]">
                    {/* Pillar 1: Evidence */}
                    <div>
                      <div className="text-[10px] text-[#58a6ff] uppercase tracking-wider font-bold mb-1">
                        [01] OBSERVED EVIDENCE
                      </div>
                      <p className="text-[#e6edf3] text-xs leading-relaxed font-sans">
                        {finding.description}
                      </p>
                    </div>

                    {/* Pillar 2: Why It Matters */}
                    {finding.whyItMatters && (
                      <div className="border-t border-[#1f2735] pt-3">
                        <div className="text-[10px] text-[#d29922] uppercase tracking-wider font-bold mb-1">
                          [02] WHY IT MATTERS
                        </div>
                        <p className="text-[#9aa5b8] text-xs leading-relaxed font-sans">
                          {finding.whyItMatters}
                        </p>
                      </div>
                    )}

                    {/* Pillar 3: Recommended Action */}
                    <div className="border-t border-[#1f2735] pt-3">
                      <div className="text-[10px] text-[#3fb950] uppercase tracking-wider font-bold mb-1">
                        [03] RECOMMENDED VERIFICATION / REMEDIATION
                      </div>
                      {finding.investigationSteps && finding.investigationSteps.length > 0 ? (
                        <ul className="space-y-1 text-xs text-[#e6edf3] font-sans">
                          {finding.investigationSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-[#3fb950] font-mono">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[#e6edf3] text-xs leading-relaxed font-sans">
                          {finding.recommendation}
                        </p>
                      )}
                    </div>

                    {/* Pillar 4: Backing Evidence Records */}
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="border-t border-[#1f2735] pt-3">
                        <div className="text-[10px] text-[#626e82] uppercase tracking-wider font-bold mb-2">
                          [04] BACKING PROBES & TIMESTAMPS
                        </div>
                        <div className="space-y-1.5">
                          {finding.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              className="console-panel p-2.5 flex items-start justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="text-[#58a6ff] font-bold">{ev.source}:</span>{' '}
                                <span className="text-[#9aa5b8]">{ev.description}</span>
                              </div>
                              <span className="console-tag text-[10px]">
                                {ev.confidence.toUpperCase()}_CONFIDENCE
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
