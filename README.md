# TradeBot — Automated Trading Bot Dashboard

A fintech-styled dashboard for managing a simulated automated trading bot: dark theme, account switching, deposits/withdrawals, and a bot engine that runs a simulated trading state machine (start/pause/stop, live P&L, activity feed).

## Stack

- **Frontend**: Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Framer Motion · React Hook Form · Zod · Lucide icons
- **Backend**: Node.js · Express 5 · PostgreSQL · Prisma ORM 6 · JWT auth

## Project layout

```
frontend/   Next.js app (UI)
backend/    Express API + Prisma schema + simulated bot engine
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
   - `DATABASE_URL` — your Postgres connection string
   - `JWT_SECRET` — any long random string

3. Configure the frontend environment:
   ```
   cp frontend/.env.example frontend/.env.local
   ```
   Defaults to `http://localhost:4000/api/v1`, which matches the backend dev server.

4. Run migrations and seed demo data:
   ```
   npm run db:migrate
   npm run db:seed
   ```
   This creates a demo user and two demo trading accounts, each with a bot ready to start.

   **Demo login:** `demo@bottrading.dev` / `Demo1234!`

5. Start both apps together:
   ```
   npm run dev
   ```
   - Backend: http://localhost:4000
   - Frontend: http://localhost:3000

## How the simulated bot works

Starting a bot registers an in-memory interval (~5s) on the backend that writes randomized P&L deltas and activity log entries to the database, with a small chance of transitioning to an `ERROR` state to exercise that UI path. The frontend polls bot status/activity every few seconds while the Bot Trading page is open. The bot logic lives behind a `BotEngine` interface (`backend/src/modules/bot/engine/`) so a real exchange/broker adapter could replace the simulated implementation later without touching routes or UI.

## Scripts (run from repo root)

- `npm run dev` — run backend and frontend together
- `npm run build` — production build of both apps
- `npm run db:migrate` — run Prisma migrations (backend)
- `npm run db:seed` — seed demo data (backend)
- `npm run db:studio` — open Prisma Studio
