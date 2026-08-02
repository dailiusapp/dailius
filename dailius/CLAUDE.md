# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Dailius is an AI life planner: an AI-powered personal planning platform that reconciles a user's commitments, goals, activities, and preferences into a realistic weekly plan, and lets the user replan conversationally (e.g. "I missed my Tuesday workout").

The repository currently has a polished marketing/waitlist landing page (`app/page.tsx` plus the section components in `components/landing/`) and nothing beyond that — no auth, planning engine, database, or AI chat exist yet. `docs/` describes where the product is going, not what exists in code today. Before implementing a product feature, read the relevant doc(s) below rather than assuming behavior.

The waitlist form (`components/landing/WaitlistForm.tsx`) has no backend: it opens a pre-filled `mailto:` as a stopgap. Wiring real capture (Supabase table or API route) is an open follow-up before the page gets real traffic.

## Commands

Run from `dailius/dailius/` (this directory):

```bash
npm install       # install dependencies
npm run dev       # start dev server (Next.js, http://localhost:3000)
npm run build     # production build
npm run start     # run production build
npm run lint      # eslint (eslint-config-next core-web-vitals + typescript)
```

There is no test runner configured yet.

## Architecture

### Stack (per docs/technical-architecture.md)

- Frontend: Next.js (App Router) + React + TypeScript
- Backend: Supabase + PostgreSQL
- AI: OpenAI API
- Payments: Stripe
- Deployment: Vercel

### Core architectural principle: the LLM does not schedule

This is the single most important rule in the codebase (see `docs/technical-architecture.md`, `docs/decision-log.md`, `docs/planning-rules.md`):

```
User → AI Conversation Layer → Planning Engine → Database → Optimized Schedule
```

- **Planning Engine**: deterministic code responsible for availability, conflicts, durations, recurrence, constraints, and scheduling rules (`docs/planning-rules.md`, `docs/planning-algorithm.md`).
- **AI Layer**: responsible only for understanding natural language, translating user intent, explaining decisions, and conversation. It must never directly decide scheduling.

When implementing planning/replanning features, keep scheduling logic out of the LLM prompt/response path — the AI layer should call into planning-engine code, not replace it.

### Planning rules to preserve (docs/planning-rules.md)

Hard constraints (never violated: existing commitments, protected time, sleep, availability) vs. soft preferences (may be overridden). Core rules: never create conflicts, respect availability/constraints, prioritize higher-priority goals when time-limited, maintain balance (e.g. avoid back-to-back hard workouts), preserve existing routines, minimize changes on replan, and always explain the reasoning behind a scheduling decision.

### Data model (docs/database-schema.md)

Key principles:
- Every record belongs to a single user (no shared ownership in MVP).
- Plans are *generated*, not manually authored — users define inputs, the planning engine produces outputs.
- Inputs (Commitment, Goal, Activity, Constraint, Preference) are modeled separately from outputs (Weekly Plan, Scheduled Block), so replanning is just regenerating outputs from the same inputs.
- Recommended build order: User → Commitment → Activity → Goal → Constraint → Weekly Plan → Scheduled Block.

### API conventions (docs/api-design.md)

REST-ish, noun-based resources (`GET /activities`, not `/getActivities`), consistent response shapes. Auth via Supabase Auth. Planned surface: `/user`, `/activities`, `/goals`, `/commitments`, `/plans/generate`, `/plans/current`, `/plans/replan`, `/chat`. Validate input before DB writes, AI calls, and planning engine execution; always check ownership.

### Frontend organization (docs/component-architecture.md, docs/coding-standards.md)

Preferred folder structure — `app/`, `components/`, and `lib/` exist today (landing page only); `features/`, `services/`, `hooks/`, `types/` don't exist yet and should be added when the first real feature (e.g. onboarding, planning) lands:

```
app/          routes and pages
components/   reusable, presentation-only UI (currently components/landing/ — marketing page sections)
features/     product-specific functionality (business workflows, domain logic), organized per-feature (e.g. features/planner/{components,hooks,services,types})
lib/          shared utilities (currently just cn.ts and constants.ts)
services/     DB access, external API calls, AI communication — the only layer that talks to the database
hooks/        React hooks
types/        shared TypeScript types
```

Rules: business logic (e.g. scheduling decisions) belongs in the planning engine / services layer, never inside components. Components should not query the database directly — go through the service layer. Default to server components; use client components only for interactivity, browser APIs, local state, or real-time behavior.

## Working philosophy (docs/coding-standards.md, docs/development-guidelines.md, docs/mvp-scope.md)

This is an MVP meant to validate one hypothesis: *"People want AI help deciding when to do the things that matter to them."* Before adding anything, ask whether it serves that. Keep solutions simple and avoid abstractions, enterprise patterns, or dependencies that aren't clearly justified.

Explicitly out of scope for now — do not build unless asked: mobile apps, wearable integrations, advanced ML models, household/shared accounts, social features, autonomous AI agents, complex optimization algorithms.

Full product/design docs (brand, copy, UI system, user flow, product vision/principles, decision log, validation plan) live in `docs/` — check there for anything not covered above before making product or design decisions.
