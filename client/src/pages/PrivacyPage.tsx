import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, CheckCircle2, EyeOff } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#080b0f] text-[#e6edf3] font-sans flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-[#1e2631] bg-[#10151b] px-4 py-2.5">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 font-mono text-xs font-bold text-[#58a6ff] hover:text-[#e6edf3] transition"
          >
            <ArrowLeft size={13} />
            <span>DAS // RETURN TO WORKSTATION</span>
          </Link>
          <span className="font-mono text-[11px] text-[#8b9bb0]">
            PRIVACY & DATA PROTECTION POLICY
          </span>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 font-mono text-xs space-y-6">
        {/* Title Block */}
        <div className="border-b border-[#1e2631] pb-4">
          <div className="flex items-center gap-2 text-[#3fb950] text-[11px] font-bold uppercase tracking-wider mb-1">
            <Shield size={13} />
            <span>PRIVACY POLICY & DATA HANDLING PRACTICES</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3]">
            PRIVACY & DATA PROTECTION NOTICE
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#8b9bb0] mt-2">
            <span>EFFECTIVE DATE: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span>LAST UPDATED: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span className="text-[#3fb950]">DATA MINIMISATION ENFORCED</span>
          </div>
        </div>

        {/* Executive Summary Card */}
        <section className="bg-[#10151b] border border-[#1e2631] p-4 space-y-2">
          <div className="text-xs font-bold text-[#e6edf3] flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-[#3fb950]" />
            <span>CORE PRIVACY PRINCIPLES AT A GLANCE</span>
          </div>
          <p className="text-xs text-[#8b9bb0] font-sans leading-relaxed">
            DomainAttackSurfaceScanner is designed around strict privacy-preserving defaults and data minimisation.
            The service is completely free and operates without user registration, cookies, analytics trackers, or commercial monetization.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <div className="bg-[#0c1015] border border-[#171f28] p-2.5">
              <span className="text-[10px] text-[#58a6ff] block font-bold">NO USER ACCOUNTS</span>
              <span className="text-[11px] text-[#8b9bb0] font-sans">No names, passwords, or emails requested.</span>
            </div>
            <div className="bg-[#0c1015] border border-[#171f28] p-2.5">
              <span className="text-[10px] text-[#3fb950] block font-bold">NO TRACKING COOKIES</span>
              <span className="text-[11px] text-[#8b9bb0] font-sans">Zero advertising or third-party tracking scripts.</span>
            </div>
            <div className="bg-[#0c1015] border border-[#171f28] p-2.5">
              <span className="text-[10px] text-[#d29922] block font-bold">24-HOUR SCAN TTL</span>
              <span className="text-[11px] text-[#8b9bb0] font-sans">Volatile memory storage with automatic expiration.</span>
            </div>
          </div>
        </section>

        {/* Section 1: Data We Collect & Process */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-1.5 border-b border-[#1e2631] pb-1">
            <span className="text-[#58a6ff]">[01]</span>
            <span>DATA COLLECTED AND PROCESSED</span>
          </h2>
          <div className="space-y-2 text-[#8b9bb0] font-sans text-xs leading-relaxed">
            <p>
              We collect and process only the minimal technical data strictly necessary to execute the requested reconnaissance scan:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[#e6edf3] font-mono text-[11px] bg-[#0c1015] p-3 border border-[#1e2631]">
              <li>
                <strong className="text-[#58a6ff]">Target Domain Name:</strong> The public domain name entered by the user (e.g., <code className="text-[#e6edf3]">example.com</code>) to define the scope of the assessment.
              </li>
              <li>
                <strong className="text-[#58a6ff]">Client IP Address (Ephemeral):</strong> Received automatically by the web server during TCP HTTP handshake for request routing and anti-abuse rate limiting. Client IPs are stored only in volatile memory for rate-limiting windows (1 to 60 minutes) and are not written to a database.
              </li>
              <li>
                <strong className="text-[#58a6ff]">Public Perimeter Data:</strong> Information retrieved from publicly queryable sources regarding the target domain (DNS records, public Certificate Transparency log entries, WHOIS/RDAP registrar records, and public HTTP response headers).
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Data We Do NOT Collect */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-1.5 border-b border-[#1e2631] pb-1">
            <span className="text-[#58a6ff]">[02]</span>
            <span>DATA WE EXPLICITLY DO NOT COLLECT</span>
          </h2>
          <div className="bg-[#10151b] border border-[#1e2631] p-3 text-xs font-sans text-[#8b9bb0] leading-relaxed">
            <p className="mb-2">We deliberately avoid collecting any personal identifying information:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-[#e6edf3]">
                <EyeOff size={12} className="text-[#f85149]" />
                <span>NO names or contact numbers</span>
              </div>
              <div className="flex items-center gap-2 text-[#e6edf3]">
                <EyeOff size={12} className="text-[#f85149]" />
                <span>NO email addresses or user accounts</span>
              </div>
              <div className="flex items-center gap-2 text-[#e6edf3]">
                <EyeOff size={12} className="text-[#f85149]" />
                <span>NO passwords or credentials</span>
              </div>
              <div className="flex items-center gap-2 text-[#e6edf3]">
                <EyeOff size={12} className="text-[#f85149]" />
                <span>NO payment, card, or billing information</span>
              </div>
              <div className="flex items-center gap-2 text-[#e6edf3]">
                <EyeOff size={12} className="text-[#f85149]" />
                <span>NO biometric or sensitive personal data</span>
              </div>
              <div className="flex items-center gap-2 text-[#e6edf3]">
                <EyeOff size={12} className="text-[#f85149]" />
                <span>NO cross-site tracking or advertising profiles</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Storage, Retention & Deletion */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-1.5 border-b border-[#1e2631] pb-1">
            <span className="text-[#58a6ff]">[03]</span>
            <span>DATA STORAGE, RETENTION AND DELETION</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[#8b9bb0] leading-relaxed">
            <p>
              The application utilizes a memory-only storage model with automated time-based eviction:
            </p>
            <div className="bg-[#0c1015] border border-[#1e2631] p-3 space-y-2 font-mono text-[11px]">
              <div>
                <strong className="text-[#58a6ff]">Backend In-Memory Cache (24-Hour TTL):</strong>
                <p className="font-sans text-[#8b9bb0] mt-0.5">
                  Scan results are stored in server RAM using an in-memory Map (<code className="text-[#e6edf3]">scanStore.ts</code>). Each record is automatically discarded after 24 hours (<code className="text-[#e6edf3]">TTL_MS = 86,400,000 ms</code>) or immediately upon server process restart. No persistent database (such as MongoDB, PostgreSQL, or SQLite) is connected or used to store scan history.
                </p>
              </div>
              <div className="border-t border-[#171f28] pt-2">
                <strong className="text-[#58a6ff]">Client-Side Local Storage (User Controlled):</strong>
                <p className="font-sans text-[#8b9bb0] mt-0.5">
                  Your web browser stores two items locally in <code className="text-[#e6edf3]">localStorage</code>:
                </p>
                <ul className="list-disc list-inside mt-1 font-sans space-y-1">
                  <li><code className="text-[#e6edf3]">dass_guided_mode</code>: Saves your UI preference between Guided Mode and Technical Mode.</li>
                  <li><code className="text-[#e6edf3]">domain_scanner_scans</code>: Stores recent scan IDs and domain names so you can view your personal scan history and launch comparisons. This data never leaves your browser and can be completely wiped at any time using your browser&apos;s &ldquo;Clear Browsing Data&rdquo; feature.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Cookies & Tracking Technologies */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-1.5 border-b border-[#1e2631] pb-1">
            <span className="text-[#58a6ff]">[04]</span>
            <span>COOKIES AND TRACKING TECHNOLOGIES</span>
          </h2>
          <div className="bg-[#10151b] border border-[#1e2631] p-3.5 space-y-2 text-xs font-sans text-[#8b9bb0] leading-relaxed">
            <p>
              <strong className="text-[#3fb950] font-mono">ZERO COOKIE POLICY:</strong> This website does not set any HTTP cookies. We do not use session cookies, authentication cookies, analytics cookies, or advertising cookies.
            </p>
            <p>
              We do not embed third-party analytics trackers, telemetry scripts, or pixel beacons (such as Google Analytics, Meta Pixel, PostHog, or Hotjar). Because no non-essential cookies or tracking technologies are used, no cookie consent banner is required or displayed.
            </p>
          </div>
        </section>

        {/* Section 5: Third-Party Dependencies & Data Flows */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-1.5 border-b border-[#1e2631] pb-1">
            <span className="text-[#58a6ff]">[05]</span>
            <span>THIRD-PARTY SERVICES AND RECONNAISSANCE PROVIDERS</span>
          </h2>
          <div className="space-y-2 text-xs font-sans text-[#8b9bb0] leading-relaxed">
            <p>
              To observe public records without intrusive probing, the backend queries the following public data sources on behalf of the user:
            </p>
            <div className="overflow-x-auto">
              <table className="console-table font-mono text-[11px]">
                <thead>
                  <tr>
                    <th>PROVIDER / SERVICE</th>
                    <th>PURPOSE</th>
                    <th>DATA TRANSMITTED</th>
                    <th>CLIENT DIRECT CONNECTION?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold text-[#e6edf3]">Authoritative DNS Resolvers</td>
                    <td>Resolve public A, AAAA, MX, NS, and TXT records</td>
                    <td>Target domain name query</td>
                    <td className="text-[#3fb950]">No (Server-side)</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#e6edf3]">crt.sh (Sectigo CT Logs)</td>
                    <td>Query public append-only Certificate Transparency logs</td>
                    <td>Target domain wildcard query</td>
                    <td className="text-[#3fb950]">No (Server-side)</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#e6edf3]">RDAP.org / IANA Bootstrap</td>
                    <td>Retrieve public WHOIS domain registration metadata</td>
                    <td>Target domain name query</td>
                    <td className="text-[#3fb950]">No (Server-side)</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#e6edf3]">ipapi.co / BGP Geolocation</td>
                    <td>Determine Autonomous System Numbers (ASN) & regional datacenters</td>
                    <td>Discovered public target IP address</td>
                    <td className="text-[#3fb950]">No (Server-side)</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#e6edf3]">OpenStreetMap Tile Servers</td>
                    <td>Render regional network map markers in dashboard</td>
                    <td>Standard map tile coordinates (Z/X/Y)</td>
                    <td className="text-[#d29922]">Yes (Browser tile request)</td>
                  </tr>
                  <tr>
                    <td className="font-bold text-[#e6edf3]">Google Fonts CDN</td>
                    <td>Web typography stylesheets (<code className="text-[#e6edf3]">Inter</code>)</td>
                    <td>Standard browser font asset request</td>
                    <td className="text-[#d29922]">Yes (Browser font request)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 6: Indian Data Protection (DPDP) Readiness */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-1.5 border-b border-[#1e2631] pb-1">
            <span className="text-[#58a6ff]">[06]</span>
            <span>PRIVACY & DATA PROTECTION READINESS (DPDP CONTEXT)</span>
          </h2>
          <div className="bg-[#0c1015] border border-[#1e2631] p-3.5 space-y-2 text-xs font-sans text-[#8b9bb0] leading-relaxed">
            <p>
              In alignment with the principles of India&apos;s <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong> and international data protection standards:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-[#e6edf3]">
              <li><strong className="text-[#58a6ff]">Purpose Limitation:</strong> Target domain inputs are processed solely to produce the requested external security reconnaissance report.</li>
              <li><strong className="text-[#58a6ff]">Data Minimisation:</strong> No unnecessary identifying information is solicited, required, or saved.</li>
              <li><strong className="text-[#58a6ff]">Storage Limitation:</strong> In-memory records are purged after 24 hours. Local browser history can be cleared instantly by the user.</li>
              <li><strong className="text-[#58a6ff]">Integrity & Confidentiality:</strong> All web traffic is routed over secure HTTPS with strict Transport Security headers and input validation.</li>
            </ul>
          </div>
        </section>

        {/* Section 7: Operator & Contact Information */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-[#e6edf3] flex items-center gap-1.5 border-b border-[#1e2631] pb-1">
            <span className="text-[#58a6ff]">[07]</span>
            <span>OPERATOR DETAILS AND CONTACT</span>
          </h2>
          <div className="bg-[#10151b] border border-[#1e2631] p-3.5 text-xs font-sans text-[#8b9bb0] leading-relaxed space-y-2">
            <p>
              DomainAttackSurfaceScanner is maintained as an open-source cybersecurity project by <strong>Balu Annapureddy</strong>. It is not operated by a commercial entity, and no paid subscriptions or commercial services are offered.
            </p>
            <p>
              For privacy-related inquiries, security disclosures, or questions regarding this notice, please contact the maintainer via the official GitHub project repository:
            </p>
            <div className="font-mono text-xs text-[#58a6ff] bg-[#0c1015] p-2 border border-[#171f28]">
              <a
                href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner/issues"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-[#e6edf3]"
              >
                https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner/issues
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1e2631] bg-[#0c1015] px-4 py-3 mt-auto font-mono text-[11px] text-[#576575]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DOMAIN ATTACK SURFACE SCANNER // PRIVACY POLICY</span>
          <div className="flex items-center gap-3">
            <Link to="/terms" className="hover:text-[#8b9bb0]">TERMS OF USE</Link>
            <Link to="/security" className="hover:text-[#8b9bb0]">SECURITY & AUTHORIZED USE</Link>
            <Link to="/" className="hover:text-[#8b9bb0]">CONSOLE</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
