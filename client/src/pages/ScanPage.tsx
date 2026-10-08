import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock3,
  ArrowLeft,
  XCircle,
  RotateCw,
  FileText,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { getScan } from '../lib/api';
import type { DomainScan, Asset, ScanCategory } from '../../../shared/types';
import { generateDetailedFindingsOverview } from '../lib/narrativeSummary';
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

export default function ScanPage() {
  const { scanId } = useParams();
  const [scan, setScan] = useState<DomainScan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    const el = document.getElementById('sec-telemetry');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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

      {/* ─── Security Workstation Sub-Header ─────────────────────── */}
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
              title="Toggle guided interpretation vs raw technical telemetry"
            >
              <SlidersHorizontal size={13} />
              <span>{isGuidedMode ? 'MODE: GUIDED' : 'MODE: RAW'}</span>
            </button>

            <Link
              to={`/report/${encodeURIComponent(scan.scanId)}`}
              className="console-btn console-btn-primary py-1.5 px-3.5 text-xs font-bold rounded-lg"
            >
              <FileText size={13} />
              <span>SECURITY REPORT</span>
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

      {/* ─── Main Narrative-First Workstation Layout ───────────────── */}
      <div className="mx-auto max-w-[1720px] px-4 sm:px-8 pt-8 space-y-10 sm:space-y-12 pb-4">
        {/* Compact Pipeline Stepper */}
        <ScanProgressStepper
          categories={scan.categories}
          activeCategory={selectedCategoryTab}
          onSelectCategory={handleCategorySelectFromStepper}
        />

        {/* ─── 00. Narrative Executive Summary Paragraph (A.1) ──────── */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-technical)] rounded-xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider">
                <span>EXECUTIVE RECONNAISSANCE SUMMARY</span>
                <span className="console-tag">PASSIVE OSINT</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                Attack Surface Assessment for {scan.domain}
              </h2>
            </div>
            {scan.score !== undefined && scan.score !== null && (
              <div className="sm:text-right shrink-0">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase">HYGIENE SCORE</div>
                <div className="text-2xl font-black font-mono text-[var(--accent-primary)]">{scan.score}/100</div>
              </div>
            )}
          </div>
          {(() => {
            const overview = generateDetailedFindingsOverview(scan);
            return (
              <div className="space-y-4 pt-1 font-sans">
                {/* 1 & 2: What was scanned and when + Score range meaning */}
                <div className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed space-y-1.5">
                  <p>{overview.scanSentence}</p>
                  <p>{overview.scoreSentence}</p>
                </div>

                {/* 3: Walkthrough of every finding */}
                <div className="border-t border-[var(--border-muted)] pt-3.5 space-y-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)] flex items-center justify-between">
                    <span>FINDINGS OVERVIEW ({overview.findingsWalkthrough.length})</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">PLAIN-LANGUAGE SUMMARY</span>
                  </div>
                  {overview.findingsWalkthrough.length === 0 ? (
                    <p className="text-xs sm:text-sm text-[#16a34a] dark:text-[#2ee59d] font-medium">
                      No security weaknesses or configuration issues were observed during this scan.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {overview.findingsWalkthrough.map((item) => (
                        <div
                          key={item.id}
                          className="bg-[var(--bg-panel-inset)] p-3 rounded-lg border border-[var(--border-muted)] text-xs space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">{item.title}</span>
                            <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded border bg-[var(--bg-panel)] text-[var(--text-secondary)]">
                              {item.severity}
                            </span>
                          </div>
                          <p className="text-[var(--text-secondary)] leading-relaxed">
                            {item.plainSummary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4: What's good (confirmed positive controls) or plain statement if 0 */}
                <div className="border-t border-[var(--border-muted)] pt-3.5 space-y-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#16a34a] dark:text-[#2ee59d]">
                    CONFIRMED SECURITY CONTROLS ({overview.positiveControls.length})
                  </div>
                  {overview.positiveControls.length === 0 ? (
                    <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                      No confirmed defensive security controls (such as HTTPS enforcement, defensive HTTP headers, or email authentication records) were observed during this scan.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                      {overview.positiveControls.map((ctrl, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#16a34a] dark:text-[#2ee59d] font-bold mt-0.5 shrink-0">✓</span>
                          <span>{ctrl}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Dense Telemetry Strip + Transparent Hygiene Score Breakdown */}
        <ScanOverviewCard
          scan={scan}
          onOpenGlossary={openGlossary}
          isGuidedMode={isGuidedMode}
        />

        {/* ─── Continuous Reading Anchor Bar ────────────────────────── */}
        <nav aria-label="Section shortcuts" className="flex items-center gap-2 overflow-x-auto py-2 text-xs font-mono border-b border-[var(--border-muted)] sticky top-0 bg-[var(--bg-canvas)]/95 backdrop-blur-sm z-20">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] shrink-0">INDEX:</span>
          <a href="#sec-findings" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-muted)] shrink-0 transition">
            01. Detailed Findings ({scan.findings?.length ?? 0})
          </a>
          <a href="#sec-topology" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-muted)] shrink-0 transition">
            02. Attack Surface Topology
          </a>
          <a href="#sec-map" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-muted)] shrink-0 transition">
            03. Infrastructure Map
          </a>
          <a href="#sec-chains" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-muted)] shrink-0 transition">
            04. Asset Routing Chains
          </a>
          <a href="#sec-inventory" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-muted)] shrink-0 transition">
            05. Asset Inventory ({scan.assets?.length ?? 0})
          </a>
          <a href="#sec-telemetry" className="px-2.5 py-1 rounded-md bg-[var(--bg-panel-subtle)] hover:text-[var(--accent-primary)] border border-[var(--border-muted)] shrink-0 transition">
            06. Technical Telemetry
          </a>
        </nav>

        {/* ─── 01. Detailed Findings & Hygiene Evaluation (A.3) ─────── */}
        <section id="sec-findings" className="w-full scroll-mt-14">
          <FindingsSection
            sectionNumber="01"
            findings={scan.findings ?? []}
            onOpenGlossary={openGlossary}
          />
        </section>

        {/* ─── 02. Attack Surface Topology Graph (A.4) ──────────────── */}
        <section id="sec-topology" className="w-full scroll-mt-14">
          <AttackSurfaceGraph
            sectionNumber="02"
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 03. Infrastructure Distribution Map (A.5) ───────────── */}
        <section id="sec-map" className="w-full scroll-mt-14">
          <InfrastructureMap
            sectionNumber="03"
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 04. Asset Routing Chains (A.6) ───────────────────────── */}
        <section id="sec-chains" className="w-full scroll-mt-14">
          <AssetChainVisualizer
            sectionNumber="04"
            assets={scan.assets ?? []}
            relationships={scan.relationships ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 05. Attack Surface Asset Inventory Table ─────────────── */}
        <section id="sec-inventory" className="w-full scroll-mt-14">
          <AssetsInventoryTable
            sectionNumber="05"
            assets={scan.assets ?? []}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
          />
        </section>

        {/* ─── 06. Technical Protocol Telemetry ─────────────────────── */}
        <section id="sec-telemetry" className="w-full scroll-mt-14">
          <CategoryInspectionTabs
            scan={scan}
            defaultCategory={selectedCategoryTab}
          />
        </section>
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
