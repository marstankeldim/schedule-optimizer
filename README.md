# Schedule Optimizer

AI-powered task scheduling that adapts to your energy, priorities, and calendar. Add tasks, optimize your day or week, track progress, and get insights into how you work best.

## Features

- Optimize a daily or weekly schedule from your task list
- Energy and priority-aware scheduling with automatic break placement
- Calendar import (.ics) to avoid conflicts
- Recurring tasks and quick task templates
- Focus mode, completion celebrations, and streaks/achievements
- Schedule history, analytics dashboards, and break adherence stats
- Export schedules back to calendar (.ics)
- Push/local notifications for breaks (Capacitor)

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Supabase (auth, database, edge functions)
- Capacitor (mobile + notifications)

## Getting Started

```sh
npm install
npm run dev
```

By default the dev server runs at `http://127.0.0.1:5173`.

## Environment Variables

Create a `.env` file in the project root with:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

## Scripts

```sh
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # lint
```

## Supabase

This repo includes Supabase migrations and edge functions in `supabase/`. The app calls edge functions for schedule optimization and planning.

## Contact

Ayan Ospan — ako5473@psu.edu
