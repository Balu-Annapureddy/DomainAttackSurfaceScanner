import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Globe,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { ScanComparison } from '../../../shared/types';
import { getScanComparison } from '../lib/api';
import WorkstationNav from '../components/WorkstationNav';

export default function ComparisonPage() {
  const { baseId, targetId } = useParams<{ baseId: string; targetId: string }>();
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function loadDiff() {
      if (!baseId || !targetId) {
        setError('Both baseline and target scan IDs are required for comparison.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getScanComparison(baseId, targetId);
        if (!isCancelled) {
          setComparison(data);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to compare scans');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadDiff();
    return () => {
      isCancelled = true;
    };
  }, [baseId, targetId]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-mono pb-16 transition-colors duration-150 flex flex-col">
      <WorkstationNav />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6 w-full flex-1">
        {loading && (
          <div className="console-panel p-16 text-center space-y-3">
            <RefreshCw className="h-7 w-7 animate-spin text-[var(--accent-primary)] mx-auto" />
            <p className="text-xs text-[var(--text-secondary)]">CALCULATING PERIMETER DELTA & CERTIFICATE ROTATION…</p>
          </div>
        )}

        {error && (
          <div className="console-panel-inset border-l-2 border-l-red-500 p-4 text-xs text-red-500 space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={15} />
              <span>[COMPARISON ENGINE ERROR]: {error}</span>
            </div>
            <Link to="/history" className="text-[var(--accent-primary)] hover:underline block pt-1">
              [Return to Scan History]
            </Link>
          </div>
        )}

        {!loading && !error && comparison && (
          <div className="space-y-6">
            {/* ─── Header Banner ───────────────────────────────────── */}
            <div className="console-panel p-5 space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border-technical)] pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="console-tag console-tag-cyan">
                      <GitCompare size={12} /> SCAN_DIFFERENCING_ENGINE
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    {comparison.domain}
                  </h1>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] font-sans">
                    Deterministic diff calculating asset additions/removals, certificate rotation, and hygiene drift.
                  </p>
                </div>

                {/* Score Delta Pill */}
                <div className="flex items-center gap-4 console-panel-inset p-3 border border-[var(--border-muted)]">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">BASELINE SCORE</span>
                    <span className="text-xl font-bold text-[var(--text-secondary)]">
                      {comparison.baselineScore ?? '—'}
                    </span>
                  </div>

                  <div className="text-center px-2">
                    {comparison.scoreDelta > 0 ? (
                      <span className="console-tag console-tag-phosphor">
                        <TrendingUp size={11} /> +{comparison.scoreDelta}
                      </span>
                    ) : comparison.scoreDelta < 0 ? (
                      <span className="console-tag console-tag-coral">
                        <TrendingDown size={11} /> {comparison.scoreDelta}
                      </span>
                    ) : (
                      <span className="console-tag">
                        <Minus size={11} /> 0
                      </span>
                    )}
                    <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">DELTA</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">TARGET SCORE</span>
                    <span className="text-xl font-bold text-[var(--text-primary)]">
                      {comparison.currentScore ?? '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scans Baseline & Target Meta */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="console-panel-inset p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      BASELINE SCAN (T0)
                    </span>
                    <Link
                      to={`/scan/${comparison.baselineScanId}`}
                      className="text-[var(--accent-primary)] hover:underline text-[10px]"
                    >
                      [VIEW SCAN]
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-primary)]">
                    <Calendar size={11} className="text-[var(--text-muted)]" />
                    <span>{new Date(comparison.baselineCreatedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block truncate">{comparison.baselineScanId}</span>
                </div>

                <div className="console-panel-inset p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                      TARGET SCAN (T1)
                    </span>
                    <Link
                      to={`/scan/${comparison.currentScanId}`}
                      className="text-[var(--accent-primary)] hover:underline text-[10px]"
                    >
                      [VIEW SCAN]
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-primary)]">
                    <Calendar size={11} className="text-[var(--text-muted)]" />
                    <span>{new Date(comparison.currentCreatedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] block truncate">{comparison.currentScanId}</span>
                </div>
              </div>
            </div>

            {/* ─── Metric Blocks ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-secondary)] block">ADDED ASSETS</span>
                <span className="text-xl font-bold text-emerald-500 block">
                  +{comparison.addedAssets.length}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Newly discovered</span>
              </div>

              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-secondary)] block">REMOVED ASSETS</span>
                <span className="text-xl font-bold text-red-500 block">
                  -{comparison.removedAssets.length}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Decommissioned</span>
              </div>

              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-secondary)] block">NEW FINDINGS</span>
                <span className="text-xl font-bold text-amber-500 block">
                  +{comparison.newFindings.length}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Introduced issues</span>
              </div>

              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[var(--text-secondary)] block">RESOLVED FINDINGS</span>
                <span className="text-xl font-bold text-[var(--accent-primary)] block">
                  -{comparison.resolvedFindings.length}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Remediated issues</span>
              </div>
            </div>

            {/* ─── Certificate & DNS Drift Cards ───────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs">
              {/* Certificate Drift */}
              <div className="console-panel p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-technical)] pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                    <Lock size={13} className="text-purple-400" />
                    <span>CERTIFICATE ROTATION & IDENTITY</span>
                  </div>
                  {comparison.certificateDiff.changed ? (
                    <span className="console-tag console-tag-amber text-[10px]">
                      ROTATION_DETECTED
                    </span>
                  ) : (
                    <span className="console-tag text-[10px]">NO_CHANGE</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="console-panel-inset p-2.5">
                    <span className="text-[10px] text-[var(--text-muted)] block">SHA-256 FINGERPRINT:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <div className="truncate">
                        <span className="text-[10px] text-[var(--text-secondary)] block">Baseline:</span>
                        <span className="text-[10px] text-[var(--text-muted)] truncate block">
                          {comparison.certificateDiff.baselineFingerprint || 'None observed'}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-[var(--text-secondary)] block">Current:</span>
                        <span className="text-[10px] text-[var(--accent-primary)] truncate block">
                          {comparison.certificateDiff.currentFingerprint || 'None observed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="console-panel-inset p-2.5 flex justify-between">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Baseline Valid To:</span>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {comparison.certificateDiff.baselineValidTo || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Current Valid To:</span>
                      <span className="text-[11px] text-[var(--accent-primary)]">
                        {comparison.certificateDiff.currentValidTo || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DNS Drift */}
              <div className="console-panel p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-technical)] pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                    <Globe size={13} className="text-[var(--accent-primary)]" />
                    <span>DNS & EMAIL SECURITY DRIFT</span>
                  </div>
                  {comparison.dnsDiff.changed ? (
                    <span className="console-tag console-tag-amber text-[10px]">
                      DNS_DRIFT_OBSERVED
                    </span>
                  ) : (
                    <span className="console-tag text-[10px]">NO_CHANGE</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="console-panel-inset p-2.5 flex justify-between">
                    <span className="text-[var(--text-secondary)]">SPF Policy Drift:</span>
                    <span className={comparison.dnsDiff.baselineSpf !== comparison.dnsDiff.currentSpf ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)]'}>
                      {comparison.dnsDiff.baselineSpf !== comparison.dnsDiff.currentSpf ? 'MODIFIED' : 'NO CHANGE'}
                    </span>
                  </div>
                  <div className="console-panel-inset p-2.5 flex justify-between">
                    <span className="text-[var(--text-secondary)]">DMARC Policy Drift:</span>
                    <span className={comparison.dnsDiff.baselineDmarc !== comparison.dnsDiff.currentDmarc ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)]'}>
                      {comparison.dnsDiff.baselineDmarc !== comparison.dnsDiff.currentDmarc ? 'MODIFIED' : 'NO CHANGE'}
                    </span>
                  </div>
                  <div className="console-panel-inset p-2.5 flex justify-between">
                    <span className="text-[var(--text-secondary)]">Nameservers Drift:</span>
                    <span className={comparison.dnsDiff.addedNameservers.length > 0 || comparison.dnsDiff.removedNameservers.length > 0 ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)]'}>
                      {comparison.dnsDiff.addedNameservers.length > 0 || comparison.dnsDiff.removedNameservers.length > 0 ? 'MODIFIED' : 'NO CHANGE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Detailed Asset Additions / Deletions ─────────────── */}
            <div className="console-panel p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border-technical)] pb-2">
                <span className="font-bold text-[var(--text-primary)]">ASSET DELTA INVENTORY</span>
                <span className="console-tag">DETERMINISTIC_DIFF</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Added Assets */}
                <div className="space-y-2">
                  <span className="text-[10px] text-emerald-500 font-bold block">
                    + NEWLY DISCOVERED ENTITIES ({comparison.addedAssets.length})
                  </span>
                  {comparison.addedAssets.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-[11px]">No new assets detected.</p>
                  ) : (
                    <div className="space-y-1">
                      {comparison.addedAssets.map((a) => (
                        <div key={a.id} className="console-panel-inset p-2 flex items-center justify-between">
                          <span className="text-[var(--text-primary)] font-bold truncate max-w-[240px]">{a.value}</span>
                          <span className="console-tag text-[9px]">{a.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Removed Assets */}
                <div className="space-y-2">
                  <span className="text-[10px] text-red-500 font-bold block">
                    - DECOMMISSIONED / UNRESOLVED ENTITIES ({comparison.removedAssets.length})
                  </span>
                  {comparison.removedAssets.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-[11px]">No decommissioned assets detected.</p>
                  ) : (
                    <div className="space-y-1">
                      {comparison.removedAssets.map((a) => (
                        <div key={a.id} className="console-panel-inset p-2 flex items-center justify-between">
                          <span className="text-[var(--text-secondary)] line-through truncate max-w-[240px]">{a.value}</span>
                          <span className="console-tag text-[9px]">{a.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
