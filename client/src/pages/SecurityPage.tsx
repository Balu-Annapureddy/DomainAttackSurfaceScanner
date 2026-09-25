import { Link } from 'react-router-dom';
import { ShieldCheck, Bug } from 'lucide-react';
import WorkstationNav from '../components/WorkstationNav';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav />

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 font-mono text-xs space-y-6">
        {/* Title Block */}
        <div className="border-b border-[var(--border-technical)] pb-4">
          <div className="flex items-center gap-2 text-emerald-500 text-[11px] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck size={13} />
            <span>RESPONSIBLE DISCLOSURE & ARCHITECTURAL SAFEGUARDS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            SECURITY POLICY & VULNERABILITY REPORTING
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-secondary)] mt-2">
            <span>EFFECTIVE DATE: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span>LAST UPDATED: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span className="text-[var(--accent-primary)]">RESPONSIBLE DISCLOSURE PROGRAM</span>
          </div>
        </div>

        {/* Section 1: Reporting Security Vulnerabilities */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[01]</span>
            <span>REPORTING A VULNERABILITY IN THIS PROJECT</span>
          </h2>
          <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-4 text-xs font-sans text-[var(--text-secondary)] space-y-3 leading-relaxed">
            <p>
              If you identify a security vulnerability in DomainAttackSurfaceScanner itself (e.g., an SSRF bypass, denial-of-service vector, or injection flaw), we welcome and appreciate responsible disclosure.
            </p>
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-2 font-mono text-[11px]">
              <strong className="text-emerald-500 flex items-center gap-1.5">
                <Bug size={13} />
                <span>HOW TO SUBMIT A SECURITY REPORT:</span>
              </strong>
              <p className="font-sans text-[var(--text-secondary)]">
                Please submit details privately using GitHub&apos;s Private Vulnerability Reporting feature on our repository:
              </p>
              <div className="text-[var(--accent-primary)] break-all">
                <a
                  href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner/security/advisories/new"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-[var(--text-primary)]"
                >
                  https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner/security/advisories/new
                </a>
              </div>
              <p className="font-sans text-[11px] text-[var(--text-muted)] mt-1">
                Please include reproducible steps, request/response samples, and the potential impact. We will acknowledge receipt and provide a remediation timeline before public disclosure.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Built-in Architectural Safeguards */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[02]</span>
            <span>ARCHITECTURAL SAFEGUARDS & ABUSE PREVENTION</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p>
              DomainAttackSurfaceScanner includes active defenses to prevent being weaponized as a proxy or scanner against private infrastructure:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px] text-[var(--text-primary)]">
              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-1">
                <span className="text-[var(--accent-primary)] font-bold block">SSRF & PRIVATE IP BLOCKING</span>
                <p className="font-sans text-[var(--text-secondary)] text-xs">
                  All resolved IP addresses are validated prior to connection. The scanner strictly blocks loopback (127.0.0.0/8, ::1), private RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), link-local (169.254.0.0/16), cloud metadata endpoints, and multicast blocks.
                </p>
              </div>

              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-1">
                <span className="text-emerald-500 font-bold block">PUBLIC DOMAIN VALIDATION</span>
                <p className="font-sans text-[var(--text-secondary)] text-xs">
                  Inputs must be valid publicly delegable FQDNs. Localhost, internal names, single-label domains, and invalid TLDs are rejected before initiating DNS lookups.
                </p>
              </div>

              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-1">
                <span className="text-amber-500 font-bold block">RESOURCE BUDGETS & BOUNDS</span>
                <p className="font-sans text-[var(--text-secondary)] text-xs">
                  Each scan is constrained by hard limits: maximum 30 external network requests, 512KB response payload cap, 5-second socket timeout, and maximum 3 redirect hops.
                </p>
              </div>

              <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-1">
                <span className="text-[var(--accent-primary)] font-bold block">RATE LIMITING & CONCURRENCY</span>
                <p className="font-sans text-[var(--text-secondary)] text-xs">
                  API endpoints enforce IP-based rate limiting (100 req/min general; strict rate limiting on scan initiation) and limits concurrent scans to 2 per server instance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Non-Intrusive OSINT Scope */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[03]</span>
            <span>PASSIVE RECONNAISSANCE GUARANTEE</span>
          </h2>
          <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-4 text-xs font-sans text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p>
              The scanner is engineered exclusively for <strong>passive external visibility</strong>. It performs standard public HTTP GET/HEAD requests to ports 80 and 443, identical to a standard web browser visit.
            </p>
            <p className="font-mono text-[11px] text-[var(--text-primary)]">
              IT DOES NOT PERFORM:
            </p>
            <ul className="list-disc list-inside font-mono text-[11px] text-[var(--text-secondary)] space-y-1">
              <li>TCP/UDP port scanning or service enumeration across random ports</li>
              <li>Authentication brute-forcing or credential stuffing</li>
              <li>Fuzzing, SQL injection, XSS exploitation, or automated payload delivery</li>
              <li>Denial-of-service testing or network flooding</li>
            </ul>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-3 mt-auto font-mono text-[11px] text-[var(--text-muted)]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DOMAIN ATTACK SURFACE SCANNER // SECURITY POLICY</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition">PRIVACY POLICY</Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-[var(--accent-primary)] transition">TERMS OF USE</Link>
            <span>&middot;</span>
            <Link to="/cookies" className="hover:text-[var(--accent-primary)] transition">COOKIE POLICY</Link>
            <span>&middot;</span>
            <Link to="/billing" className="hover:text-[var(--accent-primary)] transition">BILLING &amp; REFUNDS</Link>
            <span>&middot;</span>
            <Link to="/security" className="text-[var(--accent-primary)] font-bold">SECURITY &amp; DISCLOSURE</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
