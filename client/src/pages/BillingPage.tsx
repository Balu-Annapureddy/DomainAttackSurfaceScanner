import { CheckCircle2, ShieldAlert } from 'lucide-react';
import LegalPageLayout from '../components/LegalPageLayout';

const TOC = [
  { id: 'sec-statement', title: 'Core Statement' },
  { id: 'sec-tiers', title: 'Usage Quotas' },
  { id: 'sec-fraud', title: 'Fraud Warning' },
  { id: 'sec-future', title: 'Future Terms' },
];

export default function BillingPage() {
  return (
    <LegalPageLayout
      title="BILLING, PRICING & REFUND POLICY"
      category="LEGAL & COMMERCIAL // DISCLOSURE"
      effectiveDate="SEPTEMBER 25, 2026"
      lastUpdated="SEPTEMBER 25, 2026"
      badge="NO-PAYMENT MODEL"
      toc={TOC}
    >
      {/* Core Statement Card */}
      <section id="sec-statement" className="console-panel p-5 space-y-3 scroll-mt-20">
        <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
          <CheckCircle2 size={14} className="text-[var(--accent-primary)]" />
          <span>PRIMARY COMMERCIAL STATEMENT</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
          <strong>DomainAttackSurfaceScanner is provided entirely free of charge.</strong> The application currently processes <strong>no financial transactions</strong>, maintains no paid subscriptions, charges no fees, and integrates no payment processors (such as Stripe, PayPal, or merchant banks).
        </p>
        <div className="console-panel-inset p-3.5 border border-[var(--border-technical)] font-mono text-xs text-[var(--text-primary)] rounded-xs">
          &ldquo;Because the service currently does not charge fees or process paid transactions, no payment billing or refund process currently applies.&rdquo;
        </div>
      </section>

      {/* 1. Free-Tier Quota Model */}
      <section id="sec-tiers" className="space-y-3 scroll-mt-20">
        <h2 className="text-base sm:text-lg font-normal font-display italic text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <span>1. Usage Quota Allocation (Free Tiers)</span>
        </h2>
        <div className="console-panel p-4 space-y-3 font-sans text-xs text-[var(--text-secondary)] rounded-xs">
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
      <section id="sec-fraud" className="space-y-3 font-mono scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <ShieldAlert size={14} className="text-red-500" />
          <span>2. FRAUD WARNING &amp; THIRD-PARTY CHARGES</span>
        </h2>
        <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)] leading-relaxed rounded-lg">
          <p>
            The operators of DomainAttackSurfaceScanner will <strong>never</strong> ask for credit card details, wire transfers, cryptocurrency payments, or banking credentials. If any website, individual, or message claims to charge for access to this tool, it is fraudulent and unauthorized.
          </p>
        </div>
      </section>

      {/* 3. Future Commercial Revisions */}
      <section id="sec-future" className="space-y-3 font-mono scroll-mt-20">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-technical)] pb-2">
          <span>3. FUTURE COMMERCIAL TERMS</span>
        </h2>
        <div className="console-panel p-4 space-y-2 font-sans text-xs text-[var(--text-secondary)] leading-relaxed rounded-lg">
          <p>
            Should dedicated cloud hosting, high-throughput dedicated scanning nodes, or enterprise SLA plans be introduced in future revisions of this software, comprehensive billing terms, tax disclosures, cancellation policies, and refund provisions will be published explicitly in advance on this page.
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}
