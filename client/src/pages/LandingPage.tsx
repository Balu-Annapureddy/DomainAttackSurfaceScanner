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

      {/* ─── Main Content Container with Generous Spacing ───────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-10 sm:gap-14">
        
        {/* ─── Hero & Target Submission Module ──────────────────────── */}
        <section className="console-panel p-6 sm:p-10 bg-[var(--bg-panel)] relative overflow-hidden">
          {/* Subtle accent backdrop */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-primary)] opacity-5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-[var(--border-technical)]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent-active-bg)] text-[var(--accent-primary)] border border-[var(--accent-primary)] border-opacity-30 mb-3">
                <Shield className="w-3.5 h-3.5" />
                <span>NON-INTRUSIVE PASSIVE OSINT PLATFORM</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Domain Attack Surface Scanner
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2 leading-relaxed">
                Observe public perimeter infrastructure, cryptographic certificates, DNS topologies, and configuration hygiene without invasive probes or active port scanning.
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                to="/scan/sample"
                className="console-btn console-btn-phosphor text-xs py-2 px-3.5 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>TRY DEMO REPORT</span>
              </Link>
            </div>
          </div>

          {/* Search Bar Form with Large, Sleek Input & Prominent CTA */}
          <form onSubmit={handleScan} className="mt-8 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <label htmlFor="target-domain-input" className="sr-only">
                  Target Domain Name (e.g. example.com)
                </label>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-[var(--text-muted)]">
                  <Globe className="w-5 h-5 text-[var(--accent-primary)]" />
                  <span className="text-xs font-mono font-semibold text-[var(--text-muted)] hidden sm:inline">
                    DOMAIN:
                  </span>
                </div>
                <input
                  id="target-domain-input"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="example.com"
                  className="console-input pl-11 sm:pl-28 py-3.5 text-base font-mono bg-[var(--bg-panel-inset)] rounded-lg shadow-inner"
                  disabled={loading}
                  autoFocus
                  aria-describedby="auth-notice"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !domain.trim()}
                className="console-btn-primary px-8 py-3.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer shrink-0"
                aria-label="Start Passive Attack Surface Scan"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>SCANNING PERIMETER...</span>
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
            <div id="auth-notice" className="text-xs text-[var(--text-secondary)] flex flex-wrap items-center gap-2 pt-2">
              <span className="text-amber-500 dark:text-amber-400 font-semibold inline-flex items-center gap-1">
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
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 text-xs sm:text-sm rounded-lg flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ─── 7 System Capabilities (Prominent & Spacious Cards) ────── */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[var(--accent-primary)]">[01]</span>
                <span>System Capabilities</span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Seven primary passive reconnaissance vectors evaluated during perimeter analysis
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)] tracking-wider uppercase">
              OBSERVABLE VECTORS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap, i) => {
              const IconComp = cap.icon;
              return (
                <div
                  key={i}
                  className="console-panel p-6 bg-[var(--bg-panel)] flex flex-col justify-between hover:border-[var(--accent-primary)] hover:shadow-lg transition-all duration-200 group rounded-xl"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent-active-bg)] text-[var(--accent-primary)] flex items-center justify-center border border-[var(--accent-primary)] border-opacity-20 group-hover:scale-105 transition-transform">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--bg-panel-subtle)] text-[var(--text-muted)] border border-[var(--border-muted)]">
                        {cap.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── How the System Works: Methodological Pipeline ─────────── */}
        <section className="console-panel overflow-hidden">
          <div className="dossier-header">
            <div className="flex items-center gap-2">
              <span className="dossier-num">[02]</span>
              <span>HOW THE SYSTEM WORKS</span>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono">
              METHODOLOGICAL PIPELINE
            </span>
          </div>

          <div className="p-6 bg-[var(--bg-panel)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {pipelineStages.map((stage) => (
                <div
                  key={stage.step}
                  className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] p-4 rounded-lg flex flex-col justify-between gap-2 hover:border-[var(--accent-primary)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">
                      STAGE {stage.step}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] opacity-40" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {stage.name}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-snug">
                      {stage.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Passive Reconnaissance Guarantee ───────────────────────── */}
        <section className="console-panel p-6 bg-[var(--bg-panel-subtle)] border border-[var(--border-technical)] rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-active-bg)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--accent-primary)] border-opacity-30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span>Passive Reconnaissance Guarantee</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    NON-INVASIVE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-4xl leading-relaxed">
                  This tool solely evaluates publicly observable DNS, append-only Certificate Transparency logs, WHOIS registry metadata, and standard public HTTP response headers. It performs no port scanning, brute-forcing, active fuzzing, or intrusive probing.
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] border border-[var(--border-muted)] px-3 py-1.5 rounded bg-[var(--bg-panel)] shadow-xs">
              SAFE FOR REGULATED TARGETS
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer with Legal Navigation ──────────────────────────── */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-4 mt-auto">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="font-mono">
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
