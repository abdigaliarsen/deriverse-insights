export interface Trade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;
  pnlPercent: number;
  fees: number;
  entryTime: Date;
  exitTime: Date;
  orderType: "market" | "limit" | "stop";
  notes: string;
  leverage: number;
}

export interface DailyPnl {
  date: string;
  pnl: number;
  cumPnl: number;
  drawdown: number;
  tradeCount: number;
}

export interface SessionPerformance {
  session: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export interface SymbolStats {
  symbol: string;
  trades: number;
  pnl: number;
  winRate: number;
  volume: number;
}

export interface FeeBreakdown {
  type: string;
  amount: number;
  percentage: number;
}
