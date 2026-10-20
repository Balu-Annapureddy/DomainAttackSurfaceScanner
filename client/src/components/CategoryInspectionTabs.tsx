import { useState } from 'react';
import {
  Globe,
  FileCode,
  Lock,
  Server,
  Search,
  Cpu,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DomainScan, ScanCategory } from '../../../shared/types';

interface CategoryInspectionTabsProps {
  scan: DomainScan;
  defaultCategory?: ScanCategory;
  onOpenGlossary?: (termKey: string) => void;
}

const TABS: Array<{
  id: ScanCategory;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'dns', label: 'DNS Infrastructure', shortDesc: 'Domain routing, mail servers, and zone integrity', icon: Globe },
  { id: 'http', label: 'Website & HTTP Security', shortDesc: 'HTTPS enforcement and protective browser headers', icon: FileCode },
  { id: 'tls', label: 'HTTPS & TLS Certificates', shortDesc: 'Encryption protocols, certificates, and cipher suites', icon: Lock },
  { id: 'subdomains', label: 'Public Certificate Records', shortDesc: 'Hostnames discovered via public certificate logs (CT)', icon: Server },
  { id: 'whois', label: 'Domain Registration (WHOIS)', shortDesc: 'Registrar, creation, expiration, and ownership status', icon: Search },
  { id: 'exposure', label: 'Public Exposure & Ports', shortDesc: 'Reachable ports, public files, and exposure intelligence', icon: Cpu },
];

