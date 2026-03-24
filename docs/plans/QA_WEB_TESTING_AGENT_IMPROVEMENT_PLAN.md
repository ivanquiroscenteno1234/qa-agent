# QA Web Testing Agent Improvement Plan

## Goal

Define the next implementation plan for the current QA web testing app without introducing a database yet.

This plan focuses on:

- improving agent reliability and execution quality
- improving the operator UI and workflow clarity
- improving observability, evidence review, and failure diagnosis
- improving scenario-library quality and regression usefulness
- keeping the current local-file architecture viable until a database exists

This plan does not include database migration work.

---

## Scope Boundaries

### In scope

- worker-style execution using the current app runtime and local persistence
- run progress streaming or polling
- modularization of the execution engine
- stronger scenario execution policies
- improved scenario libraries and run comparison
- improved QA analysis and evidence presentation
- UI restructuring and better operator guidance
- improved validation, error handling, and observability
- safer handling of credential inputs within the current constraints

### Explicitly out of scope for this plan

- database design or migration
- multi-user collaboration backed by server-side identity
- external bug tracker integration that depends on durable backend infrastructure
- enterprise-grade secret vault integration if it requires infrastructure not yet available

---

## Current State Summary

The app already supports:

- plain-text step parsing
- scenario generation
- live Playwright execution
- discovery-first exploratory runs
- saved scenario libraries
- regression reruns from saved libraries
- crawl, screenshot, trace, and report artifacts
- bounded QA analysis insights

The main current constraints are:

- the execution engine is too monolithic
- run execution still behaves like a synchronous request workflow
- the UI is dense and makes the operator infer too much state
- scenario execution still relies on a mix of deterministic logic and brittle string heuristics
- observability is mostly post-run rather than live

---

## Implementation Principles

1. Keep deterministic execution primary.
2. Use AI-style analysis only after deterministic evidence capture.
3. Preserve the local-file architecture, but make it safer and more structured.
4. Prefer phased refactors over a full rewrite.
5. Improve operator trust before adding more automation surface.

---

## Target Outcomes

By the end of this plan, the app should:

- show live run progress clearly
- separate run drafting, execution, and evidence review cleanly in the UI
- execute saved scenarios through explicit scenario-type policies
- provide better failure classification and confidence reporting
- compare current discovery results against previous saved baselines
- preserve higher-quality scenario libraries with lightweight versioning
- make the QA analysis feature more actionable for humans and developers

---

## Workstreams

### Workstream 1: Execution Runtime Hardening

Purpose:

- make runs more reliable without requiring a database

Key changes:

- decouple run start from the long-running execution path
- introduce a local execution queue or worker coordinator using file-backed status updates
- persist step-level progress as execution advances
- add run cancellation support for active runs
- distinguish transient warnings from real failures

Primary files:

- `app/api/runs/[runId]/start/route.ts`
- `lib/qa/execution-engine.ts`
- `lib/qa/store.ts`
- `lib/types.ts`

Acceptance criteria:

- a run can be started without tying the entire browser session to one request lifecycle
- the current run phase and last completed step are persisted during execution
- a user can cancel an active run safely
- interrupted runs retain partial results and artifacts already captured

---

### Workstream 2: Execution Engine Modularization

Purpose:

- reduce complexity and make the agent easier to extend safely

Key changes:

- split the current execution engine into smaller modules
- isolate browser helpers from scenario policies and artifact/report generation
- create a shared page-surface model used by discovery and regression execution
- add explicit execution policy functions by scenario type

Recommended module split:

- `lib/qa/browser-runtime.ts`
- `lib/qa/discovery-engine.ts`
- `lib/qa/scenario-executor.ts`
- `lib/qa/assertions.ts`
- `lib/qa/artifact-builder.ts`
- `lib/qa/analysis-engine.ts`

Primary files impacted:

- `lib/qa/execution-engine.ts`
- `lib/qa/scenario-generator.ts`
- `lib/qa/step-parser.ts`
- `lib/types.ts`

Acceptance criteria:

- the top-level executor becomes an orchestrator rather than the owner of all behavior
- discovery logic, scenario execution logic, and analysis logic are independently testable
- scenario execution policies are explicit and easy to extend

---

### Workstream 3: Scenario Policy and Page Model Improvements

Purpose:

- reduce brittle string matching and improve repeatability of regression runs

Key changes:

- build a reusable page-surface model from crawls and live UI observations
- track discovered views, inputs, actions, and confidence as structured data
- execute scenarios against page-surface entities instead of raw text whenever possible
- add scenario-policy handlers for:
  - navigation reachability
  - authentication boundary checks
  - permissions verification
  - state-transition checks
  - empty-state and boundary-state checks
  - accessibility-oriented form labeling checks

