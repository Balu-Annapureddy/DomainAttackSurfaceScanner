import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  AlertTriangle,
  Globe,
  FileCode,
  Lock,
  Server,
  Mail,
  Network,
  Radio,
  ArrowRight,
  Shield,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
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
      setError('Please specify a target domain name (e.g. example.com)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await createScan(cleanDomain);
      navigate(`/scan/${encodeURIComponent(data.scanId)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to commence scan');
    } finally {
      setLoading(false);
    }
  };

  const capabilities = [
    {
      icon: Globe,
      tag: 'DNS / FOOTPRINT',
      title: 'DNS & Infrastructure Resolution',
      desc: 'Authoritative nameservers, MX mail routing, multi-cloud A/AAAA endpoints, and canonical CNAME alias chains mapped without probing.',
    },
    {
      icon: FileCode,
      tag: 'APPEND-ONLY CT',
      title: 'Certificate Transparency Logs',
      desc: 'Cryptographic public logs audited passively to discover subdomains, historical hostnames, wildcard records, and SAN expansions.',
    },
    {
      icon: Lock,
      tag: 'CRYPTOGRAPHY',
      title: 'TLS & Transport Encryption',
      desc: 'Certificate validity horizon, intermediate authority chains, protocol suites, and automated detection of expired or untrusted certs.',
    },
    {
      icon: Server,
      tag: 'HTTP POSTURE',
      title: 'Web Perimeter Hygiene',
      desc: 'Observation of HTTP-to-HTTPS redirect enforcement, strict HSTS max-age, CSP, X-Frame-Options, and server technology signatures.',
    },
    {
      icon: Mail,
      tag: 'EMAIL AUTH',
      title: 'Email Spoofing Defense',
      desc: 'Verification of SPF policy directives (~all / -all), DMARC alignment records (p=none/quarantine/reject), and mail gateway exposure.',
    },
    {
      icon: Network,
      tag: 'TOPOLOGY',
      title: 'BGP & ASN Infrastructure',
      desc: 'Correlating IP endpoints with Autonomous System Numbers (ASNs), transit carriers, hosting providers, and geographic points of presence.',
    },
    {
      icon: Radio,
      tag: 'OBSERVABLE OSINT',
      title: 'Attack Surface Graph Mapping',
      desc: 'Bidirectional relationship graph linking domains, hostnames, IP endpoints, certificates, and organizations into an actionable model.',
    },
  ];

  const pipelineStages = [
    { step: '01', name: 'Resolve', desc: 'Authoritative DNS query orchestration' },
    { step: '02', name: 'Discover', desc: 'Certificate Transparency log harvesting' },
    { step: '03', name: 'Correlate', desc: 'Autonomous system & organization mapping' },
    { step: '04', name: 'Observe', desc: 'Perimeter HTTP/TLS response verification' },
    { step: '05', name: 'Assess', desc: 'Configuration hygiene & weakness scoring' },
    { step: '06', name: 'Report', desc: 'Synthesizing actionable intelligence dossier' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav onOpenGlossary={() => setGlossaryOpen(true)} />

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col gap-14 sm:gap-18">

        {/* ─── Hero & Target Submission Module ──────────────────────── */}
        <section className="console-panel p-7 sm:p-12 bg-[var(--bg-panel)] relative overflow-hidden">
          {/* Accent glow backdrops */}
          <div className="absolute top-0 right-0 w-[480px] h-[480px] bg-[var(--accent-primary)] opacity-[0.04] rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--accent-primary)] opacity-[0.025] rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-8 border-b border-[var(--border-technical)]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[var(--accent-active-bg)] text-[var(--accent-primary)] border border-[var(--accent-primary)] border-opacity-30 mb-4">
                <Shield className="w-3.5 h-3.5" />
                <span>NON-INTRUSIVE PASSIVE OSINT PLATFORM</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
                Domain Attack<br className="hidden sm:block" /> Surface Scanner
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3 leading-relaxed max-w-2xl">
                Observe public perimeter infrastructure, cryptographic certificates, DNS topologies, and configuration hygiene without invasive probes or active port scanning.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                to="/scan/sample"
                id="demo-report-btn"
                className="console-btn console-btn-phosphor text-xs py-2.5 px-4 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>TRY DEMO REPORT</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Search Bar Form */}
          <form onSubmit={handleScan} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <label htmlFor="target-domain-input" className="sr-only">
                  Target Domain Name (e.g. example.com)
                </label>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2.5 pointer-events-none">
                  <Globe className="w-5 h-5 text-[var(--accent-primary)]" />
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)] hidden sm:inline tracking-widest">
                    TARGET:
                  </span>
                </div>
                <input
                  id="target-domain-input"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="console-input pl-12 sm:pl-32 py-4 text-base font-mono bg-[var(--bg-panel-inset)] rounded-lg shadow-inner"
                  disabled={loading}
                  autoFocus
                  aria-describedby="auth-notice"
                />
              </div>

              <button
                type="submit"
                id="start-scan-btn"
                disabled={loading || !domain.trim()}
                className="console-btn console-btn-primary px-10 py-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer shrink-0"
                aria-label="Start Passive Attack Surface Scan"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    <span>SCANNING...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>START SCAN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Authorization Notice */}
            <div id="auth-notice" className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-2">
              <span className="text-[var(--sev-medium)] font-semibold inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>AUTHORIZATION:</span>
              </span>
              <span>By initiating a scan, you confirm that you own or are explicitly authorized to assess the target domain.</span>
              <span className="text-[var(--text-muted)]">•</span>
              <Link to="/terms" className="text-[var(--accent-primary)] hover:underline font-medium">
                Terms of Use
              </Link>
              <span className="text-[var(--text-muted)]">•</span>
              <Link to="/privacy" className="text-[var(--accent-primary)] hover:underline font-medium">
                Privacy Policy
              </Link>
            </div>
          </form>

          {error && (
            <div className="mt-5 p-4 bg-[var(--sev-critical-bg)] border border-[var(--sev-critical)] text-[var(--sev-critical)] text-xs sm:text-sm rounded-lg flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ─── 7 System Capabilities — Large Prominent Cards ──────────── */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="font-mono text-sm font-bold text-[var(--accent-primary)]">[01]</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  System Capabilities
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Seven passive reconnaissance vectors evaluated during perimeter analysis
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)] tracking-widest uppercase shrink-0">
              OBSERVABLE VECTORS ×7
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {capabilities.map((cap, i) => {
              const IconComp = cap.icon;
              return (
                <div
                  key={i}
                  id={`capability-card-${i}`}
                  className="capability-card animate-fade-in-up group"
                >
                  {/* Top row: icon + tag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="capability-icon">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] text-[var(--text-muted)] border border-[var(--border-muted)] shrink-0 mt-1">
                      {cap.tag}
                    </span>
                  </div>

                  {/* Title + description */}
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-primary)] transition-colors leading-snug">
                      {cap.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-[var(--border-muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] opacity-60" />
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">PASSIVE DETECTION</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── How the System Works: Methodological Pipeline ─────────── */}
        <section className="console-panel overflow-hidden">
          <div className="dossier-header">
            <div className="flex items-center gap-2.5">
              <span className="dossier-num">[02]</span>
              <span>HOW THE SYSTEM WORKS</span>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono tracking-wider">
              METHODOLOGICAL PIPELINE
            </span>
          </div>

          <div className="p-6 sm:p-8 bg-[var(--bg-panel)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {pipelineStages.map((stage, i) => (
                <div
                  key={stage.step}
                  id={`pipeline-stage-${i}`}
                  className="pipeline-stage"
                >
                  <div className="flex items-center justify-between">
                    <span className="pipeline-step-label">
                      STAGE {stage.step}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] opacity-50" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                      {stage.name}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] leading-snug">
                      {stage.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Passive Reconnaissance Guarantee ─────────────────────────── */}
        <section className="console-panel p-6 sm:p-8 bg-[var(--bg-panel-subtle)] border border-[var(--border-technical)] rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-start gap-5">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-active-bg)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--accent-primary)] border-opacity-30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)] flex flex-wrap items-center gap-2 mb-2">
                  <span>Passive Reconnaissance Guarantee</span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[var(--sev-low-bg)] text-[var(--sev-low)] font-bold border border-[var(--sev-low)] border-opacity-30">
                    NON-INVASIVE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-4xl leading-relaxed">
                  This tool solely evaluates publicly observable DNS, append-only Certificate Transparency logs, WHOIS registry metadata, and standard public HTTP response headers. It performs no port scanning, brute-forcing, active fuzzing, or intrusive probing.
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] border border-[var(--border-muted)] px-4 py-2 rounded-lg bg-[var(--bg-panel)]">
              SAFE FOR REGULATED TARGETS
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-5 mt-auto">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="font-mono tracking-wider">
            DOMAIN ATTACK SURFACE SCANNER • PASSIVE RECONNAISSANCE
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms of Use</Link>
            <Link to="/cookies" className="hover:text-[var(--text-primary)] transition-colors">Cookie Policy</Link>
            <Link to="/billing" className="hover:text-[var(--text-primary)] transition-colors">Billing &amp; Refunds</Link>
            <Link to="/security" className="hover:text-[var(--text-primary)] transition-colors">Security Disclosure</Link>
            <button
              onClick={() => setGlossaryOpen(true)}
              className="hover:text-[var(--text-primary)] cursor-pointer transition-colors font-semibold text-[var(--accent-primary)]"
            >
              Field Manual
            </button>
            <a
              href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {glossaryOpen && <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />}
    </div>
  );
}
