# Dailius — AI-Assisted Planning Engine Refactoring Requirements

## 1. Overview

Refactor the current Dailius scheduling architecture so that the system combines:

1. **AI reasoning/planning**
2. **Deterministic scheduling and validation**
3. **Calendar and user data as the source of truth**

The current deterministic scheduler is useful for enforcing hard constraints and finding available time slots, but it is too simplistic for complex replanning scenarios.

Dailius needs to reason about the user's **entire week, goals, priorities, activities, constraints, existing commitments, and trade-offs** when something changes.

The key architectural principle is:

> **The AI should decide what the schedule should accomplish and propose changes. The deterministic planning engine should determine whether those changes are feasible and valid.**

Do NOT replace the deterministic scheduling engine with an LLM.

Instead, refactor the system into an AI-assisted planning architecture.

---

# 2. Product Principle

Dailius is not primarily trying to answer:

> "Where can I fit this activity?"

It is trying to answer:

> "Given everything happening in this person's life, what should they do and when is the best time to do it?"

This distinction is especially important when the schedule changes.

Example:

The user wants:

* Running 3×/week
* Cycling 2×/week
* Strength training 3×/week
* Guitar 3×/week

The user misses a Tuesday run.

A simplistic deterministic scheduler may simply find the next available 40-minute slot and place the run there.

Dailius should instead reason over the entire remaining week.

For example:

* Move Thursday strength training to Friday
* Place the missed run on Thursday
* Preserve the weekend cycling session
* Avoid excessive hard sessions close together
* Preserve family dinner
* Maintain the user's weekly running target

The AI should be capable of recognizing that multiple schedule changes may be necessary to produce a better overall plan.

---

# 3. Target Architecture

Refactor toward this architecture:

```text
                    USER
                      │
                      ▼
             AI Conversational Layer
                      │
                      ▼
                AI Planner
                      │
             proposes plan/actions
                      │
                      ▼
          Deterministic Planning Engine
                      │
             validates proposal
                      │
             ┌────────┴────────┐
             │                 │
           VALID             INVALID
             │                 │
             ▼                 ▼
       Accept proposal    Return validation
             │             errors to AI
             │                 │
             │                 ▼
             │             AI revises
             │                 │
             └─────────────────┘
                      │
                      ▼
             Validated Schedule
                      │
                      ▼
                Calendar/UI
```

The responsibilities must remain clearly separated.

---

# 4. Responsibility of the AI

The AI is responsible for **reasoning and planning**.

It should understand:

* User intent
* Goals
* Activity priorities
* Existing schedule
* Flexible activities
* Fixed commitments
* Constraints
* Preferences
* Changes to the user's circumstances
* Trade-offs between activities
* The consequences of moving one activity
* Whether multiple activities should be rearranged
* Which activities should be preserved
* Which activities are more flexible
* Which activities are higher priority
* The user's requested change

The AI should propose a coherent plan rather than simply finding the first available time slot.

The AI should NOT directly write arbitrary calendar events or bypass deterministic validation.

---

# 5. Responsibility of the Deterministic Planning Engine

The deterministic engine remains responsible for objective scheduling rules and validation.

It should handle:

### Hard constraints

Examples:

* Fixed calendar commitments
* Availability
* Activity duration
* No overlapping activities
* Protected family time
* Maximum activity duration
* Minimum/maximum frequency
* Required spacing
* Recovery requirements where explicitly configured
* "Do not schedule after X"
* "Do not schedule before X"
* Existing immovable events
* Recurring commitments
* Other objectively testable constraints

### Schedule validation

The deterministic engine must be able to answer:

```text
Is this proposed schedule valid?
```

It should return structured validation results.

Example:

```json
{
  "valid": false,
  "violations": [
    {
      "type": "TIME_CONFLICT",
      "activity": "Running",
      "conflictsWith": "Work",
      "date": "2026-08-13"
    },
    {
      "type": "PROTECTED_TIME",
      "activity": "Strength",
      "constraint": "Family dinner",
      "date": "2026-08-13"
    }
  ]
}
```

Do not rely on the LLM to determine whether a hard constraint has been violated.

