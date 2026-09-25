import { Link } from 'react-router-dom';
import { AlertTriangle, Scale } from 'lucide-react';
import WorkstationNav from '../components/WorkstationNav';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav />

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 font-mono text-xs space-y-6">
        {/* Title Block */}
        <div className="border-b border-[var(--border-technical)] pb-4">
          <div className="flex items-center gap-2 text-[var(--accent-primary)] text-[11px] font-bold uppercase tracking-wider mb-1">
            <Scale size={13} />
            <span>LEGAL AGREEMENT & ACCEPTABLE USE POLICY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            TERMS AND CONDITIONS OF USE
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-secondary)] mt-2">
            <span>EFFECTIVE DATE: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span>LAST UPDATED: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span className="text-emerald-500">OPEN-SOURCE MIT LICENSE</span>
          </div>
        </div>

        {/* ─── Critical Authorization Warning Banner ──────────────────── */}
        <div className="bg-[var(--bg-panel-inset)] border-l-2 border-amber-500 p-4 text-xs text-[var(--text-primary)] space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-500">
            <AlertTriangle size={14} className="shrink-0" />
            <span>MANDATORY AUTHORIZED SCANNING REQUIREMENT</span>
          </div>
          <p className="font-sans text-[11px] text-[var(--text-secondary)] leading-relaxed">
            By initiating a scan, you explicitly affirm that you own the target domain or have received express written authorization from the domain owner to perform external attack surface reconnaissance. Unauthorized surveillance or reconnaissance against targets you do not control is strictly prohibited.
          </p>
        </div>

        {/* Section 1: Service Description */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[01]</span>
            <span>SERVICE DESCRIPTION AND NATURE OF THE TOOL</span>
          </h2>
          <div className="space-y-2 text-[var(--text-secondary)] font-sans text-xs leading-relaxed">
            <p>
              DomainAttackSurfaceScanner is a defensive, non-intrusive security intelligence workstation. It aggregates and visualizes publicly accessible technical records—such as authoritative DNS answers, append-only Certificate Transparency (CT) logs, WHOIS/RDAP registry entries, and standard HTTP response headers—to help system administrators and security analysts understand their public-facing attack surface.
            </p>
            <p>
              The tool does <strong>not</strong> perform vulnerability exploitation, port scanning, credential brute-forcing, SQL injection, denial-of-service, or intrusive penetration testing.
            </p>
          </div>
        </section>

        {/* Section 2: Acceptable Use & Prohibited Activities */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[02]</span>
            <span>ACCEPTABLE USE AND PROHIBITED ACTIVITIES</span>
          </h2>
          <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-4 text-xs font-sans text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <p>Users agree to comply with all applicable local, national, and international laws. You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-1.5 font-mono text-[11px] text-[var(--text-primary)]">
              <li>Scan any domain or digital asset without prior authorization from the rightful owner or operator.</li>
              <li>Use scan results to conduct harassment, extortion, cyberattacks, unauthorized intrusion, or malicious exploitation.</li>
              <li>Attempt to disrupt, overload, flood, or degrade the availability of the scanning infrastructure (including automated denial-of-service).</li>
              <li>Circumvent or attempt to bypass rate limits, server resource budgets, or server-side request forgery (SSRF) security filters.</li>
              <li>Use automated scrapers, bots, or scripts to flood the public service with repetitive bulk queries.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: Inherent Limitations & Accuracy */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[03]</span>
            <span>INHERENT TECHNICAL LIMITATIONS & EPISTEMOLOGY</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p>
              The application reports observable public evidence. Users must recognize the technical boundaries of passive open-source reconnaissance:
            </p>
            <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 space-y-2 font-mono text-[11px]">
              <div>
                <strong className="text-[var(--accent-primary)]">Absence of Evidence is Not Proof of Absence:</strong>
                <p className="font-sans text-[var(--text-secondary)] mt-0.5">
                  If an email security record (like SPF or DMARC) or security header is marked &ldquo;Not Observed,&rdquo; this indicates that public queries did not return evidence. It does not guarantee that protective controls do not exist behind internal firewalls or private DNS views.
                </p>
              </div>
              <div className="border-t border-[var(--border-muted)] pt-2">
                <strong className="text-[var(--accent-primary)]">Third-Party Dependency Limitations:</strong>
                <p className="font-sans text-[var(--text-secondary)] mt-0.5">
                  CT log indexes (<code className="text-[var(--text-primary)]">crt.sh</code>), WHOIS registries, and GeoIP routing databases are operated by external third parties. They may be temporarily rate-limited, delayed, or incomplete.
                </p>
              </div>
              <div className="border-t border-[var(--border-muted)] pt-2">
                <strong className="text-[var(--accent-primary)]">Datacenter Geolocation Disclaimer:</strong>
                <p className="font-sans text-[var(--text-secondary)] mt-0.5">
                  All geographic coordinates indicate estimated ISP router hubs or cloud datacenters derived from registry blocks. They <em>never</em> indicate the physical address of an individual or physical organization building.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Warranty Disclaimer & Limitation of Liability */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[04]</span>
            <span>WARRANTY DISCLAIMER AND LIMITATION OF LIABILITY</span>
          </h2>
          <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-3.5 space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p className="font-mono text-[11px] text-[var(--text-primary)] uppercase">
              THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
            </p>
            <p>
              Under no circumstances shall the maintainers, contributors, or operators be liable for any claim, damages, legal actions, network interruptions, or other liability arising from your use of or inability to use the software, or any reliance placed upon scan output.
            </p>
          </div>
        </section>

        {/* Section 5: Paid Services & Refund Notice */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[05]</span>
            <span>COMMERCIAL TERMS & REFUND NOTICE</span>
          </h2>
          <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p>
              DomainAttackSurfaceScanner is <strong>100% free and open-source</strong>. We do not sell subscriptions, licenses, credits, or paid services. Consequently, no billing transactions occur, and no refund policies or cancellation terms are applicable.
            </p>
          </div>
        </section>

        {/* Section 6: Intellectual Property */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[06]</span>
            <span>INTELLECTUAL PROPERTY & LICENSE</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
            <p>
              The source code of DomainAttackSurfaceScanner is licensed under the <strong>MIT License</strong>. You are free to inspect, audit, fork, and self-host the application in accordance with the MIT license terms.
            </p>
          </div>
        </section>

        {/* Section 7: Inquiries */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-1">
            <span className="text-[var(--accent-primary)]">[07]</span>
            <span>QUESTIONS AND CONTACT</span>
          </h2>
          <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-3.5 text-xs font-sans text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p>
              Questions regarding these Terms of Use or requests for clarification should be submitted via the public GitHub repository:
            </p>
            <div className="font-mono text-xs text-[var(--accent-primary)] bg-[var(--bg-panel-inset)] p-2 border border-[var(--border-muted)]">
              <a
                href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[var(--text-primary)]"
              >
                https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-3 mt-auto font-mono text-[11px] text-[var(--text-muted)]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DOMAIN ATTACK SURFACE SCANNER // TERMS OF USE</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition">PRIVACY POLICY</Link>
            <span>&middot;</span>
            <Link to="/terms" className="text-[var(--accent-primary)] font-bold">TERMS OF USE</Link>
            <span>&middot;</span>
            <Link to="/cookies" className="hover:text-[var(--accent-primary)] transition">COOKIE POLICY</Link>
            <span>&middot;</span>
            <Link to="/billing" className="hover:text-[var(--accent-primary)] transition">BILLING &amp; REFUNDS</Link>
            <span>&middot;</span>
            <Link to="/security" className="hover:text-[var(--accent-primary)] transition">SECURITY &amp; DISCLOSURE</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
