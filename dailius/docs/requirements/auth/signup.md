# Sign Up Page Requirements

**Version:** 1.0
**Status:** Approved
**Feature:** User Authentication

---

# Purpose

The Sign Up page allows a new user to create a Dailius account quickly and securely.

The experience should be simple, intuitive, and require less than one minute to complete.

---

# URL

```
/register
```

---

# Goals

## Primary Goal

Allow a new user to:

* Create a Dailius account
* Verify their email address
* Continue into the application

## Secondary Goals

* Build trust
* Minimize friction
* Provide clear validation and error messages
* Support desktop and mobile devices

---

# Functional Requirements

## Registration Form

The page shall display the following fields:

| Field         | Required | Validation                                   |
| ------------- | -------- | -------------------------------------------- |
| Full Name     | Yes      | Minimum 2 characters, maximum 100 characters |
| Email Address | Yes      | Valid email format                           |
| Password      | Yes      | Minimum 8 characters                         |

### Full Name

Requirements:

* Required
* Trim leading and trailing whitespace
* Minimum length: 2 characters
* Maximum length: 100 characters

Example:

```
Carlos Ventura
```

---

### Email Address

Requirements:

* Required
* Must be a valid email address
* Convert to lowercase before storing
* Trim whitespace

Example:

```
carlos@example.com
```

---

### Password

Requirements:

* Required
* Minimum 8 characters

For the MVP, password complexity rules such as uppercase letters, numbers, or symbols are **not required**.

Passwords must never be stored outside of Supabase Auth.

---

# Primary Action

Primary button:

```
Create Account
```

While submitting:

```
Creating account...
```

During submission:

* Disable all form inputs
* Disable the submit button
* Prevent duplicate submissions
* Display a loading indicator

---

# Validation

Validation shall occur:

* When a field loses focus, or
* After the user attempts to submit the form

Example messages:

```
Please enter your full name.
```

```
Please enter a valid email address.
```

```
Password must be at least 8 characters.
```

Only one validation message should be displayed per field.

---

# Successful Registration

Upon successful registration, the application shall:

1. Create a user in Supabase Auth.
2. Create a corresponding row in the `profiles` table.
3. Trigger Supabase email verification.
4. Display a confirmation page.

Example:

```
Check your email

We've sent a verification email to:

carlos@example.com

Please verify your email before signing in.

[ Return to Login ]
```

---

# Error Handling

Display user-friendly messages for expected errors.

Examples:

Email already registered:

```
An account with this email already exists.
```

Weak password:

```
Password must be at least 8 characters.
```

Unexpected server error:

```
Something went wrong.

Please try again.
```

Internal Supabase error messages must not be shown directly to the user.

---

# Navigation

Below the registration form display:

```
Already have an account?

Sign In
```

Link:

```
/login
```

---

# Accessibility

The page shall:

* Support keyboard navigation
* Use semantic HTML
* Associate labels with all form fields
* Display visible keyboard focus states
* Expose validation errors to assistive technologies
* Meet WCAG AA color contrast guidelines

---

# Responsive Design

The page shall support:

* Desktop
* Tablet
* Mobile

Mobile requirements:

* Single-column layout
* No horizontal scrolling
* Minimum touch target size of 44 × 44 pixels

---

# Security Requirements

The application shall:

* Use HTTPS
* Never log passwords
* Never store passwords outside Supabase Auth
* Sanitize user input
* Prevent duplicate submissions
* Rely on Supabase Auth for password hashing and authentication

---

# Analytics (Future Enhancement)

The following analytics events should be easy to add later:

* Registration page viewed
* Registration started
* Registration completed
* Registration failed

Analytics are **out of scope for the MVP**.

---

# Out of Scope

The following features are intentionally excluded from the MVP:

* Google Sign-In
* Apple Sign-In
* Microsoft Sign-In
* GitHub Sign-In
* Multi-factor authentication (MFA)
* CAPTCHA
* Referral codes
* Invite codes
* Marketing email opt-in
* Profile photo upload

---

# Acceptance Criteria

The feature is considered complete when a user can:

* Visit `/register`
* Enter their full name
* Enter a valid email address
* Enter a password with at least 8 characters
* Submit the registration form
* Receive clear validation messages for invalid input
* Successfully create a new account
* Receive an email verification message
* View a confirmation screen after registration
* Navigate to the login page if they already have an account
* Complete the registration process in under one minute on desktop and mobile devices
