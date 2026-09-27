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
  History,
} from 'lucide-react';
import GlossaryModal from '../components/GlossaryModal';
import WorkstationNav from '../components/WorkstationNav';
import { createScan } from '../lib/api';

export default function LandingPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryTerm, setGlossaryTerm] = useState<string | undefined>(undefined);
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

  const handleOpenTerm = (term: string) => {
    setGlossaryTerm(term);
    setGlossaryOpen(true);
  };

  const featureCards = [
    {
      icon: Globe,
      tag: 'DISCOVERY',
      title: 'DNS & Perimeter Mapping',
      desc: 'Authoritative nameservers, mail routing MX, multi-cloud A/AAAA endpoints, and canonical CNAME aliases mapped non-invasively.',
      term: 'dns_mx',
    },
    {
      icon: FileCode,
      tag: 'TRANSPARENCY',
      title: 'Certificate Log Auditing',
      desc: 'Append-only public CT logs harvested to discover historical hostnames, wildcards, and hidden subdomains.',
      term: 'certificate_transparency',
    },
    {
      icon: Network,
      tag: 'INFRASTRUCTURE',
      title: 'BGP Routing & Topology',
      desc: 'IP geolocation, Autonomous System Numbers (ASNs), and transit providers correlated into a unified topology graph.',
      term: 'autonomous_system',
    },
    {
      icon: Server,
      tag: 'HYGIENE',
      title: 'Security Header Posture',
      desc: 'Passive evaluation of strict HSTS policies, CSP configurations, TLS cipher suites, and modern redirect chains.',
      term: 'hsts',
    },
    {
      icon: Mail,
      tag: 'EMAIL AUTH',
      title: 'Email Spoofing Defense',
      desc: 'Evaluation of SPF policy directives (~all / -all) and DMARC enforcement alignment records across mail gateways.',
      term: 'spf',
    },
    {
      icon: Radio,
      tag: 'INTELLIGENCE',
      title: 'Attack Surface Graph',
      desc: 'Interactive relationship network linking assets, IP hosts, cryptographic certificates, and cloud vendors.',
      term: 'attack_surface',
    },
    {
      icon: History,
      tag: 'TIMELINE',
      title: 'Drift & History Tracking',
      desc: 'Differential comparison across historical scans to detect newly discovered perimeter endpoints or retired hosts.',
      term: 'passive_osint',
    },
    {
      icon: Lock,
      tag: 'COMPLIANCE',
      title: 'Regulated Target Safety',
      desc: 'Guaranteed 100% passive observation. Safe for production environments, financial institutions, and regulated entities.',
      term: 'passive_osint',
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
      <WorkstationNav onOpenGlossary={(term) => { setGlossaryTerm(term); setGlossaryOpen(true); }} />

      {/* ─── Hero Section with Subtle Workstation Grid Texture ───────── */}
      <section className="relative border-b border-[var(--border-muted)] bg-[var(--bg-canvas)] workstation-grid-bg py-20 sm:py-28 overflow-hidden">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[var(--accent-primary)] opacity-[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--accent-active-bg)] text-[var(--accent-primary)] border border-[var(--accent-primary)] border-opacity-30 mb-6 shadow-xs animate-fade-in">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-mono tracking-wide uppercase text-[11px]">Passive External Attack Surface Reconnaissance</span>
          </div>

          {/* Headline */}
          <h1 className="font-hero tracking-tight text-[var(--text-primary)] max-w-4xl">
            Domain Attack Surface Scanner
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[var(--text-secondary)] mt-4 mb-10 max-w-2xl leading-relaxed">
            Continuously observe public infrastructure perimeter, DNS records, TLS certificates, and security hygiene without sending invasive probes.
          </p>

          {/* Single Joined Pill Search Control */}
          <form onSubmit={handleScan} className="w-full max-w-2xl">
            <div className="hero-search-pill">
              <div className="flex items-center gap-2 pl-2 text-[var(--accent-primary)] shrink-0">
                <Globe className="w-5 h-5" />
                <span className="font-mono text-xs font-bold text-[var(--text-muted)] hidden sm:inline tracking-wider">
                  DOMAIN:
                </span>
              </div>

              <input
                id="target-domain-input"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="flex-1 bg-transparent border-none outline-none font-mono text-sm sm:text-base px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-0"
                disabled={loading}
                autoFocus
                aria-label="Target domain name"
              />

              <button
                type="submit"
                id="start-scan-btn"
                disabled={loading || !domain.trim()}
                className="console-btn-primary rounded-full px-6 sm:px-8 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
                aria-label="Start Passive Attack Surface Scan"
              >
                {loading ? (
                  <>
                    <span className="btn-spinner" />
                    <span>SCANNING…</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>START SCAN</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-[var(--sev-critical-bg)] border border-[var(--sev-critical)] text-[var(--sev-critical)] text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 max-w-md mx-auto">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Disclaimer & Demo Link */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
              <span>Non-intrusive &middot; Non-disruptive &middot; Safe for regulated targets</span>
              <span>&bull;</span>
              <Link
                to="/scan/sample"
                id="demo-report-btn"
                className="text-[var(--accent-primary)] font-semibold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Try Demo Report</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </form>
        </div>
      </section>

      {/* ─── Main Body: Feature Cards Grid & Pipeline ────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col gap-16 sm:gap-20">

        {/* ─── Core Capability Vectors (4-col desktop → 2-col tablet → 1-col mobile) ── */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-[var(--border-muted)] pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">[01]</span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Passive Reconnaissance Capabilities
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Eight observable perimeter intelligence vectors analyzed without intrusive probing
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)] tracking-widest uppercase shrink-0">
              OBSERVABLE VECTORS &times; 8
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureCards.map((card, i) => {
              const IconComp = card.icon;
              return (
                <div
                  key={i}
                  id={`feature-card-${i}`}
                  className="console-panel p-6 rounded-xl flex flex-col justify-between hover:border-[var(--accent-primary)] transition-all group cursor-pointer bg-[var(--bg-panel)]"
                  onClick={() => handleOpenTerm(card.term)}
                >
                  <div>
                    {/* Icon in soft circle */}
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div className="w-12 h-12 rounded-full bg-[var(--bg-panel-subtle)] text-[var(--accent-primary)] flex items-center justify-center border border-[var(--border-technical)] group-hover:scale-105 transition-transform">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="console-tag">
                        {card.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--border-muted)] flex items-center justify-between text-xs text-[var(--accent-primary)] font-semibold">
                    <span className="opacity-90 group-hover:underline">Learn more in Field Manual</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── How the System Works: Methodological Pipeline ─────────── */}
        <section className="console-panel overflow-hidden rounded-xl">
          <div className="dossier-header px-6 py-4">
            <div className="flex items-center gap-2.5">
              <span className="dossier-num">[02]</span>
              <span>HOW THE SYSTEM WORKS</span>
            </div>
            <span className="text-[11px] text-[var(--text-secondary)] font-mono tracking-wider">
              METHODOLOGICAL PIPELINE
            </span>
          </div>

          <div className="p-6 sm:p-8 bg-[var(--bg-panel-subtle)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {pipelineStages.map((stage, i) => (
                <div
                  key={stage.step}
                  id={`pipeline-stage-${i}`}
                  className="bg-[var(--bg-panel)] border border-[var(--border-technical)] p-4 rounded-xl flex flex-col justify-between gap-3 shadow-xs hover:border-[var(--accent-primary)] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">
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
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-active-bg)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--accent-primary)] border-opacity-30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex flex-wrap items-center gap-2 mb-1.5">
                  <span>Passive Reconnaissance Guarantee</span>
                  <span className="console-tag console-tag-phosphor">
                    NON-INVASIVE
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-4xl leading-relaxed">
                  This tool solely evaluates publicly observable DNS, append-only Certificate Transparency logs, WHOIS registry metadata, and standard public HTTP response headers. It performs no port scanning, brute-forcing, active fuzzing, or intrusive probing.
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-[11px] text-[var(--text-muted)] border border-[var(--border-muted)] px-3.5 py-1.5 rounded-lg bg-[var(--bg-panel)] shadow-xs">
              SAFE FOR REGULATED TARGETS
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--bg-panel)] px-4 py-6 mt-auto">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="font-mono tracking-wider">
            DOMAIN ATTACK SURFACE SCANNER &bull; PASSIVE RECONNAISSANCE
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition-colors">Privacy Policy</Link>
            <span>&bull;</span>
            <Link to="/terms" className="hover:text-[var(--accent-primary)] transition-colors">Terms of Use</Link>
            <span>&bull;</span>
            <Link to="/cookies" className="hover:text-[var(--accent-primary)] transition-colors">Cookie Policy</Link>
            <span>&bull;</span>
            <Link to="/security" className="hover:text-[var(--accent-primary)] transition-colors">Security Disclosure</Link>
            <span>&bull;</span>
            <Link to="/billing" className="hover:text-[var(--accent-primary)] transition-colors">Billing</Link>
          </div>
        </div>
      </footer>

      {/* Field Manual Glossary Modal */}
      <GlossaryModal
        isOpen={glossaryOpen}
        initialTermKey={glossaryTerm}
        onClose={() => setGlossaryOpen(false)}
      />
    </div>
  );
}
