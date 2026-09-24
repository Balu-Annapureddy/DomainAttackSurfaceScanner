import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ShieldCheck, HelpCircle } from 'lucide-react';
import type { Finding, FindingSeverity } from '../../../shared/types';

interface FindingsSectionProps {
  findings: Finding[];
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

export default function FindingsSection({ findings }: FindingsSectionProps) {
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
              {findings.length} observed configuration signal{findings.length === 1 ? '' : 's'}
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
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>
                  </div>

                  <button className="text-slate-500 hover:text-slate-300 p-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded Details: Recommendation & Evidence */}
                {isExpanded && (
                  <div className="ml-10 mt-3 space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-4">
                    {/* Recommendation */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        Recommended Action
                      </span>
                      <p className="mt-1 text-xs text-slate-300">
                        {finding.recommendation}
                      </p>
                    </div>

                    {/* Evidence */}
                    {finding.evidence && finding.evidence.length > 0 && (
                      <div className="border-t border-slate-800/60 pt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Supporting Observation Evidence
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
