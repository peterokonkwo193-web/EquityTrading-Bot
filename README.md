# Equity Trading Bot

A premium, dark-themed **paper-trading simulator**. It does not connect to any broker, exchange, MT4/MT5, or real market — every trade is generated internally and clearly labeled as simulated throughout the app.

## Stack

- **Frontend**: Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · React Hook Form · Zod · Lucide icons
- **Backend**: Node.js · Express 5 · PostgreSQL · Prisma ORM 6 · JWT auth

## Project layout

```
frontend/   Next.js app (UI)
backend/    Express API + Prisma schema + simulated trading engine
```

## Prerequisites

- Node.js 20+ (v24 also works)
- A PostgreSQL database — a free hosted instance (e.g. [Neon](https://neon.com) or [Supabase](https://supabase.com)) works well since no local Postgres/Docker is required

## Setup

1. Install dependencies (root workspace installs both apps):
   ```
   npm install
   ```

2. Configure the backend environment:
   ```
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and set:
   - `DATABASE_URL` — your Postgres connection string (pooled, e.g. Supabase's pgbouncer URL)
   - `DIRECT_URL` — a direct (non-pooled) connection string, used only for migrations
   - `JWT_SECRET` — any long random string

3. Configure the frontend environment:
   ```
   cp frontend/.env.example frontend/.env.local
   ```
   Defaults to `http://localhost:4000/api/v1`, which matches the backend dev server.

4. Run migrations:
   ```
   npm run db:migrate
   ```
   No seed data is required — create your account via the app's **Register** page.

5. Start both apps together:
   ```
   npm run dev
   ```
   - Backend: http://localhost:4000
   - Frontend: http://localhost:3000 (or :3001 if 3000 is already in use)

## Account flow

Registration asks for a display currency (USD/GBP/EUR) and creates a **Main Account** with a $0 virtual balance. Email verification and password reset are **simulated** — no real email provider is wired up, so the verification code / reset token is shown directly on-screen (and logged server-side) instead of being emailed.

## How the simulation works

- **Wallet**: "Add virtual funds" instantly credits your practice balance. No real payment method is ever collected.
- **Trading Bot**: pick a market (crypto: BTC/ETH/BNB/SOL, forex: XAUUSD/EURUSD/GBPUSD/USDJPY/AUDUSD) and a simulated amount (min $100). Starting a simulation opens a `SimulatedTrade` that runs for 20 seconds, then resolves to a randomized profit or loss (natural ~60% win rate, not artificially bounded). Trade outcomes are computed lazily on read (`backend/src/modules/trades/trades.service.ts`) rather than via a persistent background loop.
- **Price ticker**: crypto prices come from the public CoinGecko API; the forex/gold symbols are simulated with a small random walk (CoinGecko doesn't cover forex). The ticker is purely a display feature — it's never used to price or resolve trades.
- **No popups**: the app never uses browser alerts or floating toasts. Every action's result (success/error) shows as an inline status banner on the page itself.

## Scripts (run from repo root)

- `npm run dev` — run backend and frontend together
- `npm run build` — production build of both apps
- `npm run db:migrate` — run Prisma migrations (backend)
- `npm run db:studio` — open Prisma Studio

## A note on latency

This project is wired to a free-tier Supabase Postgres instance. Under rapid, back-to-back requests (e.g. an automated test clicking through the UI with no pauses), you may see loading spinners linger for a few seconds — that's real network/connection-pool latency, not a bug; every page shows an honest loading/disabled state until data actually arrives.
