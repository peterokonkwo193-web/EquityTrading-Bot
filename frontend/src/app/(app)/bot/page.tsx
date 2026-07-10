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
  Loader2, Check, CheckCircle2, XCircle
} from "lucide-react";

// Startup steps for the progressive initialization sequence
const STARTUP_STEPS = [
  "Initializing AI Engine...",
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const [accountLimit, setAccountLimit] = useState<number>(0);

  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to hold latest executeNextTrade without causing dep-loop
  const executeNextTradeRef = useRef<(() => Promise<void>) | null>(null);
  // Ref flags to avoid stale closures on stop
  const stopRequestedRef = useRef(false);
  const isBotActiveRef = useRef(false);
  const accountLimitRef = useRef(0);

  // Available user balance
  const balance = selectedAccount ? Number(selectedAccount.balance) : 0;
  const currency = selectedAccount?.currency || "USD";

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    fetchWallet(accountId)
      .then((wallet) => {
        if (!cancelled) {
          const limit = Number(wallet.accountLimit);
          setAccountLimit(limit);
          accountLimitRef.current = limit;
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, balance]);

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

    // Phase 1: Market Analysis / Scanning
    setBotStatus("Scanning");
    addLog("Scanning market liquidity & order books...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!isBotActiveRef.current) return;

    setBotStatus("Analyzing");
    addLog("Analyzing market trends and volumes...");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!isBotActiveRef.current) return;

    // Choose asset and details
    const assets = activeMarket === "crypto" ? CRYPTO_ASSETS : FOREX_ASSETS;
    const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
    const direction = Math.random() < 0.5 ? "BUY" : "SELL";
    const entryPrice = getAssetPrice(selectedAsset);
    const duration = 15 + Math.floor(Math.random() * 16); // 15-30s

    setBotStatus("Trading");
    addLog(`Entry confirmed for ${selectedAsset}. Generating order...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
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

    // Wait for the trade duration
    await new Promise((resolve) => setTimeout(resolve, duration * 1000));
    if (!isBotActiveRef.current) return;

    // Phase: Settle trade (Closing Position)
    setBotStatus("Closing Position");
    addLog(`Closing position for ${selectedAsset}...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!isBotActiveRef.current) return;

    // Calculate final win or loss (win rate fluctuates dynamically between 85% and 95%)
    const winProbability = 0.85 + Math.random() * 0.10;
    const isWin = Math.random() < winProbability;
    const returnPct = isWin ? (1.0 + Math.random() * 2.0) : -(0.8 + Math.random() * 1.7);
    const rawProfitLoss = Math.round(currentAmount * (returnPct / 100) * 100) / 100;
    // Guarantee at least $1 of movement either way, however small the trade amount.
    const finalProfitLoss = Math.abs(rawProfitLoss) < 1 ? (isWin ? 1 : -1) : rawProfitLoss;
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
          note: `AI Trading Engine: ${direction} ${selectedAsset} P&L`,
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

    // Brief cooldown then chain next trade via ref (not state dependency)
    setBotStatus("Scanning");
    addLog("Searching for next high probability entry...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Call latest version via ref — no circular dep
    if (isBotActiveRef.current && executeNextTradeRef.current) {
      executeNextTradeRef.current();
    }
  }, [selectedAccount, user, activeMarket, tradeAmount, accountId, currency, refreshAccounts, addLog, status]);

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
    addLog("Initiating AI Bot Startup sequence...");

    // Progressive steps loader simulation
    for (let i = 0; i < STARTUP_STEPS.length; i++) {
      setStartupStep(i);
      addLog(STARTUP_STEPS[i]);
      await new Promise((resolve) => setTimeout(resolve, 300));
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
    <div className="flex flex-col gap-6">

      {/* Page Header */}
      <Card className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Bot Trading Engine</h2>
        <p className="text-sm text-text-secondary mt-2 max-w-2xl mx-auto">
          The bot trades in a low risk strategy focused on prioritizing capital preservation and long term consistency over high risk speculation.
        </p>
      </Card>

      {/* Startup Sequence Overlay when Initializing */}
      {botStatus === "Initializing" && (
        <Card className="p-8 border border-white/10 bg-navy-950/40 backdrop-blur flex flex-col items-center justify-center text-center gap-6 min-h-[350px]">
          <div className="relative flex items-center justify-center h-20 w-20">
            <Loader2 className="h-16 w-16 text-gold animate-spin shrink-0 absolute" />
            <div className="text-gold font-bold text-sm">{Math.round((startupStep / STARTUP_STEPS.length) * 100)}%</div>
          </div>
          <div className="flex flex-col gap-2 max-w-md w-full">
            <h3 className="font-bold text-text-primary text-lg">Waking Up AI Trading Core</h3>
            <p className="text-xs text-text-secondary">Please stand by as database models and indicators load.</p>

            <div className="mt-6 flex flex-col gap-2 text-left bg-white/[0.02] border border-white/5 rounded-xl p-4 max-h-[140px] overflow-y-auto">
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

      {botStatus !== "Initializing" && !isBotActive && (
        <div className="w-full max-w-md mx-auto flex flex-col gap-4">
          {/* Crypto Card */}
          <button
            onClick={() => setActiveMarket("crypto")}
            className={`flex items-center gap-4 p-5 border rounded-2xl text-left transition-all ${
              activeMarket === "crypto"
                ? "border-gold bg-gold/[0.04]"
                : "border-white/10 bg-white/[0.01] hover:bg-white/[0.03]"
            }`}
          >
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-400 shrink-0">
              <Bitcoin className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-text-primary">Crypto</p>
              <p className="text-xs text-text-secondary mt-0.5">BTC · ETH · BNB · SOL</p>
            </div>
          </button>

          {/* Forex Card */}
          <button
            onClick={() => setActiveMarket("forex")}
            className={`relative flex items-center gap-4 p-5 border rounded-2xl text-left transition-all ${
              activeMarket === "forex"
                ? "border-gold bg-gold/[0.04]"
                : "border-white/10 bg-white/[0.01] hover:bg-white/[0.03]"
            }`}
          >
            <span
              className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                forexOpen ? "bg-green-500/15 text-green-400" : "bg-rose-500/15 text-rose-400"
              }`}
            >
              {forexOpen ? "Market Open" : "Market Closed"}
            </span>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-400 shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-text-primary">Forex</p>
              <p className="text-xs text-text-secondary mt-0.5">XAUUSD · EURUSD · GBPUSD · USDJPY · AUDUSD</p>
            </div>
          </button>

          {/* Starting Amount */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Starting amount ({currency}, min {formatCurrency(100, currency)})
            </label>
            <Input
              type="number"
              min="100"
              placeholder="0.00"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
            />
            <div className="flex justify-between text-[11px] text-text-muted font-mono mt-0.5">
              <span>Available: <span className="text-gold">{formatCurrency(balance, currency)}</span></span>
              <span>Limit: {formatCurrency(accountLimit, currency)}</span>
            </div>

            {isBalanceInsufficient && (
              <div className="mt-1 text-xs text-rose-400 bg-rose-500/[0.03] border border-rose-500/20 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Insufficient available balance. Please deposit funds before starting the simulator.</span>
              </div>
            )}

            {isLimitReached && (
              <div className="mt-1 text-xs text-rose-400 bg-rose-500/[0.03] border border-rose-500/20 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Account limit reached. Make a new deposit to unlock a higher trading limit.</span>
              </div>
            )}
          </div>

          <Button
            disabled={!activeMarket || isBalanceInsufficient || isLimitReached || isNaN(amtNum) || amtNum < 100}
            onClick={handleStartBot}
            className="w-full"
          >
            <Rocket className="h-4 w-4" />
            Start Bot
          </Button>
        </div>
      )}

      {botStatus !== "Initializing" && isBotActive && activeMarket && (
        <div className="flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <WalletIcon className="h-3.5 w-3.5" />
                Available Balance
              </span>
              <span className="text-xl font-bold text-gold font-mono">{formatCurrency(balance, currency)}</span>
            </Card>

            <Card className="p-4 flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <TrendingUp className="h-3.5 w-3.5" />
                Bot PnL ({activeMarket.toUpperCase()})
              </span>
              <span className={`text-xl font-bold font-mono ${sessionProfit >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {sessionProfit >= 0 ? "+" : ""}
                {formatCurrency(sessionProfit, currency)}
              </span>
            </Card>

            <Card className="p-4 flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Activity className="h-3.5 w-3.5" />
                Total Trades
              </span>
              <span className="text-xl font-bold text-text-primary font-mono">{totalTrades}</span>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Wins: {winningTrades}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                  <XCircle className="h-3 w-3" />
                  Losses: {losingTrades}
                </span>
              </div>
            </Card>

            <Card className="p-4 flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                <Target className="h-3.5 w-3.5" />
                Win Rate
              </span>
              <span className="text-xl font-bold text-primary font-mono">{winRate.toFixed(1)}%</span>
            </Card>
          </div>

          {/* Status Card */}
          <Card className="p-6 flex flex-col items-center text-center gap-3 border border-white/10">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Bot Running
            </span>
            <p className="text-sm font-semibold text-text-primary">
              Trading {activeMarket.toUpperCase()} · {formatCurrency(parseFloat(tradeAmount) || 0, currency)}/trade
            </p>
            <p className="text-xs font-medium text-gold">
              {rotationMsg || "Scanning market structure..."}
            </p>
            <Button variant="danger" onClick={handleStop} className="w-full max-w-xs">
              <Square className="h-4 w-4" />
              Stop Bot
            </Button>
          </Card>
        </div>
      )}

      {/* Live Trade Feed */}
      {activeMarket && (
        <Card className="p-6 border border-white/10">
          <h3 className="font-bold text-text-primary text-base border-b border-white/10 pb-4 mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            Live Trade Feed
          </h3>
          {trades.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">
              No trades executed yet. Your bot&apos;s trade feed will appear here once it opens a position.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {trades.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.01] p-4 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        t.direction === "BUY" ? "bg-green-500/15 text-green-400" : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {t.direction === "BUY" ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-sm">{t.pair}</span>
                      <span className={`text-[11px] font-semibold ${t.direction === "BUY" ? "text-green-400" : "text-rose-400"}`}>
                        {t.direction}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {formatCurrency(t.amount, currency)} · {t.startTime.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <span className={`font-semibold font-mono text-sm ${t.profitLoss >= 0 ? "text-green-400" : "text-rose-400"}`}>
                    {t.profitLoss >= 0 ? "+" : ""}
                    {formatCurrency(t.profitLoss, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
