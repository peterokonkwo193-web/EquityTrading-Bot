"use client";

import clsx from "clsx";
import { AssetClassTab, CRYPTO_MARKETS, FOREX_MARKETS } from "./markets";

interface MarketPickerProps {
  assetClass: AssetClassTab;
  market: string;
  onAssetClassChange: (assetClass: AssetClassTab) => void;
  onMarketChange: (market: string) => void;
  disabled?: boolean;
}

export function MarketPicker({ assetClass, market, onAssetClassChange, onMarketChange, disabled }: MarketPickerProps) {
  const markets = assetClass === "CRYPTO" ? CRYPTO_MARKETS : FOREX_MARKETS;

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(["CRYPTO", "FOREX"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            disabled={disabled}
            onClick={() => {
              onAssetClassChange(tab);
              onMarketChange(tab === "CRYPTO" ? CRYPTO_MARKETS[0] : FOREX_MARKETS[0]);
            }}
            className={clsx(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              assetClass === tab ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab === "CRYPTO" ? "Crypto" : "Forex"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {markets.map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onMarketChange(m)}
            className={clsx(
              "rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              market === m
                ? "border-gold/40 bg-gold-muted/40 text-gold"
                : "border-white/10 bg-white/[0.03] text-text-secondary hover:text-text-primary"
            )}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