Primary files:

- `lib/qa/execution-engine.ts`
- `lib/qa/scenario-generator.ts`
- `lib/types.ts`

Acceptance criteria:

- exploratory and regression runs share the same surface model vocabulary
- saved scenarios can point to stable discovered targets more often than free-text phrases
- blocked outcomes drop because unsupported checks are explicitly modeled instead of guessed

---

### Workstream 4: Observability and Failure Taxonomy

Purpose:

- make the agent easier to trust and easier to debug

Key changes:

- introduce structured run events and warnings
- classify execution failures by cause
- record confidence and fallback usage per step or scenario
- persist lightweight execution logs with timestamps
- surface warning-only states separately from fail and blocked

Recommended new concepts:

- `RunEvent`
- `FailureCategory`
- `ExecutionWarning`
- `ConfidenceScore`

Example failure categories:

- `element-not-found`
- `timeout`
- `auth-failed`
- `navigation-mismatch`
- `assertion-failed`
- `unsupported-scenario`
- `unexpected-dialog`

Primary files:

- `lib/types.ts`
- `lib/qa/execution-engine.ts`
- `lib/qa/store.ts`
- `components/qa-command-center.tsx`

Acceptance criteria:

- a run result explains why it failed or blocked, not only what failed
- silent `.catch(() => undefined)` behavior is reduced or replaced by recorded warnings
- the UI can show the execution timeline with meaningful events and categories

---

### Workstream 5: Scenario Library Lifecycle

Purpose:

- treat saved scenarios as curated QA assets rather than incidental run outputs

Key changes:

- separate generated scenario suggestions from approved regression libraries
- add lightweight version metadata to local scenario libraries
- add explicit actions such as:
  - save as library
  - update existing library
  - compare current run to library
  - mark scenario as approved or exploratory-only
- preserve source-run traceability and diff summaries

Primary files:

- `lib/types.ts`
- `lib/qa/store.ts`
- `components/qa-command-center.tsx`
- `app/api/scenario-libraries/route.ts`

Acceptance criteria:

- the operator can understand whether a library is draft, active, or updated
- scenario libraries preserve version history in local storage
- a run can show which scenarios were reused, added, removed, or changed from the selected library

---

### Workstream 6: UI Workflow Redesign

Purpose:

- make the dashboard easier to operate and easier to understand during long runs

Key changes:

- split the current page into clearer workflow areas
- reduce initial field density by hiding advanced controls behind an expandable section
- make the run state model explicit: draft, ready, running, completed, cancelled
- add clearer actions for:
  - create draft
  - start now
  - cancel run
  - save library
  - rerun library
  - compare against previous run

Recommended UI structure:

1. Setup
2. Scenario Library
3. Live Run Console
4. Evidence Review
5. QA Analysis

Primary files:

- `components/qa-command-center.tsx`
- `app/globals.css`

Acceptance criteria:

- the default screen is usable without understanding every advanced field
- the user can tell at a glance what is selected, what is running, and what evidence was produced
- the run console updates while execution is in progress

---

### Workstream 7: Evidence and Artifact Review UX

Purpose:

- turn artifacts into a usable QA workspace rather than a download list

Key changes:

- preview screenshots inline
- show crawl artifacts in a structured explorer
- show run summary metrics prominently
- map artifacts back to steps and scenarios
- group evidence by scenario or phase instead of one flat list

Primary files:

- `components/qa-command-center.tsx`
- `app/api/runs/[runId]/artifacts/[artifactId]/route.ts`

Acceptance criteria:

- the operator can review evidence without downloading every artifact
- each scenario or step clearly shows the supporting screenshot and notes
- crawl data is readable as structured UI inventory rather than only raw JSON

---

### Workstream 8: QA Analysis Maturation

Purpose:

- make the QA analysis feature more valuable to the human QA and dev team

Key changes:

- separate intended-flow insights from UX and defect-prevention recommendations
- attach evidence references to each insight
- let exploratory runs seed analysis that regression runs can reuse or compare against
- allow the analysis layer to propose:
  - candidate pass scenarios
  - likely usability risks
  - missing orientation or labeling
  - inconsistent language issues
  - recommended manual follow-up

Primary files:

- `lib/qa/execution-engine.ts`
- `components/qa-command-center.tsx`
- `lib/types.ts`

Acceptance criteria:

- each QA insight includes category, confidence, recommendation, and supporting evidence
- the UI clearly distinguishes observed evidence from interpretation
- regression runs can display whether prior insights still appear relevant

---

### Workstream 9: Safer Validation and Local Security Improvements

Purpose:

