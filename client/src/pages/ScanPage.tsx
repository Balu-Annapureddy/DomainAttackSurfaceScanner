import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock3,
  ArrowLeft,
  XCircle,
  RotateCw,
  GitFork,
  Layers,
  AlertTriangle,
  FileText,
  Network,
  Sparkles,
  SlidersHorizontal,
  MapPin,
  ListTree,
} from 'lucide-react';
import { getScan } from '../lib/api';
import type { DomainScan, Asset, ScanCategory } from '../../../shared/types';
import ScanOverviewCard from '../components/ScanOverviewCard';
import ScanProgressStepper from '../components/ScanProgressStepper';
import InfrastructureMap from '../components/InfrastructureMap';
import AttackSurfaceGraph from '../components/AttackSurfaceGraph';
import FindingsSection from '../components/FindingsSection';
import AssetsInventoryTable from '../components/AssetsInventoryTable';
import CategoryInspectionTabs from '../components/CategoryInspectionTabs';
import AssetDetailModal from '../components/AssetDetailModal';
import AssetChainVisualizer from '../components/AssetChainVisualizer';
import GlossaryModal from '../components/GlossaryModal';
import WorkstationNav from '../components/WorkstationNav';

type ActiveViewTab = 'graph' | 'map' | 'chains' | 'inventory' | 'findings' | 'raw' | 'all';

