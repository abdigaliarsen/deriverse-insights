import { motion } from "framer-motion";
import { useTradingData } from "@/hooks/use-trading-data";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { PnlChart } from "@/components/dashboard/PnlChart";
import { LongShortRatio } from "@/components/dashboard/LongShortRatio";
import { FeeBreakdownChart } from "@/components/dashboard/FeeBreakdown";
import { SessionPerformanceCard } from "@/components/dashboard/SessionPerformance";
import { SymbolPerformance } from "@/components/dashboard/SymbolPerformance";
import { TradeHistory } from "@/components/dashboard/TradeHistory";
import { OrderTypeAnalysis } from "@/components/dashboard/OrderTypeAnalysis";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { Activity } from "lucide-react";

const Dashboard = () => {
  const {
    trades,
    stats,
    dailyPnl,
    sessionPerf,
    symbolStats,
    feeBreakdown,
    symbols,
    selectedSymbol,
    setSelectedSymbol,
    dateRange,
    setDateRange,
  } = useTradingData();

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
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse-glow" />
              Solana Mainnet
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Filters */}
        <DashboardFilters
          symbols={symbols}
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />

        {/* Overview Stats */}
        <OverviewStats stats={stats} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <PnlChart data={dailyPnl} />
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

        {/* Analysis Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SymbolPerformance data={symbolStats} />
          <OrderTypeAnalysis trades={trades} />
          <FeeBreakdownChart data={feeBreakdown} totalFees={stats.totalFees} />
        </div>

        {/* Trade History */}
        <TradeHistory trades={trades} />
      </main>
    </div>
  );
};

export default Dashboard;
