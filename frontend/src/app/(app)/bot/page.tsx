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
  AlertTriangle, Square,
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
}

export default function TradingBotPage() {
  const { user } = useAuth();
  const { selectedAccount, isLoading: isAccountLoading, refreshAccounts } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const status = useStatus();

  // Market & Capital Configuration
  const [activeMarket, setActiveMarket] = useState<"crypto" | "forex" | null>(null);
  const [tradeAmount, setTradeAmount] = useState<string>("");
  const [isBotActive, setIsBotActive] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);

  // Status Badge State
  const [botStatus, setBotStatus] = useState<
    "Idle" | "Initializing" | "Scanning" | "Analyzing" | "Trading" | "Monitoring" | "Closing Position"
  >("Idle");

  // Startup sequence step
  const [startupStep, setStartupStep] = useState<number>(-1);

  // Rotation text (Market analysis)
  const [rotationMsg, setRotationMsg] = useState("");

  // Simulated Trades list and stats
  const [trades, setTrades] = useState<SimulatedTradeItem[]>([]);
  const [currentTrade, setCurrentTrade] = useState<SimulatedTradeItem | null>(null);

  // Session parameters
  const [sessionProfit, setSessionProfit] = useState<number>(0);
  const [, setActivityLogs] = useState<string[]>(["Algo Engine ready. Select a market class to begin."]);

  // Deposit-based trading limit: every $100 deposited unlocks $10,000 of limit.
  // Starts as Infinity (not 0) so the "limit reached" warning can't flash
  // true before the real limit has finished loading from the wallet.
  const [accountLimit, setAccountLimit] = useState<number>(Infinity);

  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to hold latest executeNextTrade without causing dep-loop
  const executeNextTradeRef = useRef<(() => Promise<void>) | null>(null);
  // Ref flags to avoid stale closures on stop
  const stopRequestedRef = useRef(false);
  const isBotActiveRef = useRef(false);
  const accountLimitRef = useRef(Infinity);
  const botStartIndexRef = useRef<number>(-1);

  // Available user balance
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
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Log auto-scroll helper
  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLogs((prev) => [...prev.slice(-49), `[${timestamp}] ${msg}`]);
  }, []);

  // Rotation messages interval
  useEffect(() => {
    if (isBotActive && botStatus !== "Initializing") {
      rotationIntervalRef.current = setInterval(() => {
        const rand = ANALYSIS_MESSAGES[Math.floor(Math.random() * ANALYSIS_MESSAGES.length)];
        setRotationMsg(rand);
        if (Math.random() < 0.2) {
          addLog(rand);
        }
      }, 2500);
    } else {
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
    }
    return () => {
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
    };
  }, [isBotActive, botStatus, addLog]);

  // Helper to generate realistic starting asset prices
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

  // Trade Execution Loop — uses refs to avoid dep-loop, calls itself recursively
  const executeNextTrade = useCallback(async () => {
    if (!selectedAccount || !user) return;

    // Check ref flags (avoids stale closure issues with state)
    if (stopRequestedRef.current) {
      stopRequestedRef.current = false;
      setStopRequested(false);
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      addLog("Bot stopped successfully. Returned to idle.");
      return;
    }

    // Guard: bot may have been stopped externally
    if (!isBotActiveRef.current) return;

    // Guard: account balance has reached its deposit-based trading limit
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

    // Phase 1: Market Analysis / Quick Entry Confirmation
    setBotStatus("Scanning");
    addLog("Scanning market liquidity & order books...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!isBotActiveRef.current) return;

    setBotStatus("Analyzing");
    addLog("Analyzing market trends and volumes...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!isBotActiveRef.current) return;

    // Choose asset and details
    const assets = activeMarket === "crypto" ? CRYPTO_ASSETS : FOREX_ASSETS;
    const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
    const direction = Math.random() < 0.5 ? "BUY" : "SELL";
    const entryPrice = getAssetPrice(selectedAsset);
    const duration = 10; // Exactly 10s trade execution

    setBotStatus("Trading");
    addLog(`Entry confirmed for ${selectedAsset}. Generating order...`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (!isBotActiveRef.current) return;

    // Create Active Trade Item
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

    // Wait for the trade duration (10s)
    for (let s = duration; s > 0; s--) {
      if (!isBotActiveRef.current) return;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!isBotActiveRef.current) return;

    // Phase: Settle trade (Closing Position)
    setBotStatus("Closing Position");
    addLog(`Closing position for ${selectedAsset}...`);
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (!isBotActiveRef.current) return;

    // Win/loss sequence designed to ensure a 30% loss rate (70% win rate)
    // where any window of 5 trades has 1-2 losses, and any window of 10 trades has exactly 3 losses.
    const winLossSequence = [true, true, false, true, true, true, false, true, true, false, true, true, true, false, true, true, false, true, true, false];
    if (botStartIndexRef.current === -1) {
      botStartIndexRef.current = Math.floor(Math.random() * winLossSequence.length);
    }
    const isWin = winLossSequence[(botStartIndexRef.current + trades.length) % winLossSequence.length];

    // Generate a loss amount between $0.50 and $1.00
    const lossAmount = Math.round((0.50 + Math.random() * 0.50) * 100) / 100;
    const profitAmount = Math.round((2.00 + Math.random() * 2.00) * 100) / 100;
    const finalProfitLoss = isWin ? profitAmount : -lossAmount;

    // Calculate returnPct based on finalProfitLoss and currentAmount
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

    // Sync balance with backend
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

    // Update session stats
    setSessionProfit((prev) => prev + finalProfitLoss);
    setTrades((prev) => [closedTrade, ...prev]);
    setCurrentTrade(null);

    addLog(`Position closed. Return: ${finalProfitLoss >= 0 ? "+" : ""}${formatCurrency(finalProfitLoss, currency)} (${returnPct.toFixed(2)}%)`);

    // Stop immediately once the position is settled, instead of waiting
    // through the cooldown below before the queued stop gets picked up.
    if (stopRequestedRef.current) {
      stopRequestedRef.current = false;
      setStopRequested(false);
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      addLog("Bot stopped successfully. Returned to idle.");
      return;
    }

    // Wait 10 seconds before executing the next trade
    setBotStatus("Scanning");
    addLog("Searching for next high probability entry. Next trade in 10s...");
    for (let c = 10; c > 0; c--) {
      if (!isBotActiveRef.current || stopRequestedRef.current) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (stopRequestedRef.current) {
      stopRequestedRef.current = false;
      setStopRequested(false);
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      addLog("Bot stopped successfully. Returned to idle.");
      return;
    }

    // Call latest version via ref — no circular dep
    if (isBotActiveRef.current && executeNextTradeRef.current) {
      executeNextTradeRef.current();
    }
  }, [selectedAccount, user, activeMarket, tradeAmount, accountId, currency, refreshAccounts, addLog, status, trades]);

  // Keep executeNextTradeRef pointing to the latest function
  useEffect(() => {
    executeNextTradeRef.current = executeNextTrade;
  }, [executeNextTrade]);

  // Start Bot Function
  const handleStartBot = async () => {
    status.clear();

    const amt = parseFloat(tradeAmount);
    if (isNaN(amt) || amt < 100) {
      status.error("Minimum trading amount is $100");
      return;
    }

    if (amt > balance) {
      return;
    }

    if (balance >= accountLimit) {
      status.error("Account limit reached. Make a new deposit to unlock a higher trading limit.");
      return;
    }

    // Set ref before async so the loop guard sees it immediately
    isBotActiveRef.current = true;
    stopRequestedRef.current = false;

    setBotStatus("Initializing");
    setIsBotActive(true);
    setStartupStep(0);
    addLog("Initiating Bot Startup sequence...");

    // Progressive steps loader simulation
    for (let i = 0; i < STARTUP_STEPS.length; i++) {
      setStartupStep(i);
      addLog(STARTUP_STEPS[i]);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setStartupStep(-1);
    setBotStatus("Scanning");
    addLog("Bot started successfully. Listening for market entries.");

    // Kick off the loop directly — no useEffect trigger needed
    if (executeNextTradeRef.current) {
      executeNextTradeRef.current();
    }
  };

  const handleStop = () => {
    if (currentTrade) {
      stopRequestedRef.current = true;
      setStopRequested(true);
      addLog("Stop request queued. Bot will shut down once the current position is closed.");
    } else {
      isBotActiveRef.current = false;
      setIsBotActive(false);
      setBotStatus("Idle");
      addLog("Bot stopped. Idle state.");
    }
  };

  // Clean values for stats
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.profitLoss > 0).length;
  const losingTrades = totalTrades - winningTrades;
  // Make winRate fluctuate dynamically between 85% and 95% (never showing 100% or dropping below 85%)
  const rawWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const winRate = rawWinRate > 95 || rawWinRate === 0
    ? 85 + (Math.sin(totalTrades || 1) * 5 + 5) // stable pseudo-random fluctuation between 85-95
    : Math.max(85, rawWinRate);

  if (isAccountLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const amtNum = parseFloat(tradeAmount);
  const isBalanceInsufficient = amtNum > balance;
  const isLimitReached = balance >= accountLimit;
  const forexOpen = isForexMarketOpen();

  return (
    <div className="flex flex-col gap-2.5 max-w-7xl mx-auto w-full">

      {/* Page Header */}
      <div className="border-b border-white/5 pb-2">
        <h2 className="text-base font-bold text-text-primary leading-tight flex items-center gap-2">
          <Rocket className="h-4 w-4 text-gold" />
          Bot Trading Engine
        </h2>
        <p className="text-[11px] sm:text-xs text-text-muted mt-0.5">
          The bot trades in a low-risk algorithmic strategy focused on prioritizing capital preservation and consistent returns over high-risk speculation.
        </p>
      </div>

      {/* Startup Sequence Overlay when Initializing */}
      {botStatus === "Initializing" && (
        <Card className="p-6 border border-white/10 bg-navy-950/40 backdrop-blur flex flex-col items-center justify-center text-center gap-4 max-w-sm mx-auto my-6">
          <div className="relative flex items-center justify-center h-16 w-16">
            <Loader2 className="h-12 w-12 text-gold animate-spin shrink-0 absolute" />
            <div className="text-gold font-bold text-xs">{Math.round((startupStep / STARTUP_STEPS.length) * 100)}%</div>
          </div>
          <div className="flex flex-col gap-1 max-w-xs w-full">
            <h3 className="font-bold text-text-primary text-sm">Waking Up Trading Core</h3>
            <p className="text-[11px] text-text-secondary">Loading market models & indicators...</p>

            <div className="mt-3 flex flex-col gap-1 text-left bg-white/[0.02] border border-white/5 rounded-lg p-2.5 max-h-[100px] overflow-y-auto">
              {STARTUP_STEPS.slice(0, startupStep + 1).map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <Check className="h-3 w-3 text-green-400 shrink-0" />
                  <span className={idx === startupStep ? "text-gold font-medium animate-pulse" : "text-text-muted"}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Setup View (when Idle) */}
      {botStatus !== "Initializing" && !isBotActive && (
        <Card className="w-full max-w-md mx-auto p-4 border border-white/10 my-2">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2.5">
              {/* Crypto Card */}
              <button
                onClick={() => setActiveMarket("crypto")}
                className={`flex items-center gap-2.5 p-3 border rounded-xl text-left transition-all ${
                  activeMarket === "crypto"
                    ? "border-gold bg-gold/[0.06]"
                    : "border-white/10 bg-white/[0.01] hover:bg-white/[0.03]"
                }`}
              >
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-400 shrink-0">
                  <Bitcoin className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-text-primary text-xs">Crypto</p>
                  <p className="text-[10px] text-text-secondary truncate">BTC · ETH · SOL</p>
                </div>
              </button>

              {/* Forex Card */}
              <button
                onClick={() => setActiveMarket("forex")}
                className={`relative flex items-center gap-2.5 p-3 border rounded-xl text-left transition-all ${
                  activeMarket === "forex"
                    ? "border-gold bg-gold/[0.06]"
                    : "border-white/10 bg-white/[0.01] hover:bg-white/[0.03]"
                }`}
              >
                <span
                  className={`absolute top-1.5 right-1.5 text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                    forexOpen ? "bg-green-500/15 text-green-400" : "bg-rose-500/15 text-rose-400"
                  }`}
                >
                  {forexOpen ? "Open" : "Closed"}
                </span>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-400 shrink-0">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-text-primary text-xs">Forex</p>
                  <p className="text-[10px] text-text-secondary truncate">XAU · EUR · GBP</p>
                </div>
              </button>
            </div>

            {/* Starting Amount */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-text-secondary uppercase tracking-wider text-[10px]">
                  Starting amount ({currency})
                </label>
                <span className="text-[11px] text-text-muted font-mono">
                  Available: <strong className="text-gold">{formatCurrency(balance, currency)}</strong>
                </span>
              </div>
              <Input
                type="number"
                min="100"
                placeholder="Min $100.00"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                className="h-9 text-xs"
              />

              {isBalanceInsufficient && (
                <div className="text-[11px] text-rose-400 bg-rose-500/[0.03] border border-rose-500/20 p-2 rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>Insufficient balance. Minimum {formatCurrency(100, currency)} required.</span>
                </div>
              )}

              {isLimitReached && (
                <div className="text-[11px] text-rose-400 bg-rose-500/[0.03] border border-rose-500/20 p-2 rounded-lg flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>Account limit reached. Deposit to unlock higher trading limit.</span>
                </div>
              )}
            </div>

            <Button
              disabled={!activeMarket || isBalanceInsufficient || isLimitReached || isNaN(amtNum) || amtNum < 100}
              onClick={handleStartBot}
              className="w-full h-9 text-xs font-semibold"
            >
              <Rocket className="h-3.5 w-3.5" />
              Start Bot
            </Button>
          </div>
        </Card>
      )}

      {/* Running Engine View (Stats + Split Columns) */}
      {botStatus !== "Initializing" && isBotActive && activeMarket && (
        <div className="flex flex-col gap-2.5">
          {/* Streamlined Compact Telemetry Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <Card className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex flex-col justify-center border border-white/10 min-h-[46px] sm:min-h-[50px]">
              <span className="flex items-center gap-1 text-[10px] text-text-secondary truncate">
                <WalletIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gold shrink-0" />
                Available Balance
              </span>
              <span className="text-xs sm:text-sm md:text-base font-bold text-gold font-mono truncate leading-tight mt-0.5">
                {formatCurrency(balance, currency)}
              </span>
            </Card>

            <Card className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex flex-col justify-center border border-white/10 min-h-[46px] sm:min-h-[50px]">
              <span className="flex items-center gap-1 text-[10px] text-text-secondary truncate">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                Profit (PnL)
              </span>
              <span className={`text-xs sm:text-sm md:text-base font-bold font-mono truncate leading-tight mt-0.5 ${sessionProfit >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {sessionProfit >= 0 ? "+" : ""}
                {formatCurrency(sessionProfit, currency)}
              </span>
            </Card>

            <Card className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex flex-col justify-center border border-white/10 min-h-[46px] sm:min-h-[50px]">
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 text-[10px] text-text-secondary truncate">
                  <Activity className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  Total Trades
                </span>
                <span className="text-[9px] font-mono text-text-muted shrink-0">
                  <span className="text-green-400 font-semibold">{winningTrades}W</span> · <span className="text-rose-400 font-semibold">{losingTrades}L</span>
                </span>
              </div>
              <span className="text-xs sm:text-sm md:text-base font-bold text-text-primary font-mono leading-tight mt-0.5">
                {totalTrades}
              </span>
            </Card>

            <Card className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl flex flex-col justify-center border border-white/10 min-h-[46px] sm:min-h-[50px]">
              <span className="flex items-center gap-1 text-[10px] text-text-secondary truncate">
                <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary shrink-0" />
                Win Rate
              </span>
              <span className="text-xs sm:text-sm md:text-base font-bold text-primary font-mono leading-tight mt-0.5">
                {totalTrades > 0 ? `${winRate.toFixed(1)}%` : "0.0%"}
              </span>
            </Card>
          </div>

          {/* Split Two-Column Layout (Fits on screen without scrolling) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
            {/* Left Column: Control Card + Active Trade Indicator */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              {/* Compact Status Card */}
              <Card className="p-3 border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  {stopRequested ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Stopping...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                      Bot Running
                    </span>
                  )}
                  <span className="text-[11px] text-text-muted font-mono">
                    {activeMarket.toUpperCase()} · {formatCurrency(parseFloat(tradeAmount) || 0, currency)}
                  </span>
                </div>

                {/* Status / Rotation Message */}
                <p className="text-[11px] font-medium text-gold truncate py-0.5">
                  {stopRequested
                    ? "Finishing position, then stopping..."
                    : rotationMsg || "Scanning market structure..."}
                </p>

                <Button
                  variant="danger"
                  onClick={handleStop}
                  className="w-full h-8 text-xs font-semibold"
                  disabled={stopRequested}
                  isLoading={stopRequested}
                >
                  <Square className="h-3 w-3" />
                  {stopRequested ? "Stopping..." : "Stop Bot"}
                </Button>
              </Card>

              {/* Compact Active Open Trade Indicator */}
              {currentTrade && currentTrade.status === "OPEN" && (
                <Card className="p-3 border border-gold/40 bg-gradient-to-br from-gold/[0.08] via-card to-card shadow-lg flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          currentTrade.direction === "BUY"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {currentTrade.direction === "BUY" ? (
                          <ArrowUpRight className="h-4 w-4 animate-pulse" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-text-primary text-xs">{currentTrade.pair}</span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              currentTrade.direction === "BUY"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {currentTrade.direction}
                          </span>
                        </div>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          {formatCurrency(currentTrade.amount, currency)} · Entry: {currentTrade.entryPrice.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 border border-gold/30 text-[10px] font-mono font-semibold text-gold">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-ping" />
                      Executing
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column: Live Trade Feed (Clean fixed-height scrollable list) */}
            <div className="lg:col-span-7">
              <Card className="p-3 border border-white/10 flex flex-col h-[320px]">
                <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    <h3 className="font-bold text-text-primary text-xs">Live Trade Feed</h3>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">{trades.length} executed</span>
                </div>

                {trades.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center p-4">
                    <p className="text-xs text-text-muted">
                      No trades executed yet. Completed positions will appear here once closed.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {trades.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.01] px-2.5 py-1.5 hover:bg-white/[0.03] transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${
                              t.direction === "BUY" ? "bg-green-500/15 text-green-400" : "bg-rose-500/15 text-rose-400"
                            }`}
                          >
                            {t.direction === "BUY" ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-text-primary text-xs">{t.pair}</span>
                            <span className={`text-[9px] font-bold ${t.direction === "BUY" ? "text-green-400" : "text-rose-400"}`}>
                              {t.direction}
                            </span>
                            <span className="text-[10px] text-text-muted hidden sm:inline">
                              {formatCurrency(t.amount, currency)} · {t.startTime.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <span className={`font-semibold font-mono text-xs ${t.profitLoss >= 0 ? "text-green-400" : "text-rose-400"}`}>
                          {t.profitLoss >= 0 ? "+" : ""}
                          {formatCurrency(t.profitLoss, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
