# Planning Algorithm

## Purpose

Defines how Dailius creates and updates schedules.

This document describes the logic conceptually.

Implementation details may change.

---

# Core Principle

The planner should not simply find empty calendar slots.

It should optimize the user's limited time based on:

- Commitments
- Goals
- Activities
- Constraints
- Preferences

---

# Planning Process

## Step 1: Gather Inputs

Collect:

- Existing commitments
- Availability
- Goals
- Activities
- Constraints
- Preferences

---

# Step 2: Understand Available Time

Calculate:

- Free blocks
- Duration available
- Time windows
- Conflicts

Example:

Monday:

Available:

6:00 AM - 7:00 AM

6:00 PM - 8:00 PM

---

# Step 3: Apply Hard Constraints

Remove invalid options.

Examples:

Constraint:

"No exercise after 8 PM"

Remove:

8 PM onward exercise slots.

---

# Step 4: Prioritize Activities

Rank activities based on:

- Goal importance
- User priority
- Deadline
- Frequency requirements

Example:

High priority:

Run training goal

Medium priority:

Guitar practice

Low priority:

Optional hobby

---

# Step 5: Generate Candidate Plans

Create possible schedules.

Consider:

- Timing
- Duration
- Recovery
- Balance

---

# Step 6: Score Plans

Evaluate:

## Goal Alignment

Does the plan support important goals?

---

## Constraint Satisfaction

Does it respect user rules?

---

## Consistency

Does it preserve routines?

---

## Realism

Can the user realistically complete it?

---

## Preference Match

Does it align with preferences?

---

# Step 7: Select Best Plan

Choose the highest scoring realistic plan.

---

# Step 8: Generate Explanation

Every generated plan should explain key decisions.

Example:

"Your long cycling ride is scheduled Saturday morning because it provides enough time and keeps Sunday free for family."

---

# Replanning

When something changes:

Example:

"I missed Tuesday workout."

Process:

1. Identify impacted activity
2. Recalculate available time
3. Review priorities
4. Consider alternatives
5. Minimize disruption
6. Generate updated recommendation

---

# Future Improvements

Potential future enhancements:

- Energy levels
- Recovery data
- Weather
- Fitness metrics
- Machine learning recommendations
- Habit formation models

These are not required for MVP.