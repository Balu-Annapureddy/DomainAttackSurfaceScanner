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
  CheckCircle2,
} from 'lucide-react';
import type { DomainScan } from '../../../shared/types';
import { getScan } from '../lib/api';
import { exportScanJson, exportAssetsCsv, exportFindingsCsv } from '../lib/export';
import {
  generateHumanSecurityAssessment,
  getPrioritizedAttentionList,
  getConfirmedProtectionsDetailed,
} from '../lib/narrativeSummary';
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
          setError(err instanceof Error ? err.message : 'Unable to compile report');
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
      <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center font-mono transition-colors">
        <div className="console-panel p-6 text-center space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin text-[var(--accent-primary)] mx-auto" />
          <p className="text-xs text-[var(--text-secondary)] font-bold tracking-wider">COMPILING SECURITY ASSESSMENT REPORT…</p>
        </div>
      </main>
    );
  }

  if (error || !scan) {
    return (
      <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4 font-mono transition-colors">
        <div className="max-w-md console-panel p-6 text-center space-y-3">
          <AlertTriangle className="mx-auto h-7 w-7 text-red-500" />
          <h1 className="text-sm font-bold tracking-wider">REPORT UNAVAILABLE</h1>
          <p className="text-xs text-[var(--text-secondary)]">{error || 'Scan record expired or not found.'}</p>
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

  const assessment = generateHumanSecurityAssessment(scan);
  const attentionItems = getPrioritizedAttentionList(scan);
  const confirmedProtections = getConfirmedProtectionsDetailed(scan);
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
    dnssec?: { observed?: boolean; record?: string };
  } | undefined;

  const httpData = scan.categories.http?.data as {
    httpsEnforced?: boolean;
    httpRedirectsToHttps?: boolean;
    finalObservedUrl?: string;
    headers?: Record<string, string>;
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
      <nav aria-label="Report Actions" className="border-b border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <Link
            to={`/scan/${encodeURIComponent(scan.scanId)}`}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition"
          >
            <ArrowLeft size={13} />
            <span>[ RETURN TO INTERACTIVE ASSESSMENT ]</span>
          </Link>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={handlePrint}
              className="console-btn console-btn-primary py-1 px-3 text-xs"
              title="Print document or Save as PDF"
            >
              <Printer size={13} />
              <span>PRINT / SAVE PDF</span>
            </button>
            <button
              type="button"
              onClick={() => exportScanJson(scan)}
              className="console-btn py-1 px-2.5 text-xs text-[var(--text-secondary)]"
            >
              <Download size={11} />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => exportAssetsCsv(scan)}
              className="console-btn py-1 px-2.5 text-xs text-[var(--text-secondary)]"
            >
              <Download size={11} />
              <span>ASSETS CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportFindingsCsv(scan)}
              className="console-btn py-1 px-2.5 text-xs text-[var(--text-secondary)]"
            >
              <Download size={11} />
              <span>FINDINGS CSV</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Printable Security Report Layout (Desktop Sidebar + Main) ── */}
      <div className="mx-auto max-w-7xl px-4 pt-6 lg:flex lg:gap-6 print:p-0 print:block">
        {/* Left Anchor-Nav Sidebar (Desktop) */}
        <aside className="hidden lg:block w-48 shrink-0 print:hidden">
          <div className="sticky top-4 console-panel p-3 space-y-1 text-xs font-mono">
            <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider px-2 py-1 mb-1 border-b border-[var(--border-muted)]">
              REPORT INDEX
            </div>
            <a href="#sec-summary" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">01. Summary</a>
            <a href="#sec-attention" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">02. Priority Issues</a>
            <a href="#sec-good" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">03. Active Defenses</a>
            <a href="#sec-footprint" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">04. Surface Footprint</a>
            <a href="#sec-transport" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">05. Encryption &amp; TLS</a>
            <a href="#sec-mail" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">06. Mail &amp; DNS</a>
            <a href="#sec-headers" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">07. Security Headers</a>
            <a href="#sec-findings" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">08. Full Findings</a>
            <a href="#sec-scope" className="block px-2 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-panel-subtle)] transition">09. Scope &amp; Limits</a>
          </div>
        </aside>

        {/* Report Content Body */}
        <article className="flex-1 min-w-0 space-y-6 print:p-0 print:space-y-4">
          {/* ─── Report Masthead ───────────────────────────────────────── */}
          <header className="console-panel p-5 print:border-b print:border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 font-mono">
              <div>
                <div className="flex items-center gap-2 text-[var(--accent-primary)] text-xs font-bold uppercase tracking-wider">
                  <Shield size={14} />
                  <span>SECURITY ASSESSMENT REPORT</span>
                </div>
                <h1 className="mt-1 text-2xl sm:text-3xl font-display italic font-normal tracking-tight text-[var(--text-primary)] print:text-slate-900">
                  {scan.domain}
                </h1>
                <p className="mt-1 text-xs text-[var(--text-secondary)] print:text-slate-600 font-sans max-w-xl">
                  Comprehensive external assessment of public domain configuration, website connection encryption, email authentication defenses, and visible infrastructure footprint.
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-[var(--text-secondary)] print:text-slate-600 shrink-0">
                <span className="flex items-center gap-1 font-mono">
                  <Calendar size={12} /> {new Date(scan.createdAt).toUTCString()}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  ASSESSMENT ID: {scan.scanId.slice(0, 12)}…
                </span>
                <span className="console-tag text-[10px] uppercase font-mono">
                  PUBLIC CONFIGURATION AUDIT
                </span>
              </div>
            </div>
          </header>

          {/* ─── [01] Human Security Assessment Narrative ─────────────── */}
          <section id="sec-summary" className="console-panel p-5 scroll-mt-14 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-muted)] pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  01. Assessment Summary
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  Executive Security Overview
                </h2>
              </div>
              {hasScore && (
                <div className="text-right flex items-baseline gap-2">
                  <span className="text-2xl font-display italic font-bold text-[var(--accent-primary)]">
                    {score} / 100
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    ({assessment.scoreClassification})
                  </span>
                </div>
              )}
            </div>

            {/* Narrative Answers */}
            <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-[var(--text-primary)] block">What did we check?</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {assessment.whatWeChecked.map((chk, idx) => (
                    <div key={idx} className="bg-[var(--bg-panel-subtle)] p-2.5 rounded border border-[var(--border-muted)] text-xs">
                      <strong className="text-[var(--text-primary)] block">{chk.title}</strong>
                      <span className="text-[11px] text-[var(--text-secondary)]">{chk.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--text-primary)] block">What did we find?</span>
                <p>{assessment.whatWeFoundNarrative}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--text-primary)] block">What matters most?</span>
                <p>{assessment.whatMattersMostNarrative}</p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-muted)] text-center font-mono text-xs">
              <div className="p-2 bg-[var(--bg-panel-subtle)] rounded">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Priority Items</span>
                <span className="text-base font-bold text-amber-500">{assessment.importantFindingsCount}</span>
              </div>
              <div className="p-2 bg-[var(--bg-panel-subtle)] rounded">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Active Defenses</span>
                <span className="text-base font-bold text-[#16a34a] dark:text-[#52B788]">{assessment.protectionsConfirmedCount}</span>
              </div>
              <div className="p-2 bg-[var(--bg-panel-subtle)] rounded">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Discovered Assets</span>
                <span className="text-base font-bold text-[var(--text-primary)]">{scan.assets?.length ?? 0}</span>
              </div>
              <div className="p-2 bg-[var(--bg-panel-subtle)] rounded">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">Unverified Areas</span>
                <span className="text-base font-bold text-[var(--text-muted)]">{assessment.unverifiedAreasCount}</span>
              </div>
            </div>
          </section>

          {/* ─── [02] What Needs Your Attention ───────────────────────── */}
          <section id="sec-attention" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                02. Priority Action Items
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                What Needs Your Attention ({attentionItems.length})
              </h2>
            </div>

            {attentionItems.length === 0 ? (
              <p className="text-xs text-[#16a34a] dark:text-[#52B788] py-2">
                ✓ No high or medium priority configuration weaknesses were observed during this assessment.
              </p>
            ) : (
              <div className="space-y-3 pt-1">
                {attentionItems.map((item) => (
                  <div key={item.id} className="bg-[var(--bg-panel-subtle)] p-3.5 rounded border border-[var(--border-muted)] space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--text-primary)] text-sm">{item.title}</span>
                      <span className="console-tag text-[10px] uppercase font-mono">
                        {item.severityHumanLabel}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[var(--text-secondary)] leading-relaxed">
                      <p><strong className="text-[var(--text-primary)]">What was found: </strong>{item.whatWeFound}</p>
                      <p><strong className="text-[var(--text-primary)]">Why this matters: </strong>{item.whyThisMatters}</p>
                      <p><strong className="text-[var(--text-primary)]">Recommended action: </strong>{item.whatYouShouldDo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── [03] What Looks Good ─────────────────────────────────── */}
          <section id="sec-good" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#52B788]">
                03. Confirmed Protections
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                What Looks Good ({confirmedProtections.length})
              </h2>
            </div>

            {confirmedProtections.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-2">
                No active defensive controls were confirmed during this scan.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {confirmedProtections.map((item, idx) => (
                  <div key={idx} className="bg-[var(--bg-panel-subtle)] p-3 rounded border border-[var(--border-muted)] space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                      <CheckCircle2 size={13} className="text-[#16a34a] dark:text-[#52B788] shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {item.plainExplanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── [04] Surface Footprint ───────────────────────────────── */}
          <section id="sec-footprint" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                04. Network Surface Footprint
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Discovered Infrastructure Endpoints
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1.5 p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)]">
                <div className="flex justify-between border-b border-[var(--border-muted)] pb-1">
                  <span className="text-[var(--text-muted)]">ROOT DOMAIN:</span>
                  <span className="text-[var(--text-primary)] font-bold">{scan.domain}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-muted)] pb-1">
                  <span className="text-[var(--text-muted)]">SUBDOMAINS (CT):</span>
                  <span className="text-[var(--accent-primary)] font-bold">
                    {scan.assets?.filter((a) => a.type === 'SUBDOMAIN').length ?? 0} hostnames
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">PUBLIC IP ADDRESSES:</span>
                  <span className="text-[var(--text-primary)] font-bold">
                    {scan.assets?.filter((a) => a.type === 'IP').length ?? 0} endpoints
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)]">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">ROUTED NETWORK PROVIDERS (ASNs)</span>
                <p className="text-xs text-[var(--text-primary)] font-bold">
                  {scan.assets?.filter((a) => a.type === 'ASN').map((a) => a.value).join(', ') || 'Direct routing / not resolved'}
                </p>
              </div>
            </div>
          </section>

          {/* ─── [05] Encryption & TLS ────────────────────────────────── */}
          <section id="sec-transport" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                05. Encryption &amp; Certificate Security
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                HTTPS Transport &amp; TLS Cryptography
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1.5">
                <div className="flex justify-between border-b border-[var(--border-muted)] pb-1">
                  <span className="text-[var(--text-muted)]">HTTPS REDIRECTION:</span>
                  <span className={httpData?.httpsEnforced ? 'text-[#16a34a] dark:text-[#52B788] font-bold' : 'text-amber-500 font-bold'}>
                    {httpData?.httpsEnforced ? '✓ ENFORCED' : 'NOT ENFORCED'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-muted)] pb-1">
                  <span className="text-[var(--text-muted)]">TLS HANDSHAKE:</span>
                  <span className={tlsData?.available ? 'text-[#16a34a] dark:text-[#52B788] font-bold' : 'text-red-500 font-bold'}>
                    {tlsData?.available ? `ESTABLISHED (${tlsData.protocol || 'TLS'})` : 'UNAVAILABLE'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">HSTS HEADER:</span>
                  <span className={httpData?.headers?.['strict-transport-security'] ? 'text-[#16a34a] dark:text-[#52B788] font-bold' : 'text-amber-500 font-bold'}>
                    {httpData?.headers?.['strict-transport-security'] ? '✓ ACTIVE' : 'MISSING'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1.5">
                <div className="flex justify-between border-b border-[var(--border-muted)] pb-1">
                  <span className="text-[var(--text-muted)]">ISSUER:</span>
                  <span className="text-[var(--text-primary)] truncate max-w-xs">{tlsData?.issuer || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border-muted)] pb-1">
                  <span className="text-[var(--text-muted)]">EXPIRES:</span>
                  <span className="text-[var(--text-primary)]">{tlsData?.validTo || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">SAN NAMES:</span>
                  <span className="text-[var(--accent-primary)]">{tlsData?.subjectAltNames?.length ?? 0} alternate domains</span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── [06] Mail & DNS Protection ───────────────────────────── */}
          <section id="sec-mail" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                06. Mail &amp; DNS Protection
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Anti-Spoofing &amp; Cryptographic Integrity
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">SPF SENDER POLICY</span>
                <span className={`font-bold block ${dnsData?.spf?.record ? 'text-[#16a34a] dark:text-[#52B788]' : 'text-amber-500'}`}>
                  {dnsData?.spf?.record ? '✓ PUBLISHED' : 'NOT PUBLISHED'}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-sans">Protects against forged sender headers</span>
              </div>

              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">DMARC POLICY</span>
                <span className={`font-bold block ${dnsData?.dmarc?.record ? 'text-[#16a34a] dark:text-[#52B788]' : 'text-amber-500'}`}>
                  {dnsData?.dmarc?.record ? '✓ PUBLISHED' : 'NOT PUBLISHED'}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-sans">Instructs receivers how to handle fake mail</span>
              </div>

              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase block">DNSSEC ZONE INTEGRITY</span>
                <span className={`font-bold block ${dnsData?.dnssec?.observed ? 'text-[#16a34a] dark:text-[#52B788]' : 'text-amber-500'}`}>
                  {dnsData?.dnssec?.observed ? '✓ SIGNED' : 'NOT SIGNED'}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-sans">Prevents DNS lookup spoofing</span>
              </div>
            </div>
          </section>

          {/* ─── [07] Protective Security Headers ─────────────────────── */}
          <section id="sec-headers" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                07. Protective Security Headers
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Browser Defense Instructions
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="font-bold text-[var(--text-primary)]">Content-Security-Policy (CSP)</span>
                  <span className={httpData?.headers?.['content-security-policy'] ? 'text-[#16a34a] dark:text-[#52B788] font-bold' : 'text-[var(--text-muted)]'}>
                    {httpData?.headers?.['content-security-policy'] ? '✓ Active' : 'Missing'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Restricts script sources to block cross-site scripting (XSS).</p>
              </div>

              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="font-bold text-[var(--text-primary)]">X-Frame-Options</span>
                  <span className={httpData?.headers?.['x-frame-options'] ? 'text-[#16a34a] dark:text-[#52B788] font-bold' : 'text-[var(--text-muted)]'}>
                    {httpData?.headers?.['x-frame-options'] ? '✓ Active' : 'Missing'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Prevents clickjacking by controlling whether site can be framed.</p>
              </div>

              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="font-bold text-[var(--text-primary)]">X-Content-Type-Options</span>
                  <span className={httpData?.headers?.['x-content-type-options'] ? 'text-[#16a34a] dark:text-[#52B788] font-bold' : 'text-[var(--text-muted)]'}>
                    {httpData?.headers?.['x-content-type-options'] ? '✓ Active' : 'Missing'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Prevents browsers from misinterpreting files as executable code.</p>
              </div>

              <div className="p-3 bg-[var(--bg-panel-subtle)] rounded border border-[var(--border-muted)] space-y-1">
                <div className="flex justify-between font-mono">
                  <span className="font-bold text-[var(--text-primary)]">Referrer-Policy</span>
                  <span className={httpData?.headers?.['referrer-policy'] ? 'text-[#16a34a] dark:text-[#52B788] font-bold' : 'text-[var(--text-muted)]'}>
                    {httpData?.headers?.['referrer-policy'] ? '✓ Active' : 'Missing'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Protects user privacy by controlling referral information sent to other sites.</p>
              </div>
            </div>
          </section>

          {/* ─── [08] Full Findings & Technical Details ───────────────── */}
          <section id="sec-findings" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                08. Findings &amp; Technical Analysis
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Detailed Hygiene Observations ({findings.length})
              </h2>
            </div>
            {findings.length === 0 ? (
              <p className="text-xs text-[#16a34a] dark:text-[#52B788] py-2">
                No hygiene anomalies or configuration weaknesses were observed during this assessment.
              </p>
            ) : (
              <div className="space-y-3.5 pt-1">
                {findings.map((f) => (
                  <div key={f.id} className="bg-[var(--bg-panel-subtle)] p-4 rounded border border-[var(--border-muted)] space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--text-primary)] text-sm">{f.title}</span>
                      <span className="console-tag text-[10px] uppercase font-mono">
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {f.description}
                    </p>
                    {f.recommendation && (
                      <div className="text-[11px] bg-[var(--bg-panel)] p-2 rounded border border-[var(--border-muted)]">
                        <strong className="text-[var(--text-primary)] font-mono">RECOMMENDED ACTION: </strong>
                        <span className="text-[var(--text-secondary)]">{f.recommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── [09] Assessment Scope & Limitations ──────────────────── */}
          <section id="sec-scope" className="console-panel p-5 scroll-mt-14 space-y-3">
            <div className="border-b border-[var(--border-muted)] pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                09. Methodology &amp; Scope
              </span>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Assessment Boundaries &amp; Important Context
              </h2>
            </div>
            <div className="text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
              <p>
                This assessment was conducted using <strong>passive, non-intrusive external reconnaissance</strong>. DASS queried publicly observable records including authoritative DNS resolvers, Certificate Transparency logs, standard TLS handshakes, and public HTTP response headers. No port scans, vulnerability exploits, or intrusive packets were transmitted.
              </p>
              <p>
                <strong>Important Distinction:</strong> A score of {hasScore ? `${score}/100` : 'N/A'} is an external security hygiene indicator based solely on observable public configuration. It does not certify that the internal systems or software code are free of vulnerabilities. Similarly, an unverified check indicates that public authoritative endpoints did not respond in time, not that a vulnerability exists.
              </p>
            </div>
          </section>

          {/* ─── Report Footer ────────────────────────────────────────── */}
          <footer className="border-t border-[var(--border-muted)] pt-3 font-mono text-[11px] text-[var(--text-muted)] flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DOMAIN ATTACK SURFACE SCANNER // REPORT ENGINE</span>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition-colors">Privacy</Link>
              <span>&middot;</span>
              <Link to="/terms" className="hover:text-[var(--accent-primary)] transition-colors">Terms</Link>
              <span>&middot;</span>
              <Link to="/security" className="hover:text-[var(--accent-primary)] transition-colors">Security &amp; Disclosure</Link>
            </div>
            <span>COMPILED: {new Date().toUTCString()}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
