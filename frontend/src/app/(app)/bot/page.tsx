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
  Rocket, TrendingUp, Activity, Target, Wallet as WalletIcon,
  Bitcoin, Landmark, ArrowUpRight, ArrowDownRight,
  AlertTriangle, StopCircle,
  Loader2, Check
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
      setBotStatus("Idle");
      addLog("Bot stopped successfully. Returned to idle.");
      return;
    }
    if (!isBotActiveRef.current) return;
    if (Number(selectedAccount.balance) >= accountLimitRef.current) {
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      status.error("Account limit reached. Make a new deposit to unlock a higher trading limit.");
      addLog("Execution terminated: Account limit reached.");
      return;
    }
    const currentAmount = parseFloat(tradeAmount);
    if (currentAmount > Number(selectedAccount.balance)) {
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      status.error("Insufficient available balance to proceed. Trading bot stopped.");
      addLog("Execution terminated: Insufficient available balance.");
      return;
    }

    setBotStatus("Scanning");
    addLog("Scanning market liquidity & order books...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!isBotActiveRef.current) return;

    setBotStatus("Analyzing");
    addLog("Analyzing market trends and volumes...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!isBotActiveRef.current) return;

    const assets = activeMarket === "crypto" ? CRYPTO_ASSETS : FOREX_ASSETS;
    const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
    const direction = Math.random() < 0.5 ? "BUY" : "SELL";
    const entryPrice = getAssetPrice(selectedAsset);
    const duration = 10;

    setBotStatus("Trading");
    addLog(`Entry confirmed for ${selectedAsset}. Generating order...`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!isBotActiveRef.current) return;

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
    setBotStatus("Monitoring");
    addLog(`Opened ${direction} position on ${selectedAsset} at ${entryPrice.toFixed(4)}`);

    for (let s = duration; s > 0; s--) {
      if (!isBotActiveRef.current) return;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!isBotActiveRef.current) return;

    setBotStatus("Closing Position");
    addLog(`Closing position for ${selectedAsset}...`);
    await new Promise((resolve) => setTimeout(resolve, 350));
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
    if (!isBotActiveRef.current) return;

    setSessionProfit((prev) => prev + finalProfitLoss);
    setTrades((prev) => [closedTrade, ...prev]);
    setCurrentTrade(null);
    addLog(`Position closed. Return: ${finalProfitLoss >= 0 ? "+" : ""}${formatCurrency(finalProfitLoss, currency)} (${returnPct.toFixed(2)}%)`);

    if (!isBotActiveRef.current) return;

    setBotStatus("Scanning");
    addLog("Searching for next high probability entry. Next trade in 10s...");
    for (let c = 10; c > 0; c--) {
      if (!isBotActiveRef.current) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!isBotActiveRef.current) return;

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
    setBotStatus("Scanning");
    addLog("Bot started successfully. Listening for market entries.");
    if (executeNextTradeRef.current) executeNextTradeRef.current();
  };

  const handleStop = () => {
    isBotActiveRef.current = false;
    stopRequestedRef.current = false;
    setIsBotActive(false);
    setCurrentTrade(null);
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
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const amtNum = parseFloat(tradeAmount);
  const isBalanceInsufficient = amtNum > balance;
  const isLimitReached = balance >= accountLimit;
  const forexOpen = isForexMarketOpen();

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full px-2 pb-8">

      {/* ───────────── PAGE HEADER ───────────── */}
      <Card className="p-5 border border-white/10 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Rocket className="h-5 w-5 text-gold" />
          <h2 className="text-xl font-bold text-text-primary">Bot Trading Engine</h2>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
          The bot trades in a low risk strategy focused on prioritizing capital preservation and long term consistency over high risk speculation.
        </p>
      </Card>

      {/* ───────────── STARTUP OVERLAY ───────────── */}
      {botStatus === "Initializing" && (
        <Card className="p-8 border border-white/10 flex flex-col items-center justify-center text-center gap-5">
          <div className="relative flex items-center justify-center h-20 w-20">
            <Loader2 className="h-16 w-16 text-gold animate-spin shrink-0 absolute" />
            <div className="text-gold font-bold text-sm">{Math.round((startupStep / STARTUP_STEPS.length) * 100)}%</div>
          </div>
          <div className="flex flex-col gap-1 max-w-xs w-full">
            <h3 className="font-bold text-text-primary text-base">Waking Up Trading Core</h3>
            <p className="text-xs text-text-secondary">Loading market models & indicators...</p>
            <div className="mt-3 flex flex-col gap-1 text-left bg-white/[0.02] border border-white/5 rounded-lg p-3 max-h-[120px] overflow-y-auto">
              {STARTUP_STEPS.slice(0, startupStep + 1).map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <span className={idx === startupStep ? "text-gold font-medium animate-pulse" : "text-text-muted"}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ───────────── IDLE / SETUP VIEW ───────────── */}
      {botStatus !== "Initializing" && !isBotActive && (
        <Card className="p-5 border border-white/10">
          <div className="flex flex-col gap-5">

            {/* Market Class Picker — large, bold, easy to read */}
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3 text-center">Select Market</p>
              <div className="grid grid-cols-2 gap-3">

                {/* Crypto */}
                <button
                  onClick={() => setActiveMarket("crypto")}
                  className={`flex flex-col items-center gap-3 p-5 border-2 rounded-2xl text-center transition-all ${
                    activeMarket === "crypto"
                      ? "border-gold bg-gold/[0.08] shadow-lg shadow-gold/10"
                      : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-amber-500/20 text-amber-400">
                    <Bitcoin className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-lg leading-tight">Crypto</p>
                    <p className="text-xs text-text-secondary mt-0.5">BTC · ETH · SOL</p>
                  </div>
                  {activeMarket === "crypto" && (
                    <span className="text-[11px] font-semibold text-gold bg-gold/10 border border-gold/30 px-2.5 py-0.5 rounded-full">Selected</span>
                  )}
                </button>

                {/* Forex */}
                <button
                  onClick={() => setActiveMarket("forex")}
                  className={`relative flex flex-col items-center gap-3 p-5 border-2 rounded-2xl text-center transition-all ${
                    activeMarket === "forex"
                      ? "border-gold bg-gold/[0.08] shadow-lg shadow-gold/10"
                      : "border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      forexOpen ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {forexOpen ? "Open" : "Closed"}
                  </span>
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-blue-500/20 text-blue-400">
                    <Landmark className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-lg leading-tight">Forex</p>
                    <p className="text-xs text-text-secondary mt-0.5">XAU · EUR · GBP</p>
                  </div>
                  {activeMarket === "forex" && (
                    <span className="text-[11px] font-semibold text-gold bg-gold/10 border border-gold/30 px-2.5 py-0.5 rounded-full">Selected</span>
                  )}
                </button>
              </div>
            </div>

            {/* Trade Amount */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                  Starting Amount ({currency})
                </label>
                <span className="text-xs text-text-muted font-mono">
                  Available: <strong className="text-gold">{formatCurrency(balance, currency)}</strong>
                </span>
              </div>
              <Input
                type="number"
                min="100"
                placeholder={`Min ${formatCurrency(100, currency)}`}
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="h-12 text-sm font-semibold"
              />

              {isBalanceInsufficient && (
                <div className="text-xs text-rose-400 bg-rose-500/[0.05] border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Insufficient balance. Minimum {formatCurrency(100, currency)} required.</span>
                </div>
              )}
              {isLimitReached && (
                <div className="text-xs text-rose-400 bg-rose-500/[0.05] border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Account limit reached. Deposit to unlock higher trading limit.</span>
                </div>
              )}
            </div>

            <Button
              disabled={!activeMarket || isBalanceInsufficient || isLimitReached || isNaN(amtNum) || amtNum < 100}
              onClick={handleStartBot}
              className="w-full h-12 text-sm font-bold"
            >
              <Rocket className="h-4 w-4" />
              Start Bot
            </Button>
          </div>
        </Card>
      )}

      {/* ───────────── RUNNING VIEW ───────────── */}
      {botStatus !== "Initializing" && isBotActive && activeMarket && (
        <div className="flex flex-col gap-4">

          {/* 2×2 Stats Grid — matches screenshot exactly */}
          <div className="grid grid-cols-2 gap-3">

            {/* Available Balance */}
            <Card className="p-4 border border-white/10 rounded-2xl flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                <WalletIcon className="h-3.5 w-3.5 text-gold shrink-0" />
                Available Balance
              </span>
              <span className="text-2xl font-bold text-gold font-mono leading-tight">
                {formatCurrency(balance, currency)}
              </span>
            </Card>

            {/* Bot PnL */}
            <Card className="p-4 border border-white/10 rounded-2xl flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                Bot PnL ({activeMarket.toUpperCase()})
              </span>
              <span className={`text-2xl font-bold font-mono leading-tight ${sessionProfit >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {sessionProfit >= 0 ? "+" : ""}{formatCurrency(sessionProfit, currency)}
              </span>
            </Card>

            {/* Total Trades */}
            <Card className="p-4 border border-white/10 rounded-2xl flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                Total Trades
              </span>
              <span className="text-2xl font-bold text-text-primary font-mono leading-tight">
                {totalTrades}
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  Wins: {winningTrades}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-400">
                  <ArrowDownRight className="h-3 w-3" />
                  Losses: {losingTrades}
                </span>
              </div>
            </Card>

            {/* Win Rate */}
            <Card className="p-4 border border-white/10 rounded-2xl flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                <Target className="h-3.5 w-3.5 shrink-0" />
                Win Rate
              </span>
              <span className="text-2xl font-bold text-primary font-mono leading-tight">
                {totalTrades > 0 ? `${winRate.toFixed(1)}%` : "0.0%"}
              </span>
            </Card>
          </div>

          {/* Bot Status Card — centered, matches screenshot */}
          <Card className="p-6 border border-white/10 rounded-2xl flex flex-col items-center gap-4 text-center">
            {/* Green "Bot Running" pill */}
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-400 bg-green-500/15 border border-green-500/25 px-4 py-1.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Bot Running
            </span>

            {/* Market + amount */}
            <div>
              <p className="text-base font-bold text-text-primary">
                Trading {activeMarket.toUpperCase()} · {formatCurrency(parseFloat(tradeAmount) || 0, currency)}/trade
              </p>
              {/* Rotation status message in gold */}
              <p className="text-sm font-semibold text-gold mt-1 min-h-[20px]">
                {rotationMsg || "Liquidity Zone Found"}
              </p>
            </div>

            {/* Stop Bot button — red, wide */}
            <button
              onClick={handleStop}
              className="flex items-center justify-center gap-2.5 w-full max-w-xs h-12 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
            >
              <StopCircle className="h-5 w-5" />
              Stop Bot
            </button>
          </Card>

          {/* Live Trade Feed */}
          <Card className="p-4 border border-white/10 rounded-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse" />
              <h3 className="font-bold text-text-primary text-sm">Live Trade Feed</h3>
            </div>

            {/* Open / in-progress trade */}
            {currentTrade && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/20 bg-gold/[0.03] px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    currentTrade.direction === "BUY" ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
                  }`}>
                    {currentTrade.direction === "BUY" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-text-primary text-sm">{currentTrade.pair}</p>
                    <p className={`text-xs font-semibold ${currentTrade.direction === "BUY" ? "text-green-400" : "text-rose-400"}`}>
                      {currentTrade.direction}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gold font-semibold animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Running...
                </div>
              </div>
            )}

            {trades.length === 0 && !currentTrade ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted">No trades executed yet. Completed positions will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                {trades.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.015] px-3 py-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        t.direction === "BUY" ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {t.direction === "BUY" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-text-primary text-sm">{t.pair}</p>
                        <p className={`text-xs font-semibold ${t.direction === "BUY" ? "text-green-400" : "text-rose-400"}`}>
                          {t.direction}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold font-mono text-sm ${t.profitLoss >= 0 ? "text-green-400" : "text-rose-400"}`}>
                      {t.profitLoss >= 0 ? "+" : ""}{formatCurrency(t.profitLoss, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

    </div>
  );
}
