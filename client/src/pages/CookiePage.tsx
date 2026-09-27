import { Cookie, Shield, CheckCircle2, EyeOff } from 'lucide-react';
import LegalPageLayout from '../components/LegalPageLayout';

const TOC = [
  { id: 'sec-summary', title: 'Executive Summary' },
  { id: 'sec-essential', title: 'Essential Cookie' },
  { id: 'sec-storage', title: 'Local Storage' },
  { id: 'sec-prohibited', title: 'Trackers Not Used' },
  { id: 'sec-legal', title: 'Legal Basis & Exemption' },
];

export default function CookiePage() {
  return (
    <LegalPageLayout
      title="COOKIE & LOCAL STORAGE POLICY"
      category="LEGAL & COMPLIANCE // COOKIE DISCLOSURE"
      effectiveDate="SEPTEMBER 25, 2026"
      lastUpdated="SEPTEMBER 25, 2026"
      badge="STRICTLY ESSENTIAL ONLY"
      toc={TOC}
    >
      {/* Executive Summary Card */}
      <section id="sec-summary" className="console-panel p-5 space-y-3 scroll-mt-20">
        <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
          <CheckCircle2 size={14} className="text-[var(--accent-primary)]" />
          <span>EXECUTIVE SUMMARY — ZERO TRACKING COOKIES</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
          DomainAttackSurfaceScanner maintains an aggressive data minimization posture. We use exactly <strong>one</strong> first-party HTTP cookie, which is strictly essential for maintaining authenticated operator sessions. If you use the application as an anonymous user, <strong>zero HTTP cookies</strong> are set.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 font-mono text-[11px]">
          <div className="console-panel-inset p-3 rounded-lg">
            <span className="text-[var(--text-secondary)] block text-[10px]">ANONYMOUS SCANNING</span>
            <strong className="text-[var(--accent-primary)]">0 HTTP COOKIES</strong>
          </div>
          <div className="console-panel-inset p-3 rounded-lg">
            <span className="text-[var(--text-secondary)] block text-[10px]">REGISTERED OPERATOR</span>
            <strong className="text-[var(--accent-primary)]">1 ESSENTIAL SESSION COOKIE</strong>
          </div>
        </div>
      </section>

      {/* 1. Essential Authentication Cookie */}
      <section id="sec-essential" className="space-y-3 font-mono scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <Shield size={14} className="text-[var(--accent-primary)]" />
          <span>1. ESSENTIAL AUTHENTICATION COOKIE</span>
        </h2>
        <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)] rounded-lg">
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
                  <td className="p-2 font-sans">Maintains authorized operator login state</td>
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
                <strong>HttpOnly</strong>: Inaccessible to client-side JavaScript (<code>document.cookie</code>), mitigating XSS token theft.
              </li>
              <li>
                <strong>SameSite=Lax</strong>: Prevents transmission during cross-site requests, mitigating CSRF attacks.
              </li>
              <li>
                <strong>Secure</strong>: Enforced in production environments so that the cookie is transmitted strictly over TLS-encrypted HTTPS.
              </li>
              <li>
                <strong>Immediate Revocation</strong>: Invalidation occurs instantly upon clicking &ldquo;Logout&rdquo; or deleting your account.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Client-Side Browser Storage */}
      <section id="sec-storage" className="space-y-3 font-mono scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <Cookie size={14} className="text-[var(--accent-primary)]" />
          <span>2. LOCAL BROWSER STORAGE (LOCALSTORAGE)</span>
        </h2>
        <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)] rounded-lg">
          <p>
            To respect user preferences without requiring server-side tracking, the client application stores non-sensitive preferences directly in your browser's <code>localStorage</code>:
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
      <section id="sec-prohibited" className="space-y-3 font-mono scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <EyeOff size={14} className="text-red-500" />
          <span>3. TRACKERS &amp; TECHNOLOGIES WE DO NOT USE</span>
        </h2>
        <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)] rounded-lg">
          <p>
            We explicitly confirm that DomainAttackSurfaceScanner does <strong>NOT</strong> employ:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="console-panel-inset p-2.5 flex items-center gap-2 rounded">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO Advertising / AdTech Cookies</span>
            </div>
            <div className="console-panel-inset p-2.5 flex items-center gap-2 rounded">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO Third-Party Analytics Trackers</span>
            </div>
            <div className="console-panel-inset p-2.5 flex items-center gap-2 rounded">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO Behavioral Tracking Pixels</span>
            </div>
            <div className="console-panel-inset p-2.5 flex items-center gap-2 rounded">
              <EyeOff size={13} className="text-red-500 shrink-0" />
              <span>NO Canvas / Hardware Fingerprinting</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Consent Exemption Clarification */}
      <section id="sec-legal" className="space-y-3 font-mono scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <span>4. LEGAL BASIS &amp; CONSENT EXEMPTION</span>
        </h2>
        <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)] leading-relaxed rounded-lg">
          <p>
            Under Article 5(3) of the EU ePrivacy Directive (Directive 2002/58/EC as amended) and relevant national transpositions, prior user consent is <strong>not required</strong> for cookies that are strictly necessary to provide an &ldquo;information society service&rdquo; explicitly requested by the user.
          </p>
          <p>
            Because our sole cookie (<code>dass_session</code>) is strictly functional and only set when an operator intentionally registers or signs into an account, we do not subject users to manipulative cookie consent modals or deceptive &ldquo;accept all&rdquo; banners.
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
