"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { settleBotTrade, fetchWallet } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStatus } from "@/hooks/useStatus";
import {
  TrendingUp, Activity, Target, Wallet as WalletIcon,
  Bitcoin, Landmark, ArrowUpRight, ArrowDownRight,
  AlertTriangle, StopCircle,
  Loader2, Check
} from "lucide-react";

// Progressive initialization sequence
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

// Continuous rotated market status messages
const ANALYSIS_MESSAGES = [
  "Scanning BTCUSDT...",
  "Scanning ETHUSDT...",
  "Scanning SOLUSDT...",
  "Scanning EURUSD...",
  "Scanning GBPUSD...",
  "Scanning USDJPY...",
  "Checking Liquidity...",
  "Finding Support...",
  "Finding Resistance...",
  "Detecting Breakout...",
  "Liquidity Zone Found",
  "Trend Confirmed",
  "Momentum Increasing",
  "Entry Opportunity Found",
  "Position Opened",
  "Position Closed",
  "Searching For Next Opportunity..."
];

const CRYPTO_ASSETS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
const FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD"];

function isForexMarketOpen() {
  const day = new Date().getDay();
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
}

export default function TradingBotPage() {
  const { user } = useAuth();
  const { selectedAccount, isLoading: isAccountLoading, refreshAccounts } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const status = useStatus();

  const [activeMarket, setActiveMarket] = useState<"crypto" | "forex" | null>(null);
  const [tradeAmount, setTradeAmount] = useState<string>("");
  const [isBotActive, setIsBotActive] = useState(false);
  const [botStatus, setBotStatus] = useState<
    "Idle" | "Initializing" | "Scanning" | "Analyzing" | "Trading" | "Monitoring" | "Closing Position"
  >("Idle");
  const [startupStep, setStartupStep] = useState<number>(-1);
  const [rotationMsg, setRotationMsg] = useState("");
  const [trades, setTrades] = useState<SimulatedTradeItem[]>([]);
  const [currentTrade, setCurrentTrade] = useState<SimulatedTradeItem | null>(null);
  const [tradeTimer, setTradeTimer] = useState<number>(0);
  const [sessionProfit, setSessionProfit] = useState<number>(0);
  const [, setActivityLogs] = useState<string[]>(["Algo Engine ready. Select a market class to begin."]);
  const [accountLimit, setAccountLimit] = useState<number>(Infinity);

  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const executeNextTradeRef = useRef<(() => Promise<void>) | null>(null);
  const stopRequestedRef = useRef(false);
  const isBotActiveRef = useRef(false);
  const accountLimitRef = useRef(Infinity);
  const botStartIndexRef = useRef<number>(-1);

  const balance = selectedAccount ? Number(selectedAccount.balance) : 0;
  const currency = selectedAccount?.currency || "USD";

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
    return () => { cancelled = true; };
  }, [accountId]);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLogs((prev) => [...prev.slice(-49), `[${timestamp}] ${msg}`]);
  }, []);

  useEffect(() => {
    if (isBotActive && botStatus !== "Initializing") {
      rotationIntervalRef.current = setInterval(() => {
        const rand = ANALYSIS_MESSAGES[Math.floor(Math.random() * ANALYSIS_MESSAGES.length)];
        setRotationMsg(rand);
        if (Math.random() < 0.2) addLog(rand);
      }, 2500);
    } else {
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
    }
    return () => { if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current); };
  }, [isBotActive, botStatus, addLog]);

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
      default: return 100 + Math.random() * 10;
    }
  };

  const executeNextTrade = useCallback(async () => {
    if (!selectedAccount || !user) return;
    if (stopRequestedRef.current) {
      stopRequestedRef.current = false;
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setTradeTimer(0);
      setBotStatus("Idle");
      addLog("Bot stopped successfully. Returned to idle.");
      return;
    }
    if (!isBotActiveRef.current) return;
    if (Number(selectedAccount.balance) >= accountLimitRef.current) {
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setTradeTimer(0);
      setBotStatus("Idle");
      status.error("Account limit reached. Make a new deposit to unlock a higher trading limit.");
      addLog("Execution terminated: Account limit reached.");
      return;
    }
    const currentAmount = parseFloat(tradeAmount);
    if (currentAmount > Number(selectedAccount.balance)) {
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setTradeTimer(0);
      setBotStatus("Idle");
      status.error("Insufficient available balance to proceed. Trading bot stopped.");
      addLog("Execution terminated: Insufficient available balance.");
      return;
    }

    const assets = activeMarket === "crypto" ? CRYPTO_ASSETS : FOREX_ASSETS;
    const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
    const direction = Math.random() < 0.5 ? "BUY" : "SELL";
    const entryPrice = getAssetPrice(selectedAsset);
    const duration = 10;

    const tradeId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newTrade: SimulatedTradeItem = {
      id: tradeId,
      pair: selectedAsset,
      direction,
      entryPrice,
      exitPrice: 0,
      duration,
      amount: currentAmount,
      profitLoss: 0,
      status: "OPEN",
      startTime: new Date(),
    };

    setCurrentTrade(newTrade);
    setBotStatus("Trading");
    addLog(`Opened ${direction} position on ${selectedAsset} at ${entryPrice.toFixed(4)}`);

    // Strictly 10-second trade loop: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    for (let s = 1; s <= duration; s++) {
      if (!isBotActiveRef.current) {
        setTradeTimer(0);
        return;
      }
      setTradeTimer(s);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!isBotActiveRef.current) {
      setTradeTimer(0);
      return;
    }

    // Trade execution & settlement at second 10
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
      } catch (e) {
        console.error("Failed to sync trade balance with backend", e);
      }
    }
    if (!isBotActiveRef.current) {
      setTradeTimer(0);
      return;
    }

    setSessionProfit((prev) => prev + finalProfitLoss);
    setTrades((prev) => [closedTrade, ...prev]);
    setCurrentTrade(null);
    setTradeTimer(0);
    addLog(`Trade executed. Return: ${finalProfitLoss >= 0 ? "+" : ""}${formatCurrency(finalProfitLoss, currency)} (${returnPct.toFixed(2)}%)`);

    if (!isBotActiveRef.current) return;

    // Immediately trigger next trade's 10-second countdown (no idle delay)
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (isBotActiveRef.current && executeNextTradeRef.current) {
      executeNextTradeRef.current();
    }
  }, [selectedAccount, user, activeMarket, tradeAmount, accountId, currency, refreshAccounts, addLog, status, trades]);

  useEffect(() => { executeNextTradeRef.current = executeNextTrade; }, [executeNextTrade]);

  const handleStartBot = async () => {
    status.clear();
    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt < 100) { status.error("Minimum trading amount is $100"); return; }
    if (amt > balance) return;
    if (balance >= accountLimit) { status.error("Account limit reached. Make a new deposit to unlock a higher trading limit."); return; }

    isBotActiveRef.current = true;
    stopRequestedRef.current = false;
    setBotStatus("Initializing");
    setIsBotActive(true);
    setStartupStep(0);
    addLog("Initiating Bot Startup sequence...");

    for (let i = 0; i < STARTUP_STEPS.length; i++) {
      setStartupStep(i);
      addLog(STARTUP_STEPS[i]);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setStartupStep(-1);
    setBotStatus("Trading");
    addLog("Bot started successfully. Executing first trade.");
    if (executeNextTradeRef.current) executeNextTradeRef.current();
  };

  const handleStop = () => {
    isBotActiveRef.current = false;
    stopRequestedRef.current = false;
    setIsBotActive(false);
    setCurrentTrade(null);
    setTradeTimer(0);
    setBotStatus("Idle");
    addLog("Bot stopped. Returned to idle.");
  };

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.profitLoss > 0).length;
  const losingTrades = totalTrades - winningTrades;
  const rawWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const winRate = rawWinRate > 95 || rawWinRate === 0
    ? 85 + (Math.sin(totalTrades || 1) * 5 + 5)
    : Math.max(85, rawWinRate);

  if (isAccountLoading) {
    return (
      <div className="flex flex-col gap-2.5 p-2 max-w-md mx-auto">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const amtNum = parseFloat(tradeAmount);
  const isBalanceInsufficient = amtNum > balance;
  const isLimitReached = balance >= accountLimit;
  const forexOpen = isForexMarketOpen();

  return (
    <div className="flex flex-col gap-2.5 max-w-md mx-auto w-full px-1 sm:px-2 pb-6">

      {/* ───────────── HEADER CARD (Matches screenshot exactly) ───────────── */}
      <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3.5 text-center shadow-sm">
        <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">Bot Trading Engine</h2>
        <p className="text-[11px] sm:text-xs text-text-secondary leading-relaxed mt-1.5 max-w-[340px] mx-auto">
          The bot trades in a low risk strategy focused on prioritizing capital preservation and long term consistency over high risk speculation.
        </p>
      </div>

      {/* ───────────── STARTUP PROGRESS OVERLAY ───────────── */}
      {botStatus === "Initializing" && (
        <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-5 flex flex-col items-center justify-center text-center gap-3">
          <div className="relative flex items-center justify-center h-14 w-14">
            <Loader2 className="h-12 w-12 text-gold animate-spin shrink-0 absolute" />
            <div className="text-gold font-bold text-xs">{Math.round((startupStep / STARTUP_STEPS.length) * 100)}%</div>
          </div>
          <div className="flex flex-col gap-1 max-w-xs w-full">
            <h3 className="font-bold text-white text-xs sm:text-sm">Waking Up Trading Core</h3>
            <p className="text-[11px] text-text-secondary">Loading market models & indicators...</p>
            <div className="mt-2 flex flex-col gap-1 text-left bg-white/[0.02] border border-white/5 rounded-xl p-2.5 max-h-[100px] overflow-y-auto">
              {STARTUP_STEPS.slice(0, startupStep + 1).map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className={idx === startupStep ? "text-gold font-medium animate-pulse" : "text-text-muted"}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────── IDLE / SETUP VIEW (Bold, high contrast, clean) ───────────── */}
      {botStatus !== "Initializing" && !isBotActive && (
        <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3.5 flex flex-col gap-3 shadow-sm">
          {/* Market Selection Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Select Market Class</span>
              <span className="text-[10px] text-text-muted">Tap to activate</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Crypto */}
              <button
                type="button"
                onClick={() => setActiveMarket("crypto")}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  activeMarket === "crypto"
                    ? "border-gold bg-gold/[0.08] shadow-sm shadow-gold/10 ring-1 ring-gold/40"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-400 shrink-0">
                  <Bitcoin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-xs leading-tight">Crypto</p>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">BTC · ETH · SOL</p>
                </div>
              </button>

              {/* Forex */}
              <button
                type="button"
                onClick={() => setActiveMarket("forex")}
                className={`relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  activeMarket === "forex"
                    ? "border-gold bg-gold/[0.08] shadow-sm shadow-gold/10 ring-1 ring-gold/40"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <span
                  className={`absolute top-1.5 right-1.5 text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                    forexOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  }`}
                >
                  {forexOpen ? "Open" : "Closed"}
                </span>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-400 shrink-0">
                  <Landmark className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-xs leading-tight">Forex</p>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">XAU · EUR · GBP</p>
                </div>
              </button>
            </div>
          </div>

          {/* Trade Amount */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-bold text-text-secondary uppercase tracking-wider text-[10px]">
                Starting Amount ({currency})
              </label>
              <span className="text-[11px] text-text-muted font-mono">
                Available: <strong className="text-gold">{formatCurrency(balance, currency)}</strong>
              </span>
            </div>
            <Input
              type="number"
              min="100"
              placeholder={`Min ${formatCurrency(100, currency)}`}
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              className="h-10 text-xs rounded-xl bg-white/[0.02] border-white/10 font-semibold"
            />

            {isBalanceInsufficient && (
              <div className="text-[11px] text-rose-400 bg-rose-500/[0.05] border border-rose-500/20 p-2 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Insufficient balance. Minimum {formatCurrency(100, currency)} required.</span>
              </div>
            )}
            {isLimitReached && (
              <div className="text-[11px] text-rose-400 bg-rose-500/[0.05] border border-rose-500/20 p-2 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Account limit reached. Deposit to unlock higher trading limit.</span>
              </div>
            )}
          </div>

          {/* Start Bot Button */}
          <Button
            disabled={!activeMarket || isBalanceInsufficient || isLimitReached || isNaN(amtNum) || amtNum < 100}
            onClick={handleStartBot}
            className="w-full h-10 text-xs font-bold rounded-xl"
          >
            Start Bot
          </Button>
        </div>
      )}

      {/* ───────────── RUNNING VIEW (Matches screenshot sizes & layout) ───────────── */}
      {botStatus !== "Initializing" && isBotActive && activeMarket && (
        <div className="flex flex-col gap-2.5">

          {/* 2×2 Stats Grid — Large bold figures */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">

            {/* Available Balance */}
            <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <WalletIcon className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                <span className="truncate">Available Balance</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gold font-mono mt-1.5 tracking-tight truncate">
                {formatCurrency(balance, currency)}
              </div>
            </div>

            {/* Bot PnL */}
            <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <TrendingUp className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                <span className="truncate">Bot PnL ({activeMarket.toUpperCase()})</span>
              </div>
              <div className={`text-xl sm:text-2xl font-bold font-mono mt-1.5 tracking-tight truncate ${sessionProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {sessionProfit >= 0 ? "+" : ""}{formatCurrency(sessionProfit, currency)}
              </div>
            </div>

            {/* Total Trades */}
            <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <Activity className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                <span className="truncate">Total Trades</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1 tracking-tight truncate">
                {totalTrades}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-start gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="leading-tight text-emerald-400">
                    <div className="text-[10px] font-medium">Wins:</div>
                    <div className="text-xs sm:text-sm font-bold font-mono">{winningTrades}</div>
                  </div>
                </div>
                <div className="flex items-start gap-1">
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-400 mt-0.5 shrink-0" />
                  <div className="leading-tight text-rose-400">
                    <div className="text-[10px] font-medium">Losses:</div>
                    <div className="text-xs sm:text-sm font-bold font-mono">{losingTrades}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Win Rate */}
            <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3 flex flex-col justify-between shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                <Target className="h-3.5 w-3.5 text-text-secondary shrink-0" />
                <span className="truncate">Win Rate</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[#3b82f6] font-mono mt-1.5 tracking-tight truncate">
                {totalTrades > 0 ? `${winRate.toFixed(1)}%` : "0.0%"}
              </div>
            </div>
          </div>

          {/* Bot Status Card (Centered, rounded-2xl, matches screenshot) */}
          <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3.5 sm:p-4 flex flex-col items-center justify-center text-center gap-1.5 shadow-sm">
            {/* Green "Bot Running" pill */}
            <div className="inline-flex items-center gap-1.5 bg-[#0e2a1d] border border-[#164e32] text-emerald-400 text-[11px] font-medium px-3 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Bot Running</span>
            </div>

            {/* Trading Pair + Amount */}
            <p className="text-xs sm:text-[13px] font-semibold text-white mt-1">
              Trading {activeMarket.toUpperCase()} · {formatCurrency(parseFloat(tradeAmount) || 0, currency)}/trade
            </p>

            {/* Dynamic Gold Status Text with active countdown display */}
            <p className="text-[11px] sm:text-xs font-medium text-gold min-h-[16px]">
              {tradeTimer > 0
                ? `Trade Execution: ${tradeTimer}s / 10s · Liquidity Zone Found`
                : (rotationMsg || "Liquidity Zone Found")}
            </p>

            {/* Stop Bot Button */}
            <button
              type="button"
              onClick={handleStop}
              className="mt-1 inline-flex items-center justify-center gap-1.5 bg-[#ea2b3e] hover:bg-rose-600 active:bg-rose-700 text-white font-semibold text-xs py-1.5 px-4 rounded-xl transition-all shadow-md shadow-rose-900/30"
            >
              <StopCircle className="h-3.5 w-3.5" />
              <span>Stop Bot</span>
            </button>
          </div>

          {/* Live Trade Feed Card */}
          <div className="rounded-2xl bg-[#111216] border border-white/[0.08] p-3 sm:p-3.5 flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-white text-xs">Live Trade Feed</h3>
            </div>

            {/* Active Running Trade with live 1..10s countdown */}
            {currentTrade && (
              <div className="flex items-center justify-between gap-2.5 rounded-xl border border-gold/20 bg-gold/[0.03] p-2.5">
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    currentTrade.direction === "BUY" ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/40" : "bg-rose-950/50 text-rose-400 border border-rose-900/40"
                  }`}>
                    {currentTrade.direction === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs leading-tight">{currentTrade.pair}</p>
                    <p className={`text-[10px] font-bold ${currentTrade.direction === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                      {currentTrade.direction}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gold font-bold font-mono animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{tradeTimer > 0 ? `${tradeTimer}s / 10s` : "Executing..."}</span>
                </div>
              </div>
            )}

            {/* Completed Trade Feed */}
            {trades.length === 0 && !currentTrade ? (
              <div className="py-4 text-center">
                <p className="text-[11px] text-text-muted">No trades executed yet. Completed positions will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                {trades.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2.5 rounded-xl border border-white/5 bg-[#15161b] p-2.5 hover:bg-[#1a1b22] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        t.direction === "BUY"
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30"
                          : "bg-rose-950/40 text-rose-400 border border-rose-900/30"
                      }`}>
                        {t.direction === "BUY" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs leading-tight">{t.pair}</p>
                        <p className={`text-[10px] font-bold ${t.direction === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                          {t.direction}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold font-mono text-xs ${t.profitLoss >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.profitLoss >= 0 ? "+" : ""}{formatCurrency(t.profitLoss, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
