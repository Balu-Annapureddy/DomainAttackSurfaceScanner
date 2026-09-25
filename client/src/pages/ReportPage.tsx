import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  Shield,
  Lock,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Globe2,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { getScan } from '../lib/api';
import { exportScanJson, exportAssetsCsv, exportFindingsCsv } from '../lib/export';
import ExecutiveSummary from '../components/ExecutiveSummary';

export default function ReportPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      if (!scanId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getScan(scanId);
        if (!isCancelled) {
          setScan(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Unable to compile dossier');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [scanId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] flex items-center justify-center font-mono">
        <div className="console-panel p-8 text-center space-y-3">
          <RefreshCw className="h-7 w-7 animate-spin text-[#58a6ff] mx-auto" />
          <p className="text-xs text-[#9aa5b8]">COMPILING SECURITY INTELLIGENCE DOSSIER…</p>
        </div>
      </main>
    );
  }

  if (error || !scan) {
    return (
      <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] flex items-center justify-center p-6 font-mono">
        <div className="max-w-md console-panel p-8 text-center space-y-4">
          <AlertTriangle className="mx-auto h-8 w-8 text-[#f85149]" />
          <h1 className="text-base font-bold">DOSSIER UNAVAILABLE</h1>
          <p className="text-xs text-[#9aa5b8]">{error || 'Scan not found or expired.'}</p>
          <Link
            to="/history"
            className="console-btn console-btn-primary inline-flex text-xs"
          >
            <ArrowLeft size={13} />
            <span>RETURN TO HISTORY</span>
          </Link>
        </div>
      </main>
    );
  }

  const score = scan.score ?? 0;
  const hasScore = scan.score !== undefined && scan.score !== null;
  const findings = scan.findings || [];

  const tlsData = scan.categories.tls?.data as {
    available?: boolean;
    protocol?: string;
    validTo?: string;
    validFrom?: string;
    issuer?: string;
    subject?: string;
    fingerprint256?: string;
    subjectAltNames?: string[];
  } | undefined;

  const dnsData = scan.categories.dns?.data as {
    addresses?: string[];
    aaaa?: string[];
    mx?: Array<{ exchange: string; priority: number }>;
    ns?: string[];
    spf?: { record?: string };
    dmarc?: { record?: string };
  } | undefined;

  const httpData = scan.categories.http?.data as {
    httpsEnforced?: boolean;
    httpRedirectsToHttps?: boolean;
    finalObservedUrl?: string;
    https?: { headers?: Record<string, string>; status?: number };
  } | undefined;

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] pb-16 print:bg-white print:text-slate-900 print:pb-0">
      {/* ─── Top Console Action Bar (Hidden in Print) ───────────────── */}
      <nav className="sticky top-0 z-40 border-b border-[#1f2735] bg-[#111620] print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to={`/scan/${scan.scanId}`}
            className="flex items-center gap-2 text-xs font-mono font-semibold text-[#9aa5b8] hover:text-[#e6edf3] transition"
          >
            <ArrowLeft size={14} />
            <span>[ RETURN TO INTERACTIVE CONSOLE ]</span>
          </Link>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={handlePrint}
              className="console-btn console-btn-primary py-1.5 px-3"
              title="Print document or Save as PDF"
            >
              <Printer size={13} />
              <span>PRINT / SAVE PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="console-btn py-1.5 px-2.5 text-[#9aa5b8]"
            >
              <Download size={11} />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportAssetsCsv(scan)}
              className="console-btn py-1.5 px-2.5 text-[#9aa5b8]"
            >
              <Download size={11} />
              <span>ASSETS CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportFindingsCsv(scan)}
              className="console-btn py-1.5 px-2.5 text-[#9aa5b8]"
            >
              <Download size={11} />
              <span>FINDINGS CSV</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Printable Dossier Container (Full Desktop Width) ────────── */}
      <article className="mx-auto max-w-7xl px-4 pt-6 space-y-6 sm:px-6 print:p-0 print:space-y-4">
        {/* ─── Dossier Header ────────────────────────────────────────── */}
        <header className="console-panel p-5 print:border-b print:border-slate-300 print:rounded-none">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 font-mono">
            <div>
              <div className="flex items-center gap-2 text-[#58a6ff] print:text-cyan-800 text-xs font-bold uppercase tracking-wider">
                <Shield size={15} />
                <span>EXTERNAL ATTACK SURFACE INTELLIGENCE DOSSIER</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#e6edf3] print:text-slate-900 sm:text-3xl">
                {scan.domain}
              </h1>
              <p className="mt-0.5 text-xs text-[#9aa5b8] print:text-slate-600 font-sans">
                Non-intrusive public perimeter reconnaissance and defensive configuration assessment.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-[#9aa5b8] print:text-slate-600">
              <span className="flex items-center gap-1 font-mono">
                <Calendar size={12} /> {new Date(scan.createdAt).toUTCString()}
              </span>
              <span className="font-mono text-[10px] text-[#626e82]">
                SCAN ID: {scan.scanId}
              </span>
              <span className="console-tag console-tag-cyan text-[10px]">
                STATUS // {scan.status.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* ─── Executive Summary Block ───────────────────────────────── */}
        <section>
          <ExecutiveSummary scan={scan} />
        </section>

        {/* ─── 2-Column Intelligence Dossier Grid ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── LEFT COLUMN ─── */}
          <div className="space-y-6">
            {/* Posture Score Breakdown */}
            <section className="console-panel p-5 space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                <span className="text-xs font-bold text-[#e6edf3]">
                  [01] DEFENSIVE POSTURE ASSESSMENT
                </span>
                <span className="text-xs text-[#58a6ff] font-bold">
                  {hasScore ? `${score} / 100` : '—'}
                </span>
              </div>
              <p className="text-xs text-[#9aa5b8] font-sans leading-relaxed">
                Rating reflects publicly observable defensive records (HSTS, CSP, valid TLS certificate, SPF/DMARC email policies, and non-sensitive well-known directories). Probes that could not be verified incur 0 penalties.
              </p>
              <div className="h-1.5 w-full rounded bg-[#1f2735] overflow-hidden">
                <div
                  className={`h-full ${
                    score >= 80 ? 'bg-[#3fb950]' : score >= 60 ? 'bg-[#58a6ff]' : score >= 40 ? 'bg-[#d29922]' : 'bg-[#f85149]'
                  }`}
                  style={{ width: `${hasScore ? Math.min(100, Math.max(5, score)) : 0}%` }}
                />
              </div>
            </section>

            {/* Transport Security & Cryptographic Dossier */}
            <section className="console-panel p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                <span className="font-bold text-[#e6edf3] flex items-center gap-1.5">
                  <Lock size={13} className="text-[#8a63d2]" />
                  <span>[02] TRANSPORT SECURITY & TLS DOSSIER</span>
                </span>
                <span className="console-tag">PORT_443</span>
              </div>

              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between py-1 border-b border-[#171e2b]">
                  <span className="text-[#626e82]">TLS HANDSHAKE:</span>
                  <span className={tlsData?.available ? 'text-[#3fb950] font-bold' : 'text-[#f85149] font-bold'}>
                    {tlsData?.available ? 'ESTABLISHED' : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171e2b]">
                  <span className="text-[#626e82]">PROTOCOL SUITE:</span>
                  <span className="text-[#e6edf3]">{tlsData?.protocol || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171e2b]">
                  <span className="text-[#626e82]">ISSUER AUTHORITY:</span>
                  <span className="text-[#e6edf3] truncate max-w-[280px]" title={tlsData?.issuer}>
                    {tlsData?.issuer || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171e2b]">
                  <span className="text-[#626e82]">EXPIRATION HORIZON:</span>
                  <span className="text-[#e6edf3]">{tlsData?.validTo || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#626e82]">HTTPS ENFORCEMENT:</span>
                  <span className={httpData?.httpsEnforced ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                    {httpData?.httpsEnforced ? 'ENFORCED (HTTP→HTTPS)' : 'NOT ENFORCED'}
                  </span>
                </div>
              </div>
            </section>

            {/* Email & Mail Security Policies */}
            <section className="console-panel p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                <span className="font-bold text-[#e6edf3] flex items-center gap-1.5">
                  <Mail size={13} className="text-[#58a6ff]" />
                  <span>[03] MAIL & ANTI-SPOOFING HYGIENE</span>
                </span>
                <span className="console-tag">DNS_TXT_MX</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-[#171e2b]">
                  <span className="text-[#626e82]">MX EXCHANGERS:</span>
                  <span className="text-[#e6edf3]">
                    {dnsData?.mx && dnsData.mx.length > 0 ? `${dnsData.mx.length} records configured` : 'None observed'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#171e2b]">
                  <span className="text-[#626e82]">SPF RECORD:</span>
                  <span className={dnsData?.spf?.record ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                    {dnsData?.spf?.record ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
                {dnsData?.spf?.record && (
                  <div className="console-panel-inset p-2 text-[10px] break-all text-[#9aa5b8]">
                    {dnsData.spf.record}
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-[#626e82]">DMARC RECORD:</span>
                  <span className={dnsData?.dmarc?.record ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                    {dnsData?.dmarc?.record ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
                {dnsData?.dmarc?.record && (
                  <div className="console-panel-inset p-2 text-[10px] break-all text-[#9aa5b8]">
                    {dnsData.dmarc.record}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="space-y-6">
            {/* Security Findings & Takeaways */}
            <section className="console-panel p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                <span className="font-bold text-[#e6edf3] flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-[#d29922]" />
                  <span>[04] RECORDED HYGIENE CONSIDERATIONS ({findings.length})</span>
                </span>
                <span className="console-tag">ACTIONABLE</span>
              </div>

              {findings.length === 0 ? (
                <p className="text-[#3fb950] py-4 text-center">
                  NO DEFENSIVE CONFIGURATION WEAKNESSES OBSERVED
                </p>
              ) : (
                <div className="space-y-2">
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      className="console-panel-inset p-3 border border-[#1f2735] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#e6edf3]">{f.title}</span>
                        <span
                          className={`console-tag text-[9px] ${
                            f.severity === 'high'
                              ? 'console-tag-coral'
                              : f.severity === 'medium'
                              ? 'console-tag-amber'
                              : 'console-tag-cyan'
                          }`}
                        >
                          {f.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#9aa5b8] font-sans leading-relaxed">
                        {f.description}
                      </p>
                      {f.recommendation && (
                        <div className="pt-1 text-[10px] text-[#3fb950]">
                          REC: {f.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* DNS Infrastructure & Public Records */}
            <section className="console-panel p-5 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1f2735] pb-2">
                <span className="font-bold text-[#e6edf3] flex items-center gap-1.5">
                  <Globe2 size={13} className="text-[#58a6ff]" />
                  <span>[05] DNS & AUTHORITATIVE INFRASTRUCTURE</span>
                </span>
                <span className="console-tag">PUBLIC_RESOLVERS</span>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[#626e82] block mb-1">A / AAAA RESOLVED IP ADDRESSES:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dnsData?.addresses?.map((ip) => (
                      <span key={ip} className="console-tag console-tag-cyan text-[11px]">
                        {ip}
                      </span>
                    )) || <span className="text-[#626e82]">None</span>}
                    {dnsData?.aaaa?.map((ip) => (
                      <span key={ip} className="console-tag text-[11px]">
                        {ip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#171e2b] pt-2">
                  <span className="text-[#626e82] block mb-1">AUTHORITATIVE NAMESERVERS:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dnsData?.ns?.map((ns) => (
                      <span key={ns} className="console-tag text-[11px]">
                        {ns}
                      </span>
                    )) || <span className="text-[#626e82]">None</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* Epistemology & Reconnaissance Scope */}
            <section className="console-panel-inset p-4 space-y-2 font-mono text-xs border border-[#1f2735]">
              <div className="text-[10px] font-bold text-[#626e82] uppercase tracking-wider">
                [06] PASSIVE OSINT METHODOLOGY & SCOPE
              </div>
              <p className="text-[11px] text-[#9aa5b8] font-sans leading-relaxed">
                This intelligence dossier was assembled entirely using passive open-source reconnaissance (OSINT). Inquiries were bounded by public DNS queries, Certificate Transparency logs (`crt.sh`), standard TLS handshakes, and public HTTP response headers. No port scans, vulnerability probes, or intrusive packets were transmitted.
              </p>
            </section>
          </div>
        </div>

        {/* ─── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-[#1f2735] pt-4 font-mono text-xs text-[#626e82] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DOMAIN ATTACK SURFACE SCANNER // RELEASE BUILD</span>
          <span>GENERATED: {new Date().toUTCString()}</span>
        </footer>
      </article>
    </main>
  );
}