---

# 6. AI Should Propose Planning Operations

The AI should not directly manipulate database records or calendar events.

Instead, introduce a structured planning-operation format.

Supported operations should initially include:

```text
ADD_ACTIVITY
REMOVE_ACTIVITY
MOVE_ACTIVITY
SWAP_ACTIVITIES
CHANGE_DURATION
CHANGE_PRIORITY
SPLIT_ACTIVITY
```

Additional operations can be added later if needed.

Example:

```json
{
  "operations": [
    {
      "type": "MOVE_ACTIVITY",
      "activityId": "strength-123",
      "targetStart": "2026-08-11T18:00:00"
    },
    {
      "type": "MOVE_ACTIVITY",
      "activityId": "run-456",
      "targetStart": "2026-08-13T17:30:00"
    }
  ]
}
```

The AI proposes these operations.

The deterministic engine applies them to a temporary schedule and validates the resulting state.

Do not modify the user's real schedule until validation succeeds and, where applicable, the user accepts the proposal.

---

# 7. Planning State

Create a compact structured representation of the user's current planning state.

Do not send the user's entire historical data set to the AI unnecessarily.

The AI planning context should contain only information relevant to the current planning problem.

At minimum, include:

### User goals

Example:

```json
{
  "activity": "running",
  "targetFrequency": 3,
  "priority": "high"
}
```

### Activities

Include:

* Activity name
* Duration
* Frequency target
* Priority
* Flexibility
* Relevant scheduling preferences
* Relevant recovery requirements
* Whether activity can be moved
* Whether activity can be skipped

### Constraints

Examples:

```text
No exercise after 20:00
Protect family dinner
Maximum 40 minutes on weekdays
Longer activities allowed on weekends
Keep Sundays mostly free
```

### Availability

Include available scheduling windows.

### Fixed commitments

Include relevant calendar events.

### Current planned activities

Include the current week's planned activities and their status.

### Completed/missed activities

Include relevant information such as:

```text
Tuesday run = missed
```

### Current request

Example:

```text
"I missed my Tuesday run. Find the best alternative."
```

---

# 8. Planning Context Must Be Compact

Avoid sending unnecessary information to the model.

Do NOT send:

* Entire historical calendar
* Every historical activity
* Unrelated conversations
* Unrelated user data
* Database internals
* Sensitive data that isn't necessary for planning

The AI should receive a purpose-built planning context.

This is important for:

* Cost
* Latency
* Reliability
* Privacy
* Model performance

---

# 9. Initial Weekly Planning

For initial weekly plan generation:

1. Load the user's goals.
2. Load recurring activities.
3. Load constraints.
4. Load availability.
5. Load fixed commitments.
6. Construct the planning state.
7. Ask the AI to propose a coherent weekly plan.
8. Convert the proposal into structured planning operations.
9. Pass operations to the deterministic planning engine.
10. Validate the resulting schedule.
11. If valid, accept the schedule.
12. If invalid, return structured validation errors to the AI.
13. Allow the AI to revise the proposal.
14. Validate again.
15. Stop after a configurable maximum number of planning attempts.

Default maximum:

```text
3 AI planning attempts per planning operation.
```

Do not allow an uncontrolled loop.

---

# 10. Replanning

Replanning is a core Dailius capability.

When something changes, the system should evaluate the **remaining planning horizon**, not simply find the next available slot.

Examples:

```text
"I missed my workout."
"I have to work late Wednesday."
"My son has soccer Thursday."
"I'm going on vacation next week."
"Prioritize running for the next 12 weeks."
"I can't exercise Friday."
```

The AI should determine whether one or multiple changes are required.

---

# 11. Missed Activity Behaviour

When a user reports:

> "I missed my workout."

The system should:

1. Identify the missed activity.
2. Mark it as missed.
3. Determine whether the activity still matters toward the current goal.
4. Analyze the remaining planning horizon.
5. Analyze existing planned activities.
6. Determine available alternatives.
7. Consider priorities and constraints.
8. Consider interactions with other activities.
9. Propose changes to the schedule.
10. Validate those changes deterministically.
11. If valid, present the proposed revised plan to the user.

