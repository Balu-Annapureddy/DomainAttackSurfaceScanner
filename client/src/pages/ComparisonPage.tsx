import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Globe,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import type { ScanComparison } from '../../../shared/types';
import { getScanComparison } from '../lib/api';

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
    <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] font-mono pb-16">
      {/* ─── Top Console Header ───────────────────────────────────── */}
      <header className="border-b border-[#1f2735] bg-[#111620]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-mono text-sm font-bold tracking-tight text-[#e6edf3] hover:text-[#58a6ff] transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[#388bfd]/40 bg-[#162030] text-[#58a6ff]">
              <Terminal size={15} />
            </div>
            <span>DOMAIN ATTACK SURFACE SCANNER</span>
          </Link>

          <Link
            to="/history"
            className="console-btn py-1.5 px-3 text-xs text-[#9aa5b8]"
          >
            <ArrowLeft size={13} />
            <span>RETURN TO HISTORY</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {loading && (
          <div className="console-panel p-16 text-center space-y-3">
            <RefreshCw className="h-7 w-7 animate-spin text-[#58a6ff] mx-auto" />
            <p className="text-xs text-[#9aa5b8]">CALCULATING PERIMETER DELTA & CERTIFICATE ROTATION…</p>
          </div>
        )}

        {error && (
          <div className="console-panel-inset border-l-2 border-l-[#f85149] p-4 text-xs text-[#f85149] space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={15} />
              <span>[COMPARISON ENGINE ERROR]: {error}</span>
            </div>
            <Link to="/history" className="text-[#58a6ff] hover:underline block pt-1">
              [Return to Scan History]
            </Link>
          </div>
        )}

        {!loading && !error && comparison && (
          <div className="space-y-6">
            {/* ─── Header Banner ───────────────────────────────────── */}
            <div className="console-panel p-5 space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#1f2735] pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="console-tag console-tag-cyan">
                      <GitCompare size={12} /> SCAN_DIFFERENCING_ENGINE
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#e6edf3]">
                    {comparison.domain}
                  </h1>
                  <p className="mt-0.5 text-xs text-[#9aa5b8] font-sans">
                    Deterministic diff calculating asset additions/removals, certificate rotation, and hygiene drift.
                  </p>
                </div>

                {/* Score Delta Pill */}
                <div className="flex items-center gap-4 console-panel-inset p-3 border border-[#1f2735]">
                  <div>
                    <span className="text-[10px] text-[#626e82] block">BASELINE SCORE</span>
                    <span className="text-xl font-bold text-[#9aa5b8]">
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
                    <span className="text-[9px] text-[#626e82] block mt-0.5">DELTA</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#626e82] block">TARGET SCORE</span>
                    <span className="text-xl font-bold text-[#e6edf3]">
                      {comparison.currentScore ?? '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scans Baseline & Target Meta */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="console-panel-inset p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#626e82]">
                      BASELINE SCAN (T0)
                    </span>
                    <Link
                      to={`/scan/${comparison.baselineScanId}`}
                      className="text-[#58a6ff] hover:underline text-[10px]"
                    >
                      [VIEW SCAN]
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-[#e6edf3]">
                    <Calendar size={11} className="text-[#626e82]" />
                    <span>{new Date(comparison.baselineCreatedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                  </div>
                  <span className="text-[10px] text-[#626e82] block truncate">{comparison.baselineScanId}</span>
                </div>

                <div className="console-panel-inset p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff]">
                      TARGET SCAN (T1)
                    </span>
                    <Link
                      to={`/scan/${comparison.currentScanId}`}
                      className="text-[#58a6ff] hover:underline text-[10px]"
                    >
                      [VIEW SCAN]
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-[#e6edf3]">
                    <Calendar size={11} className="text-[#626e82]" />
                    <span>{new Date(comparison.currentCreatedAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</span>
                  </div>
                  <span className="text-[10px] text-[#626e82] block truncate">{comparison.currentScanId}</span>
                </div>
              </div>
            </div>

            {/* ─── Metric Blocks ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[#9aa5b8] block">ADDED ASSETS</span>
                <span className="text-xl font-bold text-[#3fb950] block">
                  +{comparison.addedAssets.length}
                </span>
                <span className="text-[10px] text-[#626e82] block">Newly discovered</span>
              </div>

              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[#9aa5b8] block">REMOVED ASSETS</span>
                <span className="text-xl font-bold text-[#f85149] block">
                  -{comparison.removedAssets.length}
                </span>
                <span className="text-[10px] text-[#626e82] block">Decommissioned</span>
              </div>

              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[#9aa5b8] block">NEW FINDINGS</span>
                <span className="text-xl font-bold text-[#d29922] block">
                  +{comparison.newFindings.length}
                </span>
                <span className="text-[10px] text-[#626e82] block">Introduced issues</span>
              </div>

              <div className="console-panel-inset p-3.5 space-y-1">
                <span className="text-[10px] text-[#9aa5b8] block">RESOLVED FINDINGS</span>
                <span className="text-xl font-bold text-[#58a6ff] block">
                  -{comparison.resolvedFindings.length}
                </span>
                <span className="text-[10px] text-[#626e82] block">Remediated issues</span>
              </div>
            </div>

            {/* ─── Certificate & DNS Drift Cards ───────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 text-xs">
              {/* Certificate Drift */}
              <div className="console-panel p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#e6edf3]">
                    <Lock size={13} className="text-[#8a63d2]" />
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
                    <span className="text-[10px] text-[#626e82] block">SHA-256 FINGERPRINT:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      <div className="truncate">
                        <span className="text-[10px] text-[#9aa5b8] block">Baseline:</span>
                        <span className="text-[10px] text-[#626e82] truncate block">
                          {comparison.certificateDiff.baselineFingerprint || 'None observed'}
                        </span>
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-[#9aa5b8] block">Current:</span>
                        <span className="text-[10px] text-[#58a6ff] truncate block">
                          {comparison.certificateDiff.currentFingerprint || 'None observed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="console-panel-inset p-2.5 flex justify-between">
                    <div>
                      <span className="text-[10px] text-[#626e82] block">Baseline Valid To:</span>
                      <span className="text-[11px] text-[#9aa5b8]">
                        {comparison.certificateDiff.baselineValidTo || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#626e82] block">Current Valid To:</span>
                      <span className="text-[11px] text-[#58a6ff]">
                        {comparison.certificateDiff.currentValidTo || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DNS Drift */}
              <div className="console-panel p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#e6edf3]">
                    <Globe size={13} className="text-[#58a6ff]" />
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
                    <span className="text-[#9aa5b8]">SPF Policy Drift:</span>
                    <span className={comparison.dnsDiff.baselineSpf !== comparison.dnsDiff.currentSpf ? 'text-[#d29922] font-bold' : 'text-[#626e82]'}>
                      {comparison.dnsDiff.baselineSpf !== comparison.dnsDiff.currentSpf ? 'MODIFIED' : 'NO CHANGE'}
                    </span>
                  </div>
                  <div className="console-panel-inset p-2.5 flex justify-between">
                    <span className="text-[#9aa5b8]">DMARC Policy Drift:</span>
                    <span className={comparison.dnsDiff.baselineDmarc !== comparison.dnsDiff.currentDmarc ? 'text-[#d29922] font-bold' : 'text-[#626e82]'}>
                      {comparison.dnsDiff.baselineDmarc !== comparison.dnsDiff.currentDmarc ? 'MODIFIED' : 'NO CHANGE'}
                    </span>
                  </div>
                  <div className="console-panel-inset p-2.5 flex justify-between">
                    <span className="text-[#9aa5b8]">Nameservers Drift:</span>
                    <span className={comparison.dnsDiff.addedNameservers.length > 0 || comparison.dnsDiff.removedNameservers.length > 0 ? 'text-[#d29922] font-bold' : 'text-[#626e82]'}>
                      {comparison.dnsDiff.addedNameservers.length > 0 || comparison.dnsDiff.removedNameservers.length > 0 ? 'MODIFIED' : 'NO CHANGE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Detailed Asset Additions / Deletions ─────────────── */}
            <div className="console-panel p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                <span className="font-bold text-[#e6edf3]">ASSET DELTA INVENTORY</span>
                <span className="console-tag">DETERMINISTIC_DIFF</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Added Assets */}
                <div className="space-y-2">
                  <span className="text-[10px] text-[#3fb950] font-bold block">
                    + NEWLY DISCOVERED ENTITIES ({comparison.addedAssets.length})
                  </span>
                  {comparison.addedAssets.length === 0 ? (
                    <p className="text-[#626e82] text-[11px]">No new assets detected.</p>
                  ) : (
                    <div className="space-y-1">
                      {comparison.addedAssets.map((a) => (
                        <div key={a.id} className="console-panel-inset p-2 flex items-center justify-between">
                          <span className="text-[#e6edf3] font-bold truncate max-w-[240px]">{a.value}</span>
                          <span className="console-tag text-[9px]">{a.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Removed Assets */}
                <div className="space-y-2">
                  <span className="text-[10px] text-[#f85149] font-bold block">
                    - DECOMMISSIONED / UNRESOLVED ENTITIES ({comparison.removedAssets.length})
                  </span>
                  {comparison.removedAssets.length === 0 ? (
                    <p className="text-[#626e82] text-[11px]">No decommissioned assets detected.</p>
                  ) : (
                    <div className="space-y-1">
                      {comparison.removedAssets.map((a) => (
                        <div key={a.id} className="console-panel-inset p-2 flex items-center justify-between">
                          <span className="text-[#9aa5b8] line-through truncate max-w-[240px]">{a.value}</span>
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
      </div>
    </main>
  );
}
