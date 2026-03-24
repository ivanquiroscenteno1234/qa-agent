# Frontend Copilot Instructions

Use this file for frontend, UI, client-side, extension UI, and user-facing experience work.

## Planning And Approval Rules (Mandatory)

- Before any code change create a detailed implementation plan and show it to the user first.
- The plan must include the files or areas affected, behavior changes, risks, assumptions, and concrete suggestions.
- Do not edit files, run tools, or apply patches until the user explicitly approves, unless a provided plan file already authorizes implementation.
- Inspect the local agent system first and use the most relevant specialist from `.agent/agents` or `.agents` when those folders exist.

## Frontend Core Principles

- Prioritize clarity, usability, and validation over visual novelty.
- Prefer extending existing component, routing, styling, and data-fetching patterns over introducing new abstractions.
- Keep components small, focused, and composable.
- Keep behavior stable unless the user explicitly requests a change.

## Behavior-First Rule (Mandatory)

- Define behavior before implementing or restyling any interactive UI.
- For banners, cards, CTAs, forms, toasts, modals, menus, dashboards, widgets, and flows, define:
  - primary action
  - secondary action when applicable
  - fallback behavior when data, permissions, or dependencies are missing
  - success and error feedback expectations
  - tracking or observability expectations when relevant
- If behavior is ambiguous, ask one precise question first, then proceed with sensible defaults.
- Avoid decorative affordances that imply actions the UI does not actually support.

## State And Data Rules

- Prefer the repo's existing client state, server state, form, and network patterns.
- Keep API contracts typed and synchronized with the backend.
- Validate user input at the form boundary and again at the API boundary when relevant.
- Avoid storing derived state when it can be computed safely.
- Handle loading, empty, error, and success states explicitly.

## UX And Accessibility Rules (Mandatory)

- Use semantic structures appropriate for the platform.
- For web UI, ensure keyboard navigation, focus management, labels, accessible feedback, and readable error states.
- Prefer clear, actionable error messages over vague failures.
- Make loading and transitional states understandable to users.

## Frontend Performance Rules

- Optimize only where it affects responsiveness, correctness, or cost.
- Avoid unnecessary renders, recomputation, over-fetching, and repeated I/O.
- Use lazy loading, batching, pagination, streaming, or memoization when justified by the actual UI flow.
- Prefer measurable improvements over speculative tuning.

## Security Rules

- Never expose secrets, credentials, tokens, or private keys.
- Treat rendered HTML, markdown, file inputs, and browser-exposed integrations as hostile surfaces until proven safe.
- Validate and sanitize untrusted input.
- Prevent XSS, broken auth flows, and accidental data leaks.

## Verification And Testing (Mandatory)

- Verify changed UI behavior after implementation using the available UI or browser validation tooling.
- Add or update focused behavior-oriented tests when the repo has a frontend test suite.
- Cover the happy path and at least one meaningful edge case or failure mode.
- If verification depends on inaccessible credentials, missing data, or unavailable environments, report that clearly.

## Deliverables

- Include summary, files changed, behavior notes, usage or integration notes, risks, tests added or run, and rollout or migration steps when relevant.
- Update docs when setup, user behavior, or operational expectations materially change.

## Definition Of Done

- behavior is clearly defined and implemented
- loading, error, empty, and success states are explicit
- accessibility and keyboard behavior are considered
- tests and verification cover the changed experience
- the UI fits the repo's established frontend patterns