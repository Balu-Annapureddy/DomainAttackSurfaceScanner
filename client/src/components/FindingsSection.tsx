import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldCheck, HelpCircle } from 'lucide-react';
import type { Finding, FindingSeverity } from '../../../shared/types';

interface FindingsSectionProps {
  findings: Finding[];
  onOpenGlossary?: (termKey: string) => void;
}

const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; bg: string; border: string; text: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  high: {
    label: 'High Priority',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    icon: AlertCircle,
  },
  medium: {
    label: 'Medium Consideration',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: AlertTriangle,
  },
  low: {
    label: 'Low / Hygiene',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    icon: Info,
  },
  informational: {
    label: 'Informational',
    bg: 'bg-slate-800/60',
    border: 'border-slate-700',
    text: 'text-slate-400',
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
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Security Hygiene & Configuration Considerations</h2>
            <p className="text-xs text-slate-400">
              {findings.length} observed configuration signal{findings.length === 1 ? '' : 's'} • Contextual, non-intrusive takeaways
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium uppercase tracking-wider transition ${
                selectedSeverity === sev
                  ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                  : 'border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Passive Observation Notice */}
      <div className="border-b border-slate-800/60 bg-slate-950/50 px-5 py-2.5 text-[11px] text-slate-400 flex items-center justify-between">
        <span>
          💡 <strong>Passive Analysis Rule:</strong> <em>“We did not observe X” ≠ “X does not exist.”</em> Gaps indicate unobserved public headers or records, not confirmed exploitable vulnerabilities.
        </span>
        {onOpenGlossary && (
          <button
            type="button"
            onClick={() => onOpenGlossary('passive_osint')}
            className="text-cyan-400 hover:text-cyan-300 underline font-medium ml-2 shrink-0"
          >
            Learn more
          </button>
        )}
      </div>

      {/* Findings List */}
      <div className="divide-y divide-slate-800/60 p-4">
        {filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <ShieldCheck size={36} className="mb-2 text-emerald-400" />
            <p className="text-sm font-semibold text-white">No Hygiene Weaknesses Identified</p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              All inspected categories demonstrated expected public security configurations and standard headers.
            </p>
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const isExpanded = expandedIds.has(finding.id);
            const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.informational;
            const Icon = sev.icon;
            const obsStatus = finding.observationStatus ?? (finding.title.toLowerCase().includes('missing') || finding.title.toLowerCase().includes('not observed') ? 'not_observed' : 'observed');

            return (
              <div
                key={finding.id}
                className="py-3.5 transition first:pt-1 last:pb-1"
              >
                <div
                  onClick={() => toggleExpand(finding.id)}
                  className="flex cursor-pointer items-start justify-between gap-4 rounded-xl p-2.5 hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border ${sev.border} ${sev.bg} ${sev.text}`}
                    >
                      <Icon size={15} />
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">
                          {finding.title}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.2 text-[10px] font-semibold uppercase tracking-wider ${sev.border} ${sev.bg} ${sev.text}`}
                        >
                          {sev.label}
                        </span>
                        <span className="rounded-md border border-slate-800 bg-slate-950 px-2 py-0.2 text-[10px] uppercase tracking-wider text-slate-400">
                          {finding.category}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.2 text-[10px] font-medium uppercase tracking-wider ${
                            obsStatus === 'observed'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : obsStatus === 'not_observed'
                              ? 'border-slate-700 bg-slate-800/60 text-slate-300'
                              : obsStatus === 'check_failed'
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                              : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                        >
                          {obsStatus === 'not_observed' ? 'Not Observed' : obsStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>
                  </div>

                  <button className="text-slate-500 hover:text-slate-300 p-1 shrink-0">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded Details: 4 Clear Pillars */}
                {isExpanded && (
                  <div className="ml-10 mt-3 space-y-3.5 rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
                    {/* 1. What We Found */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        1. What Was Observed
                      </span>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>

                    {/* 2. Why It Matters */}
                    {finding.whyItMatters && (
                      <div className="border-t border-slate-800/60 pt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          2. Why It Matters
                        </span>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          {finding.whyItMatters}
                        </p>
                      </div>
                    )}

                    {/* 3. Investigation Steps / Recommendations */}
                    <div className="border-t border-slate-800/60 pt-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        3. What You Can Investigate & Remediate
                      </span>
                      {finding.investigationSteps && finding.investigationSteps.length > 0 ? (
                        <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                          {finding.investigationSteps.map((step, sIdx) => (
                            <li key={sIdx} className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-slate-300">
                          {finding.recommendation}
                        </p>
                      )}
                    </div>

                    {/* 4. Supporting Evidence */}
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="border-t border-slate-800/60 pt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          4. Backing Observation Evidence
                        </span>
                        <div className="mt-1.5 space-y-2">
                          {finding.evidence.map((ev, idx) => (
                            <div
                              key={idx}
                              className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="font-semibold text-slate-200">
                                  {ev.source}
                                </span>
                                <p className="text-slate-400">{ev.description}</p>
                              </div>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  ev.confidence === 'high'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                }`}
                              >
                                {ev.confidence} confidence
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
