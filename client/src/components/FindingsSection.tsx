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
    borderClass: 'border-[#da3633] bg-[#2a1315]',
    textClass: 'text-[#f85149]',
    icon: AlertCircle,
  },
  medium: {
    label: 'MEDIUM',
    borderClass: 'border-[#bb8009] bg-[#221a08]',
    textClass: 'text-[#d29922]',
    icon: AlertTriangle,
  },
  low: {
    label: 'LOW',
    borderClass: 'border-[#388bfd] bg-[#122238]',
    textClass: 'text-[#58a6ff]',
    icon: Info,
  },
  informational: {
    label: 'INFO',
    borderClass: 'border-[#1e2631] bg-[#0c1015]',
    textClass: 'text-[#8b9bb0]',
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
    <div className="console-panel">
      {/* ─── Workstation Dossier Header ─────────────────────────────── */}
      <div className="dossier-header flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2">
          <span className="dossier-num">[{sectionNumber}]</span>
          <span>FINDINGS & SECURITY HYGIENE DOSSIER</span>
          <span className="text-[11px] text-[#8b9bb0] ml-2">
            {findings.length} RECORDED SIGNALS
          </span>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1 font-mono text-xs">
          {['ALL', 'high', 'medium', 'low', 'informational'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase cursor-pointer border ${
                selectedSeverity === sev
                  ? 'border-[#58a6ff] bg-[#15273b] text-[#58a6ff]'
                  : 'border-[#1e2631] bg-[#0c1015] text-[#8b9bb0] hover:text-[#e6edf3]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Epistemology Bar ───────────────────────────────────────── */}
      <div className="border-b border-[#1e2631] bg-[#080b0f] px-3 py-1.5 text-[10px] font-mono text-[#8b9bb0] flex items-center justify-between">
        <span>
          <strong className="text-[#e6edf3]">EPISTEMOLOGY NOTICE:</strong> <em>“We did not observe X” ≠ “X does not exist.”</em> Missing evidence represents an unobserved public control, not a confirmed vulnerability.
        </span>
        {onOpenGlossary && (
          <button
            type="button"
            onClick={() => onOpenGlossary('passive_osint')}
            className="text-[#58a6ff] hover:underline shrink-0 ml-2"
          >
            [?] GUIDE
          </button>
        )}
      </div>

      {/* ─── Findings Records List ──────────────────────────────────── */}
      <div className="divide-y divide-[#1e2631] bg-[#0c1015]">
        {filteredFindings.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs">
            <ShieldCheck size={28} className="mx-auto text-[#3fb950] mb-2" />
            <div className="font-bold text-[#e6edf3]">
              NO HYGIENE WEAKNESSES OBSERVED
            </div>
            <div className="text-[11px] text-[#576575] mt-1">
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

            let statusBorder = 'border-[#1e2631] text-[#8b9bb0]';
            let statusLabel = 'NOT OBSERVED';

            if (obsStatus === 'observed') {
              statusBorder = 'border-[#2ea043]/40 bg-[#0f2214] text-[#3fb950]';
              statusLabel = 'OBSERVED';
            } else if (obsStatus === 'not_observed') {
              statusBorder = 'border-[#bb8009]/40 bg-[#251a08] text-[#d29922]';
              statusLabel = 'NOT OBSERVED';
            } else if (obsStatus === 'check_failed') {
              statusBorder = 'border-[#1e2631] bg-[#10151b] text-[#576575]';
              statusLabel = 'CHECK FAILED (UNVERIFIED)';
            } else if (obsStatus === 'not_applicable') {
              statusBorder = 'border-[#1e2631] bg-[#10151b] text-[#576575]';
              statusLabel = 'NOT APPLICABLE';
            }

            return (
              <div key={finding.id} className="p-3 bg-[#10151b] hover:bg-[#131b23] transition-colors">
                <div
                  onClick={() => toggleExpand(finding.id)}
                  className="cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 font-mono">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className={`px-1.5 py-0.2 border font-bold flex items-center gap-1 ${sev.borderClass} ${sev.textClass}`}>
                        <Icon size={10} />
                        [{sev.label}]
                      </span>
                      <span className={`px-1.5 py-0.2 border font-bold ${statusBorder}`}>
                        STATUS: {statusLabel}
                      </span>
                      <span className="text-[#576575]">
                        CATEGORY: {finding.category.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#e6edf3]">
                      {finding.title}
                    </div>

                    <div className="text-[11px] text-[#8b9bb0] font-sans line-clamp-2">
                      {finding.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="border border-[#1e2631] bg-[#0c1015] p-1 text-[#8b9bb0] hover:text-[#e6edf3] shrink-0"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* ─── Expandable Structured Dossier Pillars ────────── */}
                {isExpanded && (
                  <div className="mt-3 bg-[#0c1015] border border-[#1e2631] p-3 space-y-3 font-mono text-xs">
                    {/* Pillar 1: Evidence */}
                    <div>
                      <div className="text-[10px] text-[#58a6ff] uppercase font-bold mb-0.5">
                        [01] OBSERVED EVIDENCE
                      </div>
                      <div className="text-[#e6edf3] text-xs font-sans leading-relaxed">
                        {finding.description}
                      </div>
                    </div>

                    {/* Pillar 2: Why It Matters */}
                    {finding.whyItMatters && (
                      <div className="border-t border-[#1e2631] pt-2">
                        <div className="text-[10px] text-[#d29922] uppercase font-bold mb-0.5">
                          [02] WHY IT MATTERS
                        </div>
                        <div className="text-[#8b9bb0] text-xs font-sans leading-relaxed">
                          {finding.whyItMatters}
                        </div>
                      </div>
                    )}

                    {/* Pillar 3: Recommended Action */}
                    <div className="border-t border-[#1e2631] pt-2">
                      <div className="text-[10px] text-[#3fb950] uppercase font-bold mb-0.5">
                        [03] RECOMMENDED VERIFICATION / REMEDIATION
                      </div>
                      {finding.investigationSteps && finding.investigationSteps.length > 0 ? (
                        <ul className="space-y-1 text-xs text-[#e6edf3] font-sans">
                          {finding.investigationSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#3fb950] font-mono">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-[#e6edf3] text-xs font-sans leading-relaxed">
                          {finding.recommendation}
                        </div>
                      )}
                    </div>

                    {/* Pillar 4: Backing Probes */}
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="border-t border-[#1e2631] pt-2">
                        <div className="text-[10px] text-[#576575] uppercase font-bold mb-1">
                          [04] BACKING PROBES & TIMESTAMPS
                        </div>
                        <div className="space-y-1">
                          {finding.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              className="bg-[#10151b] border border-[#1e2631] p-1.5 flex items-start justify-between gap-2 text-[11px]"
                            >
                              <div>
                                <span className="text-[#58a6ff] font-bold">{ev.source}:</span>{' '}
                                <span className="text-[#8b9bb0]">{ev.description}</span>
                              </div>
                              <span className="text-[10px] text-[#576575] shrink-0 uppercase">
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