The system must NOT automatically assume:

> "Find the next free slot."

Instead, it should ask:

> "What is the best overall schedule now that this activity was missed?"

---

# 12. Multi-Activity Replanning

This is one of the most important requirements.

The AI must be able to propose changes to multiple activities when necessary.

Example:

Current schedule:

```text
Tuesday
18:00 Running

Thursday
18:00 Strength

Saturday
09:00 Cycling
```

User:

```text
I missed Tuesday's run.
```

The AI may determine:

```text
Thursday
18:00 Running

Friday
18:00 Strength

Saturday
09:00 Cycling
```

The important behaviour is that the AI understands that **rescheduling one activity may require moving another activity**.

Do not constrain the planner to moving only the missed activity.

---

# 13. Preserve Important Activities

The AI should understand that not all activities are equally interchangeable.

Activities should have metadata such as:

```text
priority
flexibility
duration
frequency
minimum spacing
maximum frequency
```

For example:

```text
Running
priority: high
frequency: 3/week
flexibility: medium

Cycling
priority: medium
frequency: 2/week
flexibility: medium

Strength
priority: medium
frequency: 3/week
flexibility: high

Guitar
priority: low
frequency: 3/week
flexibility: high
```

The AI should preferentially move lower-priority/more-flexible activities when necessary rather than automatically sacrificing high-priority activities.

---

# 14. Hard Constraints vs Soft Preferences

Explicitly distinguish between:

## Hard constraints

Must never be violated.

Examples:

```text
Cannot exercise after 20:00.
Family dinner is protected.
Work meeting cannot move.
Activity must fit within availability.
```

## Soft preferences

Should be optimized when possible but can be violated if necessary.

Examples:

```text
Prefer mornings.
Prefer cycling on weekends.
Prefer not to exercise two days in a row.
Prefer Sundays mostly free.
Prefer shorter weekday workouts.
```

The AI may trade off soft preferences.

It must not violate hard constraints.

---

# 15. Planning Objective

The AI should optimize for the **overall quality of the schedule**, not simply feasibility.

Conceptually, the planner should consider:

```text
Goal completion
+
Activity priorities
+
User preferences
+
Schedule feasibility
+
Consistency
+
Recovery
+
Minimal disruption
+
Balanced week
-
Constraint violations
-
Unnecessary changes
```

The exact scoring mechanism can initially remain simple.

Do not attempt to build an overly sophisticated mathematical optimizer for the MVP.

The AI provides the reasoning.

The deterministic engine provides feasibility and objective rule enforcement.

---

# 16. Minimize Unnecessary Changes

When replanning, do not move activities simply because another arrangement exists.

Prefer:

> **The smallest set of schedule changes that produces a substantially better overall plan.**

For example, if a missed run can be rescheduled without changing anything else, do that.

If the only way to preserve the user's priorities is to move another activity, then move it.

The AI should explain significant changes.

---

# 17. Validation / AI Feedback Loop

Implement a bounded planning loop.

Conceptually:

```text
AI generates proposal
        ↓
Deterministic engine validates
        ↓
      valid?
     /      \
   YES       NO
    ↓         ↓
 accept     structured errors
              ↓
             AI
              ↓
          revised proposal
```

Example validation feedback:

```json
{
  "valid": false,
  "violations": [
    {
      "type": "TIME_CONFLICT",
      "activity": "running",
      "conflict": "work"
    },
    {
      "type": "MINIMUM_RECOVERY",
      "activity": "cycling",
      "requiredHours": 24
    }
  ]
}
```

Send only relevant validation information back to the AI.

Do not resend unnecessary planning context if it hasn't changed.

---

# 18. Planning Attempt Limits

Implement strict limits.

Default:

```text
MAX_PLANNING_ATTEMPTS = 3
```

If the AI cannot produce a valid plan after the configured number of attempts:

* Do not modify the real schedule.
* Return a graceful failure.
* Explain that Dailius could not find a valid alternative.
* Where possible, present the closest feasible alternatives.
* Log the failure for debugging.

Never allow an infinite AI retry loop.

