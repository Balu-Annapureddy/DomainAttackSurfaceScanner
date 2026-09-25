import { Link } from 'react-router-dom';
import { Shield, CheckCircle2, EyeOff, UserCheck, Server, Lock } from 'lucide-react';
import WorkstationNav from '../components/WorkstationNav';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav />

      {/* ─── Document Container ──────────────────────────────────────── */}
      <article className="mx-auto max-w-4xl px-4 py-8 space-y-8 flex-1">
        {/* Title Block */}
        <div className="border-b border-[var(--border-technical)] pb-4 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-primary)] mb-1">
            <Shield size={13} />
            <span>LEGAL &amp; COMPLIANCE // DISCLOSURE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            PRIVACY &amp; DATA PROTECTION NOTICE
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-secondary)] mt-2">
            <span>EFFECTIVE DATE: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span>LAST UPDATED: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span className="text-[var(--accent-primary)]">DATA MINIMISATION ENFORCED</span>
          </div>
        </div>

        {/* Executive Summary Card */}
        <section className="bg-[var(--bg-panel)] border border-[var(--border-technical)] p-4 space-y-2">
          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
            <CheckCircle2 size={13} className="text-[var(--accent-primary)]" />
            <span>CORE PRIVACY &amp; DATA HANDLING PRINCIPLES</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
            DomainAttackSurfaceScanner operates under strict data minimization principles. We maintain a sharp distinction between <strong>data about the person using the service</strong> and <strong>public technical observations about scanned target infrastructure</strong>. We never sell telemetry, operate ad trackers, or deploy invasive analytics.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 font-mono text-[11px]">
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-2.5">
              <span className="text-[10px] text-[var(--accent-primary)] block font-bold">MINIMAL ACCOUNTS</span>
              <span className="text-[11px] text-[var(--text-secondary)] font-sans">Only email &amp; salted Scrypt hash. No phone or physical address.</span>
            </div>
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-2.5">
              <span className="text-[10px] text-[var(--accent-primary)] block font-bold">ESSENTIAL COOKIES ONLY</span>
              <span className="text-[11px] text-[var(--text-secondary)] font-sans">1 session cookie for login. Zero advertising or tracking cookies.</span>
            </div>
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-2.5">
              <span className="text-[10px] text-amber-500 block font-bold">FULL ERASURE RIGHTS</span>
              <span className="text-[11px] text-[var(--text-secondary)] font-sans">Self-service one-click account and scan record deletion.</span>
            </div>
          </div>
        </section>

        {/* Section 1: Classification of Data Processed */}
        <section className="space-y-4 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[01]</span>
            <span>THREE-TIER DATA CLASSIFICATION</span>
          </h2>

          <div className="space-y-3 font-sans text-xs">
            {/* Category A: User-Provided Personal Data */}
            <div className="console-panel p-4 space-y-2 border-l-2 border-l-[var(--accent-primary)]">
              <div className="flex items-center gap-2 font-mono font-bold text-[var(--text-primary)] text-xs">
                <UserCheck size={14} className="text-[var(--accent-primary)]" />
                <span>A. USER-PROVIDED DATA (DATA ABOUT THE OPERATOR)</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                When you interact with the scanner, we collect only the minimal data strictly necessary to provide the service:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
                <li>
                  <strong className="text-[var(--text-primary)]">Account Email Address:</strong> Used strictly as your unique login identifier.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Scrypt Password Hash:</strong> Passwords are never stored in plaintext. They are processed using RFC 7914 Scrypt with individual 16-byte random salts and verified with timing-safe comparison.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Submitted Target Domain Name:</strong> The public domain name you input for assessment (e.g., <code>example.com</code>).
                </li>
              </ul>
            </div>

            {/* Category B: Target Infrastructure Data */}
            <div className="console-panel p-4 space-y-2 border-l-2 border-l-[var(--accent-primary)]">
              <div className="flex items-center gap-2 font-mono font-bold text-[var(--text-primary)] text-xs">
                <Server size={14} className="text-[var(--accent-primary)]" />
                <span>B. SCANNER-GENERATED DATA (TARGET INFRASTRUCTURE ONLY)</span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--text-primary)]">CRITICAL DISTINCTION:</strong> Information gathered during a scan reflects the <em>publicly observable external attack surface of the scanned domain</em>. It is <strong>NOT</strong> personal data about the operator performing the scan:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
                <li>
                  <strong className="text-[var(--text-primary)]">Infrastructure IP Addresses:</strong> IPv4 and IPv6 addresses belonging to the target domain's public nameservers, mail exchangers, and web endpoints. <em>These are NOT the operator's personal IP address.</em>
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">DNS Records &amp; Routing:</strong> A, AAAA, MX, TXT, NS, CNAME, CAA, and mail security controls (SPF, DKIM, DMARC).
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Subdomains &amp; Certificates:</strong> Names discovered via public Certificate Transparency logs (`crt.sh`), SSL/TLS certificate chains, and cipher suites.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">ASN &amp; Organization Data:</strong> Autonomous System Numbers and hosting provider names registered in public BGP routing tables.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Approximate Infrastructure Geolocation:</strong> Approximate datacenter or ISP network points of presence derived from public IP registries. Does not indicate physical office or residential addresses.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Defensive Posture &amp; Findings:</strong> Non-intrusive observation of HTTP response headers (HSTS, CSP) and calculated external hygiene scores (0–100).
                </li>
              </ul>
            </div>

            {/* Category C: Technical & Security Data */}
            <div className="console-panel p-4 space-y-2 border-l-2 border-l-amber-500">
              <div className="flex items-center gap-2 font-mono font-bold text-[var(--text-primary)] text-xs">
                <Lock size={14} className="text-amber-500" />
                <span>C. TECHNICAL &amp; SECURITY DATA (NETWORK &amp; SESSIONS)</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
                <li>
                  <strong className="text-[var(--text-primary)]">Operator Client IP Address:</strong> Processed in volatile memory to enforce sliding-window rate limits (e.g. 5 scans/hour for anonymous users) and block volumetric denial-of-service attempts. Client IPs are never published in scan results.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Session Token:</strong> A random 32-byte cryptographic token held in an essential `HttpOnly`, `SameSite=Lax`, `Secure` cookie (`dass_session`) to keep registered operators signed in.
                </li>
                <li>
                  <strong className="text-[var(--text-primary)]">Security Logs:</strong> Server logs capturing timestamps and error codes to maintain operational integrity. We never log passwords, session tokens, or cookie values.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Data We Deliberately Do Not Collect */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[02]</span>
            <span>DATA WE DELIBERATELY DO NOT COLLECT</span>
          </h2>
          <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)]">
            <p>To ensure strict privacy preservation, our system architecture contains zero mechanisms to collect or process:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] pt-1">
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO real names or phone numbers</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO physical addresses or government IDs</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO payment, card, or billing information</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO plaintext passwords</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO advertising or behavioral trackers</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO biometric or sensitive personal data</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Exact Retention & Deletion Lifecycle */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[03]</span>
            <span>EXACT DATA RETENTION &amp; DELETION BEHAVIOR</span>
          </h2>
          <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
            <div className="space-y-2">
              <span className="font-mono font-bold text-[var(--text-primary)] text-xs block">
                1. ANONYMOUS / GUEST SCANS (EPHEMERAL RAM RETENTION)
              </span>
              <p className="leading-relaxed">
                Scans initiated without logging in are held solely in volatile system memory with an automated <strong>24-hour Time-to-Live (TTL)</strong>. When the 24-hour window expires, the scan record is automatically purged from memory. Local scan references stored in your browser's <code>localStorage</code> can be cleared at any time via the History interface.
              </p>
            </div>

            <div className="space-y-2 border-t border-[var(--border-technical)] pt-3">
              <span className="font-mono font-bold text-[var(--text-primary)] text-xs block">
                2. REGISTERED OPERATOR SCANS (PERSISTENT DATABASE STORAGE)
              </span>
              <p className="leading-relaxed">
                When you are logged into an account, scans are persisted in the database so that you can access your historical timeline, run comparative diffs, and inspect security drift over time. <em>There is no automated time-based auto-expiration for registered scans</em>; they are retained until you choose to delete them.
              </p>
            </div>

            <div className="space-y-2 border-t border-[var(--border-technical)] pt-3">
              <span className="font-mono font-bold text-[var(--text-primary)] text-xs block">
                3. COMPLETE SELF-SERVICE ACCOUNT DELETION (RIGHT TO ERASURE)
              </span>
              <p className="leading-relaxed">
                Registered operators can execute complete account erasure at any time via the <strong>DELETE ACCOUNT &amp; ALL DATA</strong> button on the History dashboard (or via <code>DELETE /api/auth/me</code>). This triggers an immediate, permanent cascade that purges:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                <li>Your account credentials and email address</li>
                <li>All active sessions and session cookies</li>
                <li>All saved scans, asset relationships, and findings</li>
                <li>All usage quota tracking records</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 4: Privacy Frameworks & DPDP Readiness */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[04]</span>
            <span>PRIVACY RIGHTS &amp; DPDP READINESS</span>
          </h2>
          <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
            <p className="leading-relaxed">
              Technical controls in this codebase are designed to support data protection obligations under the Digital Personal Data Protection (DPDP) Act, the European General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="console-panel-inset p-2.5">
                <span className="text-[var(--accent-primary)] font-bold block">PURPOSE LIMITATION</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">Data is processed solely to perform the requested reconnaissance assessment.</span>
              </div>
              <div className="console-panel-inset p-2.5">
                <span className="text-[var(--accent-primary)] font-bold block">DATA PORTABILITY</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">Operators can export complete scan dossiers as structured JSON or CSV spreadsheets.</span>
              </div>
              <div className="console-panel-inset p-2.5">
                <span className="text-[var(--accent-primary)] font-bold block">RIGHT TO ERASURE</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">Self-service, permanent deletion of individual scans or entire accounts.</span>
              </div>
              <div className="console-panel-inset p-2.5">
                <span className="text-[var(--accent-primary)] font-bold block">ACCESS CONTROL</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">Strict tenant isolation: operators can only view their own saved scan records.</span>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] italic pt-1 border-t border-[var(--border-technical)]">
              Disclaimer: Technical controls are engineered to support applicable privacy and security requirements. Formal legal compliance should be reviewed for the specific operating entity, deployment jurisdiction, and data protection officer (DPO) designations.
            </p>
          </div>
        </section>

        {/* ─── Legal Navigation Footer ─────────────────────────────────── */}
        <footer className="border-t border-[var(--border-technical)] pt-4 font-mono text-[11px] text-[var(--text-secondary)] flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="text-[var(--accent-primary)] font-bold">PRIVACY POLICY</Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-[var(--accent-primary)] transition">TERMS OF USE</Link>
            <span>&middot;</span>
            <Link to="/cookies" className="hover:text-[var(--accent-primary)] transition">COOKIE POLICY</Link>
            <span>&middot;</span>
            <Link to="/billing" className="hover:text-[var(--accent-primary)] transition">BILLING &amp; REFUNDS</Link>
            <span>&middot;</span>
            <Link to="/security" className="hover:text-[var(--accent-primary)] transition">SECURITY &amp; DISCLOSURE</Link>
          </div>
          <Link to="/" className="hover:text-[var(--accent-primary)] transition">
            [ RETURN TO CONSOLE ]
          </Link>
        </footer>
      </article>
    </div>
  );
}
