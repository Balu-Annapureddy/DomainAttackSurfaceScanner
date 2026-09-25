import { Link } from 'react-router-dom';
import { Cookie, Shield, CheckCircle2, EyeOff } from 'lucide-react';
import WorkstationNav from '../components/WorkstationNav';

export default function CookiePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav />

      {/* ─── Document Container ──────────────────────────────────────── */}
      <article className="mx-auto max-w-4xl px-4 py-8 space-y-8 flex-1">
        {/* Title Block */}
        <div className="border-b border-[var(--border-technical)] pb-4 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-primary)] mb-1">
            <Cookie size={13} />
            <span>LEGAL &amp; COMPLIANCE // COOKIE DISCLOSURE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            COOKIE &amp; LOCAL STORAGE POLICY
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-secondary)] mt-2">
            <span>EFFECTIVE DATE: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span>LAST UPDATED: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span className="text-[var(--accent-primary)]">STRICTLY ESSENTIAL ONLY</span>
          </div>
        </div>

        {/* Executive Summary Card */}
        <section className="bg-[var(--bg-panel)] border border-[var(--border-technical)] p-4 space-y-2">
          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
            <CheckCircle2 size={13} className="text-[var(--accent-primary)]" />
            <span>EXECUTIVE SUMMARY — ZERO TRACKING COOKIES</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
            DomainAttackSurfaceScanner maintains an aggressive data minimization posture. We use exactly <strong>one</strong> first-party HTTP cookie, which is strictly essential for maintaining authenticated operator sessions. If you use the application as an anonymous user, <strong>zero HTTP cookies</strong> are set.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 font-mono text-[11px]">
            <div className="console-panel-inset p-2">
              <span className="text-[var(--text-secondary)] block text-[10px]">ANONYMOUS SCANNING</span>
              <strong className="text-[var(--accent-primary)]">0 HTTP COOKIES</strong>
            </div>
            <div className="console-panel-inset p-2">
              <span className="text-[var(--text-secondary)] block text-[10px]">REGISTERED OPERATOR</span>
              <strong className="text-[var(--accent-primary)]">1 ESSENTIAL SESSION COOKIE</strong>
            </div>
          </div>
        </section>

        {/* 1. Essential Authentication Cookie */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Shield size={14} className="text-[var(--accent-primary)]" />
            <span>1. ESSENTIAL AUTHENTICATION COOKIE</span>
          </h2>
          <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
            <p>
              When an operator explicitly registers or logs into an account, the backend issues a single cryptographic session cookie:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border border-[var(--border-technical)]">
                <thead className="bg-[var(--bg-panel-subtle)] text-[var(--text-primary)]">
                  <tr>
                    <th className="p-2 border-b border-[var(--border-technical)]">Cookie Name</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Type</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Attributes</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Duration</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border-technical)]">
                    <td className="p-2 font-bold text-[var(--accent-primary)]">dass_session</td>
                    <td className="p-2">First-party Essential</td>
                    <td className="p-2">HttpOnly; SameSite=Lax; Secure</td>
                    <td className="p-2">7 days (or logout)</td>
                    <td className="p-2 font-sans">Maintains authorized operator login state and ownership validation</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="font-mono font-bold text-[var(--text-primary)] block text-[11px]">
                TECHNICAL SECURITY CONTROLS:
              </span>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>HttpOnly</strong>: Inaccessible to client-side JavaScript (`document.cookie`), mitigating Cross-Site Scripting (XSS) token exfiltration.
                </li>
                <li>
                  <strong>SameSite=Lax</strong>: Prevents transmission during cross-site requests, mitigating Cross-Site Request Forgery (CSRF).
                </li>
                <li>
                  <strong>Secure</strong>: Enforced in production environments so that the cookie is transmitted strictly over TLS-encrypted HTTPS connections.
                </li>
                <li>
                  <strong>Immediate Revocation</strong>: Invalidation occurs instantly upon clicking "[ LOGOUT ]" or executing "[ DELETE ACCOUNT ]".
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. Client-Side Browser Storage */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>2. LOCAL BROWSER STORAGE (LOCALSTORAGE)</span>
          </h2>
          <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
            <p>
              To respect user preferences without requiring server-side tracking, the client application stores the following non-sensitive preferences directly in your browser's `localStorage`:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border border-[var(--border-technical)]">
                <thead className="bg-[var(--bg-panel-subtle)] text-[var(--text-primary)]">
                  <tr>
                    <th className="p-2 border-b border-[var(--border-technical)]">Key</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Stored Data</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Transmission</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border-technical)]">
                    <td className="p-2 text-[var(--text-primary)]">dass_theme</td>
                    <td className="p-2 font-sans">Dark or light UI mode preference</td>
                    <td className="p-2 text-[var(--accent-primary)]">Never sent to server</td>
                  </tr>
                  <tr className="border-b border-[var(--border-technical)]">
                    <td className="p-2 text-[var(--text-primary)]">dass_guided_mode</td>
                    <td className="p-2 font-sans">Guided plain-English view vs Technical analyst view</td>
                    <td className="p-2 text-[var(--accent-primary)]">Never sent to server</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[var(--text-primary)]">domain_scanner_scans</td>
                    <td className="p-2 font-sans">Recent scan IDs for anonymous users (cleared via UI)</td>
                    <td className="p-2 text-[var(--accent-primary)]">Never sent to server</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 3. Explicit Prohibitions */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <EyeOff size={14} className="text-red-500" />
            <span>3. TRACKERS &amp; TECHNOLOGIES WE DO NOT USE</span>
          </h2>
          <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
            <p>
              We explicitly confirm that DomainAttackSurfaceScanner does <strong>NOT</strong> employ:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO Advertising / AdTech Cookies</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO Third-Party Analytics Trackers</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO Behavioral Tracking Pixels</span>
              </div>
              <div className="console-panel-inset p-2 flex items-center gap-2">
                <EyeOff size={13} className="text-red-500" />
                <span>NO Canvas / Hardware Fingerprinting</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Consent Exemption Clarification */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>4. LEGAL BASIS &amp; CONSENT EXEMPTION</span>
          </h2>
          <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>
              Under Article 5(3) of the EU ePrivacy Directive (Directive 2002/58/EC as amended by Directive 2009/136/EC) and relevant national transpositions, prior user consent is <strong>not required</strong> for cookies that are strictly necessary to provide an "information society service" explicitly requested by the subscriber or user.
            </p>
            <p>
              Because our sole cookie (`dass_session`) is strictly functional and only set when an operator intentionally registers or signs into an account, we do not subject users to manipulative cookie consent modals or deceptive "accept all" banners.
            </p>
          </div>
        </section>

        {/* ─── Legal Navigation Footer ─────────────────────────────────── */}
        <footer className="border-t border-[var(--border-technical)] pt-4 font-mono text-[11px] text-[var(--text-secondary)] flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition">PRIVACY POLICY</Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-[var(--accent-primary)] transition">TERMS OF USE</Link>
            <span>&middot;</span>
            <Link to="/cookies" className="text-[var(--accent-primary)] font-bold">COOKIE POLICY</Link>
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
