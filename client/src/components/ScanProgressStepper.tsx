import { CheckCircle2, Clock, AlertCircle, Loader2, ShieldCheck, Globe, Lock, FileCode, Search, Server, Cpu } from 'lucide-react';
import type { DomainScan, ScanCategory } from '../../../shared/types';

interface ScanProgressStepperProps {
  categories: DomainScan['categories'];
  activeCategory?: ScanCategory;
  onSelectCategory?: (category: ScanCategory) => void;
}

const CATEGORY_META: Record<
  ScanCategory,
  { label: string; icon: React.ComponentType<{ className?: string; size?: number }> }
> = {
  whois: { label: 'WHOIS & Registrar', icon: Search },
  dns: { label: 'DNS Infrastructure', icon: Globe },
  subdomains: { label: 'Certificate Logs', icon: Server },
  tls: { label: 'TLS Cryptography', icon: Lock },
  http: { label: 'HTTP & Headers', icon: FileCode },
  exposure: { label: 'Public Exposure', icon: Cpu },
  scoring: { label: 'Hygiene Score', icon: ShieldCheck },
};

export default function ScanProgressStepper({
  categories,
  activeCategory,
  onSelectCategory,
}: ScanProgressStepperProps) {
  const categoryKeys: ScanCategory[] = ['whois', 'dns', 'subdomains', 'tls', 'http', 'exposure', 'scoring'];

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex min-w-[700px] items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 backdrop-blur-md">
        {categoryKeys.map((key, index) => {
          const item = categories[key];
          const meta = CATEGORY_META[key];
          const Icon = meta.icon;
          const status = item?.status ?? 'pending';
          const isSelected = activeCategory === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectCategory?.(key)}
              className={`group flex flex-1 flex-col items-center rounded-lg p-2.5 text-center transition-all duration-200 ${
                isSelected
                  ? 'border border-cyan-500/40 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="relative mb-2 flex items-center justify-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all ${
                    status === 'completed'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : status === 'running'
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : status === 'failed'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border-slate-800 bg-slate-950/60 text-slate-500'
                  }`}
                >
                  {status === 'running' ? (
                    <Loader2 size={18} className="animate-spin text-cyan-400" />
                  ) : (
                    <Icon size={18} />
                  )}
                </div>

                <div className="absolute -bottom-1 -right-1">
                  {status === 'completed' && (
                    <CheckCircle2 size={13} className="rounded-full bg-slate-900 text-emerald-400" />
                  )}
                  {status === 'failed' && (
                    <AlertCircle size={13} className="rounded-full bg-slate-900 text-amber-400" />
                  )}
                  {status === 'pending' && (
                    <Clock size={12} className="rounded-full bg-slate-900 text-slate-600" />
                  )}
                </div>
              </div>

              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                0{index + 1}
              </span>
              <span className="mt-0.5 text-xs font-medium text-slate-200 group-hover:text-white">
                {meta.label}
              </span>
              <span
                className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${
                  status === 'completed'
                    ? 'text-emerald-400/90'
                    : status === 'running'
                    ? 'animate-pulse text-cyan-400'
                    : status === 'failed'
                    ? 'text-amber-400/90'
                    : 'text-slate-600'
                }`}
              >
                {status}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