---

# 19. AI Cost Controls

AI usage must be explicitly bounded.

Implement architecture that supports:

### Per-request limits

* Maximum input tokens
* Maximum output tokens
* Maximum AI calls
* Maximum planning iterations

### Per-user limits

Support configurable:

* Daily AI request limit
* Monthly AI request limit
* Monthly token limit

### Server-side enforcement

Never rely exclusively on the client to enforce usage limits.

### Rate limiting

Prevent abuse such as:

```text
User repeatedly clicking "Replan"
```

from creating uncontrolled API costs.

### Model routing

Design the architecture so different AI models can be used for different levels of complexity.

For example:

```text
Simple request
    ↓
lower-cost model / deterministic logic

Complex replanning
    ↓
more capable reasoning model
```

Do not hard-code the architecture around one model.

The model should be configurable.

---

# 20. Do Not Use AI for Simple Deterministic Operations

Examples that should remain deterministic:

```text
Is 6:00 PM available?
Does this activity overlap another activity?
Does the activity fit in the available window?
Does this violate a hard time constraint?
What is the duration?
What activities are scheduled today?
What is the next available slot?
```

The AI should be used when the system needs **judgment, prioritization, trade-offs, or interpretation**.

This is both a cost optimization and architecture principle.

---

# 21. Conversational AI

The same planning architecture should support natural-language interactions.

Examples:

```text
"Prioritize running for the next 12 weeks."

"I missed my workout."

"I need to work late Wednesday."

"My son has soccer Thursday."

"I'm going on vacation next week."

"Can you make Sunday mostly free?"

"Why did you schedule my run on Thursday?"
```

The conversational layer should translate the user's request into a structured planning intent.

Example:

```json
{
  "intent": "REPLAN",
  "reason": "MISSED_ACTIVITY",
  "activityId": "run-123"
}
```

Then the planner handles the actual planning.

Do not put all business logic into conversational prompts.

---

# 22. Explainability

When the AI proposes meaningful changes, Dailius should be able to explain them in plain language.

Example:

> "I moved your strength workout to Friday and rescheduled your missed run for Thursday. This keeps your 3 weekly runs while avoiding a hard workout immediately before your long Saturday ride."

The explanation should be generated from the actual validated plan.

Do not allow the AI to claim that something happened if the deterministic engine rejected it.

---

# 23. User Approval

For the MVP, AI-generated schedule changes should be treated as **proposals** before being committed, unless the existing product explicitly supports automatic changes.

Recommended behaviour:

```text
User request
    ↓
AI proposes changes
    ↓
Deterministic validation
    ↓
User sees proposal
    ↓
Accept
    ↓
Persist changes
```

Example UI:

```text
I found a better way to fit your missed run.

Changes:
• Move Strength → Friday 6:00 PM
• Add Run → Thursday 5:30 PM

Why:
This keeps your running goal on track while preserving your Saturday cycling session.

[Accept Changes] [Keep Current Plan]
```

---

# 24. Schedule State Management

Do not modify the production schedule while the AI is experimenting.

Use a temporary/proposed schedule.

Conceptually:

```text
Current Schedule
       ↓
Create Planning Snapshot
       ↓
AI Proposal
       ↓
Apply Operations to Snapshot
       ↓
Validate
       ↓
If valid → Proposal
       ↓
User Accepts
       ↓
Persist
```

This prevents invalid AI proposals from corrupting the user's schedule.

---

# 25. Data Model Considerations

Use the existing database architecture where possible.

Do not unnecessarily rewrite the schema.

Add fields/entities only where required to support:

* Planning operations
* Planning proposals
* Planning attempts
* Validation results
* Planning state
* AI request metadata
* Proposal status

Potential proposal statuses:

```text
DRAFT
VALID
PENDING_USER
ACCEPTED
REJECTED
EXPIRED
FAILED
```

Potential planning operation fields:

```text
type
activityId
originalStart
originalEnd
targetStart
targetEnd
metadata
```

Adapt these to the existing Dailius schema rather than blindly creating duplicate entities.

---

# 26. Logging and Observability

