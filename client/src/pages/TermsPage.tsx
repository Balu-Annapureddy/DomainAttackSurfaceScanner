import { AlertTriangle } from 'lucide-react';
import LegalPageLayout from '../components/LegalPageLayout';

const TOC = [
  { id: 'sec-authorized', title: 'Authorization Warning' },
  { id: 'sec-service', title: 'Service Description' },
  { id: 'sec-acceptable-use', title: 'Acceptable Use' },
  { id: 'sec-limitations', title: 'Technical Limitations' },
  { id: 'sec-liability', title: 'Limitation of Liability' },
  { id: 'sec-commercial', title: 'Commercial / Refunds' },
  { id: 'sec-license', title: 'License & IP' },
  { id: 'sec-contact', title: 'Contact' },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="TERMS AND CONDITIONS OF USE"
      category="LEGAL AGREEMENT & ACCEPTABLE USE POLICY"
      effectiveDate="SEPTEMBER 25, 2026"
      lastUpdated="SEPTEMBER 25, 2026"
      badge="OPEN-SOURCE MIT LICENSE"
      toc={TOC}
    >
      {/* Critical Authorization Warning Banner */}
      <div id="sec-authorized" className="bg-[var(--bg-panel-inset)] border border-[var(--border-technical)] p-4 text-xs text-[var(--text-primary)] space-y-1 rounded-xs scroll-mt-20">
        <div className="flex items-center gap-2 font-bold text-[var(--sev-medium)] font-mono">
          <AlertTriangle size={15} className="shrink-0" />
          <span>MANDATORY AUTHORIZED SCANNING REQUIREMENT</span>
        </div>
        <p className="font-sans text-xs text-[var(--text-secondary)] leading-relaxed">
          By initiating a scan, you explicitly affirm that you own the target domain or have received express written authorization from the domain owner to perform external attack surface reconnaissance. Unauthorized surveillance or reconnaissance against targets you do not control is strictly prohibited.
        </p>
      </div>

      {/* Section 1: Service Description */}
      <section id="sec-service" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-normal font-display italic text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <span className="text-[var(--accent-primary)] font-mono not-italic text-xs font-bold">[01]</span>
          <span>Service Description and Nature of the Tool</span>
        </h2>
        <div className="space-y-2 text-[var(--text-secondary)] font-sans text-xs leading-relaxed">
          <p>
            DomainAttackSurfaceScanner is a defensive, non-intrusive security intelligence workstation. It aggregates and visualizes publicly accessible technical records—such as authoritative DNS answers, Certificate Transparency (CT) logs, WHOIS/RDAP registry entries, and standard HTTP response headers—to help system administrators and security analysts understand their public-facing attack surface.
          </p>
          <p>
            The tool does <strong>not</strong> perform vulnerability exploitation, port scanning, credential brute-forcing, SQL injection, denial-of-service, or intrusive penetration testing.
          </p>
        </div>
      </section>

      {/* Section 2: Acceptable Use & Prohibited Activities */}
      <section id="sec-acceptable-use" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[02]</span>
          <span>ACCEPTABLE USE AND PROHIBITED ACTIVITIES</span>
        </h2>
        <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-4 text-xs font-sans text-[var(--text-secondary)] space-y-2 leading-relaxed rounded-lg">
          <p>Users agree to comply with all applicable local, national, and international laws. You agree NOT to:</p>
          <ul className="list-disc list-inside space-y-1.5 font-mono text-[11px] text-[var(--text-primary)]">
            <li>Scan any domain or digital asset without prior authorization from the rightful owner or operator.</li>
            <li>Use scan results to conduct harassment, extortion, cyberattacks, unauthorized intrusion, or malicious exploitation.</li>
            <li>Attempt to disrupt, overload, flood, or degrade the availability of the scanning infrastructure.</li>
            <li>Circumvent or attempt to bypass rate limits, server resource budgets, or server-side request forgery (SSRF) security filters.</li>
            <li>Use automated scrapers, bots, or scripts to flood the public service with repetitive bulk queries.</li>
          </ul>
        </div>
      </section>

      {/* Section 3: Inherent Limitations & Accuracy */}
      <section id="sec-limitations" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[03]</span>
          <span>INHERENT TECHNICAL LIMITATIONS &amp; EPISTEMOLOGY</span>
        </h2>
        <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
          <p>
            The application reports observable public evidence. Users must recognize the technical boundaries of passive open-source reconnaissance:
          </p>
          <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3.5 space-y-2.5 font-mono text-[11px] rounded-lg">
            <div>
              <strong className="text-[var(--accent-primary)]">Absence of Evidence is Not Proof of Absence:</strong>
              <p className="font-sans text-[var(--text-secondary)] mt-0.5">
                If an email security record (like SPF or DMARC) or security header is marked &ldquo;Not Observed,&rdquo; this indicates that public queries did not return evidence. It does not guarantee that protective controls do not exist behind internal firewalls or private DNS views.
              </p>
            </div>
            <div className="border-t border-[var(--border-muted)] pt-2">
              <strong className="text-[var(--accent-primary)]">Third-Party Dependency Limitations:</strong>
              <p className="font-sans text-[var(--text-secondary)] mt-0.5">
                CT log indexes (<code>crt.sh</code>), WHOIS registries, and GeoIP routing databases are operated by external third parties. They may be temporarily rate-limited, delayed, or incomplete.
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
      <section id="sec-liability" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[04]</span>
          <span>WARRANTY DISCLAIMER AND LIMITATION OF LIABILITY</span>
        </h2>
        <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-4 space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed rounded-lg">
          <p className="font-mono text-[11px] text-[var(--text-primary)] uppercase">
            THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
          </p>
          <p>
            Under no circumstances shall the maintainers, contributors, or operators be liable for any claim, damages, legal actions, network interruptions, or other liability arising from your use of or inability to use the software, or any reliance placed upon scan output.
          </p>
        </div>
      </section>

      {/* Section 5: Paid Services & Refund Notice */}
      <section id="sec-commercial" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[05]</span>
          <span>COMMERCIAL TERMS &amp; REFUND NOTICE</span>
        </h2>
        <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3.5 text-xs font-sans text-[var(--text-secondary)] leading-relaxed rounded-lg">
          <p>
            DomainAttackSurfaceScanner is <strong>100% free and open-source</strong>. We do not sell subscriptions, licenses, credits, or paid services. Consequently, no billing transactions occur, and no refund policies or cancellation terms are applicable.
          </p>
        </div>
      </section>

      {/* Section 6: Intellectual Property */}
      <section id="sec-license" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[06]</span>
          <span>INTELLECTUAL PROPERTY &amp; LICENSE</span>
        </h2>
        <div className="space-y-2 text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
          <p>
            The source code of DomainAttackSurfaceScanner is licensed under the <strong>MIT License</strong>. You are free to inspect, audit, fork, and self-host the application in accordance with the MIT license terms.
          </p>
        </div>
      </section>

      {/* Section 7: Inquiries */}
      <section id="sec-contact" className="space-y-3 scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5 border-b border-[var(--border-technical)] pb-2 font-mono">
          <span className="text-[var(--accent-primary)]">[07]</span>
          <span>QUESTIONS AND CONTACT</span>
        </h2>
        <div className="bg-[var(--bg-panel-subtle)] border border-[var(--border-muted)] p-4 text-xs font-sans text-[var(--text-secondary)] leading-relaxed space-y-2 rounded-lg">
          <p>
            Questions regarding these Terms of Use or requests for clarification should be submitted via the public GitHub repository:
          </p>
          <div className="font-mono text-xs text-[var(--accent-primary)] bg-[var(--bg-panel-inset)] p-2.5 border border-[var(--border-muted)] rounded">
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
    </LegalPageLayout>
  );
}
