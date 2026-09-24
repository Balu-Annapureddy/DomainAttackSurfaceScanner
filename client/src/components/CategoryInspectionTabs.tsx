import { useState } from 'react';
import { Search, Globe, Server, Lock, FileCode, Cpu, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
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
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-slate-800/80 bg-slate-950/40 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const status = scan.categories[tab.id]?.status;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
                isActive
                  ? 'border-cyan-400 text-white bg-slate-900/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
              <span
                className={`ml-1 h-1.5 w-1.5 rounded-full ${
                  status === 'completed'
                    ? 'bg-emerald-400'
                    : status === 'running'
                    ? 'bg-cyan-400 animate-ping'
                    : status === 'failed'
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="p-5">
        {categoryResult?.status === 'running' && (
          <div className="flex items-center justify-center p-12 text-center text-sm text-cyan-400">
            Inspection in progress for this category…
          </div>
        )}

        {categoryResult?.status === 'failed' && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300">
            <span className="font-semibold block mb-1">Lookup Failed</span>
            {categoryResult.error ?? 'Data for this category was unavailable.'}
          </div>
        )}

        {categoryResult?.status === 'completed' && data && (
          <div className="space-y-4">
            {/* DNS Tab */}
            {activeTab === 'dns' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                    A / AAAA Records (Resolved IPs)
                  </span>
                  {Array.isArray(data.addresses) && data.addresses.length > 0 ? (
                    <div className="space-y-1">
                      {(data.addresses as string[]).map((ip, i) => (
                        <div key={i} className="font-mono text-slate-200">{ip}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500">No IPv4 addresses observed</span>
                  )}
                  {Array.isArray(data.aaaa) && data.aaaa.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-800">
                      {(data.aaaa as string[]).map((ip, i) => (
                        <div key={i} className="font-mono text-slate-200">{ip}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                    Authoritative Nameservers (NS)
                  </span>
                  {Array.isArray(data.ns) && data.ns.length > 0 ? (
                    <div className="space-y-1">
                      {(data.ns as string[]).map((ns, i) => (
                        <div key={i} className="font-mono text-slate-200">{ns}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500">No NS records reported</span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">
                    Mail Exchangers (MX)
                  </span>
                  {Array.isArray(data.mx) && data.mx.length > 0 ? (
                    <div className="space-y-1">
                      {(data.mx as string[]).map((mx, i) => (
                        <div key={i} className="font-mono text-slate-200">{mx}</div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500">No MX records reported</span>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                    Email Security Policies (SPF / DMARC)
                  </span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">SPF Record:</span>
                      <span className="font-semibold text-slate-200">
                        {(data.spf as { present?: boolean })?.present ? 'Published' : 'Missing'}
                      </span>
                    </div>
                    {(data.spf as { policy?: string })?.policy && (
                      <p className="font-mono text-[11px] text-slate-400 bg-slate-900 p-2 rounded">
                        {(data.spf as { policy?: string }).policy}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-300">DMARC Policy:</span>
                      <span className="font-semibold text-slate-200">
                        {(data.dmarc as { policy?: string })?.policy ?? ((data.dmarc as { present?: boolean })?.present ? 'Present' : 'Missing')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HTTP Tab */}
            {activeTab === 'http' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">HTTPS Enforced</span>
                    <span className={`font-bold text-sm ${data.httpsEnforced ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {data.httpsEnforced ? 'Yes (Redirect Verified)' : 'No (Plain HTTP Not Redirected)'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Final Observed URL</span>
                    <span className="font-mono text-slate-200 truncate block">
                      {typeof data.finalObservedUrl === 'string' ? data.finalObservedUrl : 'None'}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">HTTP Port 80 Active</span>
                    <span className="font-bold text-slate-200">
                      {data.httpAvailable ? 'Reachable' : 'Unreachable'}
                    </span>
                  </div>
                </div>

                {/* Redirect Chain */}
                {Array.isArray(data.redirectChain) && data.redirectChain.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                      Redirect Navigation Chain
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {(data.redirectChain as string[]).map((url, i) => (
                        <div key={i} className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800 text-slate-200">
                            {url}
                          </span>
                          {i < (data.redirectChain as string[]).length - 1 && (
                            <ArrowRight size={12} className="text-slate-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TLS Tab */}
            {activeTab === 'tls' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Protocol Version</span>
                    <span className="font-mono font-bold text-slate-200">{String(data.protocol ?? 'TLS')}</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Issuer Authority</span>
                    <span className="font-mono text-slate-200">{String(data.issuer ?? 'Unknown')}</span>
                  </div>
                </div>

                {Boolean(data.fingerprint256) && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-1">SHA-256 Fingerprint Identity</span>
                    <span className="font-mono text-xs text-slate-200 break-all">{String(data.fingerprint256)}</span>
                  </div>
                )}

                {Array.isArray(data.subjectAltNames) && data.subjectAltNames.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Subject Alternative Names (SANs) ({data.subjectAltNames.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(data.subjectAltNames as string[]).map((san, i) => (
                        <span key={i} className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                          {san}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subdomains Tab */}
            {activeTab === 'subdomains' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total CT log subdomains discovered:</span>
                  <span className="font-bold text-white font-mono">{Number(data.total ?? 0)}</span>
                </div>
                {Array.isArray(data.subdomains) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-[350px] overflow-y-auto p-1">
                    {(data.subdomains as string[]).map((sub, i) => (
                      <div key={i} className="font-mono text-xs text-slate-300 bg-slate-950/60 border border-slate-800/80 px-2.5 py-1.5 rounded truncate" title={sub}>
                        {sub}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WHOIS Tab */}
            {activeTab === 'whois' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Registrar</span>
                  <span className="font-medium text-slate-200">{String(data.registrar ?? 'Not reported')}</span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Privacy Status</span>
                  <span className="font-medium text-slate-200 capitalize">{String(data.privacyStatus ?? 'Unknown')}</span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Created Date</span>
                  <span className="font-mono text-slate-200">{String(data.creationDate ?? 'Not reported')}</span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Expiry Date</span>
                  <span className="font-mono text-slate-200">{String(data.expiryDate ?? 'Not reported')}</span>
                </div>
              </div>
            )}

            {/* Exposure Checks Tab */}
            {activeTab === 'exposure' && (
              <div className="space-y-3 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Public Discovery Endpoints
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    (data.checks as Array<{ path: string; status: number; present: boolean }>) ?? [
                      { path: '/robots.txt', status: 0, present: false },
                      { path: '/sitemap.xml', status: 0, present: false },
                      { path: '/.well-known/security.txt', status: 0, present: false },
                    ]
                  ).map((check, i) => (
                    <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold text-slate-200">{check.path}</span>
                        {check.present ? (
                          <CheckCircle2 size={15} className="text-emerald-400" />
                        ) : (
                          <XCircle size={15} className="text-slate-600" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Status: {check.status > 0 ? check.status : 'Not found'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
