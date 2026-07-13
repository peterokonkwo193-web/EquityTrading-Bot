"use client";

import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Card } from "@/components/ui/Card";

const TESTIMONIALS = [
  {
    id: 1,
    name: "Marcus J.",
    role: "Full-time Crypto Trader",
    avatar: "MJ",
    avatarColor: "from-emerald-500 to-teal-600",
    stars: 5,
    text: "EquityBot completely transformed how I approach the markets. The bot execution is lightning-fast and the live charts give me everything I need in one place. My portfolio is up 34% since I started using it.",
  },
  {
    id: 2,
    name: "Priya Sharma",
    role: "Forex Day Trader",
    avatar: "PS",
    avatarColor: "from-violet-500 to-purple-600",
    stars: 5,
    text: "I've tried many platforms but EquityBot stands out for its clean interface and reliable execution. The real-time market charts are incredibly accurate and the wallet system is seamless. Highly recommended!",
  },
  {
    id: 3,
    name: "Daniel K.",
    role: "Algorithmic Trader",
    avatar: "DK",
    avatarColor: "from-blue-500 to-cyan-600",
    stars: 5,
    text: "The exchange API integration works flawlessly with Binance. Order execution is near-instant and I've had zero downtime in 4 months of continuous use. The admin dashboard gives great visibility into my team's activity.",
  },
  {
    id: 4,
    name: "Amara Osei",
    role: "Crypto Investor",
    avatar: "AO",
    avatarColor: "from-amber-500 to-orange-600",
    stars: 5,
    text: "What I love most is the transparency — every deposit is verified on-chain and I can check transaction status directly on the explorer. No more wondering if my funds arrived. This is how modern finance should work.",
  },
  {
    id: 5,
    name: "Lorenzo R.",
    role: "Portfolio Manager",
    avatar: "LR",
    avatarColor: "from-rose-500 to-pink-600",
    stars: 4,
    text: "Managing multiple client accounts is effortless with EquityBot's account system. The performance charts and win-rate analytics help me make data-driven decisions. The customer support is also excellent.",
  },
  {
    id: 6,
    name: "Sophie W.",
    role: "Retail Trader",
    avatar: "SW",
    avatarColor: "from-green-500 to-emerald-600",
    stars: 5,
    text: "As someone who was nervous about crypto trading, EquityBot made it accessible. The interface is intuitive, the risk disclaimers are clear, and I've learned a lot just by watching the live charts. Absolutely love it!",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < count ? "fill-gold text-gold" : "text-white/20"}`}
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  const [page, setPage] = useState(0);
  const perPage = 3;
  const totalPages = Math.ceil(TESTIMONIALS.length / perPage);
  const visible = TESTIMONIALS.slice(page * perPage, page * perPage + perPage);

  return (
    <Card className="flex flex-col gap-6">
      {/* Section Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-text-primary">What Our Traders Say</h3>
          <p className="mt-1 text-sm text-text-secondary">Trusted by thousands of traders worldwide</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-text-secondary transition-all hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-text-secondary transition-all hover:border-gold/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((t) => (
          <div
            key={t.id}
            className="group relative flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.03] to-transparent p-5 transition-all duration-300 hover:border-gold/20 hover:shadow-[0_8px_32px_-8px_rgba(212,175,55,0.12)]"
          >
            {/* Quote Icon */}
            <Quote className="absolute right-4 top-4 h-8 w-8 text-gold/10" />

            {/* Stars */}
            <StarRating count={t.stars} />

            {/* Text */}
            <p className="flex-1 text-sm leading-relaxed text-text-secondary">&ldquo;{t.text}&rdquo;</p>

            {/* Author */}
            <div className="flex items-center gap-3 border-t border-white/5 pt-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.avatarColor} text-xs font-bold text-white`}
              >
                {t.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                <p className="text-xs text-text-muted">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Page Dots */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === page ? "w-6 bg-gold" : "w-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </Card>
  );
}
