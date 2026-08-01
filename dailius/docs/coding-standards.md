# Dailius Coding Standards

## Purpose

This document defines engineering standards for the Dailius codebase.

The priority is:

1. Ship quickly
2. Maintain code quality
3. Keep complexity low
4. Make future changes easy

---

# General Principles

## Simple Over Clever

Prefer simple solutions that are easy to understand.

Avoid:

- Complex abstractions
- Over-engineering
- Premature optimization
- Framework patterns without a clear need

---

## Optimize for Learning

The MVP exists to validate the product.

Before building something ask:

"Does this help us learn whether people want AI life planning?"

If not, defer it.

---

# TypeScript

Use TypeScript everywhere.

Rules:

- Avoid `any`
- Prefer explicit types
- Define shared domain types
- Keep types close to the feature they support

---

# React / Next.js

## Components

Prefer:

- Small components
- Clear responsibilities
- Composition

Avoid:

- Huge components
- Components containing business logic
- Components making complex API decisions

---

## Server vs Client Components

Default:

Use server components.

Use client components only when required:

- User interaction
- Browser APIs
- State management
- Real-time behavior

---

# Business Logic

Business rules should not live inside UI components.

Example:

Bad:

React component decides workout scheduling rules.

Good:

Planning engine handles scheduling logic.

---

# Folder Structure

Preferred structure:
app/
components/
features/
lib/
services/
hooks/
types/
utils/


---

# Database Access

Database access should be centralized.

Avoid:

Components directly querying the database.

Prefer:

Component

↓

Service layer

↓

Database

---

# Error Handling

Errors should:

- Be meaningful
- Help the user recover
- Be logged appropriately

Avoid generic errors.

Bad:

"Something went wrong"

Good:

"We couldn't generate your plan because your availability is missing."

---

# Dependencies

Before adding a dependency ask:

- Does this solve a real problem?
- Could we build this simply ourselves?
- Does it increase maintenance?

Prefer fewer dependencies.

---

# Code Review Mindset

Every change should consider:

- Does this support the product vision?
- Is this the simplest implementation?
- Will another developer understand this later?