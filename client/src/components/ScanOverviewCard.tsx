import { useMemo } from 'react';
import { Shield, AlertTriangle, Layers, GitFork, Lock, Globe, ExternalLink, Calendar, CheckCircle, XCircle } from 'lucide-react';
import type { DomainScan } from '../../../shared/types';

interface ScanOverviewCardProps {
  scan: DomainScan;
}

export default function ScanOverviewCard({ scan }: ScanOverviewCardProps) {
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
  } | undefined;

  const tlsData = scan.categories.tls?.data as {
    available?: boolean;
    validTo?: string;
    protocol?: string;
  } | undefined;

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
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  scan.status === 'completed'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : scan.status === 'completed_with_warnings'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : scan.status === 'running'
                    ? 'animate-pulse border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                }`}
              >
                {scan.status.replace(/_/g, ' ')}
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
