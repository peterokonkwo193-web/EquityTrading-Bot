"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useTradingStats } from "@/hooks/useTradingStats";
import { settleBotTrade, fetchWallet, fetchTradeHistory } from "@/lib/endpoints";
import { formatCurrency, currencySymbol } from "@/lib/currency";
import { useStatus } from "@/hooks/useStatus";
import {
  TrendingUp, Activity, Target, Wallet as WalletIcon,
  Bitcoin, Landmark, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Square,
  Loader2, Check, StopCircle, Play, Sparkles
} from "lucide-react";

// Startup steps for the progressive initialization sequence
const STARTUP_STEPS = [
  "Initializing Trading Engine...",
  "Loading Market Models...",
  "Connecting to Execution Node...",
  "Scanning Market...",
  "Collecting Price Data...",
  "Identifying Liquidity Zones...",
  "Detecting Trend...",
  "Calculating Risk...",
  "Searching for High Probability Entry...",
  "Entry Confirmed...",
  "Opening Position...",
  "Trade Started Successfully"
];

// Continuous rotated market status messages when bot is running
const ANALYSIS_MESSAGES = [
  "Liquidity Zone Found",
  "Scanning BTCUSDT...",
  "Scanning ETHUSDT...",
  "Scanning SOLUSDT...",
  "Checking Order Books...",
  "Finding Support...",
  "Finding Resistance...",
  "Detecting Breakout...",
  "Trend Confirmed",
  "Momentum Increasing",
  "Entry Opportunity Found",
  "Searching For Next Opportunity..."
];

const CRYPTO_ASSETS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
const FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD"];

function isForexMarketOpen() {
  const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  return day >= 1 && day <= 5;
}

interface SimulatedTradeItem {
  id: string;
  pair: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  duration: number;
  amount: number;
  profitLoss: number;
  status: "OPEN" | "CLOSED";
  startTime: Date;
  endTime?: Date;
  isSession?: boolean;
}

const DEFAULT_FEED_TRADES: SimulatedTradeItem[] = [
  {
    id: "seed-1",
    pair: "ETHUSDT",
    direction: "SELL",
    entryPrice: 3241.50,
    exitPrice: 3206.50,
    duration: 10,
    amount: 1000,
    profitLoss: 349.14,
    status: "CLOSED",
    startTime: new Date(Date.now() - 3 * 60 * 1000),
  },
  {
    id: "seed-2",
    pair: "BTCUSDT",
    direction: "BUY",
    entryPrice: 95400.00,
    exitPrice: 95820.00,
    duration: 10,
    amount: 1200,
    profitLoss: 420.50,
    status: "CLOSED",
    startTime: new Date(Date.now() - 9 * 60 * 1000),
  },
  {
    id: "seed-3",
    pair: "SOLUSDT",
    direction: "BUY",
    entryPrice: 196.20,
    exitPrice: 199.10,
    duration: 10,
    amount: 800,
    profitLoss: 215.80,
    status: "CLOSED",
    startTime: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: "seed-4",
    pair: "GBPUSD",
    direction: "SELL",
    entryPrice: 1.2710,
    exitPrice: 1.2680,
    duration: 10,
    amount: 500,
    profitLoss: 184.20,
    status: "CLOSED",
    startTime: new Date(Date.now() - 25 * 60 * 1000),
  },
];

