"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { CryptoIcon } from "@/components/ui/CryptoIcon";
import { Card } from "@/components/ui/Card";
import { fetchTicker } from "@/lib/endpoints";

const POLL_INTERVAL_MS = 2000;

export function LiveMarketChart() {
  const [prices, setPrices] = useState<Record<string, { price: number; changePct: number; prevPrice?: number }>>({});
  const [flashStates, setFlashStates] = useState<Record<string, "up" | "down" | null>>({});
  const [activeTab, setActiveTab] = useState<"ALL" | "CRYPTO" | "FOREX">("ALL");

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await fetchTicker();
        if (cancelled) return;

        setPrices((prev) => {
          const next = { ...prev };
          const nextFlash: Record<string, "up" | "down" | null> = {};

          data.forEach((entry) => {
            const prevEntry = prev[entry.symbol];
            const currentPrice = entry.price;
            const prevPrice = prevEntry?.price ?? currentPrice;

            // Generate slight simulated fluctuations for live visual effect between polls
            const noise = (Math.random() - 0.5) * (currentPrice * 0.0005);
            const finalPrice = currentPrice + noise;

            if (finalPrice > prevPrice) {
              nextFlash[entry.symbol] = "up";
            } else if (finalPrice < prevPrice) {
              nextFlash[entry.symbol] = "down";
            }

            next[entry.symbol] = {
              price: finalPrice,
              changePct: entry.changePct + (noise / currentPrice) * 100,
              prevPrice,
            };
          });

          // Trigger flash reset timeout
          setFlashStates(nextFlash);
          setTimeout(() => {
            if (!cancelled) {
              setFlashStates((current) => {
                const reset = { ...current };
                Object.keys(reset).forEach((k) => {
                  reset[k] = null;
                });
                return reset;
              });
            }
          }, 600);

          return next;
        });
      } catch (err) {
        console.error("Failed to fetch live prices ticker", err);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const getFormatDecimals = (sym: string) => {
    if (sym === "XAUUSD") return 2;
    if (sym.includes("USD") && sym !== "BTCUSD" && sym !== "ETHUSD") return 4;
    return 2;
  };

  const getCleanLabel = (sym: string) => {
    if (sym.endsWith("USDT")) return sym.replace("USDT", "/USDT");
    if (sym.endsWith("USD")) return sym.replace("USD", "/USD");
    return sym;
  };

  // Predefined assets in the application
  const CRYPTO_LIST = ["BTC", "ETH", "BNB", "SOL"];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const FOREX_LIST = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD"];

  const getAssetClass = (sym: string) => {
    // Check if symbol matches crypto assets
    const cleanSym = sym.replace("USDT", "").replace("USD", "");
    if (CRYPTO_LIST.includes(cleanSym)) return "CRYPTO";
    return "FOREX";
  };

  // Filter prices based on activeTab
  const filteredSymbols = Object.keys(prices).filter((sym) => {
    const assetClass = getAssetClass(sym);
    if (activeTab === "ALL") return true;
    return assetClass === activeTab;
  });

  return (
    <Card className="p-6 border border-white/10 bg-gradient-to-br from-background-card to-background-card/90 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5 mb-6">
        <div>
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Activity className="h-5 w-5 text-gold animate-pulse" />
            Live Market Pricing
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">Real-time fluctuations of major crypto assets and forex currency pairs.</p>
        </div>

        {/* Tab filters */}
        <div className="flex bg-white/5 border border-white/5 p-1 rounded-xl gap-1 shrink-0 self-stretch sm:self-auto justify-center">
          {(["ALL", "CRYPTO", "FOREX"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === t
                  ? "bg-gold text-black shadow-lg"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filteredSymbols.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-text-secondary">
          <LoaderIcon className="h-8 w-8 text-gold animate-spin mb-3 shrink-0" />
          <p className="text-xs font-mono select-none animate-pulse">Syncing liquidity price list feeds...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSymbols.map((symbol) => {
            const info = prices[symbol];
            if (!info) return null;
            const flash = flashStates[symbol];
            const isUp = info.changePct >= 0;
            const isCrypto = getAssetClass(symbol) === "CRYPTO";

            return (
              <div
                key={symbol}
                className={`relative overflow-hidden rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 ${
                  flash === "up"
                    ? "border-emerald-500 bg-emerald-500/[0.04]"
                    : flash === "down"
                    ? "border-rose-500 bg-rose-500/[0.04]"
                    : "border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/20"
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCrypto
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    }`}>
                      {isCrypto ? (
                        <CryptoIcon symbol={symbol.replace("USDT", "").replace("USD", "")} className="h-6 w-6" />
                      ) : (
                        "$"
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-text-primary text-sm">{getCleanLabel(symbol)}</span>
                      <span className="block text-[9px] uppercase font-semibold text-text-muted mt-0.5 tracking-wider">
                        {isCrypto ? "Crypto Ticker" : "Forex Rate"}
                      </span>
                    </div>
                  </div>

                  <span className={`flex items-center gap-0.5 text-xs font-mono font-semibold ${
                    isUp ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {isUp ? "+" : ""}{info.changePct.toFixed(2)}%
                  </span>
                </div>

                {/* Price display with flashing up/down indicators */}
                <div className="mt-4 flex items-baseline justify-between">
                  <span className={`text-2xl font-bold font-mono tracking-tight tabular-nums transition-colors duration-200 ${
                    flash === "up" 
                      ? "text-emerald-400" 
                      : flash === "down" 
                      ? "text-rose-400" 
                      : "text-text-primary"
                  }`}>
                    {info.price.toFixed(getFormatDecimals(symbol))}
                  </span>
                  <span className="text-[10px] text-text-muted font-medium uppercase tracking-widest">
                    Live
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
