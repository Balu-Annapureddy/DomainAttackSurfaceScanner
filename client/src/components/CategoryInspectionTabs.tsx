import { useState } from 'react';
import { Search, Globe, Server, Lock, FileCode, Cpu } from 'lucide-react';
import type { DomainScan, ScanCategory } from '../../../shared/types';

interface CategoryInspectionTabsProps {
  scan: DomainScan;
  defaultCategory?: ScanCategory;
}

const TABS: Array<{ id: ScanCategory; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { id: 'dns', label: 'DNS Infrastructure', icon: Globe },
  { id: 'http', label: 'HTTP & Headers', icon: FileCode },
  { id: 'tls', label: 'TLS Cryptography', icon: Lock },
  { id: 'subdomains', label: 'Subdomains (CT)', icon: Server },
  { id: 'whois', label: 'WHOIS & Registrar', icon: Search },
  { id: 'exposure', label: 'Public Exposure', icon: Cpu },
];

export default function CategoryInspectionTabs({
  scan,
  defaultCategory = 'dns',
}: CategoryInspectionTabsProps) {
  const [activeTab, setActiveTab] = useState<ScanCategory>(defaultCategory);

  const categoryResult = scan.categories[activeTab];
  const data = categoryResult?.data as Record<string, unknown> | undefined;

  return (
    <div className="console-panel rounded-xl overflow-hidden shadow-sm">
      {/* ─── Tab Navigation Header ───────────────────────────────────── */}
      <div className="flex border-b border-[var(--border-muted)] bg-[var(--bg-panel-inset)] overflow-x-auto font-sans text-xs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const status = scan.categories[tab.id]?.status;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 whitespace-nowrap transition border-b-2 cursor-pointer ${
                isActive
                  ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--bg-panel)] font-bold'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'} />
              <span>{tab.label}</span>
              <span
                className={`ml-1 h-1.5 w-1.5 rounded-full ${
                  status === 'completed'
                    ? 'bg-[#16a34a] dark:bg-[#2ee59d]'
                    : status === 'running'
                    ? 'bg-[var(--accent-primary)] animate-ping'
                    : status === 'failed'
                    ? 'bg-[#d97706] dark:bg-[#f59e0b]'
                    : 'bg-[var(--text-muted)]'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content Area ────────────────────────────────────────── */}
      <div className="p-4 sm:p-5">
        {categoryResult?.status === 'running' && (
          <div className="p-12 text-center font-mono text-xs text-[var(--accent-primary)]">
            [QUERY RUNNING]: Inspection in progress for {activeTab.toUpperCase()}…
          </div>
        )}

        {categoryResult?.status === 'failed' && (
          <div className="console-panel-inset border-l-2 border-l-[#d97706] dark:border-l-[#f59e0b] p-4 text-xs font-mono text-[#d97706] dark:text-[#f59e0b] rounded-xs">
            <span className="font-bold block mb-1">[CATEGORY CHECK FAILED / UNVERIFIED]</span>
            <p className="text-[var(--text-secondary)] font-sans">
              {categoryResult.error ?? 'Public telemetry for this category could not be verified within time limits.'}
            </p>
          </div>
        )}

        {categoryResult?.status === 'completed' && data && (
          <div className="space-y-4 font-mono text-xs">
            {/* DNS Tab */}
            {activeTab === 'dns' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] block">
                    A / AAAA Records (Resolved IPs)
                  </span>
                  {Array.isArray(data.addresses) && data.addresses.length > 0 ? (
                    <div className="space-y-1">
                      {(data.addresses as string[]).map((ip, i) => (
                        <div key={i} className="text-[var(--text-primary)] font-mono">{ip}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">No IPv4 addresses observed</span>
                  )}
                  {Array.isArray(data.aaaa) && data.aaaa.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-[var(--border-muted)]">
                      {(data.aaaa as string[]).map((ip, i) => (
                        <div key={i} className="text-[var(--text-primary)] font-mono">{ip}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] block">
                    Authoritative Nameservers (NS)
                  </span>
                  {Array.isArray(data.ns) && data.ns.length > 0 ? (
                    <div className="space-y-1">
                      {(data.ns as string[]).map((ns, i) => (
                        <div key={i} className="text-[var(--text-primary)] font-mono">{ns}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">No NS records reported</span>
                  )}
                </div>

                <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#d97706] dark:text-[#f59e0b] block">
                    Mail Exchangers (MX)
                  </span>
                  {Array.isArray(data.mx) && data.mx.length > 0 ? (
                    <div className="space-y-1">
                      {(data.mx as Array<{ exchange?: string; priority?: number }>).map((mx, i) => (
                        <div key={i} className="text-[var(--text-primary)] font-mono">
                          {typeof mx === 'object' ? `${mx.exchange} (pri: ${mx.priority})` : String(mx)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">No MX records reported</span>
                  )}
                </div>

                <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#2ee59d] block">
                    Email Security Policies (SPF / DMARC)
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">SPF Record:</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {(data.spf as { record?: string })?.record ? 'Published' : 'Missing'}
                      </span>
                    </div>
                    {(data.spf as { record?: string })?.record && (
                      <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-panel)] p-2 rounded-xs border border-[var(--border-muted)] break-all font-mono">
                        {(data.spf as { record?: string }).record}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border-muted)]">
                      <span className="text-[var(--text-secondary)]">DMARC Policy:</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {(data.dmarc as { record?: string })?.record ? 'Published' : 'Missing'}
                      </span>
                    </div>
                    {(data.dmarc as { record?: string })?.record && (
                      <p className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-panel)] p-2 rounded-xs border border-[var(--border-muted)] break-all font-mono">
                        {(data.dmarc as { record?: string }).record}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* HTTP Tab */}
            {activeTab === 'http' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] block">
                      HTTP &rarr; HTTPS Redirection
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Enforced:</span>
                      <span className={data.httpsEnforced ? 'text-[#16a34a] dark:text-[#2ee59d] font-bold' : 'text-[#d97706] dark:text-[#f59e0b] font-bold'}>
                        {data.httpsEnforced ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Final URL:</span>
                      <span className="text-[var(--text-primary)] truncate max-w-[200px]" title={String(data.finalObservedUrl || '')}>
                        {String(data.finalObservedUrl || 'N/A')}
                      </span>
                    </div>
                  </div>

                  <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#2ee59d] block">
                      Observed Defense Headers
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">HSTS:</span>
                        <span className={(data.headers as Record<string, string>)?.[`strict-transport-security`] ? 'text-[#16a34a] dark:text-[#2ee59d]' : 'text-[var(--text-muted)]'}>
                          {(data.headers as Record<string, string>)?.[`strict-transport-security`] ? 'Active' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">CSP:</span>
                        <span className={(data.headers as Record<string, string>)?.[`content-security-policy`] ? 'text-[#16a34a] dark:text-[#2ee59d]' : 'text-[var(--text-muted)]'}>
                          {(data.headers as Record<string, string>)?.[`content-security-policy`] ? 'Active' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">X-Content-Type:</span>
                        <span className={(data.headers as Record<string, string>)?.[`x-content-type-options`] ? 'text-[#16a34a] dark:text-[#2ee59d]' : 'text-[var(--text-muted)]'}>
                          {(data.headers as Record<string, string>)?.[`x-content-type-options`] ? 'Active' : 'Missing'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {Boolean(data.headers && typeof data.headers === 'object') && (
                  <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                      All Observable Response Headers
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {Object.entries(data.headers as Record<string, string>).map(([h, v]) => (
                        <div key={h} className="flex justify-between gap-4 py-0.5 border-b border-[var(--border-muted)] text-[11px]">
                          <span className="text-[var(--accent-primary)] shrink-0 font-mono">{h}:</span>
                          <span className="text-[var(--text-secondary)] truncate text-right font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TLS Tab */}
            {activeTab === 'tls' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6] block">
                    Handshake &amp; Cipher Suite
                  </span>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Protocol:</span>
                    <span className="text-[var(--text-primary)] font-bold">{String(data.protocol || 'N/A')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Available:</span>
                    <span className={data.available ? 'text-[#16a34a] dark:text-[#2ee59d] font-bold' : 'text-[#dc2626] dark:text-[#ef4444] font-bold'}>
                      {data.available ? 'ESTABLISHED' : 'UNAVAILABLE'}
                    </span>
                  </div>
                </div>

                <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b5cf6] block">
                    Certificate Details
                  </span>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Issuer:</span>
                    <span className="text-[var(--text-primary)] truncate max-w-[200px]" title={String(data.issuer || '')}>
                      {String(data.issuer || 'N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Valid To:</span>
                    <span className="text-[var(--text-primary)]">{String(data.validTo || 'N/A')}</span>
                  </div>
                  {Boolean(data.fingerprint256) && (
                    <div className="pt-1">
                      <span className="text-[10px] text-[var(--text-muted)] block">SHA256 Fingerprint:</span>
                      <span className="text-[10px] text-[var(--text-secondary)] break-all font-mono">{String(data.fingerprint256)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subdomains (CT) Tab */}
            {activeTab === 'subdomains' && (
              <div className="console-panel-inset p-3.5 space-y-3 rounded-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#2ee59d] block">
                  Certificate Transparency Log Discoveries
                </span>
                {Array.isArray(data.subdomains) && data.subdomains.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(data.subdomains as Array<{ name?: string } | string>).map((sub, i) => {
                      const name = typeof sub === 'object' && sub !== null ? sub.name : String(sub);
                      return (
                        <div key={i} className="console-panel p-2 text-[11px] text-[var(--text-primary)] truncate font-mono rounded-xs" title={name}>
                          {name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[var(--text-muted)]">No subdomains harvested from CT logs</span>
                )}
              </div>
            )}

            {/* WHOIS Tab */}
            {activeTab === 'whois' && (
              <div className="console-panel-inset p-3.5 space-y-2 rounded-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] block">
                  Domain Registration Records
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Registrar:</span>
                    <span className="text-[var(--text-primary)]">{String(data.registrar || 'Private / Not Published')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Creation Date:</span>
                    <span className="text-[var(--text-primary)]">{String(data.creationDate || 'N/A')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Expiration Date:</span>
                    <span className="text-[var(--text-primary)]">{String(data.expirationDate || 'N/A')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Public Exposure Tab */}
            {activeTab === 'exposure' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="console-panel-inset p-3 space-y-1 rounded-xs">
                  <span className="text-[10px] text-[var(--text-secondary)] block">ROBOTS.TXT</span>
                  <span className={data.robotsTxtObserved ? 'text-[#16a34a] dark:text-[#2ee59d] font-bold' : 'text-[var(--text-muted)]'}>
                    {data.robotsTxtObserved ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
                <div className="console-panel-inset p-3 space-y-1 rounded-xs">
                  <span className="text-[10px] text-[var(--text-secondary)] block">SITEMAP.XML</span>
                  <span className={data.sitemapXmlObserved ? 'text-[#16a34a] dark:text-[#2ee59d] font-bold' : 'text-[var(--text-muted)]'}>
                    {data.sitemapXmlObserved ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
                <div className="console-panel-inset p-3 space-y-1 rounded-xs">
                  <span className="text-[10px] text-[var(--text-secondary)] block">SECURITY.TXT</span>
                  <span className={data.securityTxtObserved ? 'text-[#16a34a] dark:text-[#2ee59d] font-bold' : 'text-[var(--text-muted)]'}>
                    {data.securityTxtObserved ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
