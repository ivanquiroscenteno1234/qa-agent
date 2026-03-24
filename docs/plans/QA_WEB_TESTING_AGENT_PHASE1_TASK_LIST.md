# QA Web Testing Agent Phase 1 Task List

## Goal

Translate Phase 1 of the improvement plan into a concrete implementation sequence that can be executed in the current local-file architecture.

Phase 1 covers:

1. run-state and event modeling
2. step-level persistence and warning capture
3. local queued execution
4. live run console
5. cancel-run support

---

## Constraints

- no database
- keep Next.js app structure intact
- preserve current API routes where practical
- prefer additive changes before larger refactors
- maintain current exploratory and regression behavior while improving runtime control

---

## Deliverables

By the end of Phase 1, the app should support:

- persisted incremental run progress
- a local run-event stream or pollable event history
- local queued execution instead of long-lived request-bound execution
- active run cancellation
- a dashboard console that shows what the agent is doing while it runs
- better error and warning reporting for partially successful runs

---

## Task List

### Task 1: Extend the domain model for runtime control

Purpose:

- define the state model needed for queued execution, live progress, and cancellation

Files:

- `lib/types.ts`

Changes:

- add richer run phases, for example:
  - `queued`
  - `preparing`
  - `executing`
  - `reporting`
  - `cancelled`
- add `RunEvent`
- add `ExecutionWarning`
- add `FailureCategory`
- add optional `startedAt`, `completedAt`, `cancelRequestedAt`
- add event and warning arrays to `RunRecord`
- add optional per-step or per-scenario confidence fields if kept lightweight

Acceptance criteria:

- the type system can represent an active run separately from a completed run
- warnings and live events can be stored without inventing ad hoc strings in the UI

---

### Task 2: Add local event persistence and run mutation helpers

Purpose:

- support incremental updates while execution is in progress

Files:

- `lib/qa/store.ts`

Changes:

- add helper methods such as:
  - `appendRunEvent(runId, event)`
  - `appendRunWarning(runId, warning)`
  - `updateRunState(runId, patch)`
  - `requestRunCancellation(runId)`
  - `listRunEvents(runId)`
- optionally add an append-only local event file such as `.data/qa-run-events.json`
- ensure current `saveRun` behavior does not wipe events or warnings unexpectedly
- guard against stale writes by reading the latest run before patching

Acceptance criteria:

- a single step completion can be persisted without rewriting execution behavior manually everywhere
- the store can mark a run as cancellation-requested while execution is still active

---

### Task 3: Split execution orchestration from direct route handling

Purpose:

- stop treating run execution as a single blocking request flow

Files:

- `app/api/runs/[runId]/start/route.ts`
- `lib/qa/execution-engine.ts`
- new file: `lib/qa/run-queue.ts`

Changes:

- make the start route do this:
  - validate run exists and is startable
  - mark run as queued
  - enqueue local execution
  - return immediately with current queued state
- create a small in-process queue coordinator for the current app runtime
- prevent duplicate concurrent execution of the same run id
- allow one active worker loop per run

Acceptance criteria:

- starting a run returns quickly
- a run transitions to `queued` or `executing` without waiting for final completion
- repeated start requests on the same active run are rejected or treated idempotently

Implementation note:

- because there is no separate worker service yet, use a process-local queue abstraction first
- document clearly that this is an interim architecture pending stronger infrastructure

---

### Task 4: Add incremental execution checkpoints

Purpose:

- preserve partial progress and improve debuggability when a run ends unexpectedly

Files:

- `lib/qa/execution-engine.ts`
- `lib/qa/store.ts`

Changes:

- after each meaningful execution milestone, persist:
  - current phase
  - last completed step or scenario index
  - latest step result
  - new artifact metadata
  - new events and warnings
- replace silent catch branches with warning emission where appropriate
- add a helper such as `emitRunEvent(...)`
- add cancellation checks between steps and major crawl actions

Acceptance criteria:

- killing or interrupting a run leaves visible partial evidence in the UI
- warnings are available for recoverable issues such as retry or fallback behavior
- cancellation is honored between steps or scenario boundaries

---

### Task 5: Add cancel-run API support

Purpose:

- give operators control over long or obviously broken runs

Files:

- new file: `app/api/runs/[runId]/cancel/route.ts`
- `lib/qa/store.ts`
- `lib/qa/execution-engine.ts`
- `components/qa-command-center.tsx`

Changes:

- create cancel endpoint
- set `cancelRequestedAt`
- have the executor or queue check for cancellation before advancing
- mark run `cancelled` if cancellation is honored before completion
- expose cancel action in the UI when a run is active

Acceptance criteria:

- an operator can cancel a queued or executing run
- cancelled runs show partial evidence and a clear terminal summary

---

### Task 6: Expose live run status through polling endpoints

Purpose:

- support a working live console without adding websocket infrastructure first

Files:

- `app/api/runs/[runId]/route.ts`
- new file: `app/api/runs/[runId]/events/route.ts`
- `lib/qa/store.ts`

