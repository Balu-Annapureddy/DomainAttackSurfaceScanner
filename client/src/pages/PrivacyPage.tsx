import { CheckCircle2, EyeOff, UserCheck, Server, Lock } from 'lucide-react';
import LegalPageLayout from '../components/LegalPageLayout';

const TOC = [
  { id: 'sec-summary', title: 'Core Principles' },
  { id: 'sec-classification', title: 'Data Classification' },
  { id: 'sec-not-collected', title: 'Data Not Collected' },
  { id: 'sec-retention', title: 'Retention & Deletion' },
  { id: 'sec-frameworks', title: 'Privacy Frameworks' },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="PRIVACY & DATA PROTECTION NOTICE"
      category="LEGAL & COMPLIANCE // DISCLOSURE"
      effectiveDate="SEPTEMBER 25, 2026"
      lastUpdated="SEPTEMBER 25, 2026"
      badge="DATA MINIMISATION ENFORCED"
      toc={TOC}
    >
      {/* Executive Summary Card */}
      <section id="sec-summary" className="console-panel p-5 space-y-3 scroll-mt-20">
        <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
          <CheckCircle2 size={14} className="text-[var(--accent-primary)]" />
          <span>CORE PRIVACY &amp; DATA HANDLING PRINCIPLES</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
          DomainAttackSurfaceScanner operates under strict data minimization principles. We maintain a sharp distinction between <strong>data about the person using the service</strong> and <strong>public technical observations about scanned target infrastructure</strong>. We never sell telemetry, operate ad trackers, or deploy invasive analytics.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 font-mono text-[11px]">
          <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 rounded-lg">
            <span className="text-[10px] text-[var(--accent-primary)] block font-bold">MINIMAL ACCOUNTS</span>
            <span className="text-[11px] text-[var(--text-secondary)] font-sans">Only email &amp; salted Scrypt hash. No phone or physical address.</span>
          </div>
          <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 rounded-lg">
            <span className="text-[10px] text-[var(--accent-primary)] block font-bold">ESSENTIAL COOKIES ONLY</span>
            <span className="text-[11px] text-[var(--text-secondary)] font-sans">1 session cookie for login. Zero advertising or tracking cookies.</span>
          </div>
          <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 rounded-lg">
            <span className="text-[10px] text-amber-500 block font-bold">FULL ERASURE RIGHTS</span>
            <span className="text-[11px] text-[var(--text-secondary)] font-sans">Self-service one-click account and scan record deletion.</span>
          </div>
        </div>
      </section>

      {/* Section 1: Classification of Data Processed */}
      <section id="sec-classification" className="space-y-4 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[01]</span>
          <span>THREE-TIER DATA CLASSIFICATION</span>
        </h2>

        <div className="space-y-3 font-sans text-xs">
          {/* Category A */}
          <div className="console-panel p-4 space-y-2 border-l-4 border-l-[var(--accent-primary)]">
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
                <strong className="text-[var(--text-primary)]">Submitted Target Domain Name:</strong> The public domain name you input for assessment.
              </li>
            </ul>
          </div>

          {/* Category B */}
          <div className="console-panel p-4 space-y-2 border-l-4 border-l-[var(--accent-teal)]">
            <div className="flex items-center gap-2 font-mono font-bold text-[var(--text-primary)] text-xs">
              <Server size={14} className="text-[var(--accent-teal)]" />
              <span>B. SCANNER-GENERATED DATA (TARGET INFRASTRUCTURE ONLY)</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              <strong className="text-[var(--text-primary)]">CRITICAL DISTINCTION:</strong> Information gathered during a scan reflects the <em>publicly observable external attack surface of the scanned domain</em>. It is <strong>NOT</strong> personal data about the operator performing the scan:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
              <li>
                <strong className="text-[var(--text-primary)]">Infrastructure IP Addresses:</strong> Public endpoints belonging to the target domain's nameservers, mail exchangers, and web servers.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">DNS Records &amp; Routing:</strong> A, AAAA, MX, TXT, NS, CNAME, CAA, and mail security controls (SPF, DKIM, DMARC).
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Subdomains &amp; Certificates:</strong> Names discovered via public Certificate Transparency logs, TLS certificate chains, and cipher suites.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">ASN &amp; Organization Data:</strong> Autonomous System Numbers registered in public BGP tables.
              </li>
            </ul>
          </div>

          {/* Category C */}
          <div className="console-panel p-4 space-y-2 border-l-4 border-l-amber-500">
            <div className="flex items-center gap-2 font-mono font-bold text-[var(--text-primary)] text-xs">
              <Lock size={14} className="text-amber-500" />
              <span>C. TECHNICAL &amp; SECURITY DATA (NETWORK &amp; SESSIONS)</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-[var(--text-secondary)]">
              <li>
                <strong className="text-[var(--text-primary)]">Operator Client IP Address:</strong> Processed in volatile memory to enforce sliding-window rate limits. Client IPs are never published in scan results.
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Session Token:</strong> Random 32-byte cryptographic token held in an essential <code>HttpOnly</code>, <code>SameSite=Lax</code>, <code>Secure</code> cookie (<code>dass_session</code>).
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 2: Data We Deliberately Do Not Collect */}
      <section id="sec-not-collected" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[02]</span>
          <span>DATA WE DELIBERATELY DO NOT COLLECT</span>
        </h2>
        <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)]">
          <p>To ensure strict privacy preservation, our system architecture contains zero mechanisms to collect or process:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] pt-1">
            <div className="console-panel-inset p-2 flex items-center gap-2">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO real names or phone numbers</span>
            </div>
            <div className="console-panel-inset p-2 flex items-center gap-2">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO physical addresses or government IDs</span>
            </div>
            <div className="console-panel-inset p-2 flex items-center gap-2">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO payment, card, or billing information</span>
            </div>
            <div className="console-panel-inset p-2 flex items-center gap-2">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO plaintext passwords</span>
            </div>
            <div className="console-panel-inset p-2 flex items-center gap-2">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO advertising or behavioral trackers</span>
            </div>
            <div className="console-panel-inset p-2 flex items-center gap-2">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO biometric or sensitive personal data</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Exact Retention & Deletion Lifecycle */}
      <section id="sec-retention" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[03]</span>
          <span>EXACT DATA RETENTION &amp; DELETION BEHAVIOR</span>
        </h2>
        <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
          <div className="space-y-1.5">
            <span className="font-mono font-bold text-[var(--text-primary)] text-xs block">
              1. ANONYMOUS / GUEST SCANS (EPHEMERAL RAM RETENTION)
            </span>
            <p className="leading-relaxed">
              Scans initiated without logging in are held solely in volatile system memory with an automated <strong>24-hour Time-to-Live (TTL)</strong>. When the 24-hour window expires, the scan record is automatically purged.
            </p>
          </div>

          <div className="space-y-1.5 border-t border-[var(--border-technical)] pt-3">
            <span className="font-mono font-bold text-[var(--text-primary)] text-xs block">
              2. REGISTERED OPERATOR SCANS (PERSISTENT DATABASE STORAGE)
            </span>
            <p className="leading-relaxed">
              When logged into an account, scans are persisted in the database so that you can access your historical timeline, run comparative diffs, and inspect security drift over time until you choose to delete them.
            </p>
          </div>

          <div className="space-y-1.5 border-t border-[var(--border-technical)] pt-3">
            <span className="font-mono font-bold text-[var(--text-primary)] text-xs block">
              3. COMPLETE SELF-SERVICE ACCOUNT DELETION (RIGHT TO ERASURE)
            </span>
            <p className="leading-relaxed">
              Registered operators can execute complete account erasure at any time via the History dashboard or via <code>DELETE /api/auth/me</code>, permanently deleting account credentials, active sessions, saved scans, and quota records.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Privacy Frameworks */}
      <section id="sec-frameworks" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[04]</span>
          <span>PRIVACY RIGHTS &amp; COMPLIANCE READINESS</span>
        </h2>
        <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
          <p className="leading-relaxed">
            Technical controls in this codebase are designed to support data protection obligations under DPDP, GDPR, and CCPA:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="console-panel-inset p-2.5">
              <span className="text-[var(--accent-primary)] font-bold block">PURPOSE LIMITATION</span>
              <span className="text-[var(--text-secondary)] font-sans text-xs">Data is processed solely to perform the requested reconnaissance assessment.</span>
            </div>
            <div className="console-panel-inset p-2.5">
              <span className="text-[var(--accent-primary)] font-bold block">DATA PORTABILITY</span>
              <span className="text-[var(--text-secondary)] font-sans text-xs">Operators can export complete scan reports as structured JSON or CSV spreadsheets.</span>
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
        </div>
      </section>
    </LegalPageLayout>
  );
}
