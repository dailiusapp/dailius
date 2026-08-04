# Dailius MVP Requirements

# User Onboarding Flow

**Version:** 1.0
**Status:** Draft
**Priority:** High

---

# Goal

Guide every new user through a simple onboarding process that gathers enough information to generate their first AI-powered weekly plan.

The onboarding should feel conversational, quick, and motivating—not like filling out a long form.

**Target completion time:** 3–5 minutes

---

# Success Criteria

A new user should be able to:

* Create an account
* Complete onboarding
* Arrive at the Dashboard
* See an initial AI-generated weekly plan

...without needing to manually configure the application.

---

# Guiding Principles

## Keep it lightweight

Only ask for information that is required.

Everything else can be edited later in Settings.

---

## Progress visibility

Display progress throughout the onboarding.

Examples:

* Step 2 of 6
* 33% Complete

Users should always know how much remains.

---

## Allow skipping

Where appropriate, allow users to skip optional steps.

Example:

**Skip for now**

The AI can still generate an initial plan with limited information.

---

## Autosave

Progress should automatically save after every step.

If the user refreshes the browser or leaves the page, onboarding should resume from the last completed step.

---

# Overall Flow

```
Sign Up

↓

Welcome

↓

Step 1
Calendar

↓

Step 2
Goals

↓

Step 3
Recurring Activities

↓

Step 4
Availability

↓

Step 5
Preferences

↓

Generate Plan

↓

Dashboard
```

---

# Welcome Screen

## Purpose

Introduce the onboarding process and explain what the user will accomplish.

### Content

**Welcome to Dailius**

Let's spend a few minutes learning about your life so we can build your first personalized weekly plan.

You'll be asked about:

* Your calendar
* Your goals
* Activities you enjoy
* When you're available

You can change everything later.

**Estimated time:** 3–5 minutes

Primary button:

**Let's Begin**

---

# Step 1 — Calendar

## Purpose

Understand the user's existing commitments.

### Primary Option

Connect Google Calendar

Display a **Recommended** badge.

Primary button:

**Connect Google Calendar**

---

### Secondary Option

**I'll add events later**

If the user skips calendar connection, display:

> No problem. We'll create your first plan without your calendar.

---

### Future Integrations (Not included in MVP)

* Apple Calendar
* Microsoft Outlook

---

# Step 2 — Goals

## Purpose

Understand what the user wants to make more time for.

Question:

**What would you like to make more time for?**

Allow selecting multiple goals.

Suggested goal cards:

* Running
* Cycling
* Strength Training
* Walking
* Reading
* Learning
* Meditation
* Guitar
* Music Practice
* Family Time
* Personal Projects
* Cooking
* Housework
* Other

---

For each selected goal collect:

### Frequency

Examples:

* Daily
* 3 times per week
* Twice per month

### Priority (Optional)

* Low
* Medium (Default)
* High

---

# Step 3 — Recurring Activities

## Purpose

Capture recurring commitments that should appear regularly in the schedule.

Examples:

* Gym
* Soccer
* Church
* Language Class
* Music Lessons
* Volunteering
* Study
* Other

For each recurring activity collect:

* Activity name
* Duration
* Preferred days
* Preferred time
* Flexible? (Yes / No)

---

# Step 4 — Availability

## Purpose

Determine when the AI can schedule flexible activities.

Question:

**When do you usually have time for flexible activities?**

### Weekdays

* Morning
* Afternoon
* Evening

### Weekends

* Morning
* Afternoon
* Evening

### Maximum Daily Planning Time

Examples:

* 30 minutes
* 45 minutes
* 1 hour
* 2 hours

---

# Step 5 — Preferences

## Purpose

Capture scheduling preferences and constraints.

Examples:

### Avoid scheduling after

* 8:00 PM

### Protect time for

* Family Dinner
* Sleep
* School Pickup
* Sunday Rest
* Personal Time

### Preferred Workout Length

* 30 minutes
* 45 minutes
* 60 minutes
* 90 minutes

### Planning Style

* Keep my schedule relaxed
* Balanced
* Maximize productivity

---

# Final Review

Display a summary of the information collected.

Example:

## Goals

* Run 3x per week
* Guitar 3x per week
* Read daily

## Availability

* Weekday evenings
* Weekend mornings

## Preferences

* No workouts after 8 PM
* Protect family dinner

Buttons:

* Back
* Generate My Plan

---

# AI Plan Generation

Display a loading screen while generating the user's first weekly plan.

Primary message:

**Building your personalized weekly plan...**

Optional rotating status messages:

* Analyzing your goals...
* Finding available time...
* Balancing your priorities...
* Optimizing your schedule...
* Almost ready...

Expected duration:

5–15 seconds

---

# Completion Screen

Celebrate completion.

Example:

**Your first plan is ready!**

Welcome to Dailius.

We'll continue improving your schedule as your life changes.

Primary button:

**Go to Dashboard**

---

# Data Created During Onboarding

The onboarding process should create or update:

* User Profile
* Goals
* Recurring Activities
* Availability
* Preferences
* Calendar Connection (optional)
* Onboarding Status

---

# Error Handling

## Calendar Connection Fails

* Show an error message
* Allow retry
* Allow continuing without connecting

---

## Network Interruption

* Automatically save progress
* Resume onboarding from the last completed step

---

## AI Plan Generation Fails

Display an error message and provide:

* Retry
* Generate Again

---

# Mobile Requirements

* Fully responsive
* Single-column layout
* Large touch-friendly controls
* Sticky navigation buttons
* Optimized for mobile and desktop

---

# Accessibility Requirements

* Full keyboard navigation
* Screen reader support
* Visible focus indicators
* High color contrast
* Proper labels and ARIA attributes

---

# Analytics Events

Track the following events:

* Onboarding Started
* Calendar Connected
* Calendar Skipped
* Goal Added
* Activity Added
* Availability Completed
* Preferences Completed
* Plan Generated
* Onboarding Completed

---

# Out of Scope (MVP)

The following features are intentionally excluded from the MVP:

* Apple Calendar integration
* Microsoft Outlook integration
* Garmin integration
* Strava integration
* Household onboarding
* AI coaching during onboarding
* Task importing
* Habit history
* Time tracking
* Wearable integrations

---

# Future Improvements

Potential enhancements after MVP:

* Conversational AI onboarding instead of forms
* Natural language goal entry (e.g. "I want to run three times a week and practice guitar twice a week.")
* AI-suggested goals and activities
* Automatic recurring event detection from connected calendars
* Availability estimation based on calendar history
* Progressive onboarding with advanced preferences introduced after the first generated plan

---

# Implementation Notes

* Build onboarding as a dedicated multi-step wizard.
* Persist progress after every completed step.
* Resume onboarding automatically if interrupted.
* After successful completion, set `onboarding_completed = true` on the user's profile.
* Users with `onboarding_completed = true` should always be taken directly to the Dashboard on future logins.
* Design each onboarding step as an independent reusable component to simplify future additions and modifications.

---

# Suggested GitHub Location

```
docs/requirements/onboarding-flow.md
```
