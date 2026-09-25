import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
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
  const sortedScans = useMemo(
    () => [...scans].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [scans],
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
          computedSteps.push({ scan: current });
        } else {
          const previous = sortedScans[i - 1];
          if (!previous) continue;
          try {
            const comparison = await getScanComparison(previous.scanId, current.scanId);
            computedSteps.push({ scan: current, comparison });
          } catch {
            computedSteps.push({
              scan: current,
              error: 'Historical comparison delta could not be computed (scan expired from memory)',
            });
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
  }, [sortedScans]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs font-mono"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col console-panel shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-technical)] px-5 py-3.5 bg-[var(--bg-panel-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="console-tag console-tag-cyan text-[10px]">
                <GitCompare size={12} /> DRIFT TIMELINE
              </span>
            </div>
            <h2 id="timeline-modal-title" className="text-base font-bold text-[var(--text-primary)] mt-1">{domain}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drift timeline"
            className="console-btn py-1 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs bg-[var(--bg-canvas)]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent-primary)]" />
              <p className="text-xs text-[var(--text-secondary)]">RECONSTRUCTING CHRONOLOGICAL DRIFT…</p>
            </div>
          )}

          {!loading && steps.length > 0 && (
            <div className="relative border-l border-[var(--border-muted)] ml-3 space-y-6 pl-5">
              {steps.map((step, idx) => {
                const isInitial = idx === 0;
                const { scan, comparison } = step;
                const score = scan.score;

                return (
                  <div key={scan.scanId} className="relative">
                    {/* Node Marker */}
                    <div
                      className={`absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                        isInitial
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-panel)]'
                          : comparison?.scoreDelta && comparison.scoreDelta < 0
                          ? 'border-red-500 bg-[var(--bg-panel)]'
                          : 'border-emerald-500 bg-[var(--bg-panel)]'
                      }`}
                    />

                    {/* Step Card */}
                    <div className="console-panel p-4 space-y-3">
                      {/* Step Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-muted)] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="console-tag text-[10px]">
                            SCAN #{idx + 1}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                            <Calendar size={11} />
                            {new Date(scan.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {score !== undefined && score !== null && (
                            <span className="console-tag text-[10px]">
                              HYGIENE: {score}/100
                            </span>
                          )}
                          <Link
                            to={`/scan/${scan.scanId}`}
                            className="text-[var(--accent-primary)] hover:underline flex items-center gap-1 text-[11px]"
                          >
                            [OPEN] <ExternalLink size={10} />
                          </Link>
                        </div>
                      </div>

                      {/* Content: Initial Baseline vs Drift */}
                      {isInitial ? (
                        <div className="console-panel-inset p-3 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                            <CheckCircle size={13} className="text-emerald-500" />
                            <span>INITIAL ATTACK SURFACE BASELINE ESTABLISHED</span>
                          </div>
                          <p className="text-[var(--text-secondary)] font-sans text-[11px]">
                            Observed initial perimeter: {scan.assetCount ?? 'N/A'} assets,{' '}
                            {scan.findingCount ?? 'N/A'} findings.
                          </p>
                        </div>
                      ) : comparison ? (
                        <div className="space-y-2.5">
                          {/* Score Delta */}
                          <div className="flex flex-wrap items-center gap-2">
                            {comparison.scoreDelta > 0 ? (
                              <span className="console-tag console-tag-phosphor text-[10px]">
                                <TrendingUp size={11} /> +{comparison.scoreDelta} POSTURE IMPROVEMENT
                              </span>
                            ) : comparison.scoreDelta < 0 ? (
                              <span className="console-tag console-tag-coral text-[10px]">
                                <TrendingDown size={11} /> {comparison.scoreDelta} POSTURE REGRESSION
                              </span>
                            ) : (
                              <span className="console-tag text-[10px]">
                                <Minus size={11} /> SCORE UNCHANGED
                              </span>
                            )}

                            {comparison.addedAssets.length > 0 && (
                              <span className="console-tag console-tag-cyan text-[10px]">
                                +{comparison.addedAssets.length} NEW ASSETS
                              </span>
                            )}
                            {comparison.removedAssets.length > 0 && (
                              <span className="console-tag console-tag-amber text-[10px]">
                                -{comparison.removedAssets.length} DECOMMISSIONED
                              </span>
                            )}
                          </div>

                          {/* Detail Link */}
                          {sortedScans[idx - 1] && (
                            <div className="pt-1">
                              <Link
                                to={`/compare/${sortedScans[idx - 1]!.scanId}/${scan.scanId}`}
                                className="console-btn py-1 px-2.5 text-[10px] text-[var(--accent-primary)]"
                              >
                                [VIEW COMPLETE DRIFT REPORT]
                              </Link>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="console-panel-inset p-2.5 text-[var(--text-muted)] text-[11px]">
                          BASELINE RECORD EXPIRED // DIFF CANNOT BE COMPUTED
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-muted)] px-5 py-3 bg-[var(--bg-panel-subtle)] flex items-center justify-between text-xs">
          <span className="text-[10px] text-[var(--text-muted)]">CHRONOLOGICAL DRIFT RECONSTRUCTION</span>
          <button
            type="button"
            onClick={onClose}
            className="console-btn py-1 px-3 text-xs"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
