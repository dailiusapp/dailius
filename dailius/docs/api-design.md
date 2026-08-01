# API Design

## Purpose

Defines backend API conventions.

The MVP should keep APIs simple.

---

# API Principles

## Clear Resources

Use nouns.

Good:

GET /activities

Bad:

GET /getActivities

---

## Predictable Responses

All APIs should return consistent structures.

---

# Core Endpoints

## Authentication

Handled through Supabase Auth.

---

# User Profile

GET

/user

Returns:

- Profile information
- Preferences

---

# Activities

GET

/activities


POST

/activities


PATCH

/activities/:id


DELETE

/activities/:id

---

# Goals

GET

/goals


POST

/goals


PATCH

/goals/:id

---

# Commitments

GET

/commitments


POST

/commitments


PATCH

/commitments/:id

---

# Plans

Generate plan:

POST

/plans/generate


Get current plan:

GET

/plans/current


Replan:

POST

/plans/replan

---

# AI Chat

POST

/chat

Purpose:

Conversation about:

- Existing plan
- Changes
- Recommendations

---

# Validation

Validate input before:

- Database writes
- AI calls
- Planning engine execution

---

# Security

Always:

- Validate user ownership
- Never trust client input
- Protect private calendar data