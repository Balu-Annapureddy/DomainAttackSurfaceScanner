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
  ShieldCheck,
  BookOpen,
  Network,
  Sparkles,
  SlidersHorizontal,
  Terminal,
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
import ExecutiveSummary from '../components/ExecutiveSummary';
import AssetChainVisualizer from '../components/AssetChainVisualizer';
import GlossaryModal from '../components/GlossaryModal';

type ActiveViewTab = 'surface' | 'chains' | 'summary' | 'inventory' | 'findings' | 'raw';

export default function ScanPage() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<ActiveViewTab>('surface');
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

  const openGlossary = (termKey: string) => {
    setGlossaryInitialTerm(termKey);
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
      <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] flex items-center justify-center p-4 font-mono">
        <div className="max-w-md console-panel p-8 text-center space-y-4">
          <XCircle size={32} className="mx-auto text-[#f85149]" />
          <h1 className="text-base font-bold">SCAN UNAVAILABLE</h1>
          <p className="text-xs text-[#9aa5b8] leading-relaxed">
            {error ?? 'The requested scan could not be found or has expired from memory.'}
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/"
              className="console-btn console-btn-primary text-xs"
            >
              <ArrowLeft size={13} />
              <span>RETURN TO CONSOLE</span>
            </Link>
            <Link
              to="/scan/sample"
              className="console-btn text-xs text-[#58a6ff]"
            >
              <Sparkles size={12} />
              <span>VIEW DEMO SCAN</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !scan) {
    return (
      <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] flex items-center justify-center font-mono">
        <div className="console-panel p-8 text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#388bfd]/30 border-t-[#388bfd]" />
          <p className="text-xs text-[#e6edf3] font-bold">INITIALIZING INTELLIGENCE PIPELINE…</p>
          <p className="text-[11px] text-[#626e82]">Establishing telemetry state</p>
        </div>
      </main>
    );
  }

  if (!scan) return null;

  return (
    <main className="min-h-screen bg-[#0b0e14] text-[#e6edf3] pb-16 selection:bg-[#388bfd]/30 selection:text-[#e6edf3]">
      {/* ─── Global Console Header ───────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[#1f2735] bg-[#111620]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-mono text-sm font-bold tracking-tight text-[#e6edf3] hover:text-[#58a6ff] transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[#388bfd]/40 bg-[#162030] text-[#58a6ff]">
              <Terminal size={15} />
            </div>
            <span>DOMAIN ATTACK SURFACE SCANNER</span>
          </Link>

          <div className="flex items-center gap-2 font-mono text-xs">
            {/* Guided / Technical Mode Toggle */}
            <button
              type="button"
              onClick={toggleGuidedMode}
              className={`console-btn py-1 px-2.5 text-xs transition ${
                isGuidedMode ? 'border-[#388bfd] text-[#58a6ff]' : 'text-[#9aa5b8]'
              }`}
              title="Toggle beginner-friendly explanations and guided cards"
            >
              <SlidersHorizontal size={12} />
              <span className="hidden sm:inline">MODE:</span>{' '}
              <span>{isGuidedMode ? 'GUIDED' : 'TECHNICAL'}</span>
            </button>

            {/* Knowledge Guide */}
            <button
              type="button"
              onClick={() => openGlossary('passive_osint')}
              className="console-btn py-1 px-2.5 text-xs text-[#9aa5b8]"
              title="Open terminology guide and explanations"
            >
              <BookOpen size={12} className="text-[#58a6ff]" />
              <span className="hidden md:inline">GUIDE</span>
            </button>

            {/* Report */}
            <Link
              to={`/report/${scan.scanId}`}
              className="console-btn console-btn-primary py-1 px-2.5 text-xs"
              title="Open full printable intelligence dossier"
            >
              <FileText size={12} />
              <span>REPORT</span>
            </Link>

            {/* History */}
            <Link
              to="/history"
              className="console-btn py-1 px-2.5 text-xs text-[#9aa5b8]"
            >
              <Clock3 size={12} />
              <span className="hidden sm:inline">HISTORY</span>
            </Link>

            {/* New Scan */}
            <Link
              to="/"
              className="console-btn console-btn-phosphor py-1 px-2.5 text-xs"
            >
              <RotateCw size={12} />
              <span>NEW</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Main Content Container ─────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 space-y-5">
        {/* Pipeline Stepper */}
        <ScanProgressStepper
          categories={scan.categories}
          activeCategory={activeViewTab === 'raw' ? selectedCategoryTab : undefined}
          onSelectCategory={handleCategorySelectFromStepper}
        />

        {/* Scan Overview Console Card */}
        <ScanOverviewCard
          scan={scan}
          onOpenGlossary={openGlossary}
          isGuidedMode={isGuidedMode}
        />

        {/* ─── Navigation Tabs for Views ─────────────────────────────── */}
        <div className="flex border-b border-[#1f2735] gap-1 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveViewTab('surface')}
            className={`flex items-center gap-1.5 px-3 py-2 border-t border-x rounded-t transition ${
              activeViewTab === 'surface'
                ? 'border-[#1f2735] bg-[#111620] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6edf3] hover:bg-[#111620]/40'
            }`}
          >
            <GitFork size={13} />
            <span>[TOPOLOGY GRAPH & MAP]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('chains')}
            className={`flex items-center gap-1.5 px-3 py-2 border-t border-x rounded-t transition ${
              activeViewTab === 'chains'
                ? 'border-[#1f2735] bg-[#111620] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6edf3] hover:bg-[#111620]/40'
            }`}
          >
            <Network size={13} />
            <span>[ROUTING CHAINS]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('summary')}
            className={`flex items-center gap-1.5 px-3 py-2 border-t border-x rounded-t transition ${
              activeViewTab === 'summary'
                ? 'border-[#1f2735] bg-[#111620] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6edf3] hover:bg-[#111620]/40'
            }`}
          >
            <ShieldCheck size={13} />
            <span>[EXECUTIVE SYNTHESIS]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-2 border-t border-x rounded-t transition ${
              activeViewTab === 'inventory'
                ? 'border-[#1f2735] bg-[#111620] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6edf3] hover:bg-[#111620]/40'
            }`}
          >
            <Layers size={13} />
            <span>[ASSET INVENTORY ({scan.assets?.length ?? 0})]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('findings')}
            className={`flex items-center gap-1.5 px-3 py-2 border-t border-x rounded-t transition ${
              activeViewTab === 'findings'
                ? 'border-[#1f2735] bg-[#111620] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6edf3] hover:bg-[#111620]/40'
            }`}
          >
            <AlertTriangle size={13} />
            <span>[FINDINGS ({scan.findings?.length ?? 0})]</span>
          </button>

          <button
            onClick={() => setActiveViewTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-2 border-t border-x rounded-t transition ${
              activeViewTab === 'raw'
                ? 'border-[#1f2735] bg-[#111620] text-[#58a6ff] font-bold'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6edf3] hover:bg-[#111620]/40'
            }`}
          >
            <FileText size={13} />
            <span>[RAW TELEMETRY]</span>
          </button>
        </div>

        {/* View Tab: Topology Graph & Map */}
        {activeViewTab === 'surface' && (
          <div className="space-y-5">
            <AttackSurfaceGraph
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />

            <InfrastructureMap
              assets={scan.assets ?? []}
              relationships={scan.relationships ?? []}
              onSelectAsset={(asset) => setSelectedAsset(asset)}
            />
          </div>
        )}

        {/* View Tab: Asset Routing Chains */}
        {activeViewTab === 'chains' && (
          <AssetChainVisualizer
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        )}

        {/* View Tab: Executive Synthesis */}
        {activeViewTab === 'summary' && (
          <ExecutiveSummary scan={scan} />
        )}

        {/* View Tab: Normalized Assets Table */}
        {activeViewTab === 'inventory' && (
          <AssetsInventoryTable
            assets={scan.assets ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        )}

        {/* View Tab: Findings Section */}
        {activeViewTab === 'findings' && (
          <FindingsSection
            findings={scan.findings ?? []}
            onOpenGlossary={openGlossary}
          />
        )}

        {/* View Tab: Raw Category Data */}
        {activeViewTab === 'raw' && (
          <CategoryInspectionTabs
            scan={scan}
            defaultCategory={selectedCategoryTab}
          />
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

      {/* Reusable Glossary Modal */}
      <GlossaryModal
        initialTermKey={glossaryInitialTerm}
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
      />
    </main>
  );
}