Every AI planning operation should be traceable.

Log:

* Planning request ID
* User ID
* Trigger
* Model used
* Token usage if available
* Number of planning attempts
* Validation results
* Final result
* Latency
* Error information

Do not log sensitive information unnecessarily.

Useful triggers include:

```text
INITIAL_WEEKLY_PLAN
MISSED_ACTIVITY
USER_REPLAN_REQUEST
GOAL_CHANGE
PRIORITY_CHANGE
CALENDAR_CHANGE
CONSTRAINT_CHANGE
```

This data will be extremely useful for understanding:

* How often users need replanning
* Which scenarios fail
* How many AI attempts are normally required
* AI cost per planning event
* Which planning problems are difficult
* Whether users accept AI recommendations

---

# 27. Failure Handling

The system must fail safely.

If:

* AI API is unavailable
* AI returns malformed output
* AI proposes unsupported operations
* Validation fails
* AI exceeds attempt limit
* AI times out
* User has exceeded usage limits

then:

1. Do not corrupt the current schedule.
2. Do not partially apply the AI proposal.
3. Preserve the current valid schedule.
4. Return a user-friendly message.
5. Log the technical failure.

Example:

> "I couldn't find a valid way to reorganize the remaining week. Your current schedule hasn't been changed."

---

# 28. Structured AI Output

Do not parse free-form natural-language AI responses to determine schedule operations.

Use structured output / JSON schema supported by the selected AI API.

The AI response should contain structured information such as:

```json
{
  "summary": "Reschedule the missed run and move strength to Friday.",
  "operations": [
    {
      "type": "MOVE_ACTIVITY",
      "activityId": "strength-123",
      "targetStart": "2026-08-14T18:00:00"
    },
    {
      "type": "MOVE_ACTIVITY",
      "activityId": "run-456",
      "targetStart": "2026-08-13T17:30:00"
    }
  ]
}
```

The application must validate the schema before processing.

Reject malformed or unsupported output.

---

# 29. Security

The AI must never receive credentials, API keys, authentication tokens, or unnecessary private technical information.

The AI should only receive the minimum user planning data required for the current operation.

The AI should never be trusted with direct database access.

The AI should never be trusted with direct calendar API credentials.

All external side effects must happen through application-controlled deterministic code.

---

# 30. MVP Scope

Keep the implementation focused.

For this refactoring, prioritize:

### Required

* AI planning layer
* Structured planning context
* Structured planning operations
* Deterministic validation
* AI → validator feedback loop
* Bounded retry mechanism
* Multi-activity replanning
* Missed activity scenario
* User approval before committing changes
* AI usage controls
* Logging
* Safe failure handling

### Not required yet

Do NOT build:

* Autonomous agents
* Long-running AI processes
* Background autonomous replanning
* Wearable integrations
* Advanced machine learning
* Complex mathematical optimization
* Household planning
* Multi-user planning
* Native mobile applications
* Fully autonomous calendar modification

Keep the architecture extensible but the implementation small.

---

# 31. Example End-to-End Scenario

## Initial state

User goals:

```text
Running: 3×/week
Cycling: 2×/week
Strength: 3×/week
Guitar: 3×/week
```

Constraints:

```text
Weekday exercise ≤ 40 minutes
No exercise after 20:00
Family dinner protected
Longer cycling sessions on weekends
Sunday mostly free
```

Current schedule:

```text
Monday
18:00 Strength

Tuesday
18:00 Run

Wednesday
18:00 Guitar

Thursday
18:00 Strength

Friday
18:00 Run

Saturday
09:00 Long Ride

Sunday
Mostly free
```

The user says:

> "I missed my Tuesday run."

## Expected behaviour

The application:

1. Marks Tuesday's run as missed.
2. Creates a planning snapshot.
3. Builds a compact planning context.
4. Sends it to the AI planner.
5. AI analyzes the remaining week.
6. AI recognizes that simply adding another run could create a poor schedule.
7. AI proposes one or more operations.
8. Deterministic engine applies them to the snapshot.
9. Deterministic engine validates the resulting schedule.
10. If invalid, structured validation errors are returned to the AI.
11. AI gets up to 3 attempts.
12. Once a valid proposal is produced, the proposal is shown to the user.

