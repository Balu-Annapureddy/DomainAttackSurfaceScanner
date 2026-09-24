import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Radar,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Layers,
  Lock,
  Globe,
  Calendar,
  AlertTriangle,
  RefreshCw,
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
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white hover:text-cyan-400 transition">
            <Radar className="text-cyan-400" size={22} />
            <span>Domain Attack Surface Scanner</span>
          </Link>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/history" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition">
              <ArrowLeft size={14} />
              Back to History
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-400">Comparing baseline and target scans…</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} className="text-rose-400" />
              <span>Comparison Error</span>
            </div>
            <p className="text-sm">{error}</p>
            <div className="pt-2">
              <Link to="/history" className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:underline">
                <ArrowLeft size={13} /> Return to History
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && comparison && (
          <div className="space-y-8">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 shadow-xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-0.5 text-xs font-medium text-cyan-400">
                      <GitCompare size={13} />
                      Scan Differencing & Drift Detection
                    </span>
                  </div>
                  <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {comparison.domain}
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Comparing historical baseline against current exposure posture.
                  </p>
                </div>

                {/* Score Delta Card */}
                <div className="flex items-center gap-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4 lg:min-w-[300px]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Baseline Score
                    </span>
                    <p className="text-2xl font-extrabold text-slate-300">
                      {comparison.baselineScore ?? '—'}
                      <span className="text-xs font-normal text-slate-500">/100</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center px-2">
                    {comparison.scoreDelta > 0 ? (
                      <div className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                        <TrendingUp size={14} />
                        +{comparison.scoreDelta}
                      </div>
                    ) : comparison.scoreDelta < 0 ? (
                      <div className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400">
                        <TrendingDown size={14} />
                        {comparison.scoreDelta}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-400">
                        <Minus size={14} /> 0
                      </div>
                    )}
                    <span className="mt-1 text-[9px] text-slate-500 uppercase font-semibold">Delta</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Target Score
                    </span>
                    <p className="text-2xl font-extrabold text-white">
                      {comparison.currentScore ?? '—'}
                      <span className="text-xs font-normal text-slate-500">/100</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Scans Meta Bar */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                      Baseline Scan
                    </span>
                    <Link
                      to={`/scan/${comparison.baselineScanId}`}
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      View scan
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300">
                    <Calendar size={12} className="text-slate-500" />
                    {new Date(comparison.baselineCreatedAt).toLocaleString()}
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 truncate">{comparison.baselineScanId}</p>
                </div>

                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800/80 sm:pl-4 pt-2 sm:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-400 uppercase text-[10px] tracking-wider">
                      Target / Current Scan
                    </span>
                    <Link
                      to={`/scan/${comparison.currentScanId}`}
                      className="text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      View scan
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 text-slate-300">
                    <Calendar size={12} className="text-slate-500" />
                    {new Date(comparison.currentCreatedAt).toLocaleString()}
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 truncate">{comparison.currentScanId}</p>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-medium text-slate-400">Added Assets</span>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  +{comparison.addedAssets.length}
                </p>
                <span className="text-[10px] text-slate-500">Newly discovered</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-medium text-slate-400">Removed Assets</span>
                <p className="mt-1 text-2xl font-bold text-rose-400">
                  -{comparison.removedAssets.length}
                </p>
                <span className="text-[10px] text-slate-500">Decommissioned</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-medium text-slate-400">New Findings</span>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  +{comparison.newFindings.length}
                </p>
                <span className="text-[10px] text-slate-500">Introduced issues</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-medium text-slate-400">Resolved Findings</span>
                <p className="mt-1 text-2xl font-bold text-cyan-400">
                  -{comparison.resolvedFindings.length}
                </p>
                <span className="text-[10px] text-slate-500">Remediated issues</span>
              </div>
            </div>

            {/* Certificate & DNS Drift Cards */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Certificate Drift */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-purple-400" />
                    <h3 className="font-semibold text-sm text-slate-100">Certificate Identity & Rotation</h3>
                  </div>
                  {comparison.certificateDiff.changed ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      Certificate Changed
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      No Change
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                    <span className="font-semibold text-slate-400 block text-[11px]">SHA-256 Fingerprint</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
                      <div>
                        <span className="text-slate-500 block">Baseline</span>
                        <span className="truncate block text-slate-300">
                          {comparison.certificateDiff.baselineFingerprint || 'None observed'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Current</span>
                        <span className="truncate block text-cyan-300">
                          {comparison.certificateDiff.currentFingerprint || 'None observed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                    <span className="font-semibold text-slate-400 block text-[11px]">Validity & Expiration</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Baseline Valid To</span>
                        <span className="text-slate-300">
                          {comparison.certificateDiff.baselineValidTo
                            ? new Date(comparison.certificateDiff.baselineValidTo).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Current Valid To</span>
                        <span className="text-cyan-300">
                          {comparison.certificateDiff.currentValidTo
                            ? new Date(comparison.certificateDiff.currentValidTo).toLocaleDateString()
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DNS Drift */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-blue-400" />
                    <h3 className="font-semibold text-sm text-slate-100">DNS & Email Security Drift</h3>
                  </div>
                  {comparison.dnsDiff.changed ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      DNS Drift Observed
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      No Change
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                    <span className="font-semibold text-slate-400 block text-[11px]">SPF Record Policy</span>
                    {comparison.dnsDiff.baselineSpf !== comparison.dnsDiff.currentSpf ? (
                      <div className="space-y-1 text-[11px]">
                        <p className="text-rose-400/90 font-mono text-[10px]">
                          - {comparison.dnsDiff.baselineSpf || '(none)'}
                        </p>
                        <p className="text-emerald-400 font-mono text-[10px]">
                          + {comparison.dnsDiff.currentSpf || '(none)'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400 font-mono text-[10px]">
                        {comparison.dnsDiff.currentSpf || 'Consistent (no changes)'}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                    <span className="font-semibold text-slate-400 block text-[11px]">DMARC Record Policy</span>
                    {comparison.dnsDiff.baselineDmarc !== comparison.dnsDiff.currentDmarc ? (
                      <div className="space-y-1 text-[11px]">
                        <p className="text-rose-400/90 font-mono text-[10px]">
                          - {comparison.dnsDiff.baselineDmarc || '(none)'}
                        </p>
                        <p className="text-emerald-400 font-mono text-[10px]">
                          + {comparison.dnsDiff.currentDmarc || '(none)'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-400 font-mono text-[10px]">
                        {comparison.dnsDiff.currentDmarc || 'Consistent (no changes)'}
                      </p>
                    )}
                  </div>

                  {(comparison.dnsDiff.addedNameservers.length > 0 || comparison.dnsDiff.removedNameservers.length > 0) && (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                      <span className="font-semibold text-slate-400 block text-[11px]">Nameserver Changes</span>
                      {comparison.dnsDiff.addedNameservers.map((ns) => (
                        <p key={ns} className="text-emerald-400 text-[10px] font-mono">+ {ns}</p>
                      ))}
                      {comparison.dnsDiff.removedNameservers.map((ns) => (
                        <p key={ns} className="text-rose-400 text-[10px] font-mono">- {ns}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Findings Diff Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Posture & Weakness Drift</h2>
                </div>
                <span className="text-xs text-slate-500">
                  {comparison.persistingFindingsCount} findings persisted across scans
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* New Findings */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <XCircle size={14} /> New Weaknesses Introduced ({comparison.newFindings.length})
                    </span>
                  </div>
                  {comparison.newFindings.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No new weaknesses introduced since baseline scan.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {comparison.newFindings.map((f, i) => (
                        <div key={i} className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-300">{f.title}</span>
                            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-rose-300">
                              {f.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resolved Findings */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle size={14} /> Remediated / Resolved Issues ({comparison.resolvedFindings.length})
                    </span>
                  </div>
                  {comparison.resolvedFindings.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No weaknesses resolved compared to baseline scan.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {comparison.resolvedFindings.map((f, i) => (
                        <div key={i} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-300">{f.title}</span>
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-300">
                              Resolved
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Asset Inventory Diff Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">Asset Inventory Drift</h2>
                </div>
                <span className="text-xs text-slate-500">
                  {comparison.persistedAssetsCount} assets unchanged
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Added Assets */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Added Assets ({comparison.addedAssets.length})
                  </span>
                  {comparison.addedAssets.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No new assets discovered in current scan.
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {comparison.addedAssets.map((asset, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
                        >
                          <span className="font-mono text-emerald-300 truncate max-w-[240px]">
                            {asset.value}
                          </span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 uppercase">
                            {asset.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Removed Assets */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                    Removed / Decommissioned Assets ({comparison.removedAssets.length})
                  </span>
                  {comparison.removedAssets.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">
                      No baseline assets disappeared.
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {comparison.removedAssets.map((asset, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs"
                        >
                          <span className="font-mono text-rose-300 truncate max-w-[240px]">
                            {asset.value}
                          </span>
                          <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 uppercase">
                            {asset.type}
                          </span>
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