export default function CategoryInspectionTabs({
  scan,
  defaultCategory = 'dns',
  onOpenGlossary,
}: CategoryInspectionTabsProps) {
  const [activeTab, setActiveTab] = useState<ScanCategory>(defaultCategory);
  const [showRawHeaders, setShowRawHeaders] = useState(false);

  const categoryResult = scan.categories[activeTab];
  const data = categoryResult?.data as Record<string, unknown> | undefined;

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl overflow-hidden shadow-xs">
      {/* ─── Header & Category Explanation ─────────────────────────── */}
      <div className="bg-[var(--bg-panel-subtle)] border-b border-[var(--border-muted)] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
              Detailed Component Inspections
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] text-[var(--text-secondary)]">
              6 Assessment Areas
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Explore the specific public configurations, defenses, and technical evidence observed for each area.
          </p>
        </div>
        {onOpenGlossary && (
          <button
            type="button"
            onClick={() => onOpenGlossary('passive_osint')}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition self-start sm:self-auto cursor-pointer"
          >
            <HelpCircle size={13} />
            <span>Field Manual</span>
          </button>
        )}
      </div>

      {/* ─── Tab Navigation Bar with Responsive Snap-Scroll ─────────── */}
      <div className="flex border-b border-[var(--border-muted)] bg-[var(--bg-panel-inset)] overflow-x-auto text-xs p-1.5 gap-1.5 [scroll-snap-type:x_mandatory] scroll-smooth">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const status = scan.categories[tab.id]?.status;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`[scroll-snap-align:start] shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-lg whitespace-nowrap transition cursor-pointer font-medium ${
                isActive
                  ? 'bg-[var(--accent-active-bg)] text-[var(--accent-primary)] font-bold border border-[var(--accent-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel)]'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'} />
              <span>{tab.label}</span>
              <span
                className={`ml-1 h-2 w-2 rounded-full ${
                  status === 'completed'
                    ? 'bg-[#16a34a] dark:bg-[#52B788]'
                    : status === 'running'
                    ? 'bg-[var(--accent-primary)] animate-ping'
                    : status === 'failed'
                    ? 'bg-[#d97706] dark:bg-[#f59e0b]'
                    : 'bg-[var(--text-muted)]'
                }`}
                title={`Status: ${status || 'unknown'}`}
              />
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content Area ────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 space-y-6">
        {categoryResult?.status === 'running' && (
          <div className="p-12 text-center text-xs text-[var(--accent-primary)] space-y-2">
            <div className="mx-auto h-5 w-5 animate-spin border-2 border-[var(--border-technical)] border-t-[var(--accent-primary)] rounded-full" />
            <p className="font-mono">Inspection in progress for {activeTab.toUpperCase()}…</p>
            <p className="text-[11px] text-[var(--text-muted)]">Querying public authoritative sources</p>
          </div>
        )}

        {categoryResult?.status === 'failed' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={15} />
              <span>Category Telemetry Could Not Be Verified</span>
            </div>
            <p className="text-[var(--text-secondary)]">
              {categoryResult.error ?? 'Public telemetry for this category could not be verified within time limits.'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              This does not indicate a vulnerability. DASS reports unverified status when authoritative public endpoints do not respond in time.
            </p>
          </div>
        )}

        {categoryResult?.status === 'completed' && data && (
          <div className="space-y-6">
            {/* ═════════════════════════════════════════════════════════════ */}
            {/* TAB: DNS Infrastructure                                     */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {activeTab === 'dns' && (
              <div className="space-y-5">
                {/* Human Explanatory Banner */}
                <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                    <Globe size={14} />
                    <span>Understanding DNS Infrastructure</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    The Domain Name System (DNS) acts as the phonebook of the internet, directing visitors and incoming emails to the correct servers. We inspected this domain&apos;s authoritative DNS zone to verify that services point to verified addresses, email protection policies are published, and DNS integrity is preserved.
                  </p>
                </div>

                {/* Structured Record Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Web Server Addresses (A / AAAA) */}
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Server Addresses (A / AAAA)
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">IPv4 &amp; IPv6</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Identifies the public IP addresses hosting this domain&apos;s web servers.
                    </p>
                    {Array.isArray(data.addresses) && data.addresses.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {(data.addresses as string[]).map((ip, i) => (
                          <div key={i} className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-panel)] px-2.5 py-1 rounded border border-[var(--border-muted)]">
                            {ip}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">No IPv4 addresses observed</span>
                    )}
                    {Array.isArray(data.aaaa) && data.aaaa.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-[var(--border-muted)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase block">IPv6 Addresses</span>
                        {(data.aaaa as string[]).map((ip, i) => (
                          <div key={i} className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-panel)] px-2.5 py-1 rounded border border-[var(--border-muted)]">
                            {ip}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Authoritative Nameservers */}
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Authoritative Nameservers (NS)
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">DNS Host</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      The authoritative servers responsible for answering all DNS lookups for your domain name.
                    </p>
                    {Array.isArray(data.ns) && data.ns.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {(data.ns as string[]).map((ns, i) => (
                          <div key={i} className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-panel)] px-2.5 py-1 rounded border border-[var(--border-muted)]">
                            {ns}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">No NS records reported</span>
                    )}
                  </div>

                  {/* Mail Exchangers */}
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Mail Routing Servers (MX)
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">Email Inbound</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Specifies which mail servers are configured to accept incoming emails sent to this domain.
                    </p>
                    {Array.isArray(data.mx) && data.mx.length > 0 ? (
                      <div className="space-y-1 pt-1">
                        {(data.mx as Array<{ exchange?: string; priority?: number }>).map((mx, i) => (
                          <div key={i} className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-panel)] px-2.5 py-1 rounded border border-[var(--border-muted)] flex justify-between">
                            <span>{typeof mx === 'object' ? mx.exchange : String(mx)}</span>
                            {typeof mx === 'object' && mx.priority !== undefined && (
                              <span className="text-[var(--text-muted)] text-[10px]">Priority: {mx.priority}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">No MX records reported (domain does not receive mail)</span>
                    )}
                  </div>

                  {/* Email Spoofing Protections */}
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Email Spoofing Defenses (SPF &amp; DMARC)
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">Anti-Phishing</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Records that tell receiving mail services which servers are authorized to send email on your behalf, preventing fraud.
                    </p>
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">SPF Record:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          (data.spf as { record?: string })?.record
                            ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788]'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {(data.spf as { record?: string })?.record ? '✓ Published' : 'Missing'}
                        </span>
                      </div>
                      {(data.spf as { record?: string })?.record && (
                        <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-panel)] p-2 rounded border border-[var(--border-muted)] break-all font-mono">
                          {(data.spf as { record?: string }).record}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-muted)]">
                        <span className="text-[var(--text-secondary)]">DMARC Policy:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          (data.dmarc as { record?: string })?.record
                            ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788]'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {(data.dmarc as { record?: string })?.record ? '✓ Published' : 'Missing'}
                        </span>
                      </div>
                      {(data.dmarc as { record?: string })?.record && (
                        <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-panel)] p-2 rounded border border-[var(--border-muted)] break-all font-mono">
                          {(data.dmarc as { record?: string }).record}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* DNSSEC Section (Full Width) */}
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2 md:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">
                          DNSSEC Cryptographic Signature Chain
                        </span>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          DNSSEC cryptographically signs DNS responses to prevent attackers from tampering with lookups or redirecting visitors to fake sites.
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold px-3 py-1 rounded-md border shrink-0 ${
                          (data.dnssec as { observed?: boolean })?.observed
                            ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788] border-[#16a34a]/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {(data.dnssec as { observed?: boolean })?.observed ? '✓ SIGNED (DNSSEC ACTIVE)' : 'NOT SIGNED (ZONE UNSIGNED)'}
                      </span>
                    </div>
                    {(data.dnssec as { record?: string })?.record && (
                      <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-panel)] p-2 rounded border border-[var(--border-muted)] break-all font-mono">
                        {(data.dnssec as { record?: string }).record}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* TAB: HTTP & Headers                                         */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {activeTab === 'http' && (
              <div className="space-y-5">
                {/* Human Explanatory Banner */}
                <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                    <FileCode size={14} />
                    <span>Understanding Website &amp; HTTP Security Headers</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    HTTP security settings tell browsers how to communicate securely with your website and what safety rules to enforce when rendering its content. We checked whether unencrypted traffic is redirected to HTTPS and whether modern defense headers are active to protect your users against common web attacks.
                  </p>
                </div>

                {/* HTTP -> HTTPS Redirection Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        HTTP &rarr; HTTPS Redirection
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        data.httpsEnforced
                          ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788]'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {data.httpsEnforced ? '✓ ENFORCED' : 'NOT ENFORCED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {data.httpsEnforced
                        ? 'Requests sent over unencrypted HTTP are automatically upgraded to encrypted HTTPS, preventing eavesdropping.'
                        : 'Unencrypted HTTP connections were not automatically redirected to HTTPS. Visitors may connect without encryption if they do not type https:// explicitly.'}
                    </p>
                    <div className="pt-1 text-xs">
                      <span className="text-[var(--text-muted)]">Final Landed URL: </span>
                      <span className="font-mono text-[var(--text-primary)] break-all">
                        {String(data.finalObservedUrl || 'N/A')}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] block">
                      Protective Security Headers Summary
                    </span>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Security headers provide instructions directly to the visitor&apos;s browser to prevent attacks like clickjacking, code injection, and protocol downgrade.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {(() => {
                        const h = (data.headers as Record<string, string>) || {};
                        const headersList = [
                          {
                            name: 'Strict-Transport-Security (HSTS)',
                            desc: 'Forces HTTPS for future visits',
                            active: Boolean(h['strict-transport-security']),
                          },
                          {
                            name: 'Content-Security-Policy (CSP)',
                            desc: 'Restricts script execution & resources',
                            active: Boolean(h['content-security-policy']),
                          },
                          {
                            name: 'X-Content-Type-Options',
                            desc: 'Prevents MIME sniffing attacks',
                            active: Boolean(h['x-content-type-options']),
                          },
                          {
                            name: 'X-Frame-Options',
                            desc: 'Protects against clickjacking',
                            active: Boolean(h['x-frame-options']),
                          },
                        ];

                        return headersList.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-muted)] last:border-b-0">
                            <div>
                              <span className="font-medium text-[var(--text-primary)] block">{item.name}</span>
                              <span className="text-[10px] text-[var(--text-muted)]">{item.desc}</span>
                            </div>
                            <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                              item.active
                                ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788]'
                                : 'text-[var(--text-muted)] bg-[var(--bg-panel)]'
                            }`}>
                              {item.active ? '✓ Active' : 'Missing'}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* Raw Response Headers Accordion */}
                {Boolean(data.headers && typeof data.headers === 'object') && (
                  <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowRawHeaders((prev) => !prev)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--bg-panel)] transition cursor-pointer"
                    >
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)] block">
                          Technical Evidence: Full HTTP Response Headers
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {Object.keys(data.headers as Record<string, string>).length} headers returned by server
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <span>{showRawHeaders ? 'Hide Headers' : 'Show All Headers'}</span>
                        {showRawHeaders ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </button>

                    {showRawHeaders && (
                      <div className="border-t border-[var(--border-muted)] p-4 max-h-72 overflow-y-auto space-y-1 font-mono text-[11px]">
                        {Object.entries(data.headers as Record<string, string>).map(([k, v]) => (
                          <div key={k} className="flex flex-col sm:flex-row sm:justify-between gap-1 py-1 border-b border-[var(--border-muted)] last:border-b-0">
                            <span className="text-[var(--accent-primary)] font-bold shrink-0">{k}:</span>
                            <span className="text-[var(--text-secondary)] break-all sm:text-right">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* TAB: TLS Cryptography                                       */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {activeTab === 'tls' && (
              <div className="space-y-5">
                {/* Human Explanatory Banner */}
                <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                    <Lock size={14} />
                    <span>Understanding HTTPS &amp; TLS Cryptography</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Websites use TLS (Transport Layer Security) and digital certificates to encrypt connections between visitors and servers. This ensures private communication and authenticates that users are connecting to the genuine website rather than an impostor.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TLS Handshake */}
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Connection Handshake
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        data.available
                          ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788]'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {data.available ? '✓ ESTABLISHED' : 'UNAVAILABLE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      The negotiated encryption protocol used to establish a secure cryptographic channel.
                    </p>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Negotiated Protocol:</span>
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {String(data.protocol || 'N/A')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Cipher Suite:</span>
                        <span className="font-mono text-[var(--text-primary)] truncate max-w-[200px]" title={String(data.cipher || '')}>
                          {String(data.cipher || 'Negotiated automatically')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Information */}
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        Digital Certificate Details
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">X.509</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      The verified certificate presented by the server during cryptographic negotiation.
                    </p>
                    <div className="space-y-1.5 pt-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Certificate Issuer:</span>
                        <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px]" title={String(data.issuer || '')}>
                          {String(data.issuer || 'N/A')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-muted)]">Valid Until:</span>
                        <span className="font-mono text-[var(--text-primary)]">
                          {String(data.validTo || 'N/A')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fingerprint / Evidence */}
                  {Boolean(data.fingerprint256) && (
                    <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-1.5 md:col-span-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        SHA-256 Certificate Fingerprint
                      </span>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        A unique cryptographic hash that uniquely identifies this digital certificate across the internet.
                      </p>
                      <p className="text-xs font-mono text-[var(--accent-primary)] bg-[var(--bg-panel)] p-2.5 rounded border border-[var(--border-muted)] break-all">
                        {String(data.fingerprint256)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* TAB: Subdomains (Certificate Transparency)                  */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {activeTab === 'subdomains' && (
              <div className="space-y-5">
                {/* Human Explanatory Banner */}
                <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                    <Server size={14} />
                    <span>Understanding Public Certificate Records (CT Logs)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Whenever a certificate authority issues an SSL/TLS certificate for a domain or subdomain, it publishes an immutable record to public Certificate Transparency logs. We reviewed these public logs to discover domain names and subdomains associated with this organization. Discovering a name indicates public visibility, not a vulnerability.
                  </p>
                </div>

                <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      Discovered Domain Names &amp; Subdomains
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] font-mono">
                      {Array.isArray(data.subdomains) ? data.subdomains.length : 0} discovered
                    </span>
                  </div>

                  {Array.isArray(data.subdomains) && data.subdomains.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {(data.subdomains as Array<{ name?: string } | string>).map((sub, i) => {
                        const name = typeof sub === 'object' && sub !== null ? sub.name : String(sub);
                        return (
                          <div
                            key={i}
                            className="bg-[var(--bg-panel)] p-2.5 text-xs text-[var(--text-primary)] truncate font-mono rounded border border-[var(--border-muted)]"
                            title={name}
                          >
                            {name}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                      No additional subdomains were identified in public certificate transparency logs during this scan.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* TAB: WHOIS & Registrar                                      */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {activeTab === 'whois' && (
              <div className="space-y-5">
                {/* Human Explanatory Banner */}
                <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                    <Search size={14} />
                    <span>Understanding Domain Registration (WHOIS)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Domain registration records show the authoritative registrar managing the domain, registration age, expiration date, and designated nameservers. Public registration records confirm domain lifecycle status and whether ownership details are protected by privacy shielding.
                  </p>
                </div>

                <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-3">
                  <span className="text-xs font-bold text-[var(--text-primary)] block">
                    Domain Registration Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    <div className="bg-[var(--bg-panel)] p-3 rounded border border-[var(--border-muted)] space-y-1">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Domain Registrar</span>
                      <span className="text-xs font-medium text-[var(--text-primary)] block truncate" title={String(data.registrar || '')}>
                        {String(data.registrar || 'Private / Not Published')}
                      </span>
                    </div>
                    <div className="bg-[var(--bg-panel)] p-3 rounded border border-[var(--border-muted)] space-y-1">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Creation Date</span>
                      <span className="text-xs font-mono text-[var(--text-primary)] block">
                        {String(data.creationDate || 'N/A')}
                      </span>
                    </div>
                    <div className="bg-[var(--bg-panel)] p-3 rounded border border-[var(--border-muted)] space-y-1">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block">Expiration Date</span>
                      <span className="text-xs font-mono text-[var(--text-primary)] block">
                        {String(data.expirationDate || 'N/A')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════ */}
            {/* TAB: Public Exposure & Ports                                */}
            {/* ═════════════════════════════════════════════════════════════ */}
            {activeTab === 'exposure' && (
              <div className="space-y-5">
                {/* Human Explanatory Banner */}
                <div className="bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                    <Cpu size={14} />
                    <span>Understanding Public Exposure &amp; Perimeter Intelligence</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    Public internet intelligence sources monitor internet-wide service reachability. We examined public records (including Shodan InternetDB) to identify exposed network ports, standard policy files, and historical breach disclosure records. Reachable ports reflect network accessibility, not necessarily vulnerability.
                  </p>
                </div>

                {/* Standard Public Files */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[var(--bg-panel-inset)] p-3.5 rounded-lg border border-[var(--border-muted)] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-secondary)] block">ROBOTS.TXT</span>
                    <span className={`text-xs font-bold block ${
                      data.robotsTxtObserved ? 'text-[#16a34a] dark:text-[#52B788]' : 'text-[var(--text-muted)]'
                    }`}>
                      {data.robotsTxtObserved ? '✓ Present' : 'Not Observed'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Search crawler instructions</span>
                  </div>

                  <div className="bg-[var(--bg-panel-inset)] p-3.5 rounded-lg border border-[var(--border-muted)] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-secondary)] block">SITEMAP.XML</span>
                    <span className={`text-xs font-bold block ${
                      data.sitemapXmlObserved ? 'text-[#16a34a] dark:text-[#52B788]' : 'text-[var(--text-muted)]'
                    }`}>
                      {data.sitemapXmlObserved ? '✓ Present' : 'Not Observed'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Page indexing roadmap</span>
                  </div>

                  <div className="bg-[var(--bg-panel-inset)] p-3.5 rounded-lg border border-[var(--border-muted)] space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-secondary)] block">SECURITY.TXT (RFC 9116)</span>
                    <span className={`text-xs font-bold block ${
                      data.securityTxtObserved ? 'text-[#16a34a] dark:text-[#52B788]' : 'text-[var(--text-muted)]'
                    }`}>
                      {data.securityTxtObserved ? '✓ Present' : 'Not Observed'}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block">Vulnerability disclosure policy</span>
                  </div>
                </div>

                {/* Shodan InternetDB Public Intelligence */}
                <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        Perimeter Port Reachability (Shodan InternetDB)
                      </span>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Passive internet registry data showing which service ports are reachable on discovered IP endpoints.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-muted)]">
                      PASSIVE OSINT
                    </span>
                  </div>

                  {Array.isArray(data.shodan) && (data.shodan as Array<Record<string, unknown>>).length > 0 ? (
                    <div className="space-y-3">
                      {(data.shodan as Array<{
                        ip: string;
                        ports?: number[];
                        cpes?: string[];
                        vulns?: string[];
                        tags?: string[];
                        hasData?: boolean;
                      }>).map((host, idx) => (
                        <div key={idx} className="bg-[var(--bg-panel)] p-3.5 rounded-lg border border-[var(--border-muted)] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{host.ip}</span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              host.hasData
                                ? 'bg-[#16a34a]/10 text-[#16a34a] dark:text-[#52B788] border-[#16a34a]/30'
                                : 'bg-[var(--bg-panel-inset)] text-[var(--text-muted)] border-[var(--border-muted)]'
                            }`}>
                              {host.hasData ? 'INDEXED IN INTERNET INTELLIGENCE' : 'NO RECORDS INDEXED'}
                            </span>
                          </div>

                          {host.ports && host.ports.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-mono block">Reachable Ports:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {host.ports.map((p) => {
                                  const isRisky = [21, 23, 445, 1433, 1521, 3306, 3389, 5432, 5900, 6379, 8086, 9200, 27017].includes(p);
                                  return (
                                    <span
                                      key={p}
                                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                                        isRisky
                                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                                          : 'bg-[var(--bg-panel-inset)] text-[var(--text-primary)] border-[var(--border-muted)]'
                                      }`}
                                    >
                                      Port {p} {isRisky ? '(Attention: database / admin port)' : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {host.vulns && host.vulns.length > 0 && (
                            <div className="space-y-1 pt-2 border-t border-[var(--border-muted)]">
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase font-mono block">
                                Potential CVE Indicators:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {host.vulns.map((cve) => (
                                  <span key={cve} className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
                                    {cve}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] py-2">
                      No external Shodan InternetDB exposure records were indexed for the discovered IP infrastructure.
                    </p>
                  )}
                </div>

                {/* Breach Disclosure Metadata */}
                {Boolean(data.breachData) && (
                  <div className="bg-[var(--bg-panel-inset)] p-4 rounded-lg border border-[var(--border-muted)] space-y-3">
                    <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        Public Breach Disclosure Records
                      </span>
                      <a
                        href="https://haveibeenpwned.com/DomainSearch"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Check HaveIBeenPwned</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    {(() => {
                      const breach = data.breachData as {
                        hasBreaches?: boolean;
                        breachCount?: number;
                        breaches?: Array<{ name: string; title: string; breachDate: string; pwnCount?: number }>;
                      };
                      if (!breach || !breach.hasBreaches || !breach.breaches || breach.breaches.length === 0) {
                        return (
                          <p className="text-xs text-[var(--text-muted)]">
                            No public data breach incidents were identified for this domain.
                          </p>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-[var(--text-secondary)]">
                            {breach.breachCount || breach.breaches.length} historical public breach incident(s) recorded in disclosure registries:
                          </p>
                          <div className="space-y-1.5">
                            {breach.breaches.map((b, i) => (
                              <div
                                key={i}
                                className="bg-[var(--bg-panel)] p-2.5 rounded border border-[var(--border-muted)] flex items-center justify-between gap-2 text-xs"
                              >
                                <div>
                                  <span className="font-bold text-[var(--text-primary)]">{b.title || b.name}</span>
                                  <span className="text-[11px] text-[var(--text-muted)] ml-2">Date: {b.breachDate}</span>
                                </div>
                                {typeof b.pwnCount === 'number' && (
                                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                    {b.pwnCount.toLocaleString()} accounts
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
