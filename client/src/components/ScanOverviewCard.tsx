import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Layers, GitFork, Lock, Globe, ExternalLink, Calendar, CheckCircle, XCircle, Download, FileText } from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { exportScanJson, exportAssetsCsv, exportFindingsCsv } from '../lib/export';

interface ScanOverviewCardProps {
  scan: DomainScan;
  onOpenGlossary?: (termKey: string) => void;
  isGuidedMode?: boolean;
}

export default function ScanOverviewCard({ scan, onOpenGlossary, isGuidedMode }: ScanOverviewCardProps) {
  const score = scan.score ?? 0;
  const hasScore = scan.score !== undefined && scan.score !== null;

  const scoreColor = !hasScore
    ? 'text-slate-400'
    : score >= 80
    ? 'text-emerald-400'
    : score >= 60
    ? 'text-cyan-400'
    : score >= 40
    ? 'text-amber-400'
    : 'text-rose-400';

  const scoreBadgeBg = !hasScore
    ? 'bg-slate-800/60 text-slate-400 border-slate-700'
    : score >= 80
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    : score >= 60
    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
    : score >= 40
    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    : 'bg-rose-500/10 text-rose-300 border-rose-500/30';

  const scoreAssessment = !hasScore
    ? 'Calculating configuration posture…'
    : score >= 80
    ? 'Robust Configuration Hygiene'
    : score >= 60
    ? 'Standard Configuration'
    : score >= 40
    ? 'Action Recommended'
    : 'Attention Required';

  const httpData = scan.categories.http?.data as {
    httpsEnforced?: boolean;
    httpRedirectsToHttps?: boolean;
    finalObservedUrl?: string;
    https?: { headers?: Record<string, string> };
  } | undefined;

  const tlsData = scan.categories.tls?.data as {
    available?: boolean;
    validTo?: string;
    protocol?: string;
  } | undefined;

  // Detect edge/CDN provider if present in assets or headers
  const detectedEdge = useMemo(() => {
    const orgAsset = scan.assets?.find((a) => a.type === 'ORGANIZATION');
    const serverHeader = httpData?.https?.headers?.server?.toLowerCase();
    if (orgAsset?.value?.toLowerCase().includes('cloudflare') || serverHeader?.includes('cloudflare')) {
      return 'Cloudflare Edge CDN';
    }
    if (orgAsset?.value?.toLowerCase().includes('amazon') || orgAsset?.value?.toLowerCase().includes('aws')) {
      return 'AWS Cloud Infrastructure';
    }
    if (orgAsset?.value?.toLowerCase().includes('google')) {
      return 'Google Cloud Edge';
    }
    if (orgAsset?.value?.toLowerCase().includes('fastly')) {
      return 'Fastly CDN';
    }
    return orgAsset?.value ?? 'Direct Public Origin';
  }, [scan.assets, httpData]);

  const completeness = scan.completeness ?? (scan.status === 'completed' ? 'complete' : scan.status === 'completed_with_warnings' ? 'partially_completed' : 'checks_failed');
  const completenessDetails = scan.completenessDetails ?? {
    completed: Object.values(scan.categories).filter((c) => c.status === 'completed').length,
    total: Object.keys(scan.categories).length - 1,
    failed: Object.entries(scan.categories).filter(([cat, c]) => cat !== 'scoring' && c.status === 'failed').map(([cat]) => cat),
  };

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
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 p-6 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Domain & Meta */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-0.5 text-xs font-medium text-cyan-400">
                <Globe size={13} />
                Target Domain
              </span>

              {/* Completeness Badge */}
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wider ${
                  completeness === 'complete'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : completeness === 'partially_completed'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
                title={`Scan Completeness: ${completenessDetails.completed}/${completenessDetails.total} checks completed`}
              >
                {completeness === 'complete'
                  ? `✓ Complete (${completenessDetails.completed}/${completenessDetails.total} checks)`
                  : completeness === 'partially_completed'
                  ? `⚠ Partial (${completenessDetails.completed}/${completenessDetails.total} checks)`
                  : '✕ Checks Inconclusive'}
              </span>

              {/* Edge Provider Pill */}
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                📍 {detectedEdge}
              </span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {scan.domain}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar size={13} className="text-slate-500" />
                Scanned {new Date(scan.createdAt).toLocaleString()}
              </span>
              {safeFinalUrl && (
                <a
                  href={safeFinalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400/80 hover:text-cyan-300 transition"
                >
                  <ExternalLink size={12} />
                  {safeFinalUrl}
                </a>
              )}
            </div>

            {/* Export Actions & Knowledge Link */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                to={`/report/${scan.scanId}`}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 hover:text-white"
                title="Open clean printable intelligence report"
              >
                <FileText size={12} />
                View Report / Dossier
              </Link>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('attack_surface')}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20 hover:text-white"
                  title="Open How to Read This Scanner glossary"
                >
                  <Shield size={12} />
                  How to Read This
                </button>
              )}
              <button
                type="button"
                onClick={() => exportScanJson(scan)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300"
                title="Download full normalized scan in JSON format"
              >
                <Download size={12} />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => exportAssetsCsv(scan)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300"
                title="Download inventory of assets in CSV spreadsheet format"
              >
                <Download size={12} />
                Assets CSV
              </button>
              <button
                type="button"
                onClick={() => exportFindingsCsv(scan)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800 hover:text-cyan-300"
                title="Download observed findings in CSV format"
              >
                <Download size={12} />
                Findings CSV
              </button>
            </div>
          </div>

          {/* Posture Score Meter */}
          <div className="flex items-center gap-5 rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 lg:min-w-[280px]">
            <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${scoreColor} transition-all duration-1000 ease-out`}
                  strokeDasharray={`${hasScore ? score : 0}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold tracking-tight ${scoreColor}`}>
                  {hasScore ? score : '—'}
                </span>
                <span className="text-[9px] font-medium text-slate-500">/ 100</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Hygiene Score
              </span>
              <p className="text-sm font-semibold text-slate-100">{scoreAssessment}</p>
              <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium ${scoreBadgeBg}`}>
                External Hygiene
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Layers size={14} className="text-cyan-400" />
              <span className="text-xs font-medium">Assets</span>
            </div>
            <p className="mt-1 text-xl font-bold text-white">{scan.assets?.length ?? 0}</p>
            <span className="text-[10px] text-slate-500">Normalized nodes</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <GitFork size={14} className="text-blue-400" />
              <span className="text-xs font-medium">Relationships</span>
            </div>
            <p className="mt-1 text-xl font-bold text-white">{scan.relationships?.length ?? 0}</p>
            <span className="text-[10px] text-slate-500">Network edges</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Lock size={14} className="text-emerald-400" />
              <span className="text-xs font-medium">HTTPS Enforced</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {httpData?.httpsEnforced ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm font-bold text-emerald-400">Enforced</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-amber-400" />
                  <span className="text-sm font-bold text-amber-400">Not Enforced</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500">HTTP → HTTPS redirect</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield size={14} className="text-purple-400" />
              <span className="text-xs font-medium">TLS Cryptography</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {tlsData?.available ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-sm font-bold text-white">{tlsData.protocol ?? 'Active'}</span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-rose-400" />
                  <span className="text-sm font-bold text-rose-400">Unavailable</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Port 443 handshake</span>
          </div>
        </div>
      </div>

      {/* Passive OSINT Epistemology Banner */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-slate-950 p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <span className="text-base text-cyan-400 shrink-0 mt-0.5">🛡️</span>
          <div>
            <span className="font-bold text-cyan-300">The Passive Reconnaissance Rule:</span>{' '}
            <span className="text-slate-300">
              <em>“We did not observe X” ≠ “X does not exist.”</em> Our analysis relies strictly on public DNS, certificate transparency logs, and observable network responses without touching private networks or executing invasive exploits.
            </span>
          </div>
        </div>
        {onOpenGlossary && (
          <button
            type="button"
            onClick={() => onOpenGlossary('passive_osint')}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition whitespace-nowrap shrink-0"
          >
            How it works
          </button>
        )}
      </div>

      {/* Guided Beginner Mode: Technical Term + Short Explanation Cards */}
      {isGuidedMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-white">Certificate Transparency (CT)</span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('certificate_transparency')}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Details
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Public cryptographic logs that reveal certificates issued for the domain, identifying subdomains without brute-forcing.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-white">BGP ASN & Routing</span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('asn')}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Details
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Autonomous System Numbers reveal which hosting provider (e.g. Cloudflare, AWS, Google) operates the physical network.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-white">DNS MX & SPF/DMARC</span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('dmarc')}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Details
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mail exchanger records determine email routing and whether anti-spoofing policies protect against domain impersonation.
            </p>
          </div>
        </div>
      )}

      {/* Warnings Banner if present */}
      {scan.warnings && scan.warnings.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-300">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-400" />
          <div className="space-y-1 text-xs">
            <span className="font-semibold uppercase tracking-wider text-amber-300">
              Diagnostic Observations & Warnings ({scan.warnings.length})
            </span>
            <ul className="list-inside list-disc space-y-0.5 text-amber-200/90">
              {scan.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
