import { Link } from 'react-router-dom';
import { Shield, CheckCircle2, EyeOff } from 'lucide-react';
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
            <span>LEGAL & COMPLIANCE // DISCLOSURE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            PRIVACY & DATA PROTECTION NOTICE
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
            <span>CORE PRIVACY & DATA HANDLING PRINCIPLES</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
            DomainAttackSurfaceScanner is designed around strict privacy-preserving defaults and data minimisation.
            The service provides both anonymous scanning (with zero cookies and volatile in-memory retention) and registered operator accounts (with persistent history and essential session cookies). We never run third-party advertising trackers or sell telemetry.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 font-mono">
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-2.5">
              <span className="text-[10px] text-[var(--accent-primary)] block font-bold">MINIMAL ACCOUNTS</span>
              <span className="text-[11px] text-[var(--text-secondary)] font-sans">Only email & salted password hash. No phone or address.</span>
            </div>
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-2.5">
              <span className="text-[10px] text-[var(--accent-primary)] block font-bold">ESSENTIAL COOKIES ONLY</span>
              <span className="text-[11px] text-[var(--text-secondary)] font-sans">1 session cookie for login. Zero ad/tracking cookies.</span>
            </div>
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-2.5">
              <span className="text-[10px] text-[#d29922] block font-bold">24-HOUR ANON TTL</span>
              <span className="text-[11px] text-[var(--text-secondary)] font-sans">Guest scans automatically evict from RAM in 24 hours.</span>
            </div>
          </div>
        </section>

        {/* Section 1: Data We Collect & Process */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1 font-mono">
            <span className="text-[var(--accent-primary)]">[01]</span>
            <span>DATA COLLECTED AND PROCESSED</span>
          </h2>
          <div className="space-y-2 text-[var(--text-secondary)] font-sans text-xs leading-relaxed">
            <p>
              We collect and process only the technical data strictly necessary to operate the application and enforce rate limits:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[var(--text-primary)] font-mono text-[11px] bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)]">
              <li>
                <strong className="text-[var(--accent-primary)]">Target Domain Name:</strong> The public hostname entered by the operator (e.g., <code>example.com</code>) to scope the passive reconnaissance.
              </li>
              <li>
                <strong className="text-[var(--accent-primary)]">Operator Account Information (Registered Users Only):</strong> When creating an account, we store your email address and a cryptographically salted password hash generated via Scrypt (RFC 7914). We never store plaintext passwords.
              </li>
              <li>
                <strong className="text-[var(--accent-primary)]">Client IP Address (Ephemeral):</strong> Received by the web server during HTTP requests for routing and quota enforcement (e.g. 5 scans/hour for guests).
              </li>
              <li>
                <strong className="text-[var(--accent-primary)]">Public Perimeter Data (Generated):</strong> Public DNS records, append-only Certificate Transparency log records, WHOIS/RDAP registrar data, and public HTTP response headers.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Data We Do NOT Collect */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1 font-mono">
            <span className="text-[var(--accent-primary)]">[02]</span>
            <span>DATA WE EXPLICITLY DO NOT COLLECT</span>
          </h2>
          <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] p-3 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p className="mb-2">We deliberately avoid collecting unnecessary personal or sensitive information:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <EyeOff size={12} className="text-[#ef4444]" />
                <span>NO real names or phone numbers</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <EyeOff size={12} className="text-[#ef4444]" />
                <span>NO physical addresses or government IDs</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <EyeOff size={12} className="text-[#ef4444]" />
                <span>NO plaintext passwords</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <EyeOff size={12} className="text-[#ef4444]" />
                <span>NO payment, card, or billing information</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <EyeOff size={12} className="text-[#ef4444]" />
                <span>NO biometric or sensitive personal data</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-primary)]">
                <EyeOff size={12} className="text-[#ef4444]" />
                <span>NO cross-site tracking or advertising profiles</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Cookie Audit & Classification */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1 font-mono">
            <span className="text-[var(--accent-primary)]">[03]</span>
            <span>COOKIE AUDIT & CLASSIFICATION</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p>
              We classify all cookies strictly according to purpose:
            </p>
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-technical)] p-3 space-y-2 font-mono text-[11px]">
              <div>
                <span className="text-[var(--accent-primary)] font-bold">1. STRICTLY ESSENTIAL SESSION COOKIE:</span>
                <p className="text-[var(--text-secondary)] font-sans text-xs mt-0.5">
                  Name: <code className="text-[var(--text-primary)]">dass_session</code> (HttpOnly, Secure in production, SameSite=Lax). Used solely to authenticate registered operators between requests. Guest/anonymous scanning sets zero cookies.
                </p>
              </div>
              <div>
                <span className="text-[var(--accent-primary)] font-bold">2. NON-ESSENTIAL COOKIES:</span>
                <p className="text-[var(--text-secondary)] font-sans text-xs mt-0.5">
                  None. We do not use analytics cookies, marketing cookies, or tracking pixels. Consequently, no deceptive cookie banner is displayed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Storage, Retention & Deletion */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1 font-mono">
            <span className="text-[var(--accent-primary)]">[04]</span>
            <span>STORAGE, RETENTION AND USER DELETION RIGHTS</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-technical)] p-3 space-y-2 font-mono text-[11px]">
              <div>
                <span className="text-[var(--accent-primary)] font-bold">ANONYMOUS SCANS:</span>
                <p className="text-[var(--text-secondary)] font-sans text-xs mt-0.5">
                  Held solely in volatile RAM with an automated 24-hour Time-to-Live (TTL). Once expired, records are dropped entirely.
                </p>
              </div>
              <div>
                <span className="text-[var(--accent-primary)] font-bold">REGISTERED USER SCANS:</span>
                <p className="text-[var(--text-secondary)] font-sans text-xs mt-0.5">
                  Persisted in the database under your authenticated account ID. You may delete any scan at any time using the delete icon in the History view.
                </p>
              </div>
              <div>
                <span className="text-[var(--accent-primary)] font-bold">CLIENT BROWSER HISTORY:</span>
                <p className="text-[var(--text-secondary)] font-sans text-xs mt-0.5">
                  Stored in local browser storage (<code>localStorage</code>) and can be cleared in one click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Third-Party Integrations */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1 font-mono">
            <span className="text-[var(--accent-primary)]">[05]</span>
            <span>THIRD-PARTY RECONNAISSANCE PROVIDERS</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p>
              To observe public perimeter hygiene, our backend executes outbound queries against public authoritative data sources:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-primary)] font-mono text-[11px] bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)]">
              <li><strong>Authoritative DNS Resolvers:</strong> Queries A, AAAA, MX, NS, TXT, SPF, DMARC records for the target domain.</li>
              <li><strong>Certificate Transparency Logs (crt.sh):</strong> Queries append-only cryptographic CT logs to discover publicly known subdomains and SANs.</li>
              <li><strong>RDAP / WHOIS Registries (rdap.org):</strong> Reads public registrar registration metadata.</li>
              <li><strong>IP Intelligence (ipapi.co):</strong> Resolves target IP addresses to Autonomous System Numbers (ASN) and country codes.</li>
              <li><strong>OpenStreetMap (Tile Server):</strong> Map tiles rendered client-side with public attribution.</li>
            </ul>
          </div>
        </section>

        {/* Section 6: DPDP Readiness */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1 font-mono">
            <span className="text-[var(--accent-primary)]">[06]</span>
            <span>PRIVACY & DATA PROTECTION (DPDP READINESS)</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p>
              We implement architectural readiness aligning with the principles of the Digital Personal Data Protection (DPDP) Act:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-[var(--bg-panel-inset)] p-3 border border-[var(--border-muted)]">
              <div>
                <span className="text-[var(--accent-primary)] font-bold block">PURPOSE LIMITATION:</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">Data is processed solely to generate the requested technical report.</span>
              </div>
              <div>
                <span className="text-[var(--accent-primary)] font-bold block">COLLECTION MINIMISATION:</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">No personal profile, phone, or billing data is collected.</span>
              </div>
              <div>
                <span className="text-[var(--accent-primary)] font-bold block">STORAGE LIMITATION:</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">Automated expiration and user-directed deletion.</span>
              </div>
              <div>
                <span className="text-[var(--accent-primary)] font-bold block">REASONABLE SAFEGUARDS:</span>
                <span className="text-[var(--text-secondary)] font-sans text-xs">Scrypt hashing, private IP / SSRF blocking, and rate limits.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Security Inquiries & Contact */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1 font-mono">
            <span className="text-[var(--accent-primary)]">[07]</span>
            <span>PRIVACY INQUIRIES & DISCLOSURE</span>
          </h2>
          <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] p-3 text-xs font-sans text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p>
              DomainAttackSurfaceScanner is an open-source cybersecurity project maintained on GitHub.
              For privacy inquiries, technical corrections, or repository audits, please open an issue or security advisory:
            </p>
            <div className="font-mono text-[11px]">
              <a
                href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner/issues"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 font-bold"
              >
                <span>github.com/Balu-Annapureddy/DomainAttackSurfaceScanner</span>
              </a>
            </div>
          </div>
        </section>
      </article>

      {/* Footer */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-3 font-mono text-[11px] text-[var(--text-muted)] text-center">
        <span>DOMAIN ATTACK SURFACE SCANNER &middot; </span>
        <Link to="/terms" className="hover:text-[var(--accent-primary)]">Terms of Use</Link>
        <span> &middot; </span>
        <Link to="/security" className="hover:text-[var(--accent-primary)]">Security &amp; Vulnerability Disclosure</Link>
      </footer>
    </div>
  );
}
