import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Download,
  Shield,
  Calendar,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { getScan } from '../lib/api';
import { exportScanJson, exportAssetsCsv, exportFindingsCsv } from '../lib/export';
import WorkstationNav from '../components/WorkstationNav';

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
      <main className="min-h-screen bg-[#080b0f] text-[#e6edf3] flex items-center justify-center font-mono">
        <div className="console-panel p-6 text-center space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin text-[#58a6ff] mx-auto" />
          <p className="text-xs text-[#8b9bb0]">COMPILING INTELLIGENCE DOSSIER…</p>
        </div>
      </main>
    );
  }

  if (error || !scan) {
    return (
      <main className="min-h-screen bg-[#080b0f] text-[#e6edf3] flex items-center justify-center p-4 font-mono">
        <div className="max-w-md console-panel p-6 text-center space-y-3">
          <AlertTriangle className="mx-auto h-7 w-7 text-[#f85149]" />
          <h1 className="text-sm font-bold">DOSSIER UNAVAILABLE</h1>
          <p className="text-xs text-[#8b9bb0]">{error || 'Scan record expired or not found.'}</p>
          <Link
            to="/history"
            className="console-btn console-btn-primary inline-flex text-xs"
          >
            <ArrowLeft size={12} />
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
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-16 print:bg-white print:text-slate-900 print:pb-0 font-sans transition-colors duration-150">
      <div className="print:hidden">
        <WorkstationNav />
      </div>

      {/* ─── Top Console Action Bar (Hidden in Print) ───────────────── */}
      <nav className="border-b border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <Link
            to={`/scan/${encodeURIComponent(scan.scanId)}`}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition"
          >
            <ArrowLeft size={13} />
            <span>[ RETURN TO INTERACTIVE WORKSTATION ]</span>
          </Link>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={handlePrint}
              className="console-btn console-btn-primary py-0.5 px-2.5 text-[11px]"
              title="Print document or Save as PDF"
            >
              <Printer size={12} />
              <span>PRINT / PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="console-btn py-0.5 px-2 text-[11px] text-[#8b9bb0]"
            >
              <Download size={10} />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportAssetsCsv(scan)}
              className="console-btn py-0.5 px-2 text-[11px] text-[#8b9bb0]"
            >
              <Download size={10} />
              <span>ASSETS CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportFindingsCsv(scan)}
              className="console-btn py-0.5 px-2 text-[11px] text-[#8b9bb0]"
            >
              <Download size={10} />
              <span>FINDINGS CSV</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Printable Intelligence Dossier (1200-1400px Desktop Width) ── */}
      <article className="mx-auto max-w-7xl px-4 pt-4 space-y-4 print:p-0 print:space-y-3">
        {/* ─── Dossier Masthead ───────────────────────────────────────── */}
        <header className="console-panel p-4 print:border-b print:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 font-mono">
            <div>
              <div className="flex items-center gap-1.5 text-[#58a6ff] text-xs font-bold uppercase tracking-wider">
                <Shield size={13} />
                <span>EXTERNAL ATTACK SURFACE INTELLIGENCE DOSSIER</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#e6edf3] print:text-slate-900">
                {scan.domain}
              </h1>
              <p className="mt-0.5 text-xs text-[#8b9bb0] print:text-slate-600 font-sans">
                Passive external intelligence assessment. Authoritative DNS, CT logs, TLS transport, and HTTP security posture.
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1 text-[11px] text-[#8b9bb0] print:text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar size={11} /> {new Date(scan.createdAt).toUTCString()}
              </span>
              <span className="text-[10px] text-[#576575]">
                SCAN ID: {scan.scanId}
              </span>
              <span className="console-tag console-tag-cyan text-[10px]">
                STATUS // {scan.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* ─── [01] Executive Intelligence Telemetry ─────────────────── */}
        <section className="console-panel">
          <div className="dossier-header">
            <div>
              <span className="dossier-num">[01]</span>
              <span>EXECUTIVE INTELLIGENCE</span>
            </div>
            <span className="text-[10px] text-[#8b9bb0]">KEY DEFENSIVE METRICS</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#1e2631]">
            <div className="bg-[#10151b] p-3 font-mono">
              <div className="text-[10px] text-[#576575] uppercase">ASSETS</div>
              <div className="text-xl font-bold text-[#e6edf3] mt-0.5">{scan.assets?.length ?? 0}</div>
              <div className="text-[10px] text-[#8b9bb0]">Discovered nodes</div>
            </div>
            <div className="bg-[#10151b] p-3 font-mono">
              <div className="text-[10px] text-[#576575] uppercase">RELATIONS</div>
              <div className="text-xl font-bold text-[#58a6ff] mt-0.5">{scan.relationships?.length ?? 0}</div>
              <div className="text-[10px] text-[#8b9bb0]">Graph edges</div>
            </div>
            <div className="bg-[#10151b] p-3 font-mono">
              <div className="text-[10px] text-[#576575] uppercase">FINDINGS</div>
              <div className="text-xl font-bold text-[#d29922] mt-0.5">{findings.length}</div>
              <div className="text-[10px] text-[#8b9bb0]">Hygiene items</div>
            </div>
            <div className="bg-[#10151b] p-3 font-mono">
              <div className="text-[10px] text-[#576575] uppercase">COMPLETENESS</div>
              <div className="text-xl font-bold text-[#e6edf3] mt-0.5">
                {scan.completeness === 'complete' ? '100%' : 'PARTIAL'}
              </div>
              <div className="text-[10px] text-[#8b9bb0]">Probe categories</div>
            </div>
            <div className="bg-[#10151b] p-3 font-mono">
              <div className="text-[10px] text-[#576575] uppercase">SCORE</div>
              <div className="text-xl font-bold text-[#3fb950] mt-0.5">{hasScore ? `${score}` : '—'} / 100</div>
              <div className="text-[10px] text-[#8b9bb0]">Configuration rating</div>
            </div>
            <div className="bg-[#10151b] p-3 font-mono">
              <div className="text-[10px] text-[#576575] uppercase">RECON SCOPE</div>
              <div className="text-xs font-bold text-[#e6edf3] mt-1">PASSIVE OSINT</div>
              <div className="text-[10px] text-[#8b9bb0]">Zero intrusive packets</div>
            </div>
          </div>
        </section>

        {/* ─── 2-Column Dossier Structure ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ─── LEFT COLUMN ─── */}
          <div className="space-y-4">
            {/* [02] Surface Footprint */}
            <section className="console-panel font-mono text-xs">
              <div className="dossier-header">
                <div>
                  <span className="dossier-num">[02]</span>
                  <span>SURFACE FOOTPRINT</span>
                </div>
                <span className="text-[10px] text-[#8b9bb0]">NETWORK ASSETS</span>
              </div>
              <div className="p-3 bg-[#10151b] space-y-2">
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">ROOT DOMAIN:</span>
                  <span className="text-[#e6edf3] font-bold">{scan.domain}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">SUBDOMAINS DISCOVERED:</span>
                  <span className="text-[#58a6ff] font-bold">
                    {scan.assets?.filter((a) => a.type === 'SUBDOMAIN').length ?? 0} hostnames
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">ROUTED IP ENDPOINTS:</span>
                  <span className="text-[#e6edf3] font-bold">
                    {scan.assets?.filter((a) => a.type === 'IP').length ?? 0} public IPs
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#576575]">AUTONOMOUS SYSTEMS (ASN):</span>
                  <span className="text-[#3fb950] font-bold">
                    {scan.assets?.filter((a) => a.type === 'ASN').map((a) => a.value).join(', ') || 'Direct routing'}
                  </span>
                </div>
              </div>
            </section>

            {/* [03] Transport Security */}
            <section className="console-panel font-mono text-xs">
              <div className="dossier-header">
                <div>
                  <span className="dossier-num">[03]</span>
                  <span>TRANSPORT SECURITY</span>
                </div>
                <span className="text-[10px] text-[#8b9bb0]">ENCRYPTION POSTURE</span>
              </div>
              <div className="p-3 bg-[#10151b] space-y-2">
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">HTTPS ENFORCEMENT:</span>
                  <span className={httpData?.httpsEnforced ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                    {httpData?.httpsEnforced ? 'ENFORCED (HTTP→HTTPS)' : 'NOT ENFORCED'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">TLS NEGOTIATION:</span>
                  <span className={tlsData?.available ? 'text-[#3fb950] font-bold' : 'text-[#f85149] font-bold'}>
                    {tlsData?.available ? `ACTIVE (${tlsData.protocol || 'TLS'})` : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#576575]">HSTS POLICY:</span>
                  <span className={httpData?.https?.headers?.['strict-transport-security'] ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                    {httpData?.https?.headers?.['strict-transport-security'] ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
              </div>
            </section>

            {/* [04] Mail & Perimeter */}
            <section className="console-panel font-mono text-xs">
              <div className="dossier-header">
                <div>
                  <span className="dossier-num">[04]</span>
                  <span>MAIL & PERIMETER</span>
                </div>
                <span className="text-[10px] text-[#8b9bb0]">SPOOFING CONTROLS</span>
              </div>
              <div className="p-3 bg-[#10151b] space-y-2">
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">MX RECORD ROUTING:</span>
                  <span className="text-[#e6edf3]">
                    {dnsData?.mx && dnsData.mx.length > 0 ? `${dnsData.mx.length} mail servers` : 'None observed'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">SPF SENDER POLICY:</span>
                  <span className={dnsData?.spf?.record ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                    {dnsData?.spf?.record ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#576575]">DMARC ENFORCEMENT:</span>
                  <span className={dnsData?.dmarc?.record ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                    {dnsData?.dmarc?.record ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
              </div>
            </section>

            {/* [05] Hygiene Observations */}
            <section className="console-panel font-mono text-xs">
              <div className="dossier-header">
                <div>
                  <span className="dossier-num">[05]</span>
                  <span>HYGIENE OBSERVATIONS</span>
                </div>
                <span className="text-[10px] text-[#8b9bb0]">DEFENSIVE SIGNALS</span>
              </div>
              <div className="p-3 bg-[#10151b] space-y-2 font-sans text-[11px] text-[#8b9bb0]">
                <p>
                  Perimeter evaluation assessed transport layers, certificate provenance, and defensive response headers.
                </p>
                <div className="space-y-1 font-mono text-xs pt-1">
                  <div className="flex justify-between py-1 border-b border-[#1e2631]">
                    <span className="text-[#576575]">CSP (CONTENT-SECURITY-POLICY):</span>
                    <span className={httpData?.https?.headers?.['content-security-policy'] ? 'text-[#3fb950]' : 'text-[#d29922]'}>
                      {httpData?.https?.headers?.['content-security-policy'] ? 'OBSERVED' : 'NOT OBSERVED'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#576575]">X-FRAME-OPTIONS:</span>
                    <span className={httpData?.https?.headers?.['x-frame-options'] ? 'text-[#3fb950]' : 'text-[#d29922]'}>
                      {httpData?.https?.headers?.['x-frame-options'] ? 'OBSERVED' : 'NOT OBSERVED'}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="space-y-4">
            {/* [06] Key Observations */}
            <section className="console-panel font-mono text-xs">
              <div className="dossier-header">
                <div>
                  <span className="dossier-num">[06]</span>
                  <span>KEY OBSERVATIONS</span>
                </div>
                <span className="text-[10px] text-[#8b9bb0]">SYNTHESIS</span>
              </div>
              <div className="p-3 bg-[#10151b] font-sans text-xs text-[#8b9bb0] space-y-2 leading-relaxed">
                <p>
                  Target <strong className="text-[#e6edf3] font-mono">{scan.domain}</strong> completed an external passive inspection across 6 probe categories.
                </p>
                <p>
                  Security hygiene calculated at <strong className="text-[#58a6ff] font-mono">{hasScore ? `${score}/100` : '—'}</strong> based on observable public defensive controls.
                </p>
              </div>
            </section>

            {/* [07] Findings Dossier */}
            <section className="console-panel font-mono text-xs">
              <div className="dossier-header">
                <div>
                  <span className="dossier-num">[07]</span>
                  <span>FINDINGS & ANOMALIES</span>
                </div>
                <span className="text-[10px] text-[#8b9bb0]">{findings.length} RECORDS</span>
              </div>
              <div className="divide-y divide-[#1e2631] bg-[#0c1015] max-h-72 overflow-y-auto">
                {findings.length === 0 ? (
                  <div className="p-4 text-center text-[#3fb950]">
                    NO HYGIENE ANOMALIES OBSERVED
                  </div>
                ) : (
                  findings.map((f) => (
                    <div key={f.id} className="p-2.5 bg-[#10151b] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#e6edf3]">{f.title}</span>
                        <span className="text-[10px] text-[#d29922] uppercase">[{f.severity}]</span>
                      </div>
                      <p className="text-[11px] text-[#8b9bb0] font-sans">
                        {f.description}
                      </p>
                      {f.recommendation && (
                        <div className="text-[10px] text-[#3fb950] font-mono">
                          ACTION: {f.recommendation}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* [08] TLS Dossier */}
            <section className="console-panel font-mono text-xs">
              <div className="dossier-header">
                <div>
                  <span className="dossier-num">[08]</span>
                  <span>TLS DOSSIER</span>
                </div>
                <span className="text-[10px] text-[#8b9bb0]">CERTIFICATE METADATA</span>
              </div>
              <div className="p-3 bg-[#10151b] space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">ISSUER:</span>
                  <span className="text-[#e6edf3] truncate max-w-xs">{tlsData?.issuer || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">SUBJECT:</span>
                  <span className="text-[#e6edf3] truncate max-w-xs">{tlsData?.subject || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1e2631]">
                  <span className="text-[#576575]">VALID UNTIL:</span>
                  <span className="text-[#e6edf3]">{tlsData?.validTo || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#576575]">SAN DOMAINS:</span>
                  <span className="text-[#58a6ff]">{tlsData?.subjectAltNames?.length ?? 0} alternate names</span>
                </div>
              </div>
            </section>

            {/* [09] Methodology */}
            <section className="console-panel-inset p-3 font-mono text-xs border border-[#1e2631]">
              <div className="text-[10px] font-bold text-[#576575] uppercase tracking-wider mb-1">
                [09] RECONNAISSANCE METHODOLOGY & SCOPE
              </div>
              <p className="text-[11px] text-[#8b9bb0] font-sans leading-relaxed">
                This intelligence dossier was assembled entirely using passive open-source reconnaissance (OSINT). Inquiries were bounded by public DNS queries, Certificate Transparency logs, standard TLS handshakes, and public HTTP response headers. No port scans, vulnerability probes, or intrusive packets were transmitted.
              </p>
            </section>
          </div>
        </div>

        {/* ─── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-[#1e2631] pt-3 font-mono text-[11px] text-[#576575] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DOMAIN ATTACK SURFACE SCANNER // INTELLIGENCE DOSSIER</span>
          <div className="flex items-center gap-3">
            <Link to="/privacy" className="hover:text-[#58a6ff] transition-colors">Privacy</Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-[#58a6ff] transition-colors">Terms</Link>
            <span>&middot;</span>
            <Link to="/security" className="hover:text-[#58a6ff] transition-colors">Security &amp; Disclosure</Link>
          </div>
          <span>COMPILED: {new Date().toUTCString()}</span>
        </footer>
      </article>
    </div>
  );
}
