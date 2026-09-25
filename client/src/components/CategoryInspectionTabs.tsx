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
    <div className="console-panel overflow-hidden space-y-0">
      {/* ─── Tab Navigation Header ───────────────────────────────────── */}
      <div className="flex border-b border-[#1f2735] bg-[#111620] overflow-x-auto font-mono text-xs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const status = scan.categories[tab.id]?.status;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 whitespace-nowrap transition border-b-2 ${
                isActive
                  ? 'border-[#388bfd] text-[#58a6ff] bg-[#161c28] font-bold'
                  : 'border-transparent text-[#9aa5b8] hover:text-[#e6edf3] hover:bg-[#161c28]/40'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-[#58a6ff]' : 'text-[#626e82]'} />
              <span>{tab.label}</span>
              <span
                className={`ml-1 h-1.5 w-1.5 rounded-full ${
                  status === 'completed'
                    ? 'bg-[#3fb950]'
                    : status === 'running'
                    ? 'bg-[#58a6ff] animate-ping'
                    : status === 'failed'
                    ? 'bg-[#d29922]'
                    : 'bg-[#626e82]'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* ─── Tab Content Area ────────────────────────────────────────── */}
      <div className="p-4 sm:p-5">
        {categoryResult?.status === 'running' && (
          <div className="p-12 text-center font-mono text-xs text-[#58a6ff]">
            [QUERY RUNNING]: Inspection in progress for {activeTab.toUpperCase()}…
          </div>
        )}

        {categoryResult?.status === 'failed' && (
          <div className="console-panel-inset border-l-2 border-l-[#d29922] p-4 text-xs font-mono text-[#d29922]">
            <span className="font-bold block mb-1">[CATEGORY CHECK FAILED / UNVERIFIED]</span>
            <p className="text-[#9aa5b8] font-sans">
              {categoryResult.error ?? 'Public telemetry for this category could not be verified within time limits.'}
            </p>
          </div>
        )}

        {categoryResult?.status === 'completed' && data && (
          <div className="space-y-4 font-mono text-xs">
            {/* DNS Tab */}
            {activeTab === 'dns' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="console-panel-inset p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] block">
                    A / AAAA Records (Resolved IPs)
                  </span>
                  {Array.isArray(data.addresses) && data.addresses.length > 0 ? (
                    <div className="space-y-1">
                      {(data.addresses as string[]).map((ip, i) => (
                        <div key={i} className="text-[#e6edf3]">{ip}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#626e82]">No IPv4 addresses observed</span>
                  )}
                  {Array.isArray(data.aaaa) && data.aaaa.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-[#1f2735]">
                      {(data.aaaa as string[]).map((ip, i) => (
                        <div key={i} className="text-[#e6edf3]">{ip}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="console-panel-inset p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] block">
                    Authoritative Nameservers (NS)
                  </span>
                  {Array.isArray(data.ns) && data.ns.length > 0 ? (
                    <div className="space-y-1">
                      {(data.ns as string[]).map((ns, i) => (
                        <div key={i} className="text-[#e6edf3]">{ns}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#626e82]">No NS records reported</span>
                  )}
                </div>

                <div className="console-panel-inset p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#d29922] block">
                    Mail Exchangers (MX)
                  </span>
                  {Array.isArray(data.mx) && data.mx.length > 0 ? (
                    <div className="space-y-1">
                      {(data.mx as Array<{ exchange?: string; priority?: number }>).map((mx, i) => (
                        <div key={i} className="text-[#e6edf3]">
                          {typeof mx === 'object' ? `${mx.exchange} (pri: ${mx.priority})` : String(mx)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#626e82]">No MX records reported</span>
                  )}
                </div>

                <div className="console-panel-inset p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#3fb950] block">
                    Email Security Policies (SPF / DMARC)
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9aa5b8]">SPF Record:</span>
                      <span className="font-bold text-[#e6edf3]">
                        {(data.spf as { record?: string })?.record ? 'Published' : 'Missing'}
                      </span>
                    </div>
                    {(data.spf as { record?: string })?.record && (
                      <p className="text-[11px] text-[#9aa5b8] bg-[#0b0e14] p-2 rounded border border-[#1f2735] break-all">
                        {(data.spf as { record?: string }).record}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-[#1f2735]">
                      <span className="text-[#9aa5b8]">DMARC Policy:</span>
                      <span className="font-bold text-[#e6edf3]">
                        {(data.dmarc as { record?: string })?.record ? 'Published' : 'Missing'}
                      </span>
                    </div>
                    {(data.dmarc as { record?: string })?.record && (
                      <p className="text-[11px] text-[#9aa5b8] bg-[#0b0e14] p-2 rounded border border-[#1f2735] break-all">
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
                  <div className="console-panel-inset p-3.5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] block">
                      HTTP → HTTPS Redirection
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[#9aa5b8]">Enforced:</span>
                      <span className={data.httpsEnforced ? 'text-[#3fb950] font-bold' : 'text-[#d29922] font-bold'}>
                        {data.httpsEnforced ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#9aa5b8]">Final URL:</span>
                      <span className="text-[#e6edf3] truncate max-w-[200px]" title={String(data.finalObservedUrl || '')}>
                        {String(data.finalObservedUrl || 'N/A')}
                      </span>
                    </div>
                  </div>

                  <div className="console-panel-inset p-3.5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#3fb950] block">
                      Observed Defense Headers
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-[#9aa5b8]">HSTS:</span>
                        <span className={(data.headers as Record<string, string>)?.[`strict-transport-security`] ? 'text-[#3fb950]' : 'text-[#626e82]'}>
                          {(data.headers as Record<string, string>)?.[`strict-transport-security`] ? 'Active' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9aa5b8]">CSP:</span>
                        <span className={(data.headers as Record<string, string>)?.[`content-security-policy`] ? 'text-[#3fb950]' : 'text-[#626e82]'}>
                          {(data.headers as Record<string, string>)?.[`content-security-policy`] ? 'Active' : 'Missing'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#9aa5b8]">X-Content-Type:</span>
                        <span className={(data.headers as Record<string, string>)?.[`x-content-type-options`] ? 'text-[#3fb950]' : 'text-[#626e82]'}>
                          {(data.headers as Record<string, string>)?.[`x-content-type-options`] ? 'Active' : 'Missing'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {Boolean(data.headers && typeof data.headers === 'object') && (
                  <div className="console-panel-inset p-3.5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#9aa5b8] block">
                      All Observable Response Headers
                    </span>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {Object.entries(data.headers as Record<string, string>).map(([h, v]) => (
                        <div key={h} className="flex justify-between gap-4 py-0.5 border-b border-[#1f2735] text-[11px]">
                          <span className="text-[#58a6ff] shrink-0">{h}:</span>
                          <span className="text-[#9aa5b8] truncate text-right">{v}</span>
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
                <div className="console-panel-inset p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a63d2] block">
                    Handshake & Cipher Suite
                  </span>
                  <div className="flex justify-between">
                    <span className="text-[#9aa5b8]">Protocol:</span>
                    <span className="text-[#e6edf3] font-bold">{String(data.protocol || 'N/A')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa5b8]">Available:</span>
                    <span className={data.available ? 'text-[#3fb950] font-bold' : 'text-[#f85149] font-bold'}>
                      {data.available ? 'ESTABLISHED' : 'UNAVAILABLE'}
                    </span>
                  </div>
                </div>

                <div className="console-panel-inset p-3.5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a63d2] block">
                    Certificate Details
                  </span>
                  <div className="flex justify-between">
                    <span className="text-[#9aa5b8]">Issuer:</span>
                    <span className="text-[#e6edf3] truncate max-w-[200px]" title={String(data.issuer || '')}>
                      {String(data.issuer || 'N/A')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa5b8]">Valid To:</span>
                    <span className="text-[#e6edf3]">{String(data.validTo || 'N/A')}</span>
                  </div>
                  {Boolean(data.fingerprint256) && (
                    <div className="pt-1">
                      <span className="text-[10px] text-[#626e82] block">SHA256 Fingerprint:</span>
                      <span className="text-[10px] text-[#9aa5b8] break-all">{String(data.fingerprint256)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subdomains (CT) Tab */}
            {activeTab === 'subdomains' && (
              <div className="console-panel-inset p-3.5 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3fb950] block">
                  Certificate Transparency Log Discoveries
                </span>
                {Array.isArray(data.subdomains) && data.subdomains.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(data.subdomains as Array<{ name?: string } | string>).map((sub, i) => {
                      const name = typeof sub === 'object' && sub !== null ? sub.name : String(sub);
                      return (
                        <div key={i} className="console-panel p-2 text-[11px] text-[#e6edf3] truncate" title={name}>
                          {name}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-[#626e82]">No subdomains harvested from CT logs</span>
                )}
              </div>
            )}

            {/* WHOIS Tab */}
            {activeTab === 'whois' && (
              <div className="console-panel-inset p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] block">
                  Domain Registration Records
                </span>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#9aa5b8]">Registrar:</span>
                    <span className="text-[#e6edf3]">{String(data.registrar || 'Private / Not Published')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa5b8]">Creation Date:</span>
                    <span className="text-[#e6edf3]">{String(data.creationDate || 'N/A')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9aa5b8]">Expiration Date:</span>
                    <span className="text-[#e6edf3]">{String(data.expirationDate || 'N/A')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Public Exposure Tab */}
            {activeTab === 'exposure' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="console-panel-inset p-3 space-y-1">
                  <span className="text-[10px] text-[#9aa5b8] block">ROBOTS.TXT</span>
                  <span className={data.robotsTxtObserved ? 'text-[#3fb950] font-bold' : 'text-[#626e82]'}>
                    {data.robotsTxtObserved ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
                <div className="console-panel-inset p-3 space-y-1">
                  <span className="text-[10px] text-[#9aa5b8] block">SITEMAP.XML</span>
                  <span className={data.sitemapXmlObserved ? 'text-[#3fb950] font-bold' : 'text-[#626e82]'}>
                    {data.sitemapXmlObserved ? 'OBSERVED' : 'NOT OBSERVED'}
                  </span>
                </div>
                <div className="console-panel-inset p-3 space-y-1">
                  <span className="text-[10px] text-[#9aa5b8] block">SECURITY.TXT</span>
                  <span className={data.securityTxtObserved ? 'text-[#3fb950] font-bold' : 'text-[#626e82]'}>
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
