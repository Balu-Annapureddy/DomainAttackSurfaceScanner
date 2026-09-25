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

  // Detect edge/CDN provider
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
    <div className="space-y-4">
      {/* ─── Top Telemetry Console Panel ───────────────────────────── */}
      <div className="console-panel p-5 space-y-4">
        {/* System & Target Metadata Line */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2735] pb-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="console-tag console-tag-cyan">TARGET // DOMAIN</span>
            <span className="font-mono text-base font-bold text-[#e6edf3]">{scan.domain}</span>
            <span className="console-tag">{detectedEdge}</span>
            <span
              className={`console-tag ${
                completeness === 'complete'
                  ? 'console-tag-phosphor'
                  : completeness === 'partial'
                  ? 'console-tag-amber'
                  : 'console-tag-coral'
              }`}
            >
              {completeness === 'complete'
                ? `✓ COMPLETE (${completenessDetails.completed}/${completenessDetails.total})`
                : completeness === 'partial'
                ? `! PARTIAL (${completenessDetails.completed}/${completenessDetails.total})`
                : '✕ INCONCLUSIVE'}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[#9aa5b8]">
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-[#626e82]" />
              {new Date(scan.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
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

        {/* ─── Executive Metric Grid (6 metrics) ───────────────────── */}
        <div>
          <div className="font-mono text-[10px] text-[#626e82] uppercase tracking-wider mb-2">
            TELEMETRY // EXECUTIVE SUMMARY METRICS
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 font-mono text-xs">
            <div className="console-panel-inset p-3">
              <span className="text-[10px] text-[#9aa5b8] block uppercase">ASSETS</span>
              <span className="text-xl font-bold text-[#e6edf3] block mt-0.5">
                {scan.assets?.length ?? 0}
              </span>
              <span className="text-[10px] text-[#626e82] block truncate">Normalized nodes</span>
            </div>

            <div className="console-panel-inset p-3">
              <span className="text-[10px] text-[#9aa5b8] block uppercase">RELATIONSHIPS</span>
              <span className="text-xl font-bold text-[#58a6ff] block mt-0.5">
                {scan.relationships?.length ?? 0}
              </span>
              <span className="text-[10px] text-[#626e82] block truncate">Network graph edges</span>
            </div>

            <div className="console-panel-inset p-3">
              <span className="text-[10px] text-[#9aa5b8] block uppercase">OBSERVATIONS</span>
              <span className="text-xl font-bold text-[#3fb950] block mt-0.5">
                {observedCount}
              </span>
              <span className="text-[10px] text-[#626e82] block truncate">Verified signals</span>
            </div>

            <div className="console-panel-inset p-3">
              <span className="text-[10px] text-[#9aa5b8] block uppercase">FINDINGS</span>
              <span className="text-xl font-bold text-[#d29922] block mt-0.5">
                {findings.length}
              </span>
              <span className="text-[10px] text-[#626e82] block truncate">Hygiene considerations</span>
            </div>

            <div className="console-panel-inset p-3">
              <span className="text-[10px] text-[#9aa5b8] block uppercase">COMPLETENESS</span>
              <span className="text-xl font-bold text-[#e6edf3] block mt-0.5">
                {completenessDetails.completed}/{completenessDetails.total}
              </span>
              <span className="text-[10px] text-[#626e82] block truncate">Categories checked</span>
            </div>

            <div className="console-panel-inset p-3">
              <span className="text-[10px] text-[#9aa5b8] block uppercase">HYGIENE SCORE</span>
              <span
                className={`text-xl font-bold block mt-0.5 ${
                  !hasScore
                    ? 'text-[#626e82]'
                    : score >= 80
                    ? 'text-[#3fb950]'
                    : score >= 60
                    ? 'text-[#58a6ff]'
                    : score >= 40
                    ? 'text-[#d29922]'
                    : 'text-[#f85149]'
                }`}
              >
                {hasScore ? `${score}` : '—'} <span className="text-xs text-[#626e82]">/ 100</span>
              </span>
              <span className="text-[10px] text-[#626e82] block truncate">Defensive rating</span>
            </div>
          </div>
        </div>

        {/* ─── Security Posture & Epistemology ─────────────────────── */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 pt-2">
          {/* Posture Score & Assessment (Left 2 cols) */}
          <div className="console-panel-inset p-4 lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-[#58a6ff] font-bold">HYGIENE SCORE:</span>
                <span
                  className={`font-bold ${
                    !hasScore
                      ? 'text-[#626e82]'
                      : score >= 80
                      ? 'text-[#3fb950]'
                      : score >= 60
                      ? 'text-[#58a6ff]'
                      : score >= 40
                      ? 'text-[#d29922]'
                      : 'text-[#f85149]'
                  }`}
                >
                  {hasScore ? `${score} / 100` : 'CALCULATING'}
                </span>
                <span className="text-[10px] text-[#626e82]">Observable configuration hygiene</span>
              </div>
              <span className="console-tag font-mono text-[10px]">PASSIVE EVALUATION</span>
            </div>

            <p className="text-xs text-[#9aa5b8] leading-relaxed">
              {scoreAssessment}
            </p>

            <div className="h-1.5 w-full rounded bg-[#1f2735] overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
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
          </div>

          {/* Explicit Epistemology: Observed vs Not Observed vs Unverified */}
          <div className="console-panel-inset p-3.5 space-y-1.5 font-mono text-xs">
            <div className="text-[10px] font-bold text-[#626e82] uppercase tracking-wider pb-1 border-b border-[#1f2735]">
              EVIDENTIARY STATUS BREAKDOWN
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#9aa5b8] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3fb950]" /> WHAT WAS OBSERVED:
              </span>
              <span className="font-bold text-[#3fb950]">{observedCount} items</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#9aa5b8] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d29922]" /> WHAT WAS NOT OBSERVED:
              </span>
              <span className="font-bold text-[#d29922]">{notObservedCount} items</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#9aa5b8] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#626e82]" /> COULD NOT BE VERIFIED:
              </span>
              <span className="font-bold text-[#626e82]">{checkFailedCount} items</span>
            </div>
          </div>
        </div>

        {/* ─── Action & Export Buttons Bar ─────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1f2735] text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/report/${scan.scanId}`}
              className="console-btn console-btn-primary py-1.5 px-3 text-xs"
            >
              <FileText size={12} />
              <span>PRINTABLE REPORT</span>
            </Link>
            {onOpenGlossary && (
              <button
                type="button"
                onClick={() => onOpenGlossary('attack_surface')}
                className="console-btn py-1.5 px-3 text-xs text-[#9aa5b8]"
              >
                <BookOpen size={12} className="text-[#58a6ff]" />
                <span>KNOWLEDGE GUIDE</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="console-btn py-1 px-2.5 text-xs text-[#9aa5b8]"
            >
              <Download size={11} />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportAssetsCsv(scan)}
              className="console-btn py-1 px-2.5 text-xs text-[#9aa5b8]"
            >
              <Download size={11} />
              <span>ASSETS CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportFindingsCsv(scan)}
              className="console-btn py-1 px-2.5 text-xs text-[#9aa5b8]"
            >
              <Download size={11} />
              <span>FINDINGS CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Guided Beginner Cards (if guided mode) ──────────────────── */}
      {isGuidedMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="console-panel p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#e6edf3]">
                Certificate Transparency
              </span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('certificate_transparency')}
                  className="font-mono text-[10px] text-[#58a6ff] hover:underline"
                >
                  [?] EXPLAIN
                </button>
              )}
            </div>
            <p className="text-xs text-[#9aa5b8] leading-relaxed">
              Public append-only logs showing all digital certificates issued for this domain, discovering subdomains passively.
            </p>
          </div>

          <div className="console-panel p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#e6edf3]">
                BGP Autonomous System (ASN)
              </span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('asn')}
                  className="font-mono text-[10px] text-[#58a6ff] hover:underline"
                >
                  [?] EXPLAIN
                </button>
              )}
            </div>
            <p className="text-xs text-[#9aa5b8] leading-relaxed">
              Identifies which cloud provider or telecom carrier operates the network prefix announcing the target's IP endpoints.
            </p>
          </div>

          <div className="console-panel p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#e6edf3]">
                DNS MX & SPF/DMARC
              </span>
              {onOpenGlossary && (
                <button
                  type="button"
                  onClick={() => onOpenGlossary('dmarc')}
                  className="font-mono text-[10px] text-[#58a6ff] hover:underline"
                >
                  [?] EXPLAIN
                </button>
              )}
            </div>
            <p className="text-xs text-[#9aa5b8] leading-relaxed">
              Verifies if the domain routes email and whether published policies prevent malicious spoofing and phishing impersonation.
            </p>
          </div>
        </div>
      )}

      {/* ─── Diagnostic Warnings Banner if present ───────────────────── */}
      {scan.warnings && scan.warnings.length > 0 && (
        <div className="console-panel-inset border-l-2 border-l-[#d29922] p-3 text-xs font-mono text-[#d29922] space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle size={13} />
            <span>DIAGNOSTIC WARNINGS & RATE LIMIT OBSERVATIONS ({scan.warnings.length}):</span>
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-[#9aa5b8] text-[11px]">
            {scan.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
