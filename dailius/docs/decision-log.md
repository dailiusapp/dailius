# Decision Log

## Purpose

Records important product and technical decisions.

The goal is to preserve context.

Future developers should understand:

- What was decided
- Why it was decided
- What alternatives were considered

---

# Decision Format
Date:
Decision:
Reason:
Alternatives considered:
Status:



---

# 2026-07-31

## Decision

Dailius is positioned as an AI planning layer, not a calendar replacement.

## Reason

Existing calendars are good at storing events but do not help users decide how to allocate time.

Dailius should answer:

"Given everything happening in my life, what should I do and when?"

## Alternatives considered

Build another calendar application.

## Status

Accepted.

---

# 2026-07-31

## Decision

Start with an AI Personal Time Planner.

## Reason

The smallest product that validates the core hypothesis:

"People want AI help fitting meaningful activities into their lives."

## Alternatives considered

Start with:

- Household planning
- Task management
- Fitness coaching

## Status

Accepted.

---

# 2026-07-31

## Decision

Use a planning engine separate from the LLM.

## Reason

Scheduling requires deterministic rules.

The AI should understand intent and explain decisions, but should not directly control scheduling logic.

## Alternatives considered

Allow the LLM to generate schedules directly.

## Status

Accepted.

---

# 2026-07-31

## Decision

Use Next.js, Supabase, OpenAI API, and Vercel.

## Reason

Optimized for:

- Fast development
- Simple deployment
- One developer workflow

## Alternatives considered

Custom backend infrastructure.

## Status

Accepted.

---

# Future Decisions

Record decisions here as the product evolves.