export default function ScanPage() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<ActiveViewTab>('graph');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<ScanCategory>('dns');
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [glossaryInitialTerm, setGlossaryInitialTerm] = useState<string>('passive_osint');
  const [isGuidedMode, setIsGuidedMode] = useState<boolean>(() => {
    return localStorage.getItem('dass_guided_mode') !== 'false';
  });

  const toggleGuidedMode = () => {
    setIsGuidedMode((prev) => {
      const next = !prev;
      localStorage.setItem('dass_guided_mode', String(next));
      return next;
    });
  };

  const openGlossary = (termKey?: string) => {
    setGlossaryInitialTerm(termKey || 'passive_osint');
    setIsGlossaryOpen(true);
  };

  useEffect(() => {
    if (!scanId) return;

    let active = true;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const current = await getScan(scanId);
        if (!active) return;
        setScan(current);
        setLoading(false);
        setError(null);

        // Enrich browser localStorage history with scan metrics
        try {
          const stored = JSON.parse(localStorage.getItem('domain_scanner_scans') || '[]') as Array<{
            scanId: string;
            domain: string;
            createdAt: string;
            status?: string;
            score?: number | null;
            assetCount?: number;
            findingCount?: number;
            warningsCount?: number;
          }>;
          const updated = stored.map((item) => {
            if (item.scanId === current.scanId) {
              return {
                ...item,
                status: current.status,
                score: current.score,
                assetCount: current.assets?.length ?? 0,
                findingCount: current.findings?.length ?? 0,
                warningsCount: current.warnings?.length ?? 0,
              };
            }
            return item;
          });
          localStorage.setItem('domain_scanner_scans', JSON.stringify(updated));
        } catch {
          // Ignore localStorage errors
        }

        if (current.status !== 'running') {
          return;
        }
        timer = window.setTimeout(() => {
          void poll();
        }, 2000);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load scan');
        setLoading(false);
      }
    };

    void poll();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [scanId]);

  const handleCategorySelectFromStepper = (category: ScanCategory) => {
    setSelectedCategoryTab(category);
    setActiveViewTab('raw');
  };

  if (!scanId || error || (!scan && !loading)) {
    return (
      <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4 font-mono transition-colors">
        <div className="max-w-md console-panel p-6 text-center space-y-3">
          <XCircle size={28} className="mx-auto text-red-500" />
          <h1 className="text-sm font-bold tracking-wider">SCAN RECORD UNAVAILABLE</h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {error ?? 'The requested scan could not be found or has expired from memory.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Link to="/" className="console-btn console-btn-primary text-xs">
              <ArrowLeft size={12} />
              <span>RETURN TO CONSOLE</span>
            </Link>
            <Link to="/scan/sample" className="console-btn text-xs text-[var(--accent-primary)]">
              <Sparkles size={11} />
              <span>VIEW SAMPLE SCAN</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !scan) {
    return (
      <main className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center font-mono transition-colors">
        <div className="console-panel p-6 text-center space-y-2">
          <div className="mx-auto h-6 w-6 animate-spin border-2 border-[var(--border-technical)] border-t-[var(--accent-primary)] rounded-full" />
          <p className="text-xs text-[var(--text-primary)] font-bold tracking-wider">INITIALIZING WORKSTATION TELEMETRY…</p>
          <p className="text-[11px] text-[var(--text-muted)]">Querying public reconnaissance pipelines</p>
        </div>
      </main>
    );
  }

  if (!scan) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-12 font-sans w-full transition-colors duration-150 flex flex-col">
      <WorkstationNav onOpenGlossary={openGlossary} />

      {/* ─── Modern Security Workstation Sub-Header ────────────── */}
      <div className="border-b border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] px-4 sm:px-8 py-3 text-xs">
        <div className="mx-auto flex max-w-[1720px] flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-extrabold text-sm sm:text-base text-[var(--accent-primary)] truncate max-w-[280px] sm:max-w-md">
              TARGET: {scan.domain}
            </span>
            <span className="text-[var(--border-muted)] hidden sm:inline">•</span>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-mono">
              <span className="console-tag font-bold text-[var(--accent-primary)]">PASSIVE-EXTERNAL</span>
              <span className="text-[var(--text-muted)]">SCAN_ID: {scan.scanId.slice(0, 8)}…</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={toggleGuidedMode}
              className={`console-btn py-1.5 px-3 text-xs font-semibold rounded-lg ${
                isGuidedMode ? 'border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-active-bg)]' : 'text-[var(--text-secondary)]'
              }`}
              title="Toggle guided interpretation vs raw technical dossier"
            >
              <SlidersHorizontal size={13} />
              <span>{isGuidedMode ? 'MODE: GUIDED' : 'MODE: RAW'}</span>
            </button>

            <Link
              to={`/report/${encodeURIComponent(scan.scanId)}`}
              className="console-btn console-btn-primary py-1.5 px-3.5 text-xs font-bold rounded-lg"
            >
              <FileText size={13} />
              <span>FULL DOSSIER</span>
            </Link>

            <Link to="/history" className="console-btn py-1.5 px-3 text-xs text-[var(--text-secondary)] rounded-lg">
              <Clock3 size={13} />
              <span className="hidden sm:inline">HISTORY</span>
            </Link>

            <Link to="/" className="console-btn console-btn-phosphor py-1.5 px-3 text-xs font-bold rounded-lg">
              <RotateCw size={13} />
              <span>NEW SCAN</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main Workstation Layout ─────────────────────────────────── */}
      <div className="mx-auto max-w-[1720px] px-4 sm:px-8 pt-6 space-y-8 sm:space-y-10">
        {/* Compact Pipeline Stepper */}
        <ScanProgressStepper
          categories={scan.categories}
          activeCategory={activeViewTab === 'raw' ? selectedCategoryTab : undefined}
          onSelectCategory={handleCategorySelectFromStepper}
        />

        {/* Dense Telemetry Strip */}
        <ScanOverviewCard
          scan={scan}
          onOpenGlossary={openGlossary}
          isGuidedMode={isGuidedMode}
        />

        {/* ─── Operational View Tabs ─────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2">
          <button
            onClick={() => setActiveViewTab('graph')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap shadow-xs ${
              activeViewTab === 'graph'
                ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md ring-2 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <GitFork size={14} />
            <span>Relationship Graph</span>
          </button>

          <button
            onClick={() => setActiveViewTab('map')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap shadow-xs ${
              activeViewTab === 'map'
                ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md ring-2 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <MapPin size={14} />
            <span>Infrastructure Map</span>
          </button>

          <button
            onClick={() => setActiveViewTab('chains')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap shadow-xs ${
              activeViewTab === 'chains'
                ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md ring-2 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <Network size={14} />
            <span>Routing Chains</span>
          </button>

          <button
            onClick={() => setActiveViewTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap shadow-xs ${
              activeViewTab === 'inventory'
                ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md ring-2 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <Layers size={14} />
            <span>Asset Inventory</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeViewTab === 'inventory' ? 'bg-white/20 text-white' : 'bg-[var(--bg-panel-inset)] text-[var(--accent-primary)]'
            }`}>
              {scan.assets?.length ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveViewTab('findings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap shadow-xs ${
              activeViewTab === 'findings'
                ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md ring-2 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <AlertTriangle size={14} />
            <span>Findings</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeViewTab === 'findings' ? 'bg-white/20 text-white' : 'bg-[var(--bg-panel-inset)] text-[#d97706] dark:text-[#f59e0b]'
            }`}>
              {scan.findings?.length ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveViewTab('raw')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap shadow-xs ${
              activeViewTab === 'raw'
                ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md ring-2 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <FileText size={14} />
            <span>Raw Telemetry</span>
          </button>

          <button
            onClick={() => setActiveViewTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition whitespace-nowrap shadow-xs ${
              activeViewTab === 'all'
                ? 'bg-[var(--accent-primary)] text-white font-bold shadow-md ring-2 ring-[var(--accent-glow)]'
                : 'bg-[var(--bg-panel)] border border-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
            }`}
          >
            <ListTree size={14} />
            <span>All Dossier Sections</span>
          </button>
        </div>

        {/* ─── Primary View 1: Topology Graph (Default) ──────────────── */}
        {activeViewTab === 'graph' && (
          <div className="w-full">
            <AttackSurfaceGraph
              sectionNumber="03"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 2: Infrastructure Map */}
        {activeViewTab === 'map' && (
          <div className="w-full">
            <InfrastructureMap
              sectionNumber="04"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 3: Routing Chains */}
        {activeViewTab === 'chains' && (
          <div className="w-full">
            <AssetChainVisualizer
              sectionNumber="05"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 4: Inventory Table */}
        {activeViewTab === 'inventory' && (
          <div className="w-full">
            <AssetsInventoryTable
              sectionNumber="06"
              assets={scan.assets ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* Primary View 5: Findings Records */}
        {activeViewTab === 'findings' && (
          <div className="w-full">
            <FindingsSection
              sectionNumber="07"
              findings={scan.findings ?? []}
              onOpenGlossary={openGlossary}
            />
          </div>
        )}

        {/* Primary View 6: Raw Telemetry */}
        {activeViewTab === 'raw' && (
          <div className="w-full">
            <CategoryInspectionTabs
              scan={scan}
              defaultCategory={selectedCategoryTab}
            />
          </div>
        )}

        {/* Primary View 7: All Dossier Sections Sequentially */}
        {activeViewTab === 'all' && (
          <div className="space-y-10 sm:space-y-12 w-full">
            <AttackSurfaceGraph
              sectionNumber="03"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <InfrastructureMap
              sectionNumber="04"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <AssetChainVisualizer
              sectionNumber="05"
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <AssetsInventoryTable
              sectionNumber="06"
              assets={scan.assets ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
            <FindingsSection
              sectionNumber="07"
              findings={scan.findings ?? []}
              onOpenGlossary={openGlossary}
            />
          </div>
        )}
      </div>

      {/* Asset Detail & Evidence Modal */}
      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          assets={scan.assets ?? []}
          relationships={scan.relationships ?? []}
          onClose={() => setSelectedAsset(null)}
          onSelectRelatedAsset={(nextAsset) => setSelectedAsset(nextAsset)}
        />
      )}

      {/* Security Field Manual Modal */}
      <GlossaryModal
        initialTermKey={glossaryInitialTerm}
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />

      {/* ─── Compact Legal Footer ─────────────────────────────────── */}
      <footer className="mt-8 border-t border-[var(--border-muted)] bg-[var(--bg-panel-inset)] px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)]">
        <div className="mx-auto max-w-[1720px] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DOMAIN ATTACK SURFACE SCANNER // RECONNAISSANCE CONSOLE</span>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/privacy" className="hover:text-[var(--text-primary)] transition-colors">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-[var(--text-primary)] transition-colors">TERMS OF USE</Link>
            <Link to="/cookies" className="hover:text-[var(--text-primary)] transition-colors">COOKIE POLICY</Link>
            <Link to="/billing" className="hover:text-[var(--text-primary)] transition-colors">BILLING &amp; REFUNDS</Link>
            <Link to="/security" className="hover:text-[var(--text-primary)] transition-colors">SECURITY &amp; AUTHORIZED USE</Link>
            <a
              href="https://github.com/Balu-Annapureddy/DomainAttackSurfaceScanner"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              GITHUB
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
