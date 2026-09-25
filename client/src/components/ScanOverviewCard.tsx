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

        {/* Right Tile: Epistemology & Posture Gauge (5 cols) */}
        <div className="lg:col-span-5 bg-[var(--bg-panel)] border border-[var(--border-technical)] p-4 sm:p-5 flex flex-col justify-between rounded-xl shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
                OBSERVABLE HYGIENE: <span className="text-[var(--accent-primary)] text-sm">{hasScore ? `${score}/100` : 'PENDING'}</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">PASSIVE OSINT</span>
            </div>
            <div className="h-2.5 w-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] overflow-hidden mb-3 rounded-full">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  score >= 80 ? 'bg-[#16a34a] dark:bg-[#2ee59d]' : score >= 60 ? 'bg-[var(--accent-primary)]' : score >= 40 ? 'bg-[#d97706] dark:bg-[#f59e0b]' : 'bg-[#dc2626] dark:bg-[#ef4444]'
                }`}
                style={{ width: `${hasScore ? Math.min(100, Math.max(5, score)) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-[var(--bg-panel-inset)] p-2.5 border border-[var(--border-muted)] rounded-lg font-medium">
            <span className="text-[#16a34a] dark:text-[#2ee59d]">✓ OBSERVED: {observedCount}</span>
            <span className="text-[#d97706] dark:text-[#f59e0b]">! UNEXPOSED: {notObservedCount}</span>
            <span className="text-[var(--text-muted)]">? UNVERIFIED: {checkFailedCount}</span>
          </div>
        </div>
      </div>

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
