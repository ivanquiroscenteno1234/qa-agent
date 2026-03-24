# Backend Copilot Instructions

Use this file for backend services, APIs, jobs, workers, scripts, CLI automation, and data-processing code.

## Planning And Approval Rules (Mandatory)

- Before any code change create a detailed implementation plan and show it to the user first.
- The plan must include the files or systems affected, source-of-truth decisions, risks, assumptions, and concrete suggestions.
- Do not edit files, run tools, or apply patches until the user explicitly approves, unless a provided plan file already authorizes implementation.
- Inspect the local agent system first and use the most relevant specialist from `.agent/agents` or `.agents` when those folders exist.

## Backend Core Principles

- Prefer the native architecture of the project before adding custom infrastructure.
- Keep modules, services, handlers, jobs, utilities, and commands narrowly focused.
- Fix root causes instead of layering surface patches.
- Keep naming explicit and domain-oriented.
- Document source of truth, lifecycle, and failure modes when changing data flow.

## Data, Contracts, And Side Effects

- Centralize persistence and network access through the repo's existing access layer when one exists.
- Favor typed contracts for requests, responses, events, commands, and persisted records.
- Validate external input at boundaries.
- Avoid storing derived state when it can be computed safely.
- Handle retries, timeouts, idempotency, and concurrency deliberately for operations touching external systems.
- Make async work cancellable or interruptible when the platform supports it.

## Reliability Rules

- Design endpoint, job, and worker behavior so failures are explicit and diagnosable.
- Prefer safe fallback behavior over silent partial failure.
- Be deliberate about transaction boundaries, deduplication, and retry safety.
- For scripts and automations, optimize for predictable exit behavior, safe execution, and clear logs.

## Security Rules (Mandatory)

- Never expose secrets, credentials, tokens, or private keys.
- Validate, sanitize, and encode untrusted input at every appropriate boundary.
- Prevent injection vulnerabilities, broken authorization flows, data leaks, and unsafe deserialization.
- Use least privilege for services, databases, queues, jobs, and external integrations.
- Treat shell commands, SQL, file access, and third-party callbacks as hostile surfaces until proven otherwise.

## API And Operational Behavior

- Keep public behavior stable unless the user explicitly requests a behavior change.
- Use actionable, consistent errors for APIs, jobs, and CLIs.
- Make logs understandable to operators.
- Keep success, partial-failure, retry, and terminal-failure behavior explicit.

## Verification And Testing (Mandatory)

- Verify changed backend behavior after implementation using the real validation path when possible.
- For API or data work, confirm the endpoint, service, job, or query reads and writes the expected data.
- For scripts, CLI flows, and automations, run the relevant command or test path and verify side effects and failure handling.
- Add or update focused behavior-oriented tests when the repo has a test suite.
- Cover the happy path and at least one meaningful edge case or failure mode.
- If verification depends on inaccessible credentials, missing data, or unavailable environments, report that clearly.

## Quality And Documentation

- Satisfy formatter, linter, type checker, and test expectations where applicable.
- Do not leave dead code, placeholder TODO logic, or unused exports without reason.
- Keep diffs narrow and directly relevant to the task.
- Update docs when architecture, setup, contracts, or operational procedures materially change.

## Deliverables

- Include summary, files changed, contract or behavior notes, risks, tests added or run, and rollout or migration steps when relevant.

## Definition Of Done

- contracts and boundaries are explicit
- security and failure modes are considered
- retries, timeouts, idempotency, and concurrency are handled deliberately when relevant
- verification confirms expected backend behavior
- the implementation fits the repo's backend patterns