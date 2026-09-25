import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Search, BookOpen, Clock, AlertTriangle } from 'lucide-react';
import GlossaryModal from '../components/GlossaryModal';

export default function LandingPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const navigate = useNavigate();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain) {
      setError('SPECIFY TARGET DOMAIN (E.G., EXAMPLE.COM)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain }),
      });
      const data = await res.json() as { scanId?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || 'UNABLE TO INITIALIZE PASSIVE RECONNAISSANCE');
      }

      navigate(`/scan/${encodeURIComponent(data.scanId!)}`);
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
    <div className="min-h-screen bg-[#080b0f] text-[#e6edf3] font-sans flex flex-col">
      {/* ─── Workstation Shell Header ───────────────────────────────── */}
      <header className="border-b border-[#1e2631] bg-[#10151b] px-4 py-2.5">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-[#58a6ff] tracking-wider">DAS // WORKSTATION</span>
            <span className="text-[#1e2631]">|</span>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9bb0]">
              <span className="flex items-center gap-1 text-[#3fb950]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3fb950] animate-pulse" />
                SYSTEM // ONLINE
              </span>
              <span>•</span>
              <span>MODE // PASSIVE-EXTERNAL</span>
            </div>
          </div>

          <nav className="flex items-center gap-3 font-mono text-xs">
            <Link to="/history" className="text-[#8b9bb0] hover:text-[#e6edf3] transition-colors flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              HISTORY
            </Link>
            <button
              onClick={() => setGlossaryOpen(true)}
              className="text-[#8b9bb0] hover:text-[#e6edf3] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              FIELD MANUAL
            </button>
            <Link to="/scan/sample" className="console-btn text-xs py-1 px-2.5">
              EXPLORE SAMPLE
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Workstation Main Console ───────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 flex flex-col gap-6">
        {/* ─── Console Identification ───────────────────────────────── */}
        <section className="console-panel p-5 bg-[#10151b]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1e2631]">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#58a6ff] font-semibold mb-1">
                <span>[TERMINAL // RECON-01]</span>
                <span>•</span>
                <span>NON-INTRUSIVE PUBLIC OSINT</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-[#e6edf3] tracking-tight">
                DOMAIN ATTACK SURFACE SCANNER
              </h1>
              <p className="text-xs text-[#8b9bb0] font-mono mt-1">
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#576575]">
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
            <div id="auth-notice" className="font-mono text-[11px] text-[#8b9bb0] flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[#d29922] font-semibold">⚠ NOTICE:</span>
              <span>Only scan domains and infrastructure that you own or are explicitly authorized to assess.</span>
              <span className="text-[#576575]">|</span>
              <Link to="/terms" className="text-[#58a6ff] hover:underline">
                Acceptable Use Policy
              </Link>
            </div>
          </form>

          {error && (
            <div className="mt-3 p-2 bg-[#0c1015] border border-[#da3633] text-[#f85149] font-mono text-xs flex items-center gap-2">
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
            <span className="text-[10px] text-[#8b9bb0]">OBSERVABLE PERIMETER VECTORS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#1e2631]">
            {capabilities.map((cap, i) => (
              <div key={i} className="bg-[#10151b] p-4 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-[#e6edf3] mb-1.5 flex items-center gap-1.5">
                    <span className="text-[#58a6ff]">▸</span>
                    {cap.title}
                  </div>
                  <p className="text-xs text-[#8b9bb0] leading-relaxed">
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
            <span className="text-[10px] text-[#8b9bb0]">METHODOLOGICAL PIPELINE</span>
          </div>

          <div className="p-4 bg-[#10151b]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {pipelineStages.map((stage) => (
                <div key={stage.step} className="bg-[#0c1015] border border-[#1e2631] p-3 flex flex-col">
                  <div className="font-mono text-xs font-bold text-[#58a6ff] mb-1">
                    {stage.step} // {stage.name}
                  </div>
                  <div className="text-[11px] text-[#8b9bb0] font-mono leading-tight">
                    {stage.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Passive Reconnaissance Guarantee ───────────────────────── */}
        <section className="console-panel p-4 bg-[#0c1015] border border-[#1e2631]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#3fb950] shrink-0 mt-0.5" />
              <div>
                <div className="font-mono text-xs font-bold text-[#3fb950] uppercase tracking-wider">
                  PASSIVE RECONNAISSANCE GUARANTEE
                </div>
                <p className="text-xs text-[#8b9bb0] mt-0.5 max-w-4xl">
                  This tool solely evaluates publicly observable DNS, append-only Certificate Transparency logs, WHOIS registry metadata, and standard public HTTP response headers. It performs no port scanning, brute-forcing, active fuzzing, or intrusive probing.
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-[10px] text-[#576575] border border-[#1e2631] px-2 py-1 bg-[#10151b]">
              SAFE FOR REGULATED TARGETS
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer with Legal Navigation ──────────────────────────── */}
      <footer className="border-t border-[#1e2631] bg-[#0c1015] px-4 py-3 mt-auto">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[11px] text-[#576575]">
          <div>
            DOMAIN ATTACK SURFACE SCANNER // NON-INTRUSIVE OSINT PLATFORM
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="hover:text-[#8b9bb0] transition-colors">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-[#8b9bb0] transition-colors">TERMS OF USE</Link>
            <Link to="/security" className="hover:text-[#8b9bb0] transition-colors">SECURITY & DISCLOSURE</Link>
            <button onClick={() => setGlossaryOpen(true)} className="hover:text-[#8b9bb0] cursor-pointer transition-colors">
              FIELD MANUAL
            </button>
            <a
              href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#8b9bb0] transition-colors"
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