- reduce avoidable operator and runtime mistakes without requiring external infrastructure

Key changes:

- validate run plans more strictly by mode before execution
- avoid storing credentials in unnecessary places in memory and logs
- improve redaction in errors and exported reports
- add warnings when the operator uses visible browser mode with production-like credentials

Primary files:

- `app/api/runs/route.ts`
- `app/api/scenarios/generate/route.ts`
- `lib/qa/execution-engine.ts`
- `components/qa-command-center.tsx`

Acceptance criteria:

- invalid plans fail early with useful messages
- redaction covers the configured credentials and common secret patterns
- the UI communicates risky configuration choices clearly

---

## Phased Delivery Plan

### Phase 1: Reliability Foundation

Priority: highest

Deliverables:

- local execution queue or worker coordinator
- persisted step-level progress
- run cancellation
- structured warnings and failure categories
- stricter run-plan validation by mode

Why first:

- this phase reduces the biggest operator trust and reliability problems without changing the product surface too much

Expected files:

- `lib/types.ts`
- `lib/qa/store.ts`
- `lib/qa/execution-engine.ts`
- `app/api/runs/route.ts`
- `app/api/runs/[runId]/start/route.ts`
- `components/qa-command-center.tsx`

---

### Phase 2: UI Workflow Redesign

Priority: high

Deliverables:

- redesigned dashboard layout
- clear draft/start/cancel flow
- live run console
- simplified default form and advanced settings section
- clearer scenario-library panel

Why second:

- once execution state becomes more structured, the UI can expose it clearly instead of guessing from final results

Expected files:

- `components/qa-command-center.tsx`
- `app/globals.css`

---

### Phase 3: Engine Modularization and Scenario Policies

Priority: high

Deliverables:

- split executor into smaller modules
- page-surface model
- explicit scenario handlers by type
- better regression matching against discovered targets

Why third:

- after runtime stability and UI clarity improve, this phase addresses maintainability and long-term agent quality

Expected files:

- `lib/qa/execution-engine.ts`
- new `lib/qa/*` modules
- `lib/qa/scenario-generator.ts`
- `lib/types.ts`

---

### Phase 4: Evidence, Libraries, and Run Comparison

Priority: medium-high

Deliverables:

- inline screenshot and crawl previews
- scenario-library version metadata
- run-to-run comparison summaries
- library diff and reuse details

Why fourth:

- this phase makes the app feel like a real QA tool instead of an execution utility

Expected files:

- `components/qa-command-center.tsx`
- `lib/qa/store.ts`
- `app/api/scenario-libraries/route.ts`
- `app/api/runs/[runId]/artifacts/[artifactId]/route.ts`
- `lib/types.ts`

---

### Phase 5: QA Analysis Maturation

Priority: medium

Deliverables:

- richer insight categories and evidence linkage
- developer-facing recommendations
- run comparison against previous insights
- suggested follow-up manual tests

Why fifth:

- the analysis layer becomes more useful after the evidence model and scenario-library lifecycle are stronger

Expected files:

- `lib/qa/execution-engine.ts`
- `components/qa-command-center.tsx`
- `lib/types.ts`

---

## Recommended Sequencing Notes

- Do not start the full UI redesign before execution state and event modeling are defined.
- Do not split the execution engine blindly; define target module boundaries first.
- Do not expand AI-like analysis depth before evidence references exist in the result model.
- Do not make scenario-library versioning complex; lightweight local history is sufficient for now.

---

## Suggested Local Persistence Extensions

Because there is no database yet, the local file model should be extended rather than replaced.

Recommended additions:

- `qa-runs.json` remains the run store
- `qa-scenario-libraries.json` remains the library store
- optional `qa-run-events.json` for append-only execution events
- optional per-run event or summary files under `.data/runs/<runId>/`

This preserves the current architecture while reducing the risk of losing execution detail.

---

## Definition of Done

This improvement plan is considered complete when:

- active runs expose live state and can be cancelled
- the UI supports a clear operator workflow from setup to evidence review
- the execution engine is modular enough to extend safely
- regression execution relies more on structured discovered targets and less on raw text matching
- scenario libraries behave like intentional QA assets with lightweight versioning
- QA analysis surfaces actionable recommendations with evidence linkage

---

## Recommended First Slice

If implementation starts immediately, the first slice should be:

1. Add new run-state and event types.
2. Add step-level persistence and warning capture.
3. Refactor run start into queued local execution.
4. Add a live run console to the dashboard.
5. Add explicit cancel-run support.

This slice produces the largest practical improvement in reliability and UX without waiting for infrastructure changes.

See also:

- `docs/QA_WEB_TESTING_AGENT_PHASE1_TASK_LIST.md`