Example result:

```text
I found a way to keep your running goal on track.

Changes:
• Move Thursday Strength → Friday
• Add missed Run → Thursday

This preserves your Saturday long ride and keeps your 3 weekly runs without creating unnecessary conflicts.
```

The user can then:

```text
[Accept Changes]
[Keep Current Plan]
```

---

# 32. Another Example — Priority Change

User says:

> "Prioritize running for the next 12 weeks."

The system should not simply change a text field and leave the schedule untouched.

It should:

1. Update the running priority.
2. Analyze the current plan.
3. Re-evaluate competing flexible activities.
4. Determine whether schedule changes are beneficial.
5. Generate a revised plan.
6. Validate it.
7. Show the user what changed.

Potentially:

```text
Running
Priority: High

Cycling
Priority: Medium

Strength
Priority: Medium

Guitar
Priority: Low
```

The AI can then reason that guitar or a flexible strength session may move before sacrificing an important run.

---

# 33. Another Example — Work Conflict

User says:

> "I have to work late Wednesday."

The system should:

1. Identify affected activities.
2. Determine which are movable.
3. Analyze the rest of the week.
4. Consider the user's priorities.
5. Potentially move more than one activity.
6. Validate the resulting plan.
7. Present the proposed changes.

Do NOT simply move the affected activity to the first available slot.

---

# 34. Another Example — Vacation

User says:

> "I'm going on vacation next week."

For the MVP, the system does not need sophisticated travel planning.

It should be capable of:

1. Identifying the affected planning horizon.
2. Removing or marking affected flexible activities.
3. Considering which goals can realistically be maintained.
4. Rebalancing the current/remaining plan if appropriate.
5. Avoiding impossible scheduling assumptions.

---

# 35. Architecture Quality Requirements

The implementation should maintain clear separation of concerns.

Recommended conceptual modules:

```text
planning/
    planning-context
    planning-intent
    ai-planner
    planning-operations
    planning-proposal
    planning-validator
    planning-loop
    planning-service
```

Adapt names to the existing codebase.

Avoid introducing unnecessary abstractions if the existing project structure has a better equivalent.

The important requirement is architectural separation, not exact filenames.

---

# 36. Testing Requirements

Add automated tests for the new planning architecture.

At minimum test:

### Deterministic validation

* Time conflict
* Availability violation
* Protected time
* Duration violation
* Recovery violation
* Valid schedule

### AI output validation

* Valid operation
* Unsupported operation
* Invalid activity ID
* Malformed output
* Missing required fields

### Replanning

* Missed activity
* Multiple activities moved
* Priority change
* Work conflict
* No valid alternative

### Retry loop

* First attempt valid
* First attempt invalid, second valid
* All attempts invalid
* Maximum attempt limit respected

### Safety

* Invalid proposals never modify production schedule
* Partial operations never persist
* Failed AI request leaves existing schedule unchanged

---

# 37. Cost/Usage Instrumentation

Add enough telemetry to calculate:

```text
AI requests per user
AI requests per planning event
Input tokens
Output tokens
Total tokens
Estimated cost
Average attempts per successful plan
Failure rate
```

This is important because Dailius needs to determine whether AI-assisted planning is economically viable.

Do not optimize prematurely based on guesses.

Instrument the system so real usage can be measured.

---

# 38. Performance Requirements

For normal planning requests:

* Avoid unnecessary AI calls.
* Avoid sending redundant context.
* Keep planning context compact.
* Use deterministic logic wherever possible.
* Use bounded AI retries.
* Avoid synchronous calls that can be replaced with simpler deterministic checks.

The architecture should make it possible to later introduce model routing without a major refactor.

---

# 39. Implementation Constraints

Before changing code:

1. Inspect the existing Dailius architecture.
2. Understand the current deterministic scheduler.
3. Identify what can be reused.
4. Do NOT rewrite working scheduling functionality unnecessarily.
5. Preserve existing behaviour for simple scheduling scenarios.
6. Refactor incrementally.
7. Keep existing tests passing.
8. Add tests before/alongside changes where practical.
9. Avoid introducing unnecessary dependencies.
10. Follow the existing project coding conventions.

