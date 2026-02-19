import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTradingData } from "@/hooks/use-trading-data";
import { useDeriverseData } from "@/hooks/use-deriverse-data";
import { useIsMobile } from "@/hooks/use-mobile";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { PnlChart } from "@/components/dashboard/PnlChart";
import { LongShortRatio } from "@/components/dashboard/LongShortRatio";
import { FeeBreakdownChart } from "@/components/dashboard/FeeBreakdown";
import { SessionPerformanceCard } from "@/components/dashboard/SessionPerformance";
import { SymbolPerformance } from "@/components/dashboard/SymbolPerformance";
import { TradeHistory } from "@/components/dashboard/TradeHistory";
import { OrderTypeAnalysis } from "@/components/dashboard/OrderTypeAnalysis";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { RiskMetricsPanel } from "@/components/dashboard/RiskMetrics";
import { CalendarHeatmap } from "@/components/dashboard/CalendarHeatmap";
import { TimeOfDayHeatmap } from "@/components/dashboard/TimeOfDayHeatmap";
import { TradeDistribution } from "@/components/dashboard/TradeDistribution";
import { PeriodComparison } from "@/components/dashboard/PeriodComparison";
import { LeverageAnalysis } from "@/components/dashboard/LeverageAnalysis";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { PerformanceScore } from "@/components/dashboard/PerformanceScore";
import { RollingMetrics } from "@/components/dashboard/RollingMetrics";
import { WinLossProfile } from "@/components/dashboard/WinLossProfile";
import { MonthlyPerformance } from "@/components/dashboard/MonthlyPerformance";
import { CorrelationMatrix } from "@/components/dashboard/CorrelationMatrix";
import { DrawdownAnalysis } from "@/components/dashboard/DrawdownAnalysis";
import { MonteCarloChart } from "@/components/dashboard/MonteCarloChart";
import { TradeTimeline } from "@/components/dashboard/TradeTimeline";
import { LiveMarketData } from "@/components/dashboard/LiveMarketData";
import { OrderBookChart } from "@/components/dashboard/OrderBookChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StatsSkeleton, ChartSkeleton, TableSkeleton, RiskMetricsSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { Activity, Filter } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const Dashboard = () => {
  const {
    trades,
    stats,
    dailyPnl,
    sessionPerf,
    symbolStats,
    feeBreakdown,
    equityCurve,
    symbols,
    selectedSymbol,
    setSelectedSymbol,
    dateRange,
    setDateRange,
  } = useTradingData();

  const deriverse = useDeriverseData();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Sparkline data for OverviewStats
  const dailyPnlValues = useMemo(() => dailyPnl.map((d) => d.pnl), [dailyPnl]);
  const weeklyWinRates = useMemo(() => {
    const sorted = [...trades].sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime());
    const chunks: number[] = [];
    let weekStart = sorted.length > 0 ? sorted[0].exitTime.getTime() : 0;
    let weekTrades: typeof sorted = [];
    for (const t of sorted) {
      if (t.exitTime.getTime() - weekStart > 7 * 24 * 3600 * 1000) {
        if (weekTrades.length > 0) {
          chunks.push((weekTrades.filter((wt) => wt.pnl > 0).length / weekTrades.length) * 100);
        }
        weekTrades = [];
        weekStart = t.exitTime.getTime();
      }
      weekTrades.push(t);
    }
    if (weekTrades.length > 0) {
      chunks.push((weekTrades.filter((wt) => wt.pnl > 0).length / weekTrades.length) * 100);
    }
    return chunks;
  }, [trades]);

  const filtersContent = (
    <DashboardFilters
      symbols={symbols}
      selectedSymbol={selectedSymbol}
      onSymbolChange={setSelectedSymbol}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center glow-primary">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">
                Deriverse <span className="text-primary">Analytics</span>
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Trading Journal & Portfolio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton trades={trades} stats={stats as unknown as Record<string, unknown>} />
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${deriverse.isLive ? "bg-profit" : "bg-warning"} animate-pulse-glow`} />
              {deriverse.isLive ? "Solana Devnet" : "Offline Mode"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Filters */}
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 text-xs rounded-md bg-secondary text-secondary-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] pt-8">
              <SheetTitle className="text-sm font-semibold mb-4">Filters</SheetTitle>
              <div className="flex flex-col gap-4">
                {filtersContent}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          filtersContent
        )}

        {/* Insights Panel */}
        <ErrorBoundary fallbackTitle="Insights failed to load">
          <InsightsPanel trades={trades} />
        </ErrorBoundary>

        {/* Performance Score + Overview Stats */}
        <ErrorBoundary fallbackTitle="Stats failed to load">
          {isLoading ? (
            <StatsSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-1">
                <PerformanceScore trades={trades} />
              </div>
              <div className="lg:col-span-3">
                <OverviewStats stats={stats} dailyPnlValues={dailyPnlValues} weeklyWinRates={weeklyWinRates} />
              </div>
            </div>
          )}
        </ErrorBoundary>

        {/* Risk Metrics */}
        <ErrorBoundary fallbackTitle="Risk metrics failed to load">
          {isLoading ? <RiskMetricsSkeleton /> : <RiskMetricsPanel trades={trades} />}
        </ErrorBoundary>

        {/* Rolling Metrics */}
        <ErrorBoundary fallbackTitle="Rolling metrics failed to load">
          <RollingMetrics trades={trades} />
        </ErrorBoundary>

        {/* Charts Row */}
        <ErrorBoundary fallbackTitle="Charts failed to load">
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <PnlChart data={dailyPnl} equityData={equityCurve} />
              </div>
              <div className="space-y-4">
                <LongShortRatio
                  longCount={stats.longCount}
                  shortCount={stats.shortCount}
                  longPnl={stats.longPnl}
                  shortPnl={stats.shortPnl}
                />
                <SessionPerformanceCard data={sessionPerf} />
              </div>
            </div>
          )}
        </ErrorBoundary>

        {/* Heatmaps Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ErrorBoundary fallbackTitle="Calendar heatmap failed to load">
            <CalendarHeatmap trades={trades} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Time heatmap failed to load">
            <TimeOfDayHeatmap trades={trades} />
          </ErrorBoundary>
        </div>

        {/* Monte Carlo Simulation */}
        <ErrorBoundary fallbackTitle="Monte Carlo failed to load">
          <MonteCarloChart trades={trades} />
        </ErrorBoundary>

        {/* Win vs Loss Profile */}
        <ErrorBoundary fallbackTitle="Win/Loss profile failed to load">
          <WinLossProfile trades={trades} />
        </ErrorBoundary>

        {/* Monthly Performance */}
        <ErrorBoundary fallbackTitle="Monthly performance failed to load">
          <MonthlyPerformance trades={trades} />
        </ErrorBoundary>

        {/* Drawdown Analysis */}
        <ErrorBoundary fallbackTitle="Drawdown analysis failed to load">
          <DrawdownAnalysis trades={trades} />
        </ErrorBoundary>

        {/* Deriverse SDK Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ErrorBoundary fallbackTitle="Market data failed to load">
            <LiveMarketData
              instruments={deriverse.instruments}
              isLive={deriverse.isLive}
              isLoading={deriverse.isLoading}
              lastUpdated={deriverse.lastUpdated}
            />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Order book failed to load">
            <OrderBookChart
              orderBook={deriverse.orderBook}
              instruments={deriverse.instruments}
              selectedInstrument={deriverse.selectedInstrument}
              onInstrumentChange={deriverse.setSelectedInstrument}
            />
          </ErrorBoundary>
        </div>

        {/* Symbol + Correlation Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ErrorBoundary fallbackTitle="Symbol perf failed to load">
            <SymbolPerformance data={symbolStats} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Correlation failed to load">
            <CorrelationMatrix trades={trades} />
          </ErrorBoundary>
        </div>

        {/* Analysis Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ErrorBoundary fallbackTitle="Order analysis failed to load">
            <OrderTypeAnalysis trades={trades} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Fee breakdown failed to load">
            <FeeBreakdownChart data={feeBreakdown} totalFees={stats.totalFees} trades={trades} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Leverage analysis failed to load">
            <LeverageAnalysis trades={trades} />
          </ErrorBoundary>
        </div>

        {/* Distribution + Period + Timeline Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ErrorBoundary fallbackTitle="Distribution failed to load">
            <TradeDistribution trades={trades} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Period comparison failed to load">
            <PeriodComparison trades={trades} />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Timeline failed to load">
            <TradeTimeline trades={trades} />
          </ErrorBoundary>
        </div>

        {/* Trade History */}
        <ErrorBoundary fallbackTitle="Trade history failed to load">
          {isLoading ? <TableSkeleton /> : <TradeHistory trades={trades} />}
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default Dashboard;
