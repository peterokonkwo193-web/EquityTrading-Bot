"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  sender: "user" | "bot";
  text: string;
  time: string;
}

export function AiSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: "Hello! I am your AI Support Assistant. Ask me anything about Equity Bot, deposits, withdrawals, bot settings, or currencies!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: userText, time: timeStr }]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI typing delay and respond
    setTimeout(() => {
      let botResponse = "";
      const lower = userText.toLowerCase();

      if (lower.includes("deposit") || lower.includes("pay") || lower.includes("send money")) {
        botResponse = "To deposit, navigate to the 'Wallet' page from the sidebar. Select your desired asset (BTC, ETH, USDT, USDC, BNB, or TRX) and your blockchain network. Copy our platform's wallet address, complete the transfer from your external wallet, input your amount, and submit. The deposit will be reviewed and credited in your local currency.";
      } else if (lower.includes("withdraw") || lower.includes("cash out")) {
        botResponse = "To request a withdrawal, go to the 'Wallet' page and select the 'Withdraw' tab. Choose your asset, network, specify the target destination address, and enter the amount. Withdrawals are processed and approved by an administrator within 24 hours.";
      } else if (lower.includes("bot") || lower.includes("trade") || lower.includes("algo")) {
        botResponse = "Our AI Trading Bot continuously scans the market and executes positions using a low-risk algorithmic strategy. Choose between the Crypto or Forex tabs, input your capital (minimum $100), and click 'Start Bot'. It runs continuous order cycles, displaying live P&L returns, and updates your account balance instantly upon settlement.";
      } else if (lower.includes("currency") || lower.includes("pound") || lower.includes("euro") || lower.includes("dollar")) {
        botResponse = "Equity Bot supports US Dollars ($), British Pounds (£), and Euros (€). You can choose your preferred currency on the register signup form or modify it at any time in the 'Settings' page.";
      } else if (lower.includes("admin") || lower.includes("role") || lower.includes("give profit")) {
        botResponse = "Administrators can review deposit/withdrawal requests and directly adjust balances or award profits using the 'Give Profit' action button in the Admin Panel list.";
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        botResponse = "Hello there! How can I assist you with your trading journey today?";
      } else {
        botResponse = "I can help you navigate deposits, withdrawals, bot trading stats, setting preferences, and currency display configurations. Please let me know if you would like me to explain any of these features in detail!";
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-black shadow-2xl hover:scale-105 transition-all duration-200 border border-gold/20"
          aria-label="Open AI support chat"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window Drawer */}
      {isOpen && (
        <div className="w-[340px] h-[450px] border border-white/10 bg-gradient-to-br from-background-card to-background-card/95 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-white/5 border-b border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gold/10 text-gold flex items-center justify-center border border-gold/20">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">AI Support Assistant</p>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  <span className="text-[9px] text-text-secondary uppercase">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
            {messages.map((msg, index) => {
              const isBot = msg.sender === "bot";
              return (
                <div
                  key={index}
                  className={`flex gap-2 max-w-[85%] ${
                    isBot ? "self-start" : "self-end flex-row-reverse"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center border text-[10px] ${
                      isBot
                        ? "bg-gold/10 text-gold border-gold/20"
                        : "bg-white/10 text-text-primary border-white/10"
                    }`}
                  >
                    {isBot ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex flex-col">
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isBot
                          ? "bg-white/5 text-text-secondary rounded-tl-none border border-white/5"
                          : "bg-gold text-black rounded-tr-none font-medium"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-text-muted mt-1 px-1 font-mono">
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-2 self-start max-w-[85%]">
                <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center bg-gold/10 text-gold border border-gold/20">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-none bg-white/5 text-text-secondary border border-white/5 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white/5 border-t border-white/5 flex gap-2">
            <input
              type="text"
              placeholder="Ask support..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/30 placeholder-text-muted"
            />
            <button
              type="submit"
              className="h-8 w-8 bg-gold text-black rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