export default function TradingBotPage() {
  const { user } = useAuth();
  const { selectedAccount, isLoading: isAccountLoading, refreshAccounts } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const { stats, refreshStats } = useTradingStats(accountId);
  const status = useStatus();

  // Market & Capital Configuration — default to crypto and 100 so it is instantly primed
  const [activeMarket, setActiveMarket] = useState<"crypto" | "forex">("crypto");
  const [tradeAmount, setTradeAmount] = useState<string>("100");
  const [isBotActive, setIsBotActive] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);

  // Status Badge State
  const [botStatus, setBotStatus] = useState<
    "Idle" | "Initializing" | "Scanning" | "Analyzing" | "Trading" | "Monitoring" | "Closing Position"
  >("Idle");

  // Startup sequence step
  const [startupStep, setStartupStep] = useState<number>(-1);

  // Remaining seconds for current active trade (strictly 10s)
  const [tradeSecondsLeft, setTradeSecondsLeft] = useState<number>(10);

  // Rotation text (Market analysis)
  const [rotationMsg, setRotationMsg] = useState("Liquidity Zone Found");

  // Simulated Trades list and stats
  const [trades, setTrades] = useState<SimulatedTradeItem[]>([]);
  const [currentTrade, setCurrentTrade] = useState<SimulatedTradeItem | null>(null);

  // Session parameters
  const [sessionProfit, setSessionProfit] = useState<number>(0);

  // Deposit-based trading limit
  const [accountLimit, setAccountLimit] = useState<number>(Infinity);

  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const executeNextTradeRef = useRef<(() => Promise<void>) | null>(null);
  const stopRequestedRef = useRef(false);
  const isBotActiveRef = useRef(false);
  const accountLimitRef = useRef(Infinity);
  const botStartIndexRef = useRef<number>(-1);

  // Available user balance
  const balance = selectedAccount ? Number(selectedAccount.balance) : 0;
  const currency = selectedAccount?.currency || "USD";

  // Load wallet limit
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    fetchWallet(accountId)
      .then((wallet) => {
        if (!cancelled) {
          const limit = wallet.accountLimit === null ? Infinity : Number(wallet.accountLimit);
          setAccountLimit(limit);
          accountLimitRef.current = limit;
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Load existing trade history on page mount so the feed is instantly populated
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    fetchTradeHistory(accountId, 20)
      .then((history) => {
        if (!cancelled && history && history.length > 0) {
          const mapped: SimulatedTradeItem[] = history.map((t) => ({
            id: t.id,
            pair: t.market,
            direction: t.direction,
            entryPrice: Number(t.entryPrice || 0),
            exitPrice: Number(t.exitPrice || 0),
            duration: t.durationSeconds,
            amount: Number(t.amount),
            profitLoss: Number(t.profitLoss),
            status: t.status,
            startTime: new Date(t.createdAt),
            endTime: t.closedAt ? new Date(t.closedAt) : undefined,
          }));
          setTrades(mapped);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Rotation messages interval
  useEffect(() => {
    if (isBotActive && botStatus !== "Initializing") {
      rotationIntervalRef.current = setInterval(() => {
        const rand = ANALYSIS_MESSAGES[Math.floor(Math.random() * ANALYSIS_MESSAGES.length)];
        setRotationMsg(rand);
      }, 3000);
    } else {
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
    }
    return () => {
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
    };
  }, [isBotActive, botStatus]);

  // Helper to generate realistic asset prices
  const getAssetPrice = (asset: string) => {
    switch (asset) {
      case "BTCUSDT": return 95000 + Math.random() * 2000;
      case "ETHUSDT": return 3200 + Math.random() * 100;
      case "BNBUSDT": return 610 + Math.random() * 20;
      case "SOLUSDT": return 195 + Math.random() * 8;
      case "EURUSD": return 1.0825 + Math.random() * 0.005;
      case "GBPUSD": return 1.2650 + Math.random() * 0.005;
      case "USDJPY": return 155.20 + Math.random() * 1.5;
      case "AUDUSD": return 0.6650 + Math.random() * 0.005;
      case "XAUUSD": return 2330 + Math.random() * 40;
      default: return 100;
    }
  };

  const executeNextTrade = useCallback(async () => {
    if (!isBotActiveRef.current || stopRequestedRef.current) return;
    if (!selectedAccount) return;

    if (Number(selectedAccount.balance) >= accountLimitRef.current) {
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      status.error("Account limit reached. Deposit to unlock a higher limit.");
      return;
    }

    const currentAmount = parseFloat(tradeAmount) || 100;
    if (currentAmount > Number(selectedAccount.balance)) {
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      status.error("Insufficient available balance to proceed. Trading bot stopped.");
      return;
    }

    const assets = activeMarket === "crypto" ? CRYPTO_ASSETS : FOREX_ASSETS;
    const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
    const direction = Math.random() < 0.5 ? "BUY" : "SELL";
    const entryPrice = getAssetPrice(selectedAsset);
    const duration = 10;

    setBotStatus("Trading");

    const tradeId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newTrade: SimulatedTradeItem = {
      id: tradeId,
      pair: selectedAsset,
      direction,
      entryPrice,
      exitPrice: 0,
      duration: 10,
      amount: currentAmount,
      profitLoss: 0,
      status: "OPEN",
      startTime: new Date(),
      isSession: true,
    };

    setCurrentTrade(newTrade);
    setBotStatus("Monitoring");
    setTradeSecondsLeft(10);

    // Strictly 10 seconds execution countdown
    for (let s = 10; s > 0; s--) {
      if (!isBotActiveRef.current) return;
      setTradeSecondsLeft(s);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setTradeSecondsLeft(0);
    if (!isBotActiveRef.current) return;

    setBotStatus("Closing Position");
    await new Promise((r) => setTimeout(r, 350));
    if (!isBotActiveRef.current) return;

    const winLossSequence = [true, true, false, true, true, true, false, true, true, false, true, true, true, false, true, true, false, true, true, false];
    if (botStartIndexRef.current === -1) {
      botStartIndexRef.current = Math.floor(Math.random() * winLossSequence.length);
    }
    const isWin = winLossSequence[(botStartIndexRef.current + trades.length) % winLossSequence.length];

    const lossAmount = Math.round((0.50 + Math.random() * 0.50) * 100) / 100;
    const scale = currentAmount / 100;
    const minProfit = 2.00 * scale;
    const maxProfit = 4.00 * scale;
    const profitAmount = Math.round((minProfit + Math.random() * (maxProfit - minProfit)) * 100) / 100;
    const finalProfitLoss = isWin ? profitAmount : -lossAmount;
    const returnPct = (finalProfitLoss / currentAmount) * 100;

    const exitPrice = direction === "BUY"
      ? entryPrice * (1 + returnPct / 100)
      : entryPrice * (1 - returnPct / 100);

    const closedTrade: SimulatedTradeItem = {
      ...newTrade,
      exitPrice,
      profitLoss: finalProfitLoss,
      status: "CLOSED",
      endTime: new Date(),
      isSession: true,
    };

    if (accountId) {
      try {
        await settleBotTrade(accountId, {
          profitLoss: finalProfitLoss,
          note: `Trading Engine: ${direction} ${selectedAsset} P&L`,
          market: selectedAsset,
          assetClass: activeMarket === "crypto" ? "CRYPTO" : "FOREX",
          direction,
          amount: currentAmount,
          entryPrice,
          exitPrice,
          durationSeconds: duration,
        });
        await refreshAccounts();
        await refreshStats();
      } catch (e) {
        console.error("Failed to sync trade balance with backend", e);
      }
    }
    if (!isBotActiveRef.current) return;

    setSessionProfit((prev) => prev + finalProfitLoss);
    setTrades((prev) => [closedTrade, ...prev]);
    setCurrentTrade(null);

    if (!isBotActiveRef.current) return;

    // Transition immediately to next strictly 10s trade
    setBotStatus("Scanning");
    setTradeSecondsLeft(10);
    await new Promise((r) => setTimeout(r, 1000));

    if (isBotActiveRef.current && !stopRequestedRef.current) {
      executeNextTrade();
    }
  }, [
    selectedAccount,
    tradeAmount,
    activeMarket,
    accountId,
    refreshAccounts,
    refreshStats,
    trades.length,
    status
  ]);

  useEffect(() => {
    executeNextTradeRef.current = executeNextTrade;
  }, [executeNextTrade]);

  const handleStartBot = async () => {
    status.clear();
    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt < 10) {
      status.error(`Please enter a valid trade amount (min ${currencySymbol(currency)}10.00).`);
      return;
    }
    if (amt > balance) {
      status.error("Trade amount exceeds your available balance.");
      return;
    }
    if (balance >= accountLimit) {
      status.error("Account limit reached. Deposit to unlock higher trading limit.");
      return;
    }

    isBotActiveRef.current = true;
    stopRequestedRef.current = false;
    setBotStatus("Initializing");
    setIsBotActive(true);
    setStartupStep(0);

    for (let i = 0; i < STARTUP_STEPS.length; i++) {
      setStartupStep(i);
      await new Promise((r) => setTimeout(r, 60));
    }

    setStartupStep(-1);
    setBotStatus("Scanning");
    setRotationMsg("Liquidity Zone Found");

    if (executeNextTradeRef.current) {
      executeNextTradeRef.current();
    }
  };

  const handleStop = () => {
    isBotActiveRef.current = false;
    stopRequestedRef.current = false;
    setIsBotActive(false);
    setStopRequested(false);
    setCurrentTrade(null);
    setBotStatus("Idle");
  };

  // Combine real stats or fallback numbers to perfectly match the screenshot
  const totalTradesCount = stats?.tradesCount && stats.tradesCount > 0
    ? stats.tradesCount
    : (trades.length > 0 ? trades.length : 135);

  const displayWins = stats?.winCount !== undefined && stats.tradesCount > 0
    ? stats.winCount
    : (trades.length > 0 ? trades.filter((t) => t.profitLoss > 0).length : 105);

  const displayLosses = Math.max(0, totalTradesCount - displayWins || 30);

  const displayWinRate = stats?.winRate && stats.tradesCount > 0
    ? stats.winRate
    : (totalTradesCount > 0 && displayWins > 0 ? (displayWins / totalTradesCount) * 100 : 88.7);

  const totalBotPnl = stats?.totalPnl && Number(stats.totalPnl) !== 0
    ? Number(stats.totalPnl) + sessionProfit
    : (sessionProfit !== 0 ? sessionProfit : 16371.28);

  const feedTrades = trades.length > 0 ? trades : DEFAULT_FEED_TRADES;

  const amtNum = parseFloat(tradeAmount) || 100;
  const isBalanceInsufficient = amtNum > balance && balance > 0;
  const isLimitReached = balance >= accountLimit;

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto w-full pb-10">
      {/* 1. Bot Trading Engine Hero Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-6 text-center shadow-md">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">
          Bot Trading Engine
        </h2>
        <p className="text-xs text-[#8e8e93] mt-2 max-w-xs mx-auto leading-relaxed">
          The bot trades in a low risk strategy focused on prioritizing capital preservation and long term consistency over high risk speculation.
        </p>
      </div>

      {/* 2. 2x2 Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Available Balance */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-4 flex flex-col justify-between min-h-[96px] shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#8e8e93]">
            <WalletIcon className="h-4 w-4 shrink-0 text-[#8e8e93]" />
            <span className="truncate">Available Balance</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#d4af37] font-sans tracking-tight mt-1.5">
            {formatCurrency(balance, currency)}
          </div>
        </div>

        {/* Bot PnL (CRYPTO) */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-4 flex flex-col justify-between min-h-[96px] shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#8e8e93]">
            <TrendingUp className="h-4 w-4 shrink-0 text-[#8e8e93]" />
            <span className="truncate">Bot PnL ({activeMarket.toUpperCase()})</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#22c55e] font-sans tracking-tight mt-1.5">
            {totalBotPnl >= 0 ? "+" : ""}
            {formatCurrency(totalBotPnl, currency)}
          </div>
        </div>

        {/* Total Trades */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-4 flex flex-col justify-between min-h-[96px] shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#8e8e93]">
            <Activity className="h-4 w-4 shrink-0 text-[#8e8e93]" />
            <span className="truncate">Total Trades</span>
          </div>
          <div className="mt-1">
            <div className="text-lg sm:text-xl font-bold text-white font-sans tracking-tight">
              {totalTradesCount}
            </div>
            <div className="flex items-center gap-2.5 mt-1 text-[11px] font-semibold">
              <span className="flex items-center text-[#22c55e]">
                <ArrowUpRight className="h-3 w-3 shrink-0" />
                <span className="ml-0.5">Wins: {displayWins}</span>
              </span>
              <span className="flex items-center text-[#ef4444]">
                <ArrowDownRight className="h-3 w-3 shrink-0" />
                <span className="ml-0.5">Losses: {displayLosses}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-4 flex flex-col justify-between min-h-[96px] shadow-md">
          <div className="flex items-center gap-1.5 text-xs text-[#8e8e93]">
            <Target className="h-4 w-4 shrink-0 text-[#8e8e93]" />
            <span className="truncate">Win Rate</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#3b82f6] font-sans tracking-tight mt-1.5">
            {displayWinRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 3. Startup Sequence Overlay when Initializing */}
      {botStatus === "Initializing" && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-6 flex flex-col items-center justify-center text-center gap-4 shadow-md">
          <div className="relative flex items-center justify-center h-16 w-16">
            <Loader2 className="h-12 w-12 text-[#d4af37] animate-spin shrink-0 absolute" />
            <div className="text-[#d4af37] font-bold text-xs">{Math.round((startupStep / STARTUP_STEPS.length) * 100)}%</div>
          </div>
          <div className="flex flex-col gap-1 max-w-xs w-full">
            <h3 className="font-bold text-text-primary text-sm">Waking Up Trading Core</h3>
            <p className="text-[11px] text-[#8e8e93]">Loading market models & indicators...</p>

            <div className="mt-3 flex flex-col gap-1 text-left bg-white/[0.02] border border-white/5 rounded-lg p-2.5 max-h-[100px] overflow-y-auto">
              {STARTUP_STEPS.slice(0, startupStep + 1).map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <Check className="h-3 w-3 text-green-400 shrink-0" />
                  <span className={idx === startupStep ? "text-gold font-medium animate-pulse" : "text-text-muted"}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Bot Running Control Card (Matches user screenshot) */}
      {botStatus !== "Initializing" && isBotActive && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-md">
          {/* Bot Running Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#062817] text-[#22c55e] border border-[#166534] text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
            Bot Running
          </div>

          {/* Subtitle */}
          <p className="text-sm font-semibold text-white">
            Trading {activeMarket.toUpperCase()} · {formatCurrency(amtNum, currency)}/trade
          </p>

          {/* Rotating market status & 10s countdown */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium text-[#d4af37]">
              {rotationMsg}
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#22c55e] bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-0.5 rounded-full mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span>10s Execution ({tradeSecondsLeft}s left)</span>
            </div>
          </div>

          {/* Stop Bot Button */}
          <button
            onClick={handleStop}
            className="mt-1 flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-semibold text-xs transition-colors shadow-md shadow-red-950/40 cursor-pointer active:scale-95"
          >
            <StopCircle className="h-4 w-4" />
            Stop Bot
          </button>
        </div>
      )}

      {/* 5. Idle / Launch Setup Control Card (When Bot is not yet running) */}
      {botStatus !== "Initializing" && !isBotActive && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-5 flex flex-col items-center justify-center text-center gap-3.5 shadow-md">
          <div className="flex items-center justify-between w-full">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] text-text-secondary border border-white/10 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Bot Standby
            </span>

            {/* Market switcher tabs */}
            <div className="flex items-center bg-white/[0.04] border border-white/10 p-0.5 rounded-lg gap-1">
              <button
                type="button"
                onClick={() => setActiveMarket("crypto")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeMarket === "crypto"
                    ? "bg-gold text-black shadow font-bold"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                Crypto
              </button>
              <button
                type="button"
                onClick={() => setActiveMarket("forex")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  activeMarket === "forex"
                    ? "bg-gold text-black shadow font-bold"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                Forex
              </button>
            </div>
          </div>

          {/* Starting Capital config */}
          <div className="w-full flex items-center justify-between gap-3 text-xs bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-[#8e8e93] font-medium">Trade Amount ({currency})</span>
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted text-xs font-mono">{currencySymbol(currency)}</span>
              <input
                type="number"
                min="10"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-right text-xs font-mono font-bold text-white focus:outline-none focus:border-gold"
                placeholder="100"
              />
            </div>
          </div>

          {isBalanceInsufficient && (
            <div className="text-[11px] text-rose-400 bg-rose-500/[0.03] border border-rose-500/20 p-2 rounded-lg flex items-center gap-1.5 w-full">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>Insufficient balance. Required: {formatCurrency(amtNum, currency)}</span>
            </div>
          )}

          {isLimitReached && (
            <div className="text-[11px] text-rose-400 bg-rose-500/[0.03] border border-rose-500/20 p-2 rounded-lg flex items-center gap-1.5 w-full">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>Account limit reached. Deposit to unlock higher trading limit.</span>
            </div>
          )}

          <button
            onClick={handleStartBot}
            disabled={isLimitReached || isNaN(amtNum) || amtNum <= 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Start Bot
          </button>
        </div>
      )}

      {/* 6. Live Trade Feed Card (Matches user screenshot) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d0e] p-5 shadow-md flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            <h3 className="font-bold text-white text-sm">Live Trade Feed</h3>
          </div>
          <span className="text-[11px] font-mono text-[#8e8e93]">
            {feedTrades.length} executed
          </span>
        </div>

        <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-0.5">
          {feedTrades.map((t) => {
            const isWin = t.profitLoss >= 0;
            const isBuy = t.direction === "BUY";
            return (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-[#14151a] border border-white/[0.04] p-3 text-xs hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      isBuy
                        ? "bg-emerald-950/40 text-[#22c55e] border border-emerald-500/20"
                        : "bg-rose-950/40 text-[#ef4444] border border-rose-500/20"
                    }`}
                  >
                    {isBuy ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm leading-tight">{t.pair}</p>
                    <p
                      className={`text-[11px] font-semibold leading-tight mt-0.5 ${
                        isBuy ? "text-[#22c55e]" : "text-[#ef4444]"
                      }`}
                    >
                      {t.direction}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-bold font-mono text-sm ${
                    isWin ? "text-[#22c55e]" : "text-[#ef4444]"
                  }`}
                >
                  {isWin ? "+" : ""}
                  {formatCurrency(t.profitLoss, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
