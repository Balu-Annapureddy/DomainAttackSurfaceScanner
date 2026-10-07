import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, Download, FileText, BookOpen, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { exportScanJson } from '../lib/export';

interface ScanOverviewCardProps {
  scan: DomainScan;
  onOpenGlossary?: (termKey: string) => void;
  isGuidedMode?: boolean;
}

export default function ScanOverviewCard({ scan, onOpenGlossary, isGuidedMode }: ScanOverviewCardProps) {
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const score = scan.score ?? 0;
  const hasScore = scan.score !== undefined && scan.score !== null;
  const breakdown = scan.scoreBreakdown;

  const httpData = scan.categories.http?.data as {
    httpsEnforced?: boolean;
    httpRedirectsToHttps?: boolean;
    finalObservedUrl?: string;
    https?: { headers?: Record<string, string> };
  } | undefined;

  const dnsData = scan.categories.dns?.data as {
    records?: {
      TXT?: Array<{ value: string }>;
    };
  } | undefined;

  const checks = useMemo(() => {
    const hasHttps = Boolean(httpData?.httpsEnforced || httpData?.httpRedirectsToHttps);
    const hasTls = scan.categories.tls?.status === 'completed' && Boolean(scan.categories.tls?.data);
    const txts = dnsData?.records?.TXT?.map((t) => t.value) ?? [];
    const hasSpf = txts.some((t) => t.toLowerCase().includes('v=spf1'));
    const hasDmarc = scan.assets?.some((a) => a.value.includes('_dmarc')) || txts.some((t) => t.toLowerCase().includes('v=dmarc1'));

    return [
      { name: 'HTTP', ok: hasHttps, label: hasHttps ? 'ENFORCED' : 'UNENFORCED' },
      { name: 'TLS', ok: hasTls, label: hasTls ? 'OBSERVED' : 'UNAVAILABLE' },
      { name: 'SPF', ok: hasSpf, label: hasSpf ? 'OBSERVED' : 'MISSING' },
      { name: 'DMARC', ok: hasDmarc, label: hasDmarc ? 'OBSERVED' : 'MISSING' },
    ];
  }, [httpData, scan.categories.tls, dnsData, scan.assets]);

  const detectedEdge = useMemo(() => {
    const orgAsset = scan.assets?.find((a) => a.type === 'ORGANIZATION');
    const serverHeader = httpData?.https?.headers?.server?.toLowerCase();
    if (orgAsset?.value?.toLowerCase().includes('cloudflare') || serverHeader?.includes('cloudflare')) {
      return 'Cloudflare Edge';
    }
    if (orgAsset?.value?.toLowerCase().includes('amazon') || orgAsset?.value?.toLowerCase().includes('aws')) {
      return 'AWS Cloud';
    }
    if (orgAsset?.value?.toLowerCase().includes('google')) {
      return 'Google Cloud';
    }
    if (orgAsset?.value?.toLowerCase().includes('fastly')) {
      return 'Fastly CDN';
    }
    return orgAsset?.value ?? 'Direct Origin';
  }, [scan.assets, httpData]);

  const completeness = scan.completeness ?? (scan.status === 'completed' ? 'complete' : scan.status === 'completed_with_warnings' ? 'partial' : 'inconclusive');
  const completenessDetails = scan.completenessDetails ?? {
    completed: Object.values(scan.categories).filter((c) => c.status === 'completed').length,
    total: Object.keys(scan.categories).length - 1,
    failed: Object.entries(scan.categories).filter(([cat, c]) => cat !== 'scoring' && c.status === 'failed').map(([cat]) => cat),
  };

  const findings = scan.findings ?? [];
  const observedCount = findings.filter((f) => f.observationStatus === 'observed').length;
  const notObservedCount = findings.filter((f) => !f.observationStatus || f.observationStatus === 'not_observed').length;
  const checkFailedCount = findings.filter((f) => f.observationStatus === 'check_failed').length;

  const safeFinalUrl = useMemo(() => {
    const raw = httpData?.finalObservedUrl;
    if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
      try {
        const u = new URL(raw);
        if (['http:', 'https:'].includes(u.protocol)) {
          return u.toString();
        }
      } catch {
        return null;
      }
    }
    return null;
  }, [httpData?.finalObservedUrl]);

  return (
    <div className="space-y-4 font-sans text-sm w-full">
      {/* ─── Compact Operational Header Bar ─────────────────────────── */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs text-[var(--text-muted)] font-mono font-bold tracking-wider">TARGET:</span>
          <span className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">{scan.domain}</span>
          <span className="console-tag font-semibold px-2.5 py-0.5 rounded-md">{detectedEdge}</span>
          <span className="console-tag font-mono text-xs px-2.5 py-0.5 rounded-md">
            STATUS: {scan.status.replace(/_/g, ' ').toUpperCase()}
          </span>
          <span
            className={`console-tag font-mono text-xs px-2.5 py-0.5 rounded-md ${
              completeness === 'complete'
                ? 'console-tag-phosphor'
                : completeness === 'partial'
                ? 'console-tag-amber'
                : 'console-tag-coral'
            }`}
          >
            {completenessDetails.completed}/{completenessDetails.total} PROBES
          </span>
          {safeFinalUrl && (
            <a
              href={safeFinalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[var(--accent-primary)] hover:underline text-xs font-semibold ml-1"
            >
              <ExternalLink size={12} />
              <span>ORIGIN</span>
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-mono hidden lg:inline-flex">
            <Calendar size={13} />
            {new Date(scan.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
          </span>
          <div className="flex items-center gap-2 border-l border-[var(--border-muted)] pl-3">
            <Link
              to={`/report/${scan.scanId}`}
              className="console-btn console-btn-primary py-1 px-3.5 text-xs font-bold"
            >
              <FileText size={13} />
              <span>REPORT</span>
            </Link>
            {onOpenGlossary && (
              <button
                type="button"
                onClick={() => onOpenGlossary('attack_surface')}
                className="console-btn py-1 px-3 text-xs text-[var(--text-secondary)] font-medium"
              >
                <BookOpen size={13} className="text-[var(--accent-primary)]" />
                <span className="hidden sm:inline">MANUAL</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="console-btn py-1 px-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title="Export raw JSON"
            >
              <Download size={12} />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Compact Grafana-Style 2-Tile Telemetry Row ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Tile: 6 Key Metrics (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--bg-panel)] border border-[var(--border-technical)] p-4 sm:p-5 rounded-xl shadow-xs">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 text-center">
            <div className="bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)] rounded-lg shadow-xs">
              <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">ASSETS</div>
              <div className="text-xl font-black text-[var(--text-primary)] mt-0.5">{scan.assets?.length ?? 0}</div>
            </div>
            <div className="bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)] rounded-lg shadow-xs">
              <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">RELATIONS</div>
              <div className="text-xl font-black text-[var(--accent-primary)] mt-0.5">{scan.relationships?.length ?? 0}</div>
            </div>
            <div className="bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)] rounded-lg shadow-xs">
              <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">SIGNALS</div>
              <div className="text-xl font-black text-[#16a34a] dark:text-[#2ee59d] mt-0.5">{observedCount}</div>
            </div>
            <div className="bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)] rounded-lg shadow-xs">
              <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">FINDINGS</div>
              <div className="text-xl font-black text-[#d97706] dark:text-[#f59e0b] mt-0.5">{findings.length}</div>
            </div>
            <div className="bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)] rounded-lg shadow-xs">
              <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">COMPLETE</div>
              <div className="text-xl font-black text-[var(--text-primary)] mt-0.5">
                {Math.round((completenessDetails.completed / Math.max(1, completenessDetails.total)) * 100)}%
              </div>
            </div>
            <div className="bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)] rounded-lg shadow-xs">
              <div className="text-[10px] text-[var(--text-muted)] font-mono font-bold uppercase tracking-wider">SCORE</div>
              <div className={`text-xl font-black mt-0.5 ${score >= 80 ? 'text-[#16a34a] dark:text-[#2ee59d]' : score >= 60 ? 'text-[var(--accent-primary)]' : score >= 40 ? 'text-[#d97706] dark:text-[#f59e0b]' : 'text-[#dc2626] dark:text-[#ef4444]'}`}>
                {hasScore ? `${score}` : '—'}
              </div>
            </div>
          </div>

          {/* Core Defense Checks Mini-Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 text-center text-xs">
            {checks.map((chk) => (
              <div
                key={chk.name}
                className={`py-1.5 px-2 border rounded-lg ${
                  chk.ok
                    ? 'border-[#16a34a]/30 bg-[#16a34a]/10 text-[#16a34a] dark:text-[#2ee59d]'
                    : 'border-[#d97706]/30 bg-[#d97706]/10 text-[#d97706] dark:text-[#f59e0b]'
                }`}
              >
                <span className="font-bold">{chk.name}: </span>
                <span className="font-medium">{chk.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Tile: Epistemology & Radial Posture Gauge (5 cols) */}
        <div className="lg:col-span-5 bg-[var(--bg-panel)] border border-[var(--border-technical)] p-4 sm:p-5 flex flex-col justify-between rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
              SECURITY POSTURE GAUGE
            </span>
            <span className="console-tag">PASSIVE OSINT</span>
          </div>

          <div className="flex items-center gap-5 my-auto py-2">
            {/* Radial SVG Gauge */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[var(--bg-panel-inset)]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={score >= 70 ? 'var(--accent-teal)' : score >= 40 ? '#d97706' : '#dc2626'}
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * (hasScore ? Math.min(100, Math.max(0, score)) : 0)) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black font-mono leading-none text-[var(--text-primary)]">
                  {hasScore ? score : '—'}
                </span>
                <span className="text-[9px] font-mono text-[var(--text-muted)] leading-tight mt-0.5">/ 100</span>
              </div>
            </div>

            {/* Score interpretation */}
            <div className="flex-1 space-y-1.5">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {score >= 80 ? 'Robust Defense Posture' : score >= 60 ? 'Standard Hygiene Posture' : score >= 40 ? 'Moderate Exposure Risk' : 'Elevated Attack Surface Risk'}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-snug">
                {hasScore
                  ? `Computed from observable DNS, TLS encryption depth, and HTTP header defenses.`
                  : 'Awaiting probe evaluation…'}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-[var(--bg-panel-inset)] p-2.5 border border-[var(--border-muted)] rounded-lg font-medium mt-2">
            <span className="text-[#16a34a] dark:text-[#2ee59d]">✓ OBSERVED: {observedCount}</span>
            <span className="text-[#d97706] dark:text-[#f59e0b]">! UNEXPOSED: {notObservedCount}</span>
            <span className="text-[var(--text-muted)]">? UNVERIFIED: {checkFailedCount}</span>
          </div>
        </div>
      </div>

      {/* ─── Score Breakdown & Transparent Deduction Audit (v2) ──────── */}
      {hasScore && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-panel-subtle)] border-b border-[var(--border-muted)]">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">[HYGIENE SCORE AUDIT]</span>
              <span className="text-sm font-bold text-[var(--text-primary)]">Score Transparency &amp; Deduction Breakdown</span>
            </div>
            <button
              type="button"
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="console-btn py-1 px-3 text-xs font-bold text-[var(--accent-primary)] border border-[var(--accent-primary)]/40 hover:bg-[var(--accent-active-bg)] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>{breakdownOpen ? 'HIDE AUDIT' : `WHY IS MY SCORE ${score}?`}</span>
              {breakdownOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Dimension score meters */}
          {breakdown && (
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Object.entries(breakdown.dimensions).map(([key, dim]) => {
                const deductionPercent = Math.round((dim.deducted / dim.maxDeduction) * 100);
                const scorePercent = 100 - deductionPercent;
                const isClean = dim.deducted === 0;

                return (
                  <div key={key} className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3.5 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[var(--text-primary)]">{dim.label}</span>
                      <span className={`font-mono font-bold ${isClean ? 'text-[#16a34a] dark:text-[#2ee59d]' : 'text-[#d97706] dark:text-[#f59e0b]'}`}>
                        {isClean ? 'NO DEDUCTION' : `−${dim.deducted} PTS`}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-[var(--bg-panel)] h-2 rounded-full overflow-hidden border border-[var(--border-muted)]">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          scorePercent >= 80 ? 'bg-[#16a34a]' : scorePercent >= 50 ? 'bg-[#d97706]' : 'bg-[#dc2626]'
                        }`}
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] flex justify-between font-mono">
                      <span>Max impact: −{dim.maxDeduction} pts</span>
                      <span>{dim.observations.length} note{dim.observations.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detailed Observations Drawer */}
          {breakdownOpen && (
            <div className="border-t border-[var(--border-muted)] p-4 sm:p-5 bg-[var(--bg-panel-inset)] space-y-3">
              <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                Itemised Hygiene Deductions &amp; Observations
              </div>

              {breakdown && breakdown.totalDeducted === 0 ? (
                <div className="text-xs text-[#16a34a] dark:text-[#2ee59d] p-3 border border-[#16a34a]/30 rounded-lg bg-[#16a34a]/10 font-medium">
                  ✓ Perfect Score: No deductions were assessed. All observable DNS, TLS, and HTTP security headers are correctly configured.
                </div>
              ) : breakdown ? (
                <div className="space-y-2">
                  {Object.entries(breakdown.dimensions).flatMap(([dimKey, dim]) =>
                    dim.observations.map((obs, obsIdx) => (
                      <div
                        key={`${dimKey}-${obsIdx}`}
                        className="bg-[var(--bg-panel)] border border-[var(--border-muted)] p-3 rounded-lg flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 flex-1">
                          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                            {dim.label}
                          </span>
                          <div className="text-[var(--text-primary)] font-medium leading-relaxed">
                            {obs.description}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-[#fee2e2]/60 dark:bg-[#ef4444]/20 border border-[#dc2626]/30 text-[#dc2626] dark:text-[#ef4444] font-mono font-bold text-xs rounded-md shrink-0">
                          −{obs.pointsDeducted} PTS
                        </span>
                      </div>
                    )),
                  )}
                  <div className="pt-2 flex justify-between items-center text-xs font-mono font-bold border-t border-[var(--border-muted)]">
                    <span className="text-[var(--text-secondary)]">TOTAL DEDUCTION:</span>
                    <span className="text-[#dc2626] dark:text-[#ef4444]">−{breakdown.totalDeducted} POINTS</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Breakdown data unavailable for this scan.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Compact Warning Strip (Collapsible if present) ─────────── */}
      {scan.warnings && scan.warnings.length > 0 && (
        <div className="bg-[var(--bg-panel-inset)] border border-[#d97706]/40 px-4 py-2.5 text-xs flex items-center justify-between rounded-xl">
          <div className="flex items-center gap-2 text-[#d97706] dark:text-[#f59e0b] font-semibold">
            <AlertTriangle size={14} />
            <span>{scan.warnings.length} DIAGNOSTIC WARNING(S) NOTED DURING PASSIVE SCAN</span>
          </div>
          <button
            onClick={() => setWarningsOpen(!warningsOpen)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>{warningsOpen ? 'HIDE' : 'VIEW'}</span>
            {warningsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      )}

      {warningsOpen && scan.warnings && (
        <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 text-xs text-[var(--text-secondary)] space-y-1 rounded-xl">
          {scan.warnings.map((w, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="text-[#d97706] dark:text-[#f59e0b] font-bold">•</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Guided mode contextual explainer (Only if guided mode and collapsed as a subtle tip) */}
      {isGuidedMode && (
        <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-technical)] px-4 py-3 text-xs text-[var(--text-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl">
          <span className="leading-relaxed">
            <strong className="text-[var(--accent-primary)] font-bold">GUIDED INTERPRETATION:</strong> Evaluating public DNS, CT logs, TLS certificates, and HTTP response headers. Click any node or row to inspect underlying OSINT evidence.
          </span>
          {onOpenGlossary && (
            <button
              onClick={() => onOpenGlossary('passive_osint')}
              className="text-[var(--accent-primary)] font-bold hover:underline text-xs shrink-0 self-start sm:self-auto cursor-pointer"
            >
              [?] FIELD MANUAL
            </button>
          )}
        </div>
      )}
    </div>
  );
}
