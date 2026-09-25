import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, Download, FileText, BookOpen, AlertTriangle } from 'lucide-react';
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

  const scoreAssessment = !hasScore
    ? 'Evaluating public perimeter configuration…'
    : score >= 80
    ? 'Robust Configuration Hygiene: Standard defensive records and secure defaults observed.'
    : score >= 60
    ? 'Standard Configuration: Basic transport protections active, optional headers or email policies absent.'
    : score >= 40
    ? 'Action Recommended: Key security protections (e.g. DMARC, HSTS) are unobserved in public records.'
    : 'Attention Required: Multiple foundational perimeter hygiene controls are not observed.';

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

  // Extract quick checks for HTTP, TLS, SPF, DMARC
  const checks = useMemo(() => {
    const hasHttps = Boolean(httpData?.httpsEnforced || httpData?.httpRedirectsToHttps);
    const hasTls = scan.categories.tls?.status === 'completed' && Boolean(scan.categories.tls?.data);
    
    // Check SPF & DMARC in DNS or findings
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

  // Detect edge/CDN provider
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

  // Completeness breakdown
  const completeness = scan.completeness ?? (scan.status === 'completed' ? 'complete' : scan.status === 'completed_with_warnings' ? 'partial' : 'inconclusive');
  const completenessDetails = scan.completenessDetails ?? {
    completed: Object.values(scan.categories).filter((c) => c.status === 'completed').length,
    total: Object.keys(scan.categories).length - 1,
    failed: Object.entries(scan.categories).filter(([cat, c]) => cat !== 'scoring' && c.status === 'failed').map(([cat]) => cat),
  };

  // Epistemological categorization of findings
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
    <div className="space-y-3 font-mono">
      {/* ─── Workstation Top Telemetry Strip ────────────────────────── */}
      <div className="bg-[#10151b] border border-[#1e2631] p-3 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2.5 border-b border-[#1e2631]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[#576575] font-bold">TARGET:</span>
            <span className="text-sm font-bold text-[#e6edf3]">{scan.domain}</span>
            <span className="console-tag">{detectedEdge}</span>
            <span className="text-[10px] text-[#576575]">ID:</span>
            <span className="text-[#8b9bb0] text-[11px] truncate max-w-[130px]">{scan.scanId}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8b9bb0]">
            <span className="flex items-center gap-1">
              <Calendar size={11} className="text-[#576575]" />
              {new Date(scan.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
            </span>
            <span className="console-tag">
              STATUS // {scan.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span
              className={`console-tag ${
                completeness === 'complete'
                  ? 'console-tag-phosphor'
                  : completeness === 'partial'
                  ? 'console-tag-amber'
                  : 'console-tag-coral'
              }`}
            >
              {completenessDetails.completed}/{completenessDetails.total} CHECKS
            </span>
            {safeFinalUrl && (
              <a
                href={safeFinalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#58a6ff] hover:underline"
              >
                <ExternalLink size={11} />
                <span>ORIGIN</span>
              </a>
            )}
          </div>
        </div>

        {/* ─── Executive Telemetry Readouts (Dense 6-Cell Grid) ─────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#1e2631] mt-2.5">
          <div className="bg-[#0c1015] p-2.5">
            <div className="text-[10px] text-[#576575] font-bold uppercase tracking-wider">ASSETS</div>
            <div className="text-lg font-bold text-[#e6edf3] mt-0.5">{scan.assets?.length ?? 0}</div>
            <div className="text-[10px] text-[#8b9bb0]">Observed Nodes</div>
          </div>

          <div className="bg-[#0c1015] p-2.5">
            <div className="text-[10px] text-[#576575] font-bold uppercase tracking-wider">RELATIONS</div>
            <div className="text-lg font-bold text-[#58a6ff] mt-0.5">{scan.relationships?.length ?? 0}</div>
            <div className="text-[10px] text-[#8b9bb0]">Graph Edges</div>
          </div>

          <div className="bg-[#0c1015] p-2.5">
            <div className="text-[10px] text-[#576575] font-bold uppercase tracking-wider">OBSERVATIONS</div>
            <div className="text-lg font-bold text-[#3fb950] mt-0.5">{observedCount}</div>
            <div className="text-[10px] text-[#8b9bb0]">Verified Signals</div>
          </div>

          <div className="bg-[#0c1015] p-2.5">
            <div className="text-[10px] text-[#576575] font-bold uppercase tracking-wider">FINDINGS</div>
            <div className="text-lg font-bold text-[#d29922] mt-0.5">{findings.length}</div>
            <div className="text-[10px] text-[#8b9bb0]">Hygiene Checks</div>
          </div>

          <div className="bg-[#0c1015] p-2.5">
            <div className="text-[10px] text-[#576575] font-bold uppercase tracking-wider">COMPLETENESS</div>
            <div className="text-lg font-bold text-[#e6edf3] mt-0.5">
              {Math.round((completenessDetails.completed / Math.max(1, completenessDetails.total)) * 100)}%
            </div>
            <div className="text-[10px] text-[#8b9bb0]">{completenessDetails.completed}/{completenessDetails.total} Categories</div>
          </div>

          <div className="bg-[#0c1015] p-2.5">
            <div className="text-[10px] text-[#576575] font-bold uppercase tracking-wider">SCORE</div>
            <div
              className={`text-lg font-bold mt-0.5 ${
                !hasScore
                  ? 'text-[#576575]'
                  : score >= 80
                  ? 'text-[#3fb950]'
                  : score >= 60
                  ? 'text-[#58a6ff]'
                  : score >= 40
                  ? 'text-[#d29922]'
                  : 'text-[#f85149]'
              }`}
            >
              {hasScore ? `${score}` : '—'} <span className="text-xs text-[#576575]">/ 100</span>
            </div>
            <div className="text-[10px] text-[#8b9bb0]">Hygiene Rating</div>
          </div>
        </div>

        {/* ─── Security Posture Dossier & Epistemology ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 mt-2.5">
          {/* Posture Bar & Checks (7 cols) */}
          <div className="lg:col-span-7 bg-[#0c1015] border border-[#1e2631] p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#e6edf3]">
                  OBSERVABLE CONFIGURATION HYGIENE: <span className="text-[#58a6ff]">{hasScore ? `${score} / 100` : 'PENDING'}</span>
                </span>
                <span className="text-[10px] text-[#576575]">PASSIVE OSINT</span>
              </div>
              <p className="text-[11px] text-[#8b9bb0] font-sans leading-relaxed">
                {scoreAssessment}
              </p>
            </div>

            {/* Structured Posture Bar */}
            <div className="mt-2.5">
              <div className="h-2 w-full bg-[#151c23] border border-[#1e2631] overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    score >= 80
                      ? 'bg-[#3fb950]'
                      : score >= 60
                      ? 'bg-[#58a6ff]'
                      : score >= 40
                      ? 'bg-[#d29922]'
                      : 'bg-[#f85149]'
                  }`}
                  style={{ width: `${hasScore ? Math.min(100, Math.max(5, score)) : 0}%` }}
                />
              </div>

              {/* Individual Core Defensive Checks */}
              <div className="grid grid-cols-4 gap-1.5 mt-2 text-center text-[10px]">
                {checks.map((chk) => (
                  <div
                    key={chk.name}
                    className={`p-1 border ${
                      chk.ok
                        ? 'border-[#2ea043]/30 bg-[#2ea043]/5 text-[#3fb950]'
                        : 'border-[#bb8009]/30 bg-[#bb8009]/5 text-[#d29922]'
                    }`}
                  >
                    <span className="font-bold">{chk.name}: </span>
                    <span>{chk.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Epistemology Breakdown (5 cols) */}
          <div className="lg:col-span-5 bg-[#0c1015] border border-[#1e2631] p-3 flex flex-col justify-between">
            <div className="text-[10px] font-bold text-[#576575] uppercase tracking-wider border-b border-[#1e2631] pb-1">
              EVIDENTIARY STATUS BREAKDOWN
            </div>

            <div className="space-y-1.5 my-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#8b9bb0] flex items-center gap-1.5">
                  <span className="text-[#3fb950]">✓</span> WHAT WAS OBSERVED:
                </span>
                <span className="font-bold text-[#3fb950]">{observedCount} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b9bb0] flex items-center gap-1.5">
                  <span className="text-[#d29922]">!</span> WHAT WAS NOT OBSERVED:
                </span>
                <span className="font-bold text-[#d29922]">{notObservedCount} items</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8b9bb0] flex items-center gap-1.5">
                  <span className="text-[#576575]">?</span> COULD NOT BE VERIFIED:
                </span>
                <span className="font-bold text-[#576575]">{checkFailedCount} items</span>
              </div>
            </div>

            <div className="text-[10px] text-[#576575] font-sans border-t border-[#1e2631] pt-1">
              Scanner distinguishes missing evidence from failed network queries.
            </div>
          </div>
        </div>

        {/* ─── Control Bar ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2.5 border-t border-[#1e2631] text-xs">
          <div className="flex items-center gap-2">
            <Link
              to={`/report/${scan.scanId}`}
              className="console-btn console-btn-primary py-1 px-2.5 text-xs"
            >
              <FileText size={11} />
              <span>DOSSIER REPORT</span>
            </Link>
            {onOpenGlossary && (
              <button
                type="button"
                onClick={() => onOpenGlossary('attack_surface')}
                className="console-btn py-1 px-2.5 text-xs text-[#8b9bb0]"
              >
                <BookOpen size={11} className="text-[#58a6ff]" />
                <span>FIELD MANUAL</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="console-btn py-1 px-2 text-[11px] text-[#8b9bb0]"
            >
              <Download size={10} />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportAssetsCsv(scan)}
              className="console-btn py-1 px-2 text-[11px] text-[#8b9bb0]"
            >
              <Download size={10} />
              <span>ASSETS CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportFindingsCsv(scan)}
              className="console-btn py-1 px-2 text-[11px] text-[#8b9bb0]"
            >
              <Download size={10} />
              <span>FINDINGS CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Guided Beginner Explanations (if guided mode) ─────────── */}
      {isGuidedMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-[#10151b] border border-[#1e2631] p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#e6edf3]">Certificate Logs (CT)</span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('certificate_transparency')}
                  className="text-[10px] text-[#58a6ff] hover:underline"
                >
                  [?] GUIDE
                </button>
              )}
            </div>
            <p className="text-[#8b9bb0] font-sans text-[11px] leading-relaxed">
              Public append-only registries of certificates. Allows passive discovery of subdomains without querying the target.
            </p>
          </div>

          <div className="bg-[#10151b] border border-[#1e2631] p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#e6edf3]">BGP Autonomous Systems</span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('asn')}
                  className="text-[10px] text-[#58a6ff] hover:underline"
                >
                  [?] GUIDE
                </button>
              )}
            </div>
            <p className="text-[#8b9bb0] font-sans text-[11px] leading-relaxed">
              Identifies the ISP, cloud provider, or telecom network that routes IP traffic for the target domain.
            </p>
          </div>

          <div className="bg-[#10151b] border border-[#1e2631] p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[#e6edf3]">Email Security (SPF/DMARC)</span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('dmarc')}
                  className="text-[10px] text-[#58a6ff] hover:underline"
                >
                  [?] GUIDE
                </button>
              )}
            </div>
            <p className="text-[#8b9bb0] font-sans text-[11px] leading-relaxed">
              DNS-published policies specifying which mail servers are legitimate senders, mitigating phishing and impersonation.
            </p>
          </div>
        </div>
      )}

      {/* ─── Diagnostic Warnings ───────────────────────────────────── */}
      {scan.warnings && scan.warnings.length > 0 && (
        <div className="bg-[#0c1015] border-l-2 border-[#d29922] p-2.5 text-xs text-[#d29922]">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <AlertTriangle size={12} />
            <span>DIAGNOSTIC WARNINGS ({scan.warnings.length}):</span>
          </div>
          <ul className="list-inside list-disc text-[#8b9bb0] text-[11px] font-mono space-y-0.5">
            {scan.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
