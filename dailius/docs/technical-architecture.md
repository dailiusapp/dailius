# Technical Architecture

## Stack

Frontend:
- Next.js
- React
- TypeScript

Backend:
- Supabase
- PostgreSQL

AI:
- OpenAI API

Deployment:
- Vercel

Payments:
- Stripe

---

# Architecture Principle

Do not let the LLM control scheduling.

Use:

## Planning Engine

Responsible for:

- Availability
- Conflicts
- Duration
- Recurring events
- Constraints
- Scheduling rules

---

## AI Layer

Responsible for:

- Understanding natural language
- Explaining decisions
- Translating user intent
- Conversational interaction

---

Flow:

User

↓

AI Conversation Layer

↓

Planning Engine

↓

Database

↓

Optimized Schedule