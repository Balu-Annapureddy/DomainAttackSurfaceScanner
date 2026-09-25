import type { DomainScan, ScanCategory } from '../../../shared/types';

interface ScanProgressStepperProps {
  categories: DomainScan['categories'];
  activeCategory?: ScanCategory;
  onSelectCategory?: (category: ScanCategory) => void;
}

const PIPELINE_ITEMS: Array<{
  key: ScanCategory;
  id: string;
  name: string;
}> = [
  { key: 'whois', id: '01', name: 'WHOIS' },
  { key: 'dns', id: '02', name: 'DNS' },
  { key: 'subdomains', id: '03', name: 'CT LOGS' },
  { key: 'tls', id: '04', name: 'TLS' },
  { key: 'http', id: '05', name: 'HTTP' },
  { key: 'exposure', id: '06', name: 'EXPOSURE' },
  { key: 'scoring', id: '07', name: 'HYGIENE' },
];

export default function ScanProgressStepper({
  categories,
  activeCategory,
  onSelectCategory,
}: ScanProgressStepperProps) {
  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] p-3 sm:p-3.5 overflow-x-auto rounded-xl shadow-xs">
      <div className="flex items-center min-w-[720px] gap-3">
        <div className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase pr-3 border-r border-[var(--border-muted)] shrink-0 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          <span>PIPELINE</span>
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 text-xs">
          {PIPELINE_ITEMS.map((item) => {
            const status = categories[item.key]?.status ?? 'pending';
            const isSelected = activeCategory === item.key;

            let symbol = '·';
            let symbolColor = 'text-[var(--text-muted)]';
            let bgClass = 'bg-[var(--bg-panel-inset)] border-[var(--border-muted)] text-[var(--text-secondary)]';

            if (status === 'completed') {
              symbol = '✓';
              symbolColor = 'text-[#16a34a] dark:text-[#2ee59d]';
              bgClass = 'bg-[var(--bg-panel-subtle)] border-[#16a34a]/30 dark:border-[#2ee59d]/30 text-[var(--text-primary)]';
            } else if (status === 'running') {
              symbol = '►';
              symbolColor = 'text-[var(--accent-primary)] animate-pulse';
              bgClass = 'bg-[var(--accent-active-bg)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold';
            } else if (status === 'failed') {
              symbol = '!';
              symbolColor = 'text-[#d97706] dark:text-[#f59e0b]';
              bgClass = 'bg-[var(--bg-panel-inset)] border-[#d97706]/40 text-[var(--text-secondary)]';
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectCategory?.(item.key)}
                className={`flex items-center justify-between px-2.5 py-1.5 border text-left cursor-pointer transition rounded-lg ${bgClass} ${
                  isSelected ? 'ring-2 ring-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--accent-active-bg)]' : 'hover:border-[var(--accent-primary)]'
                }`}
                title={`Pipeline Stage: ${item.name} (${status})`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">{item.id}</span>
                  <span className="font-medium text-xs truncate">{item.name}</span>
                </div>
                <span className={`font-bold ${symbolColor} text-xs ml-1 shrink-0`}>{symbol}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
