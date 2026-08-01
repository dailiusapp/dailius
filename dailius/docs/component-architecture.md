# Component Architecture

## Purpose

Defines frontend organization.

---

# Folder Structure
app/
routes and pages
components/
reusable UI components
features/
product-specific functionality
lib/
shared utilities
services/
API and external integrations
hooks/
React hooks
types/
shared TypeScript types


---

# Feature Organization

Prefer organizing by feature.

Example:
features/
planner/
components/
hooks/
services/
types/
goals/
activities/
onboarding/



---

# Components

Components should:

- Have one responsibility
- Be reusable when practical
- Avoid business decisions

---

# Feature Layer

Features contain:

- Business workflows
- Domain logic
- Feature-specific components

---

# Services

Services handle:

- Database access
- External APIs
- AI communication

---

# State Management

Prefer:

- Server state first
- Local state when needed

Avoid global state unless necessary.

---

# Forms

Forms should:

- Validate input
- Provide helpful errors
- Guide users step-by-step