import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Globe,
  RefreshCw,
  X,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import type { ScanComparison } from '../../../shared/types';
import { getScanComparison } from '../lib/api';

export interface HistoryItem {
  scanId: string;
  domain: string;
  createdAt: string;
  status?: string;
  score?: number | null;
  assetCount?: number;
  findingCount?: number;
  warningsCount?: number;
}

interface IntelligenceTimelineProps {
  domain: string;
  scans: HistoryItem[];
  onClose: () => void;
}

interface TimelineStep {
  scan: HistoryItem;
  comparison?: ScanComparison | null;
  error?: string | null;
}

export default function IntelligenceTimeline({ domain, scans, onClose }: IntelligenceTimelineProps) {
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [loading, setLoading] = useState(true);

  // Chronological sort: oldest first
  const sortedScans = [...scans].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadTimeline() {
      setLoading(true);
      const computedSteps: TimelineStep[] = [];

      for (let i = 0; i < sortedScans.length; i++) {
        const current = sortedScans[i];
        if (!current) continue;

        if (i === 0) {
          // First scan is the initial baseline
          computedSteps.push({ scan: current });
        } else {
          const baseline = sortedScans[i - 1];
          if (!baseline) continue;

          try {
            const comparison = await getScanComparison(baseline.scanId, current.scanId);
            if (!isCancelled) {
              computedSteps.push({ scan: current, comparison });
            }
          } catch {
            if (!isCancelled) {
              computedSteps.push({
                scan: current,
                error: 'Detailed drift data unavailable (scan may have expired)',
              });
            }
          }
        }
      }

      if (!isCancelled) {
        setSteps(computedSteps);
        setLoading(false);
      }
    }

    void loadTimeline();
    return () => {
      isCancelled = true;
    };
  }, [domain, scans.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <GitCompare size={14} /> Historical Intelligence Timeline
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">{domain}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="h-7 w-7 animate-spin text-cyan-400" />
              <p className="text-xs text-slate-400">Loading historical drift across scans…</p>
            </div>
          )}

          {!loading && steps.length > 0 && (
            <div className="relative border-l-2 border-slate-800 ml-4 space-y-8 pl-6">
              {steps.map((step, idx) => {
                const isInitial = idx === 0;
                const { scan, comparison, error } = step;
                const score = scan.score;

                return (
                  <div key={scan.scanId} className="relative group">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 ${
                        isInitial
                          ? 'border-cyan-400 bg-slate-950'
                          : comparison?.scoreDelta && comparison.scoreDelta < 0
                          ? 'border-rose-400 bg-slate-950'
                          : 'border-emerald-400 bg-slate-950'
                      }`}
                    />

                    {/* Step Card */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 space-y-3">
                      {/* Step Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                            Scan #{idx + 1}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar size={12} className="text-slate-500" />
                            {new Date(scan.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {score !== undefined && score !== null && (
                            <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-xs font-bold text-slate-200">
                              Hygiene: {score}/100
                            </span>
                          )}
                          <Link
                            to={`/scan/${scan.scanId}`}
                            className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:underline"
                          >
                            Open scan <ExternalLink size={11} />
                          </Link>
                        </div>
                      </div>

                      {/* Content: Initial Baseline vs Drift */}
                      {isInitial ? (
                        <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                            <CheckCircle size={14} className="text-cyan-400" />
                            <span>Initial Attack Surface Baseline Established</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">
                            Discovered initial perimeter: {scan.assetCount ?? 'N/A'} assets,{' '}
                            {scan.findingCount ?? 'N/A'} hygiene findings.
                          </p>
                        </div>
                      ) : comparison ? (
                        <div className="space-y-3">
                          {/* Score Delta & Quick Stats */}
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {comparison.scoreDelta > 0 ? (
                              <span className="flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-emerald-400 font-semibold text-[11px]">
                                <TrendingUp size={13} /> +{comparison.scoreDelta} Posture Score
                              </span>
                            ) : comparison.scoreDelta < 0 ? (
                              <span className="flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-rose-400 font-semibold text-[11px]">
                                <TrendingDown size={13} /> {comparison.scoreDelta} Posture Score
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-slate-400 font-semibold text-[11px]">
                                <Minus size={13} /> Score Unchanged
                              </span>
                            )}

                            {comparison.addedAssets.length > 0 && (
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-300 text-[11px]">
                                +{comparison.addedAssets.length} Assets Discovered
                              </span>
                            )}

                            {comparison.removedAssets.length > 0 && (
                              <span className="rounded bg-rose-500/10 px-2 py-0.5 text-rose-300 text-[11px]">
                                -{comparison.removedAssets.length} Assets Removed
                              </span>
                            )}

                            {comparison.resolvedFindings.length > 0 && (
                              <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-cyan-300 text-[11px]">
                                -{comparison.resolvedFindings.length} Findings Remediated
                              </span>
                            )}

                            {comparison.newFindings.length > 0 && (
                              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 text-[11px]">
                                +{comparison.newFindings.length} New Findings
                              </span>
                            )}
                          </div>

                          {/* Major Drifts */}
                          {(comparison.certificateDiff.changed || comparison.dnsDiff.changed) && (
                            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs space-y-1">
                              {comparison.certificateDiff.changed && (
                                <div className="flex items-center gap-1.5 text-purple-300">
                                  <Lock size={12} />
                                  <span>TLS Certificate Rotation / Validity Drift Observed</span>
                                </div>
                              )}
                              {comparison.dnsDiff.changed && (
                                <div className="flex items-center gap-1.5 text-blue-300">
                                  <Globe size={12} />
                                  <span>DNS / Email Anti-Spoofing Policy Drift Observed</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="pt-1">
                            <Link
                              to={`/compare/${comparison.baselineScanId}/${comparison.currentScanId}`}
                              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              <GitCompare size={12} />
                              Open Full Side-by-Side Comparison
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          {error || 'Historical drift data could not be computed.'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-6 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