Do not assume the proposed filenames, database schema, or module structure exactly match the current repository.

Adapt the implementation to the existing codebase.

---

# 40. Backward Compatibility

Simple scheduling scenarios should continue to work without requiring AI.

For example:

```text
Find an available 30-minute slot Tuesday.
```

can remain deterministic.

AI should be invoked when:

* User asks for reasoning
* Multiple activities may need to move
* Priorities change
* A goal changes
* A missed activity needs to be reconciled
* The schedule needs holistic optimization
* The user asks a natural-language planning question

This is important for keeping Dailius fast and inexpensive.

---

# 41. Desired Final Architecture

The final system should conceptually work like this:

```text
                    ┌──────────────────┐
                    │      User        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Conversational   │
                    │      Layer       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   AI Planner     │
                    │                  │
                    │ Reason           │
                    │ Prioritize       │
                    │ Reorganize       │
                    │ Propose          │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Planning         │
                    │ Operations       │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Deterministic    │
                    │ Planning Engine  │
                    │                  │
                    │ Validate         │
                    │ Constraints      │
                    │ Conflicts        │
                    │ Availability     │
                    └────────┬─────────┘
                             │
                       ┌─────┴─────┐
                       │           │
                     VALID       INVALID
                       │           │
                       ▼           ▼
                   Proposal      AI Retry
                       │
                       ▼
                  User Approval
                       │
                       ▼
                 Persist Schedule
                       │
                       ▼
                    Calendar
```

---

# 42. Core Design Principle

The most important requirement of this refactoring is:

> **Do not try to make the deterministic scheduler behave like an AI.**

And:

> **Do not let the AI become the source of truth for scheduling rules.**

Instead:

> **AI = reasoning and planning.**

> **Deterministic engine = constraints and validation.**

> **Database/calendar = source of truth.**

This separation should allow Dailius to become significantly more intelligent without sacrificing reliability, predictability, security, or cost control.

---

# 43. Definition of Done

The refactoring is complete when:

* [ ] Existing deterministic scheduling still works.
* [ ] AI planning can generate structured planning proposals.
* [ ] AI cannot directly modify the production schedule.
* [ ] Planning proposals are validated deterministically.
* [ ] Multiple activities can be moved as part of one replanning operation.
* [ ] Missed activities trigger holistic replanning rather than simple next-slot placement.
* [ ] Hard constraints cannot be violated.
* [ ] Soft preferences can be traded off.
* [ ] AI proposals can be rejected and regenerated.
* [ ] Planning retries are bounded.
* [ ] Invalid proposals never corrupt the user's schedule.
* [ ] Users can review and accept proposed changes.
* [ ] AI usage is rate-limited and measurable.
* [ ] Token usage and estimated cost are logged.
* [ ] Simple scheduling operations do not require AI.
* [ ] AI context is compact and purpose-built.
* [ ] Automated tests cover the planning loop and validation.
* [ ] AI failures degrade gracefully.
* [ ] The implementation fits the existing Dailius architecture rather than unnecessarily rewriting it.

---

# 44. Implementation Approach

Implement this incrementally.

### Phase 1

Refactor the existing scheduler so that it exposes a clean validation interface.

### Phase 2

Create the structured planning context.

### Phase 3

Create AI planning service with structured output.

### Phase 4

Create planning operations and temporary schedule/proposal handling.

### Phase 5

Implement AI → deterministic validation → AI retry loop.

### Phase 6

Implement the missed-activity replanning scenario end-to-end.

### Phase 7

Implement priority-change and multi-activity replanning scenarios.

### Phase 8

Add usage limits, telemetry, cost tracking, and rate limiting.

### Phase 9

Add automated tests and clean up architecture.

Do not attempt to implement every future Dailius capability in this refactoring.

The immediate objective is:

> **Make Dailius capable of intelligently replanning a person's week when circumstances change, while keeping deterministic code responsible for hard scheduling rules and validation.**
