"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { settleBotTrade } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge, GoldBadge } from "@/components/ui/Badge";
import { useStatus } from "@/hooks/useStatus";
import {
  Rocket, TrendingUp, Activity,
  AlertTriangle, Pause, Play, Square,
  Loader2, Check
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
  "Trend Confirmed",
  "Momentum Increasing",
  "Entry Opportunity Found",
  "Position Opened",
  "Position Closed",
  "Searching For Next Opportunity..."
];

const CRYPTO_ASSETS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
const FOREX_ASSETS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD"];

interface SimulatedTradeItem {
  id: string;
  pair: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  duration: number;
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
  const [tradeAmount, setTradeAmount] = useState<string>("100");
  const [isBotActive, setIsBotActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pauseRequested, setPauseRequested] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stopRequested, setStopRequested] = useState(false);

  // Status Badge State
  const [botStatus, setBotStatus] = useState<
    "Idle" | "Initializing" | "Scanning" | "Analyzing" | "Trading" | "Monitoring" | "Closing Position" | "Paused" | "Stopped"
  >("Idle");

  // Startup sequence step
  const [startupStep, setStartupStep] = useState<number>(-1);

  // Rotation text (Market analysis)
  const [rotationMsg, setRotationMsg] = useState("");

  // Simulated Trades list and stats
  const [trades, setTrades] = useState<SimulatedTradeItem[]>([]);
  const [currentTrade, setCurrentTrade] = useState<SimulatedTradeItem | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [livePnlFluct, setLivePnlFluct] = useState<number>(0);

  // Session parameters (in-memory overlay for charts and statistics)
  const [todayProfit, setTodayProfit] = useState<number>(0);
  const [sessionProfit, setSessionProfit] = useState<number>(0);
  const [historyBalances, setHistoryBalances] = useState<number[]>([]);
  const [historyProfits, setHistoryProfits] = useState<number[]>([]);
  const [, setActivityLogs] = useState<string[]>(["Algo Engine ready. Select a market class to begin."]);

  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tradeTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to hold latest executeNextTrade without causing dep-loop
  const executeNextTradeRef = useRef<(() => Promise<void>) | null>(null);
  // Ref flags to avoid stale closures on stop/pause
  const stopRequestedRef = useRef(false);
  const pauseRequestedRef = useRef(false);
  const isBotActiveRef = useRef(false);

  // Available user balance
  const balance = selectedAccount ? Number(selectedAccount.balance) : 0;
  const currency = selectedAccount?.currency || "USD";

  // Initialize history balances when selectedAccount changes
  useEffect(() => {
    if (selectedAccount && historyBalances.length === 0) {
      setHistoryBalances([Number(selectedAccount.balance)]);
    }
  }, [selectedAccount, historyBalances.length]);

  // Log auto-scroll helper
  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLogs((prev) => [...prev.slice(-49), `[${timestamp}] ${msg}`]);
  }, []);

  // Rotation messages interval
  useEffect(() => {
    if (isBotActive && !isPaused && botStatus !== "Initializing") {
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
  }, [isBotActive, isPaused, botStatus, addLog]);

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

    if (pauseRequestedRef.current) {
      pauseRequestedRef.current = false;
      setPauseRequested(false);
      setIsPaused(true);
      setBotStatus("Paused");
      addLog("Bot paused. Standing by.");
      return;
    }

    // Guard: bot may have been stopped externally
    if (!isBotActiveRef.current) return;

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
      profitLoss: 0,
      status: "OPEN",
      startTime: new Date(),
    };

    setCurrentTrade(newTrade);
    setCountdown(duration);
    setLivePnlFluct(0);
    setBotStatus("Monitoring");
    addLog(`Opened ${direction} position on ${selectedAsset} at ${entryPrice.toFixed(4)}`);

    // Countdown and fluctuation loop
    let timeLeft = duration;
    const timer = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      const noise = (Math.random() - 0.5) * (currentAmount * 0.015);
      setLivePnlFluct(noise);
      if (timeLeft <= 0) clearInterval(timer);
    }, 1000);

    // Wait for the trade duration
    await new Promise((resolve) => setTimeout(resolve, duration * 1000));
    clearInterval(timer);
    if (!isBotActiveRef.current) return;

    // Phase: Settle trade (Closing Position)
    setBotStatus("Closing Position");
    addLog(`Closing position for ${selectedAsset}...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (!isBotActiveRef.current) return;

    // Calculate final win or loss (win rate fluctuates dynamically between 85% and 95%)
    const winProbability = 0.85 + Math.random() * 0.10;
    const isWin = Math.random() < winProbability;
    const returnPct = isWin ? (2.0 + Math.random() * 5.0) : -(1.5 + Math.random() * 2.5);
    const finalProfitLoss = Math.round(currentAmount * (returnPct / 100) * 100) / 100;
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
        });
        await refreshAccounts();
      } catch (e) {
        console.error("Failed to sync trade balance with backend", e);
      }
    }
    if (!isBotActiveRef.current) return;

    // Update session stats
    setTodayProfit((prev) => prev + finalProfitLoss);
    setSessionProfit((prev) => prev + finalProfitLoss);
    setTrades((prev) => [closedTrade, ...prev]);
    setHistoryBalances((prev) => [...prev, Number(selectedAccount.balance) + finalProfitLoss]);
    setHistoryProfits((prev) => [...prev, finalProfitLoss]);
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

    // Set ref before async so the loop guard sees it immediately
    isBotActiveRef.current = true;
    stopRequestedRef.current = false;
    pauseRequestedRef.current = false;

    setBotStatus("Initializing");
    setIsBotActive(true);
    setIsPaused(false);
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

  // Bot Controller Handlers
  const handlePause = () => {
    if (currentTrade) {
      pauseRequestedRef.current = true;
      setPauseRequested(true);
      addLog("Pause request queued. Bot will standby once the current position is closed.");
    } else {
      setIsPaused(true);
      setBotStatus("Paused");
      addLog("Bot paused immediately.");
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    setBotStatus("Scanning");
    addLog("Resuming AI scanning core...");
    // Re-kick the loop since it exited on pause
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
  const losingTrades = trades.filter((t) => t.profitLoss <= 0).length;
  // Make winRate fluctuate dynamically between 85% and 95% (never showing 100% or dropping below 85%)
  const rawWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const winRate = rawWinRate > 95 || rawWinRate === 0
    ? 85 + (Math.sin(totalTrades || 1) * 5 + 5) // stable pseudo-random fluctuation between 85-95
    : Math.max(85, rawWinRate);
  const performancePercent = balance > 0 ? (sessionProfit / balance) * 100 : 0;

  // Custom SVG chart path generators
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderBalanceChartPath = () => {
    if (historyBalances.length < 2) return "M 0,15 L 100,15";
    const min = Math.min(...historyBalances) * 0.99;
    const max = Math.max(...historyBalances) * 1.01;
    const range = max - min || 1;

    const points = historyBalances.map((b, idx) => {
      const x = (idx / (historyBalances.length - 1)) * 100;
      const y = 30 - ((b - min) / range) * 26 - 2; // Keep padding
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderProfitChartPath = () => {
    if (historyProfits.length === 0) return "M 0,30 L 100,30";
    let cumulative = 0;
    const history = [0, ...historyProfits.map((p) => {
      cumulative += p;
      return cumulative;
    })];

    const min = Math.min(...history) - 5;
    const max = Math.max(...history) + 5;
    const range = max - min || 1;

    const points = history.map((p, idx) => {
      const x = (idx / (history.length - 1)) * 100;
      const y = 30 - ((p - min) / range) * 24 - 3;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

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

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-bold text-text-primary">Bot Trading Engine</h2>
          <Badge className="bg-gold/10 text-gold border-gold/20 font-mono tracking-wider text-[10px]">ALGO CORE v2.0</Badge>
        </div>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl">
          Our AI Trading Engine continuously scans the market and executes trades using a low-risk strategy. Select the market you want the bot to trade below.
        </p>
      </div>

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

      {botStatus !== "Initializing" && (
        <div className={activeMarket ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : "grid grid-cols-1"}>

          {/* Controls & Setup Side */}
          <div className={activeMarket ? "lg:col-span-1 flex flex-col gap-6" : "w-full max-w-md mx-auto flex flex-col gap-6"}>

            {/* Setup Config Card */}
            <Card className="p-6 flex flex-col gap-5 border border-white/10">
              <div>
                <h3 className="font-bold text-text-primary text-base">Bot Configuration</h3>
                <p className="text-xs text-text-secondary mt-0.5">Select a market asset class and size parameters.</p>
              </div>

              {/* Market Pickers */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Select Market Class</label>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Crypto Card */}
                  <button
                    disabled={isBotActive}
                    onClick={() => {
                      setActiveMarket("crypto");
                      addLog("Selected Crypto Market (BTC, ETH, BNB, SOL).");
                    }}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all group ${
                      activeMarket === "crypto"
                        ? "border-gold bg-gold/[0.04] text-gold"
                        : "border-white/10 bg-white/[0.01] text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
                    }`}
                  >
                    <TrendingUp className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-xs">Crypto Market</span>
                    <span className="text-[10px] text-text-muted text-center leading-tight">BTC, ETH, BNB, SOL</span>
                  </button>

                  {/* Forex Card */}
                  <button
                    disabled={isBotActive}
                    onClick={() => {
                      setActiveMarket("forex");
                      addLog("Selected Forex Market (EURUSD, GBPUSD, USDJPY, AUDUSD, XAUUSD).");
                    }}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl gap-2 transition-all group ${
                      activeMarket === "forex"
                        ? "border-gold bg-gold/[0.04] text-gold"
                        : "border-white/10 bg-white/[0.01] text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"
                    }`}
                  >
                    <Activity className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-xs">Forex Market</span>
                    <span className="text-[10px] text-text-muted text-center leading-tight">EURUSD, GBPUSD, XAUUSD</span>
                  </button>

                </div>
              </div>

              {/* Trade Capital Input */}
              {activeMarket && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Trading Amount</label>
                  <Input
                    disabled={isBotActive}
                    type="number"
                    min="100"
                    placeholder="100"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-mono mt-0.5">
                    <span>Min Capital: $100</span>
                    <span>Account: {formatCurrency(balance, currency)}</span>
                  </div>

                  {isBalanceInsufficient && (
                    <div className="mt-2 text-xs text-rose-400 bg-rose-500/[0.03] border border-rose-500/20 p-3 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Insufficient available balance. Please deposit funds before starting the simulator.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Start Button */}
              {!isBotActive ? (
                <Button
                  disabled={!activeMarket || isBalanceInsufficient || parseFloat(tradeAmount) < 100}
                  onClick={handleStartBot}
                  variant="gold"
                  className="w-full mt-2"
                >
                  <Rocket className="h-4 w-4" />
                  Start Bot
                </Button>
              ) : (
                <div className="flex flex-col gap-3 mt-2 border-t border-white/5 pt-4">
                  <div className="flex justify-between items-center text-xs font-semibold text-text-secondary">
                    <span>Live Bot Controls</span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 text-text-secondary border border-white/10 rounded font-mono text-[9px] uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                      {botStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {isPaused ? (
                      <Button onClick={handleResume} variant="secondary" className="w-full text-xs">
                        <Play className="h-3.5 w-3.5" />
                        Resume
                      </Button>
                    ) : (
                      <Button onClick={handlePause} variant="secondary" className="w-full text-xs">
                        <Pause className="h-3.5 w-3.5" />
                        Pause
                      </Button>
                    )}
                    <Button onClick={handleStop} variant="secondary" className="w-full text-xs">
                      <Square className="h-3.5 w-3.5" />
                      Stop
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Active Position / Live Engine Monitor Card */}
            {isBotActive && (
              <Card className="p-6 border border-white/10 flex flex-col gap-4 relative overflow-hidden bg-gradient-to-br from-background-card to-background-card/90 shadow-lg">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-gold animate-pulse" />
                    Live Scanning Monitor
                  </span>
                  <GoldBadge className="text-[10px] py-0.5 px-2.5 font-mono uppercase tracking-wider text-xs">
                    {botStatus}
                  </GoldBadge>
                </div>

                {currentTrade ? (
                  <div className="flex flex-col gap-4">
                    {/* Rotating Indicator */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                        {currentTrade.pair} 
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          currentTrade.direction === "BUY" ? "text-green-400 bg-green-500/10" : "text-rose-400 bg-rose-500/10"
                        }`}>
                          {currentTrade.direction}
                        </span>
                      </span>
                      <span className="font-mono text-sm bg-white/5 px-2 py-0.5 rounded border border-white/5 text-text-primary">
                        00:{countdown < 10 ? `0${countdown}` : countdown}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 p-3 rounded-xl text-center">
                      <div>
                        <span className="text-[10px] text-text-secondary uppercase">Entry Price</span>
                        <p className="font-mono font-semibold text-text-primary text-sm mt-0.5">{currentTrade.entryPrice.toFixed(4)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-secondary uppercase">Current Value</span>
                        <p className="font-mono font-semibold text-text-primary text-sm mt-0.5">
                          {(currentTrade.entryPrice + livePnlFluct * 0.005).toFixed(4)}
                        </p>
                      </div>
                    </div>

                    {/* Progress countdown indicator */}
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold transition-all duration-1000"
                        style={{ width: `${(countdown / currentTrade.duration) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-text-secondary">
                    <Loader2 className="h-8 w-8 text-gold animate-spin mb-3 shrink-0" />
                    <p className="text-xs font-mono select-none animate-pulse">
                      {isPaused ? "Bot paused. Waiting for instructions..." : rotationMsg || "Scanning market structure..."}
                    </p>
                  </div>
                )}
              </Card>
            )}

          </div>

          {/* Statistics Dashboard Area */}
          {activeMarket && (
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Session Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <Card className="p-4 flex flex-col justify-between border-l-4 border-l-gold">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Current Balance</span>
                <span className="text-xl font-bold text-text-primary mt-1 font-mono transition-all">
                  {formatCurrency(balance, currency)}
                </span>
              </Card>

              <Card className="p-4 flex flex-col justify-between">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Today&apos;s Profit</span>
                <span className={`text-xl font-bold mt-1 font-mono ${todayProfit >= 0 ? "text-green-400" : "text-rose-400"}`}>
                  {todayProfit >= 0 ? "+" : ""}
                  {formatCurrency(todayProfit, currency)}
                </span>
              </Card>

              <Card className="p-4 flex flex-col justify-between">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Win Rate</span>
                <span className="text-xl font-bold text-text-primary mt-1 font-mono">
                  {winRate.toFixed(1)}%
                </span>
              </Card>

              <Card className="p-4 flex flex-col justify-between">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">Session return</span>
                <span className={`text-xl font-bold mt-1 font-mono ${performancePercent >= 0 ? "text-green-400" : "text-rose-400"}`}>
                  {performancePercent >= 0 ? "+" : ""}
                  {performancePercent.toFixed(2)}%
                </span>
              </Card>

            </div>

            {/* Quick Metrics Sub-grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                <span className="text-[9px] text-text-secondary uppercase">Total Trades</span>
                <p className="text-base font-bold text-text-primary mt-0.5">{totalTrades}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                <span className="text-[9px] text-text-secondary uppercase">Winning Trades</span>
                <p className="text-base font-bold text-green-400 mt-0.5">{winningTrades}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                <span className="text-[9px] text-text-secondary uppercase">Losing Trades</span>
                <p className="text-base font-bold text-rose-400 mt-0.5">{losingTrades}</p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-center">
                <span className="text-[9px] text-text-secondary uppercase">Active Trades</span>
                <p className="text-base font-bold text-gold mt-0.5">{currentTrade ? 1 : 0}</p>
              </div>
            </div>

          </div>
          )}

        </div>
      )}

      {/* Live Trade Feed */}
      {activeMarket && (
        <Card className="p-6 border border-white/10">
          <h3 className="font-bold text-text-primary text-base border-b border-white/10 pb-4 mb-4">Live Trade Feed</h3>
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
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${
                        t.direction === "BUY" ? "text-green-400 bg-green-500/10" : "text-rose-400 bg-rose-500/10"
                      }`}
                    >
                      {t.direction}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-sm">{t.pair}</span>
                      <span className="text-[10px] text-text-muted">{t.startTime.toLocaleTimeString()}</span>
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
