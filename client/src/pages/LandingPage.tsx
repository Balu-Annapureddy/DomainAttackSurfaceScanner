import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Search, AlertTriangle } from 'lucide-react';
import GlossaryModal from '../components/GlossaryModal';
import WorkstationNav from '../components/WorkstationNav';
import { createScan } from '../lib/api';

export default function LandingPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const navigate = useNavigate();

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain) {
      setError('SPECIFY TARGET DOMAIN (E.G., EXAMPLE.COM)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await createScan(cleanDomain);
      navigate(`/scan/${encodeURIComponent(data.scanId)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'UNABLE TO COMMENCE SCAN');
    } finally {
      setLoading(false);
    }
  };

  const capabilities = [
    { title: 'DNS / INFRASTRUCTURE', desc: 'Authoritative nameservers, MX routing, A/AAAA records, and multi-cloud perimeter footprint.' },
    { title: 'CERTIFICATE TRANSPARENCY', desc: 'Passive discovery of subdomains and SANs via public append-only cryptographic CT logs.' },
    { title: 'SECURITY HYGIENE', desc: 'Audit of HTTP headers (HSTS, CSP, X-Frame-Options) and observable security configurations.' },
    { title: 'EMAIL POSTURE', desc: 'Verification of SPF policy, DMARC alignment, and mail gateway posture against spoofing.' },
    { title: 'NETWORK RELATIONSHIPS', desc: 'Bidirectional graph mapping between root domains, hostnames, IPs, ASNs, and organizations.' },
    { title: 'OBSERVABLE SERVICES', desc: 'Passive detection of transit CDNs, edge firewalls, and cloud hosting providers.' },
  ];

  const pipelineStages = [
    { step: '01', name: 'RESOLVE', desc: 'Query authoritative DNS records' },
    { step: '02', name: 'DISCOVER', desc: 'Parse public Certificate Transparency logs' },
    { step: '03', name: 'CORRELATE', desc: 'Map IP addresses to ASNs and hosting orgs' },
    { step: '04', name: 'OBSERVE', desc: 'Inspect perimeter HTTP response headers' },
    { step: '05', name: 'ASSESS', desc: 'Evaluate configuration evidence & posture' },
    { step: '06', name: 'REPORT', desc: 'Synthesize actionable intelligence dossier' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav onOpenGlossary={() => setGlossaryOpen(true)} />

      {/* ─── Workstation Main Console ───────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 flex flex-col gap-6">
        {/* ─── Console Identification ───────────────────────────────── */}
        <section className="console-panel p-5 bg-[var(--bg-panel)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[var(--border-technical)]">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-[var(--accent-primary)] font-semibold mb-1">
                <span>[TERMINAL // RECON-01]</span>
                <span>•</span>
                <span>NON-INTRUSIVE PUBLIC OSINT</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
                DOMAIN ATTACK SURFACE SCANNER
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">
                Passive external intelligence platform. Observe public infrastructure perimeter and configuration hygiene.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/scan/sample" className="console-btn console-btn-phosphor text-xs">
                DEMO: PERIMETER-DEMO.IO
              </Link>
            </div>
          </div>

          {/* Scan Target Input Form */}
          <form onSubmit={handleScan} className="mt-4 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <label htmlFor="target-domain-input" className="sr-only">
                  Target Domain Name (e.g. example.com)
                </label>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--text-muted)]">
                  TARGET:
                </span>
                <input
                  id="target-domain-input"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="console-input pl-18 py-2 text-sm"
                  disabled={loading}
                  autoFocus
                  aria-describedby="auth-notice"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !domain.trim()}
                className="console-btn console-btn-primary px-5 py-2 text-xs flex items-center justify-center gap-2"
                aria-label="Start Passive Attack Surface Scan"
              >
                {loading ? (
                  <>INITIALIZING...</>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    START SCAN
                  </>
                )}
              </button>
            </div>

            {/* Concise Authorized Use Notice */}
            <div id="auth-notice" className="font-mono text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-amber-500 font-semibold">⚠ AUTHORIZATION:</span>
              <span>By initiating a scan, you confirm that you own or are explicitly authorized to assess the target domain.</span>
              <span className="text-[var(--text-muted)]">|</span>
              <Link to="/terms" className="text-[var(--accent-primary)] hover:underline">
                Terms of Use
              </Link>
              <span className="text-[var(--text-muted)]">&bull;</span>
              <Link to="/privacy" className="text-[var(--accent-primary)] hover:underline">
                Privacy Policy
              </Link>
            </div>
          </form>

          {error && (
            <div className="mt-3 p-2 bg-[var(--bg-panel-inset)] border border-red-500 text-red-500 font-mono text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ─── System Capabilities Grid ─────────────────────────────── */}
        <section className="console-panel">
          <div className="dossier-header">
            <div>
              <span className="dossier-num">[01]</span>
              <span>SYSTEM CAPABILITIES</span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">OBSERVABLE PERIMETER VECTORS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border-muted)]">
            {capabilities.map((cap, i) => (
              <div key={i} className="bg-[var(--bg-panel)] p-4 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                    <span className="text-[var(--accent-primary)]">▸</span>
                    {cap.title}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── How the System Works: Pipeline Stages ─────────────────── */}
        <section className="console-panel">
          <div className="dossier-header">
            <div>
              <span className="dossier-num">[02]</span>
              <span>HOW THE SYSTEM WORKS</span>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)]">METHODOLOGICAL PIPELINE</span>
          </div>

          <div className="p-4 bg-[var(--bg-panel)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {pipelineStages.map((stage) => (
                <div key={stage.step} className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-3 flex flex-col">
                  <div className="font-mono text-xs font-bold text-[var(--accent-primary)] mb-1">
                    {stage.step} // {stage.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] font-mono leading-tight">
                    {stage.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Passive Reconnaissance Guarantee ───────────────────────── */}
        <section className="console-panel p-4 bg-[var(--bg-panel-inset)] border border-[var(--border-technical)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-xs font-bold text-[var(--accent-primary)] uppercase tracking-wider">
                  PASSIVE RECONNAISSANCE GUARANTEE
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-4xl">
                  This tool solely evaluates publicly observable DNS, append-only Certificate Transparency logs, WHOIS registry metadata, and standard public HTTP response headers. It performs no port scanning, brute-forcing, active fuzzing, or intrusive probing.
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] border border-[var(--border-muted)] px-2 py-1 bg-[var(--bg-panel)]">
              SAFE FOR REGULATED TARGETS
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer with Legal Navigation ──────────────────────────── */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-3 mt-auto">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[11px] text-[var(--text-muted)]">
          <div>
            DOMAIN ATTACK SURFACE SCANNER // NON-INTRUSIVE OSINT PLATFORM
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-[var(--text-secondary)] transition-colors">TERMS OF USE</Link>
            <Link to="/cookies" className="hover:text-[var(--text-secondary)] transition-colors">COOKIE POLICY</Link>
            <Link to="/billing" className="hover:text-[var(--text-secondary)] transition-colors">BILLING &amp; REFUNDS</Link>
            <Link to="/security" className="hover:text-[var(--text-secondary)] transition-colors">SECURITY &amp; DISCLOSURE</Link>
            <button onClick={() => setGlossaryOpen(true)} className="hover:text-[var(--text-secondary)] cursor-pointer transition-colors">
              FIELD MANUAL
            </button>
            <a
              href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-secondary)] transition-colors"
            >
              GITHUB
            </a>
          </div>
        </div>
      </footer>

      {glossaryOpen && <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />}
    </div>
  );
}
