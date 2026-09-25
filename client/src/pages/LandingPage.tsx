import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Shield, ArrowRight, Sparkles, BookOpen, History, Globe2, Server, Lock } from 'lucide-react';
import { createScan } from '../lib/api';
import GlossaryModal from '../components/GlossaryModal';

export default function LandingPage() {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const scan = await createScan(domain);
      const previous = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as Array<{
        scanId: string;
        domain: string;
        createdAt: string;
      }>;
      localStorage.setItem(
        'domain_scanner_scans',
        JSON.stringify(
          [{ scanId: scan.scanId, domain: scan.domain, createdAt: scan.createdAt }, ...previous.filter((item) => item.scanId !== scan.scanId)].slice(0, 30),
        ),
      );
      navigate(`/scan/${scan.scanId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to initiate perimeter scan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] selection:bg-[#388bfd]/30 selection:text-[#e6edf3]">
      {/* ─── Global Console Header ───────────────────────────────────── */}
      <header className="border-b border-[#1f2735] bg-[#111620]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-[#388bfd]/40 bg-[#162030] text-[#58a6ff]">
              <Terminal size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-tight text-[#e6edf3]">
                  DOMAIN ATTACK SURFACE SCANNER
                </span>
                <span className="hidden font-mono text-[10px] text-[#626e82] sm:inline">
                  v1.2.0 // PASSIVE_OSINT
                </span>
              </div>
              <p className="hidden text-[11px] text-[#9aa5b8] sm:block">
                External reconnaissance and configuration hygiene console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsGlossaryOpen(true)}
              className="console-btn text-xs py-1.5 px-3 text-[#9aa5b8] hover:text-[#e6edf3]"
            >
              <BookOpen size={13} className="text-[#58a6ff]" />
              <span className="hidden sm:inline">Knowledge Guide</span>
            </button>
            <Link
              to="/history"
              className="console-btn text-xs py-1.5 px-3 text-[#9aa5b8] hover:text-[#e6edf3]"
            >
              <History size={13} />
              <span>History</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Content Container ──────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        {/* ─── Section 1: System Title & Intro ───────────────────────── */}
        <section className="border-b border-[#1f2735] pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2 font-mono text-[11px]">
            <span className="console-tag console-tag-phosphor">SYSTEM // ONLINE</span>
            <span className="console-tag console-tag-cyan">MODE // STRICTLY_PASSIVE</span>
            <span className="console-tag">EVIDENCE // PUBLIC_TELEMETRY</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e6edf3] sm:text-3xl font-mono">
            PASSIVE EXTERNAL PERIMETER INTELLIGENCE
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#9aa5b8]">
            Discover domains, subdomains, IP endpoints, autonomous systems (ASNs), and defensive posture without sending intrusive traffic, probing private networks, or launching attacks.
          </p>
        </section>

        {/* ─── Section 2: Scan Console ───────────────────────────────── */}
        <section className="console-panel p-5 sm:p-6">
          <div className="border-b border-[#1f2735] pb-3 mb-4 flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#9aa5b8]">
              TARGET RECONNAISSANCE CONSOLE
            </span>
            <span className="font-mono text-[11px] text-[#626e82]">PORT // 80, 443, DNS_PASSIVE</span>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#626e82]">
                DOMAIN:
              </span>
              <input
                id="domain-input"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="console-input pl-20"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="console-btn console-btn-primary px-6"
            >
              {loading ? (
                <>SCANNING PERIMETER…</>
              ) : (
                <>
                  <span>START SCAN</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Secondary Quick Demo Action */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#171e2b] text-xs font-mono text-[#9aa5b8]">
            <div className="flex items-center gap-2">
              <span className="text-[#626e82]">DEMO MODE:</span>
              <span>Need to evaluate immediately without initiating third-party API queries?</span>
            </div>
            <Link
              to="/scan/sample"
              className="inline-flex items-center gap-1.5 text-[#58a6ff] hover:text-[#e6edf3] font-semibold transition"
            >
              <Sparkles size={13} />
              <span>[ EXPLORE SAMPLE SCAN (perimeter-demo.io) ]</span>
            </Link>
          </div>

          {error && (
            <div className="mt-4 console-tag console-tag-coral p-2.5 w-full text-xs font-mono">
              [ERROR]: {error}
            </div>
          )}
        </section>

        {/* ─── Section 3: What We Observe (3-Column Grid) ─────────────── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs text-[#9aa5b8] uppercase tracking-wider">
            <span className="text-[#58a6ff]">[01]</span>
            <span>WHAT WE OBSERVE ACROSS THE PUBLIC PERIMETER</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="console-panel p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#58a6ff]">
                <Globe2 size={16} />
                <span className="font-mono text-xs font-bold text-[#e6edf3]">
                  DNS & INFRASTRUCTURE
                </span>
              </div>
              <p className="text-xs text-[#9aa5b8] leading-relaxed">
                A, AAAA, MX, NS, and authoritative delegations. Resolves IP endpoints, BGP Autonomous System Numbers (ASNs), and datacenter transit providers.
              </p>
            </div>

            <div className="console-panel p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#3fb950]">
                <Server size={16} />
                <span className="font-mono text-xs font-bold text-[#e6edf3]">
                  CERTIFICATE TRANSPARENCY
                </span>
              </div>
              <p className="text-xs text-[#9aa5b8] leading-relaxed">
                Public append-only cryptographic CT logs harvest valid and historical subdomains without dictionary brute-forcing or active probes.
              </p>
            </div>

            <div className="console-panel p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#d29922]">
                <Lock size={16} />
                <span className="font-mono text-xs font-bold text-[#e6edf3]">
                  SECURITY HYGIENE
                </span>
              </div>
              <p className="text-xs text-[#9aa5b8] leading-relaxed">
                TLS encryption suites, certificate valid horizons, HTTPS enforcement redirects, SPF/DMARC anti-spoofing policies, and defense headers.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Section 4: How It Works Pipeline Flow ──────────────────── */}
        <section className="console-panel p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1f2735] pb-2 font-mono text-xs text-[#9aa5b8]">
            <div className="flex items-center gap-2">
              <span className="text-[#58a6ff]">[02]</span>
              <span>HOW IT WORKS // RECONNAISSANCE PIPELINE</span>
            </div>
            <span className="text-[10px] text-[#626e82]">NON-DESTRUCTIVE EXECUTION</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 pt-2 font-mono text-xs">
            <div className="console-panel-inset p-2.5 text-center">
              <span className="text-[10px] text-[#626e82] block">STEP 01</span>
              <span className="font-bold text-[#e6edf3] block mt-0.5">Domain</span>
              <span className="text-[10px] text-[#9aa5b8] block">Input target</span>
            </div>

            <div className="console-panel-inset p-2.5 text-center">
              <span className="text-[10px] text-[#626e82] block">STEP 02</span>
              <span className="font-bold text-[#e6edf3] block mt-0.5">DNS Records</span>
              <span className="text-[10px] text-[#9aa5b8] block">A, MX, NS, TXT</span>
            </div>

            <div className="console-panel-inset p-2.5 text-center">
              <span className="text-[10px] text-[#626e82] block">STEP 03</span>
              <span className="font-bold text-[#e6edf3] block mt-0.5">Certificates</span>
              <span className="text-[10px] text-[#9aa5b8] block">Public CT logs</span>
            </div>

            <div className="console-panel-inset p-2.5 text-center">
              <span className="text-[10px] text-[#626e82] block">STEP 04</span>
              <span className="font-bold text-[#e6edf3] block mt-0.5">Infrastructure</span>
              <span className="text-[10px] text-[#9aa5b8] block">IP, ASN, GeoIP</span>
            </div>

            <div className="console-panel-inset p-2.5 text-center">
              <span className="text-[10px] text-[#626e82] block">STEP 05</span>
              <span className="font-bold text-[#e6edf3] block mt-0.5">Observations</span>
              <span className="text-[10px] text-[#9aa5b8] block">Headers & TLS</span>
            </div>

            <div className="console-panel-inset p-2.5 text-center">
              <span className="text-[10px] text-[#626e82] block">STEP 06</span>
              <span className="font-bold text-[#e6edf3] block mt-0.5">Findings</span>
              <span className="text-[10px] text-[#9aa5b8] block">Evidence graph</span>
            </div>
          </div>
        </section>

        {/* ─── Section 5: Passive Reconnaissance Guarantee ────────────── */}
        <section className="console-panel-inset border-l-2 border-l-[#388bfd] p-4 text-xs font-mono">
          <div className="flex items-start gap-3">
            <Shield size={18} className="mt-0.5 text-[#58a6ff] shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[#e6edf3]">
                  THE PASSIVE RECONNAISSANCE GUARANTEE
                </span>
                <span className="text-[10px] text-[#3fb950]">[SAFE & LEGAL]</span>
              </div>
              <p className="text-[#9aa5b8] leading-relaxed">
                <strong>“We did not observe X” ≠ “X does not exist.”</strong> DomainAttackSurfaceScanner queries authoritative public records, Certificate Transparency logs, and standard response headers. We never perform intrusive port scanning, exploit testing, or authentication brute-forcing.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Knowledge Guide Modal ───────────────────────────────────── */}
      <GlossaryModal
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </main>
  );
}
