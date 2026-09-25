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
  const score = scan.score ?? 0;
  const hasScore = scan.score !== undefined && scan.score !== null;

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
    <div className="space-y-2 font-mono text-xs w-full">
      {/* ─── Compact Operational Header Bar ─────────────────────────── */}
      <div className="bg-[#10151b] border border-[#1e2631] px-3.5 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-[#576575] font-bold">TARGET:</span>
          <span className="text-sm font-bold text-[#e6edf3]">{scan.domain}</span>
          <span className="console-tag">{detectedEdge}</span>
          <span className="console-tag">
            STATUS: {scan.status.replace(/_/g, ' ').toUpperCase()}
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
            {completenessDetails.completed}/{completenessDetails.total} PROBES
          </span>
          {safeFinalUrl && (
            <a
              href={safeFinalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#58a6ff] hover:underline text-[11px]"
            >
              <ExternalLink size={10} />
              <span>ORIGIN</span>
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-[#576575] hidden lg:inline-flex">
            <Calendar size={11} />
            {new Date(scan.createdAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
          </span>
          <div className="flex items-center gap-1 border-l border-[#1e2631] pl-2">
            <Link
              to={`/report/${scan.scanId}`}
              className="console-btn console-btn-primary py-0.5 px-2 text-[11px]"
            >
              <FileText size={11} />
              <span>REPORT</span>
            </Link>
            {onOpenGlossary && (
              <button
                type="button"
                onClick={() => onOpenGlossary('attack_surface')}
                className="console-btn py-0.5 px-2 text-[11px] text-[#8b9bb0]"
              >
                <BookOpen size={11} className="text-[#58a6ff]" />
                <span className="hidden sm:inline">MANUAL</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="console-btn py-0.5 px-1.5 text-[10px] text-[#576575] hover:text-[#e6edf3]"
              title="Export raw JSON"
            >
              <Download size={10} />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Compact Grafana-Style 2-Tile Telemetry Row ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Left Tile: 6 Key Metrics (7 cols) */}
        <div className="lg:col-span-7 bg-[#10151b] border border-[#1e2631] p-2.5">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            <div className="bg-[#0c1015] p-2 border border-[#171f28]">
              <div className="text-[9px] text-[#576575] font-bold uppercase">ASSETS</div>
              <div className="text-base font-bold text-[#e6edf3]">{scan.assets?.length ?? 0}</div>
            </div>
            <div className="bg-[#0c1015] p-2 border border-[#171f28]">
              <div className="text-[9px] text-[#576575] font-bold uppercase">RELATIONS</div>
              <div className="text-base font-bold text-[#58a6ff]">{scan.relationships?.length ?? 0}</div>
            </div>
            <div className="bg-[#0c1015] p-2 border border-[#171f28]">
              <div className="text-[9px] text-[#576575] font-bold uppercase">SIGNALS</div>
              <div className="text-base font-bold text-[#3fb950]">{observedCount}</div>
            </div>
            <div className="bg-[#0c1015] p-2 border border-[#171f28]">
              <div className="text-[9px] text-[#576575] font-bold uppercase">FINDINGS</div>
              <div className="text-base font-bold text-[#d29922]">{findings.length}</div>
            </div>
            <div className="bg-[#0c1015] p-2 border border-[#171f28]">
              <div className="text-[9px] text-[#576575] font-bold uppercase">COMPLETE</div>
              <div className="text-base font-bold text-[#e6edf3]">
                {Math.round((completenessDetails.completed / Math.max(1, completenessDetails.total)) * 100)}%
              </div>
            </div>
            <div className="bg-[#0c1015] p-2 border border-[#171f28]">
              <div className="text-[9px] text-[#576575] font-bold uppercase">SCORE</div>
              <div className={`text-base font-bold ${score >= 80 ? 'text-[#3fb950]' : score >= 60 ? 'text-[#58a6ff]' : score >= 40 ? 'text-[#d29922]' : 'text-[#f85149]'}`}>
                {hasScore ? `${score}` : '—'}
              </div>
            </div>
          </div>

          {/* Core Defense Checks Mini-Strip */}
          <div className="grid grid-cols-4 gap-1.5 mt-2 text-center text-[10px]">
            {checks.map((chk) => (
              <div
                key={chk.name}
                className={`py-0.5 px-1 border ${
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

        {/* Right Tile: Epistemology & Posture Gauge (5 cols) */}
        <div className="lg:col-span-5 bg-[#10151b] border border-[#1e2631] p-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#e6edf3]">
                OBSERVABLE HYGIENE: <span className="text-[#58a6ff]">{hasScore ? `${score}/100` : 'PENDING'}</span>
              </span>
              <span className="text-[9px] text-[#576575]">PASSIVE OSINT</span>
            </div>
            <div className="h-1.5 w-full bg-[#0c1015] border border-[#1e2631] overflow-hidden mb-2">
              <div
                className={`h-full ${
                  score >= 80 ? 'bg-[#3fb950]' : score >= 60 ? 'bg-[#58a6ff]' : score >= 40 ? 'bg-[#d29922]' : 'bg-[#f85149]'
                }`}
                style={{ width: `${hasScore ? Math.min(100, Math.max(5, score)) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] bg-[#0c1015] p-1.5 border border-[#171f28]">
            <span className="text-[#3fb950]">✓ OBSERVED: {observedCount}</span>
            <span className="text-[#d29922]">! UNEXPOSED: {notObservedCount}</span>
            <span className="text-[#576575]">? UNVERIFIED: {checkFailedCount}</span>
          </div>
        </div>
      </div>

      {/* ─── Compact Warning Strip (Collapsible if present) ─────────── */}
      {scan.warnings && scan.warnings.length > 0 && (
        <div className="bg-[#0c1015] border border-[#bb8009]/40 px-2.5 py-1 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#d29922]">
            <AlertTriangle size={11} />
            <span>{scan.warnings.length} DIAGNOSTIC WARNING(S) NOTED DURING PASSIVE SCAN</span>
          </div>
          <button
            onClick={() => setWarningsOpen(!warningsOpen)}
            className="text-[10px] text-[#8b9bb0] hover:text-[#e6edf3] flex items-center gap-1 cursor-pointer"
          >
            <span>{warningsOpen ? 'HIDE' : 'VIEW'}</span>
            {warningsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      )}

      {warningsOpen && scan.warnings && (
        <div className="bg-[#0c1015] border border-[#1e2631] p-2 text-[10px] text-[#8b9bb0] space-y-0.5">
          {scan.warnings.map((w, idx) => (
            <div key={idx} className="flex items-start gap-1">
              <span className="text-[#d29922]">•</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Guided mode contextual explainer (Only if guided mode and collapsed as a subtle tip) */}
      {isGuidedMode && (
        <div className="bg-[#0c1015] border border-[#1e2631] px-3 py-1.5 text-[11px] text-[#8b9bb0] flex items-center justify-between">
          <span>
            <strong className="text-[#58a6ff]">GUIDED INTERPRETATION:</strong> Evaluating public DNS, CT logs, TLS certificates, and HTTP response headers. Click any node or row to inspect underlying OSINT evidence.
          </span>
          {onOpenGlossary && (
            <button
              onClick={() => onOpenGlossary('passive_osint')}
              className="text-[#58a6ff] hover:underline text-[10px] shrink-0 ml-2"
            >
              [?] FIELD MANUAL
            </button>
          )}
        </div>
      )}
    </div>
  );
}
