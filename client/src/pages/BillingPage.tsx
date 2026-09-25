import { Link } from 'react-router-dom';
import { CreditCard, CheckCircle2, ShieldAlert } from 'lucide-react';
import WorkstationNav from '../components/WorkstationNav';

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans flex flex-col transition-colors duration-150">
      <WorkstationNav />

      {/* ─── Document Container ──────────────────────────────────────── */}
      <article className="mx-auto max-w-4xl px-4 py-8 space-y-8 flex-1">
        {/* Title Block */}
        <div className="border-b border-[var(--border-technical)] pb-4 font-mono">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-primary)] mb-1">
            <CreditCard size={13} />
            <span>LEGAL &amp; COMMERCIAL // DISCLOSURE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
            BILLING, PRICING &amp; REFUND POLICY
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-secondary)] mt-2">
            <span>EFFECTIVE DATE: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span>LAST UPDATED: SEPTEMBER 25, 2026</span>
            <span>•</span>
            <span className="text-[var(--accent-primary)]">NO-PAYMENT MODEL</span>
          </div>
        </div>

        {/* Core Statement Card */}
        <section className="bg-[var(--bg-panel)] border border-[var(--border-technical)] p-4 space-y-2">
          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
            <CheckCircle2 size={13} className="text-[var(--accent-primary)]" />
            <span>PRIMARY COMMERCIAL STATEMENT</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
            <strong>DomainAttackSurfaceScanner is provided entirely free of charge.</strong> The application currently processes <strong>no financial transactions</strong>, maintains no paid subscriptions, charges no fees, and integrates no payment processors (such as Stripe, PayPal, or merchant banks).
          </p>
          <div className="console-panel-inset p-3 border-l-2 border-l-[var(--accent-primary)] font-mono text-xs text-[var(--text-primary)]">
            "Because the service currently does not charge fees or process paid transactions, no payment billing or refund process currently applies."
          </div>
        </section>

        {/* 1. Free-Tier Quota Model */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>1. USAGE QUOTA ALLOCATION (FREE TIERS)</span>
          </h2>
          <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)]">
            <p>
              To protect public external data sources and ensure equitable compute distribution across all users, rate limits are enforced automatically at no monetary cost:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border border-[var(--border-technical)]">
                <thead className="bg-[var(--bg-panel-subtle)] text-[var(--text-primary)]">
                  <tr>
                    <th className="p-2 border-b border-[var(--border-technical)]">Account Tier</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Cost</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Scan Quota</th>
                    <th className="p-2 border-b border-[var(--border-technical)]">Features</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--border-technical)]">
                    <td className="p-2 font-bold text-[var(--text-primary)]">Anonymous Visitor</td>
                    <td className="p-2 text-[var(--accent-primary)] font-bold">$0.00</td>
                    <td className="p-2">5 scans / hour</td>
                    <td className="p-2 font-sans">Full perimeter map, local browser cache, zero cookies</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[var(--accent-primary)]">Registered Operator</td>
                    <td className="p-2 text-[var(--accent-primary)] font-bold">$0.00</td>
                    <td className="p-2">50 scans / hour</td>
                    <td className="p-2 font-sans">Persistent database history, multi-scan diffing, cross-device sync</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 2. Fraud & Scams Warning */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldAlert size={14} className="text-red-500" />
            <span>2. FRAUD WARNING &amp; THIRD-PARTY CHARGES</span>
          </h2>
          <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>
              The operators of DomainAttackSurfaceScanner will <strong>never</strong> ask for credit card details, wire transfers, cryptocurrency payments, or banking credentials. If any website, individual, or message claims to charge for access to this tool, it is fraudulent and unauthorized.
            </p>
          </div>
        </section>

        {/* 3. Future Commercial Revisions */}
        <section className="space-y-3 font-mono">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>3. FUTURE COMMERCIAL TERMS</span>
          </h2>
          <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)] leading-relaxed">
            <p>
              Should dedicated cloud hosting, high-throughput dedicated scanning nodes, or enterprise SLA plans be introduced in future revisions of this software, comprehensive billing terms, tax disclosures, cancellation policies, and refund provisions will be published explicitly in advance on this page.
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
            <Link to="/cookies" className="hover:text-[var(--accent-primary)] transition">COOKIE POLICY</Link>
            <span>&middot;</span>
            <Link to="/billing" className="text-[var(--accent-primary)] font-bold">BILLING &amp; REFUNDS</Link>
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