Changes:

- extend run detail endpoint if needed to include lightweight execution metadata
- add a dedicated events endpoint for run events and warnings
- return data ordered by timestamp
- keep the response small and UI-friendly

Acceptance criteria:

- the UI can poll a selected active run and render progress without full-page refresh
- the events payload is separate from heavy artifact payloads

---

### Task 7: Add a live run console to the dashboard

Purpose:

- make execution understandable while it is happening

Files:

- `components/qa-command-center.tsx`
- `app/globals.css`

Changes:

- poll the selected active run and its events on an interval
- add a console panel showing:
  - queue or execution state
  - current phase
  - active step or scenario label
  - latest warnings
  - elapsed time
- show a more explicit status banner for:
  - draft
  - queued
  - running
  - pass
  - fail
  - blocked
  - cancelled
- add a cancel button for active runs

Acceptance criteria:

- the operator does not need to wait for final completion to know what the agent is doing
- warnings and fallback behavior are visible while the run is in progress

---

### Task 8: Improve run setup validation and feedback

Purpose:

- fail bad configurations early and reduce operator confusion

Files:

- `app/api/runs/route.ts`
- `components/qa-command-center.tsx`

Changes:

- validate run plans by mode, for example:
  - regression mode requires a scenario library or generated scenarios
  - execute-steps mode should require non-empty steps unless explicitly allowed
  - discovery mode should explain that blank steps are valid
- return structured error payloads with code and message
- render those messages clearly in the UI

Acceptance criteria:

- invalid runs are rejected before queueing
- the operator sees actionable validation feedback rather than generic failure text

---

### Task 9: Improve local security and redaction behavior

Purpose:

- reduce avoidable leakage while still using local files

Files:

- `lib/qa/execution-engine.ts`
- `lib/qa/store.ts`
- `components/qa-command-center.tsx`

Changes:

- expand error redaction beyond the single known password pattern
- avoid echoing raw credentials into run events, summaries, or warnings
- add UI messaging that credential fields are local-only and should be treated carefully
- ensure the live console never prints secrets

Acceptance criteria:

- credential values do not appear in execution warnings, summaries, or event logs
- local risk is reduced even before a real vault exists

---

## Suggested Implementation Order

Implement in this order:

1. Task 1: Extend the domain model
2. Task 2: Add store mutation helpers
3. Task 3: Add queue coordinator and non-blocking run start
4. Task 4: Add execution checkpoints and warning emission
5. Task 5: Add cancel-run support
6. Task 6: Add events polling API
7. Task 7: Add live run console in the UI
8. Task 8: Improve validation and feedback
9. Task 9: Improve local redaction and safety messaging

Reason:

- the types and persistence model must exist before the queue and UI can rely on them
- the queue and checkpoints must exist before the console can show anything meaningful
- validation and redaction are safer once the core runtime data model is defined

---

## File-Level Change Map

### `lib/types.ts`

- add runtime state, event, warning, and cancellation fields

### `lib/qa/store.ts`

- add append and patch helpers
- support local event persistence
- support cancellation requests

### `lib/qa/execution-engine.ts`

- emit incremental events
- checkpoint progress
- honor cancellation
- classify warnings more explicitly

### `lib/qa/run-queue.ts`

- new process-local queue abstraction
- track active run ids
- start execution asynchronously

### `app/api/runs/[runId]/start/route.ts`

- queue run instead of executing synchronously

### `app/api/runs/[runId]/cancel/route.ts`

- new cancel API

### `app/api/runs/[runId]/events/route.ts`

- new events API for live console polling

### `components/qa-command-center.tsx`

- poll active run state
- render live console
- show cancel action and clearer status handling

### `app/globals.css`

- style live console, active banners, warning rows, and cancelled state

---

## Testing Checklist

### Reliability checks

- create a draft run and start it
- verify it becomes queued, then executing
- verify step results appear incrementally
- interrupt execution and confirm partial state remains visible

### Cancellation checks

- start a visible browser run
- cancel it mid-run
- verify the browser session stops at a safe boundary
- verify the run status becomes cancelled

### UI checks

- verify the console updates while a run is active
- verify warnings render distinctly from failures
- verify completed runs stop polling automatically

### Validation checks

- attempt invalid regression run without a library
- attempt step execution with empty steps if not allowed
- verify the API returns structured feedback and the UI displays it clearly

### Redaction checks

- force a login error
- verify the password does not appear in warnings, errors, or event logs

---

## Done Criteria For Phase 1

Phase 1 is done when:

- run execution no longer depends on one long API request
- active runs expose live progress to the UI
- the operator can cancel an active run
- step-level progress and warnings are persisted incrementally
- invalid run setups fail early with actionable messages
- credential values do not leak into the console or stored run events

---

## Recommended Next Step After Phase 1

After this task list is complete, move to the UI workflow redesign and execution-engine modularization work described in:

- `docs/QA_WEB_TESTING_AGENT_IMPROVEMENT_PLAN.md`