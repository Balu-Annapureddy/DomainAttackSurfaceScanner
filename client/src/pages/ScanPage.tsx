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

      {/* ─── Ultra-Compact Security Workstation Sub-Header ────────────── */}
      <div className="border-b border-[var(--border-technical)] bg-[var(--bg-panel-subtle)] px-3 sm:px-5 py-1.5 font-mono text-xs">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[var(--accent-primary)] truncate max-w-[200px] sm:max-w-md">
              TARGET: {scan.domain}
            </span>
            <span className="text-[var(--border-muted)] hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <span className="text-[var(--accent-primary)] font-semibold">PASSIVE-EXTERNAL</span>
              <span>•</span>
              <span className="text-[var(--text-muted)]">ID: {scan.scanId.slice(0, 8)}…</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={toggleGuidedMode}
              className={`console-btn py-0.5 px-2 text-[10px] ${
                isGuidedMode ? 'border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
              }`}
              title="Toggle guided interpretation vs raw technical dossier"
            >
              <SlidersHorizontal size={10} />
              <span>{isGuidedMode ? 'GUIDED' : 'TECH'}</span>
            </button>

            <Link
              to={`/report/${encodeURIComponent(scan.scanId)}`}
              className="console-btn console-btn-primary py-0.5 px-2 text-[10px]"
            >
              <FileText size={10} />
              <span>DOSSIER</span>
            </Link>

            <Link to="/history" className="console-btn py-0.5 px-2 text-[10px] text-[var(--text-secondary)]">
              <Clock3 size={10} />
              <span className="hidden sm:inline">HISTORY</span>
            </Link>

            <Link to="/" className="console-btn console-btn-phosphor py-0.5 px-2 text-[10px]">
              <RotateCw size={10} />
              <span>NEW SCAN</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main Workstation Layout ─────────────────────────────────── */}
      <div className="mx-auto max-w-[1720px] px-3 sm:px-5 pt-3 space-y-2.5">
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
        <div className="flex border-b border-[var(--border-technical)] gap-1 overflow-x-auto font-mono text-xs pt-1">
          <button
            onClick={() => setActiveViewTab('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'graph'
                ? 'border-[var(--border-technical)] bg-[var(--bg-panel)] text-[var(--accent-primary)] font-bold shadow-xs'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
            }`}
          >
            <GitFork size={12} />
            <span>[RELATIONSHIP GRAPH]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'map'
                ? 'border-[var(--border-technical)] bg-[var(--bg-panel)] text-[var(--accent-primary)] font-bold shadow-xs'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
            }`}
          >
            <MapPin size={12} />
            <span>[INFRASTRUCTURE MAP]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('chains')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'chains'
                ? 'border-[var(--border-technical)] bg-[var(--bg-panel)] text-[var(--accent-primary)] font-bold shadow-xs'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
            }`}
          >
            <Network size={12} />
            <span>[ROUTING CHAINS]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'inventory'
                ? 'border-[var(--border-technical)] bg-[var(--bg-panel)] text-[var(--accent-primary)] font-bold shadow-xs'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
            }`}
          >
            <Layers size={12} />
            <span>[ASSET INVENTORY ({scan.assets?.length ?? 0})]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('findings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'findings'
                ? 'border-[var(--border-technical)] bg-[var(--bg-panel)] text-[var(--accent-primary)] font-bold shadow-xs'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
            }`}
          >
            <AlertTriangle size={12} />
            <span>[FINDINGS ({scan.findings?.length ?? 0})]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'raw'
                ? 'border-[var(--border-technical)] bg-[var(--bg-panel)] text-[var(--accent-primary)] font-bold shadow-xs'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
            }`}
          >
            <FileText size={12} />
            <span>[RAW TELEMETRY]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 border-t border-x cursor-pointer transition ${
              activeViewTab === 'all'
                ? 'border-[var(--border-technical)] bg-[var(--bg-panel)] text-[var(--accent-primary)] font-bold shadow-xs'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-active-bg)]'
            }`}
          >
            <ListTree size={12} />
            <span>[ALL DOSSIER SECTIONS]</span>
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
          <div className="space-y-4 w-full">
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
