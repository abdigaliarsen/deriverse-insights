import { useState, useCallback, useRef, useEffect } from "react";
import { Wallet, RefreshCw, Loader2, ExternalLink, Check, X } from "lucide-react";
import { FetchProgress } from "@/lib/transaction-fetcher";
import { solscanAccountUrl } from "@/lib/deriverse-client";

interface WalletInputProps {
  wallet: string;
  onWalletChange: (addr: string) => void;
  isLoading: boolean;
  isCached: boolean;
  progress: FetchProgress | null;
  error: string | null;
  onRefresh: () => void;
  tradeCount: number;
  children?: React.ReactNode;
}

export function WalletInput({
  wallet,
  onWalletChange,
  isLoading,
  isCached,
  progress,
  error,
  onRefresh,
  tradeCount,
  children,
}: WalletInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(wallet);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(wallet);
  }, [wallet]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== wallet) {
      onWalletChange(trimmed);
    }
    setIsEditing(false);
  }, [inputValue, wallet, onWalletChange]);

  const handleCancel = useCallback(() => {
    setInputValue(wallet);
    setIsEditing(false);
  }, [wallet]);

  const truncated = wallet.slice(0, 4) + "..." + wallet.slice(-4);

  // Progress bar percentage
  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          className="bg-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground w-[320px] focus:outline-none focus:ring-1 focus:ring-primary"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") handleCancel();
          }}
          placeholder="Solana wallet address..."
        />
        <button
          onClick={handleSubmit}
          className="p-1 rounded hover:bg-secondary/50 text-profit"
          title="Apply"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-secondary/50 text-loss"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3 w-3 text-muted-foreground" />
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
            title="Click to change wallet"
          >
            {truncated}
          </button>
          <a
            href={solscanAccountUrl(wallet)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/40 hover:text-primary transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          {!isLoading && (
            <button
              onClick={onRefresh}
              className="p-0.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors"
              title="Refresh trade data"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
        {children && (
          <>
            <span className="w-px h-4 bg-border" />
            {children}
          </>
        )}
      </div>

      {/* Status line */}
      <div className="flex items-center gap-1.5 text-[10px]">
        {isLoading && progress ? (
          <span className="flex items-center gap-1 text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progress.message}
          </span>
        ) : error ? (
          <span className="text-loss">{error}</span>
        ) : tradeCount > 0 ? (
          <span className="text-muted-foreground">
            {tradeCount} trades{isCached ? " (cached)" : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">No trades found</span>
        )}
      </div>

      {/* Progress bar */}
      {isLoading && progress && progress.total > 0 && progress.phase !== "done" && (
        <div className="w-[160px] h-1 bg-secondary/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
