# Dashboard Requirements

## Purpose

The Dashboard is the primary page users see after logging in.

Its purpose is to immediately help users understand:

- What they should focus on today
- Their schedule for today
- Their upcoming weekly plan
- Their progress at a glance
- How to quickly interact with the AI planner

Unlike a traditional dashboard, Dailius should feel like opening a personal planning assistant rather than a reporting tool.

The experience should be calm, minimal, and focused.

---

# Route

`/dashboard`

Authentication required.

Unauthenticated users are redirected to the Login page.

---

# Page Goals

Within the first five seconds, users should know:

- What Dailius recommends they do today
- What is scheduled today
- Whether they have an active weekly plan
- How to ask Dailius for help

---

# Page Layout

The dashboard consists of the following sections in order:

1. Welcome Header
2. Today's Focus
3. Today's Overview
4. Today's Schedule
5. Weekly Plan Preview
6. AI Assistant
7. Quick Actions

The page should be fully responsive.

---

# 1. Welcome Header

Display a greeting based on the user's local time.

Examples:

Good Morning, Carlos

Good Afternoon, Carlos

Good Evening, Carlos

Below the greeting display:

"Here's your plan for today."

If the user's first name is unavailable, omit the name.

Example:

Good Morning

---

# 2. Today's Focus

## Purpose

This is the most important card on the dashboard.

It represents Dailius' core value proposition.

Instead of only showing a schedule, Dailius tells users what it believes they should prioritize today.

Initially this recommendation can be generated using simple planning rules.

In future versions it will be AI-generated.

---

## Card Contents

Title:

Today's Focus

Recommendation:

Maximum length:

2–3 short sentences.

Examples:

Prioritize your 40-minute strength workout this evening. You've completed two of your three weekly sessions and tomorrow is much busier.

---

You missed yesterday's run. Today offers the best opportunity to make it up.

---

Today is a recovery day. Enjoy your scheduled walk and allow your body to recover.

---

Your afternoon is relatively free. This is a great opportunity to practice guitar for 30 minutes.

---

Your calendar is very busy today. Focus on your most important commitments and don't worry about fitting in a workout.

---

## Empty State

If no recommendation can be generated:

Complete onboarding to receive personalized daily recommendations.

---

## Future Enhancement (Out of Scope)

Display a small:

Why?

button that explains how Dailius arrived at the recommendation.

---

# 3. Today's Overview

Display a summary card.

Example:

Today's Plan

• 3 activities planned

• 2h 40m scheduled

• No scheduling conflicts

Possible summary information:

- Number of activities
- Total scheduled time
- Scheduling conflicts
- Rest day indicator

---

## Empty State

You don't have a plan for today yet.

Display button:

Generate My Plan

---

# 4. Today's Schedule

Display all activities scheduled for today in chronological order.

Each activity card displays:

- Activity title
- Start time
- End time
- Duration
- Activity type
- Current status

Example:

7:00 AM

Morning Run

40 minutes

Scheduled

---

## Activity Status

Supported statuses:

- Scheduled
- Completed
- Missed
- Cancelled

Display each using simple colored badges.

---

## Interaction

Clicking an activity opens its detail page.

This detail page will be implemented in a future release.

---

## Empty State

No activities scheduled today.

---

# 5. Weekly Plan Preview

Display the next seven days.

Each day card displays:

- Day
- Date
- Number of activities

Examples:

Monday

3 Activities

---

Tuesday

2 Activities

---

Wednesday

Rest Day

Each day card should be clickable.

Future implementation will navigate to the selected day's schedule.

Display button:

View Full Weekly Plan

---

# 6. AI Assistant

Display a large conversational card.

Header:

Ask Dailius

Placeholder text:

"What should I focus on this afternoon?"

Button:

Open AI Assistant

Future implementation will launch the AI chat interface.

---

# 7. Quick Actions

Display quick action buttons.

Required buttons:

Generate Weekly Plan

Report Missed Activity

Add Activity

Update Goals

Initially these buttons may navigate to placeholder pages.

---

# Navigation

Top navigation should contain:

- Dailius Logo
- Dashboard
- Weekly Plan
- Goals
- Settings
- User Profile

---

## Profile Menu

Profile

Account Settings

Logout

---

# Empty User Experience

A newly registered user will not yet have any planning data.

Display:

Welcome to Dailius!

Let's build your first weekly plan.

Primary button:

Complete Onboarding

Secondary button:

Learn More

---

# Loading State

While dashboard data loads:

Display skeleton placeholders.

Avoid layout shifting.

---

# Error State

If dashboard data cannot be loaded:

We couldn't load your dashboard.

Display:

Retry

button.

---

# Responsive Design

## Desktop

Two-column layout.

Recommended layout:

Left column

- Today's Focus
- Today's Overview
- Today's Schedule

Right column

- Weekly Plan Preview
- AI Assistant
- Quick Actions

---

## Tablet

Single-column layout with cards stacked vertically.

---

## Mobile

Single-column layout.

Cards should fill the available width.

Buttons should be full width where appropriate.

---

# Accessibility

The dashboard must:

- Support keyboard navigation
- Have visible focus indicators
- Include ARIA labels where appropriate
- Meet WCAG AA accessibility standards
- Maintain sufficient color contrast

---

# Performance

Dashboard should load in under two seconds on a normal broadband connection.

Lazy load non-essential components where appropriate.

Avoid unnecessary API calls.

---

# MVP Scope

Included:

- Welcome greeting
- Today's Focus
- Today's Overview
- Today's Schedule
- Weekly Plan Preview
- AI Assistant card
- Quick Actions
- Responsive layout
- Empty states
- Loading state
- Error state

---

# Out of Scope

The following features are intentionally excluded from the MVP:

- Monthly calendar
- Drag-and-drop scheduling
- Activity editing
- Analytics dashboards
- Productivity scores
- Goal progress charts
- Fitness integrations
- Calendar integrations
- Weather integration
- Push notifications
- Household members
- Shared calendars
- Smart automatic rescheduling
- Habit tracking
- AI explanations
- Widgets
- Achievements
- Streaks
- Gamification

These features will be introduced in future releases.

---

# Success Criteria

A successful dashboard should allow a user to:

- Understand their day in under five seconds
- Know what Dailius recommends they prioritize
- View today's scheduled activities
- Preview their upcoming week
- Quickly access the AI assistant
- Begin planning or replanning with minimal effort

The dashboard should reinforce Dailius' mission:

"Given everything happening in your life, what should you do next?"