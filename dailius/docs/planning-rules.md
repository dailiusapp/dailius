# Planning Rules

## Purpose

Defines the rules used by Dailius to create schedules.

The planning engine should create realistic plans, not just fill empty calendar slots.

---

# Rule Categories

## Hard Constraints

Hard constraints must never be violated.

Examples:

- Existing commitments
- Protected family time
- Sleep requirements
- Availability boundaries

---

## Soft Preferences

Soft preferences influence decisions.

Examples:

- Prefer morning workouts
- Prefer cycling on weekends
- Prefer shorter weekday sessions

---

# Core Scheduling Rules

## Rule 1: Never Create Conflicts

A scheduled activity cannot overlap:

- Existing commitments
- Another scheduled activity

---

## Rule 2: Respect Availability

Activities can only be scheduled when the user is available.

---

## Rule 3: Respect Constraints

Examples:

Constraint:

"No exercise after 8 PM"

The planner cannot schedule exercise after that time.

---

## Rule 4: Prioritize Goals

When time is limited:

Higher priority goals receive scheduling preference.

---

## Rule 5: Maintain Balance

Avoid creating unrealistic weeks.

Example:

Do not schedule:

- Hard cycling workout
- Hard running workout
- Heavy strength workout

on consecutive days without considering recovery.

---

## Rule 6: Preserve Consistency

Prefer maintaining routines.

Example:

If a user normally runs Tuesday and Thursday:

Do not constantly move those sessions.

---

## Rule 7: Minimize Changes

When replanning:

Change as little as possible.

Users should not feel that their entire life was rearranged.

---

## Rule 8: Explain Decisions

Every recommendation should have a reason.

Example:

"Moved your run to Saturday because Wednesday became unavailable and Saturday provides better recovery after strength training."

---

# Replanning Rules

When something changes:

1. Identify impacted activities
2. Evaluate remaining options
3. Protect high-priority goals
4. Minimize disruption
5. Present recommendation

---

# Planning Quality

A good plan is:

- Realistic
- Achievable
- Balanced
- Aligned with goals
- Easy to understand