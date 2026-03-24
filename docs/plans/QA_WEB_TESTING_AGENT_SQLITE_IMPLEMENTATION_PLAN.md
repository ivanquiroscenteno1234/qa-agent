# QA Web Testing Agent SQLite Implementation Plan

## Goal

Replace the current JSON-file persistence model with a SQLite-backed storage layer without breaking the existing QA agent workflows, APIs, or local-first development model.

This plan is implementation-focused. It defines:

- why SQLite is the right next persistence layer for this app
- which parts of the current store need to move first
- the adapter and schema shape required for a safe migration
- the migration and rollout sequence
- validation and rollback criteria

This document does not implement SQLite by itself. It is the blueprint for doing that safely.

---

## Current Persistence Baseline

The current application persists data in local JSON files under `.data/`.

Primary stores today:

- `.data/qa-runs.json`
- `.data/qa-scenario-libraries.json`
- `.data/artifacts/...`

Primary write path today:

- `lib/qa/store.ts`

Current characteristics:

- local-only, single-machine persistence
- no external database dependency
- retrying JSON reads and atomic temp-file writes
- artifacts already stored separately from the main run/library records

Current pain points already observed during implementation and testing:

- transient contention while polling and writing
- expensive read/modify/write cycles for entire record collections
- awkward querying and filtering over historical runs
- duplicate detection is manual and application-driven
- stale or inconsistent active-run state is harder to repair cleanly
- future features like library history, rename, archive, and search will become progressively more complex in JSON

SQLite is a good fit because those problems are relational and local, not distributed.

---

## Implementation Goals

The SQLite work should satisfy all of the following:

1. Preserve current app behavior for Draft, Monitor, Review, Library, and Settings.
2. Keep the application local-first and runnable without external infrastructure.
3. Maintain artifact files on disk rather than stuffing binary payloads into the database.
4. Introduce a storage abstraction so the runtime stops depending directly on JSON layout details.
5. Support one-time import from existing JSON stores.
6. Allow a safe fallback to JSON during rollout if needed.

---

## Non-Goals

This plan does not include:

- moving artifacts into SQLite blobs
- introducing a remote database
- adding user accounts or multi-user concurrency control
- redesigning public APIs unless needed for correctness
- replacing Playwright runtime behavior
- implementing full-text search in the first SQLite phase

---

## Recommended Technology Choice

Use `better-sqlite3` as the primary SQLite client.

Reasoning:

- synchronous API fits local server-side route handlers well
- simpler operational model than async wrappers for an embedded local DB
- reliable and mature for Node-based local applications
- no external service required
- good fit for small to medium local datasets like this workspace

Do not start with a heavy ORM.

Recommended approach:

- use plain SQL migrations
- implement a thin repository/storage layer in TypeScript
- add optional higher-level helpers only if query complexity justifies them later

---

## Target Architecture

### High-level direction

Introduce a storage boundary that isolates the rest of the application from persistence details.

Current shape:

- routes and runtime helpers call functions in `lib/qa/store.ts`
- `lib/qa/store.ts` reads and writes JSON directly

Target shape:

- routes and runtime helpers continue calling storage functions
- `lib/qa/store.ts` becomes the stable public facade
- actual persistence is delegated to a concrete backend

Recommended structure:

- `lib/qa/store.ts`
  - public storage API used across the app
- `lib/qa/storage/types.ts`
  - repository interfaces and shared DTOs if needed
- `lib/qa/storage/json-store.ts`
  - current JSON implementation extracted from `store.ts`
- `lib/qa/storage/sqlite.ts`
  - SQLite implementation
- `lib/qa/storage/backend.ts`
  - backend selection and initialization
- `lib/qa/storage/migrations/`
  - SQL schema migration files
- `lib/qa/storage/import-json.ts`
  - one-time importer from existing `.data/*.json`

### Backend selection

Use one of these strategies:

1. Environment flag
   - `QA_STORE_BACKEND=json|sqlite`
2. Automatic fallback
   - prefer SQLite if initialized, else JSON

Recommendation:

- start with explicit environment selection for rollout clarity

---

## Data Model Inventory

The current JSON records map cleanly to relational tables.

### Core entities

1. Runs
2. Run events
3. Run warnings
4. Step results
5. Artifacts metadata
6. Scenario libraries
7. Scenario library versions
8. Scenario snapshots / change summaries
9. Analysis insights and evidence references
10. Defect candidates

### Artifact handling rule

Keep binary and large text artifacts on disk.

Store in SQLite only:

- artifact id
- run id
- artifact type
- label
- content reference or file path
- lightweight inline text only when already stored that way today

This preserves the current artifact-serving model while moving index and metadata queries into the DB.

---

## Proposed Schema

### `runs`

Purpose:

- primary run record and run-plan state

Columns:

- `id TEXT PRIMARY KEY`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `started_at TEXT NULL`
- `completed_at TEXT NULL`
- `cancel_requested_at TEXT NULL`
- `status TEXT NOT NULL`
- `current_phase TEXT NOT NULL`
- `current_activity TEXT NULL`
- `current_step_number INTEGER NULL`
- `current_scenario_index INTEGER NULL`
- `current_scenario_title TEXT NULL`
- `summary TEXT NOT NULL`
- `plan_environment TEXT NOT NULL`
- `plan_target_url TEXT NOT NULL`
- `plan_feature_area TEXT NOT NULL`
- `plan_objective TEXT NOT NULL`
- `plan_mode TEXT NOT NULL`
- `plan_browser TEXT NOT NULL`
- `plan_device TEXT NOT NULL`
- `plan_headless INTEGER NOT NULL`
- `plan_role TEXT NOT NULL`
- `plan_credential_reference TEXT NOT NULL`
- `plan_login_email TEXT NOT NULL`
- `plan_login_password TEXT NOT NULL`
- `plan_scenario_library_id TEXT NULL`
- `plan_build_version TEXT NOT NULL`
- `plan_timebox_minutes INTEGER NOT NULL`
- `plan_risk_level TEXT NOT NULL`
- `plan_safe_mode INTEGER NOT NULL`
- `plan_steps_text TEXT NOT NULL`
- `plan_expected_outcomes TEXT NOT NULL`
- `plan_prerequisites TEXT NOT NULL`
- `plan_cleanup_instructions TEXT NOT NULL`
- `plan_acceptance_criteria TEXT NOT NULL`

Notes:

- `riskFocus` should move to a child table rather than a JSON blob if we want simpler filtering
- keeping flattened plan columns is preferable to storing the plan as one opaque JSON field because the UI already queries against many of these fields

### `run_risk_focus`

- `run_id TEXT NOT NULL`
- `value TEXT NOT NULL`
- composite primary key: `(run_id, value)`

### `parsed_steps`

- `id TEXT PRIMARY KEY`
- `run_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `raw_text TEXT NOT NULL`
- `action_type TEXT NOT NULL`
- `target_description TEXT NOT NULL`
- `input_data TEXT NULL`
- `expected_result TEXT NULL`
- `fallback_interpretation TEXT NOT NULL`
- `risk_classification TEXT NOT NULL`

### `generated_scenarios`

- `id TEXT PRIMARY KEY`
- `run_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `title TEXT NOT NULL`
- `priority TEXT NOT NULL`
- `type TEXT NOT NULL`
- `expected_result TEXT NOT NULL`
- `risk_rationale TEXT NOT NULL`
- `approved_for_automation INTEGER NOT NULL`

### `generated_scenario_prerequisites`

- `scenario_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `value TEXT NOT NULL`

### `generated_scenario_steps`

- `scenario_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `value TEXT NOT NULL`

### `run_risk_summary`

- `run_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `value TEXT NOT NULL`

### `run_coverage_gaps`

- `run_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `value TEXT NOT NULL`

### `step_results`

- `run_id TEXT NOT NULL`
- `step_id TEXT NOT NULL`
- `step_number INTEGER NOT NULL`
- `user_step_text TEXT NOT NULL`
- `normalized_action TEXT NOT NULL`
- `observed_target TEXT NOT NULL`
- `action_result TEXT NOT NULL`
- `assertion_result TEXT NOT NULL`
- `notes TEXT NOT NULL`
- `screenshot_label TEXT NOT NULL`
- `screenshot_artifact_id TEXT NULL`

Primary key:

- `(run_id, step_number)`

### `artifacts`

- `id TEXT PRIMARY KEY`
- `run_id TEXT NOT NULL`
- `type TEXT NOT NULL`
- `label TEXT NOT NULL`
- `content TEXT NOT NULL`

Notes:

- if artifact content later moves to file references instead of inline text, replace `content` with `storage_path`

### `defect_candidates`

- `id TEXT PRIMARY KEY`
- `run_id TEXT NOT NULL`
- `title TEXT NOT NULL`
- `severity TEXT NOT NULL`
- `priority TEXT NOT NULL`
- `expected_result TEXT NOT NULL`
- `actual_result TEXT NOT NULL`
- `confidence REAL NOT NULL`

### `defect_repro_steps`

- `defect_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `value TEXT NOT NULL`

### `analysis_insights`

- `id TEXT PRIMARY KEY`
- `run_id TEXT NOT NULL`
- `category TEXT NOT NULL`
- `title TEXT NOT NULL`
- `summary TEXT NOT NULL`
- `recommendation TEXT NOT NULL`
- `confidence REAL NOT NULL`

### `analysis_evidence`

- `insight_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `type TEXT NOT NULL`
- `label TEXT NOT NULL`

### `run_events`

- `id TEXT PRIMARY KEY`
- `run_id TEXT NOT NULL`
- `timestamp TEXT NOT NULL`
- `phase TEXT NOT NULL`
- `level TEXT NOT NULL`
- `message TEXT NOT NULL`
- `category TEXT NULL`
- `step_number INTEGER NULL`
- `scenario_title TEXT NULL`

### `run_warnings`

- `id TEXT PRIMARY KEY`
- `run_id TEXT NOT NULL`
- `timestamp TEXT NOT NULL`
- `phase TEXT NOT NULL`
- `message TEXT NOT NULL`
- `category TEXT NOT NULL`
- `step_number INTEGER NULL`
- `scenario_title TEXT NULL`
- `recoverable INTEGER NOT NULL`

### `scenario_libraries`

- `id TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `source_run_id TEXT NULL`
- `feature_area TEXT NOT NULL`
- `environment TEXT NOT NULL`
- `target_url TEXT NOT NULL`
- `role TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- `version INTEGER NOT NULL`
- optional `archived_at TEXT NULL`

### `scenario_library_versions`

- `library_id TEXT NOT NULL`
- `version INTEGER NOT NULL`
- `created_at TEXT NOT NULL`
- `source_run_id TEXT NULL`
- `scenario_count INTEGER NOT NULL`
- `summary TEXT NOT NULL`
- primary key: `(library_id, version)`

### `scenario_library_version_changes`

- `library_id TEXT NOT NULL`
- `version INTEGER NOT NULL`
- `reused INTEGER NOT NULL`
- `added INTEGER NOT NULL`
- `removed INTEGER NOT NULL`
- `changed INTEGER NOT NULL`

### `scenario_library_version_titles`

- `library_id TEXT NOT NULL`
- `version INTEGER NOT NULL`
- `change_type TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `title TEXT NOT NULL`

### `scenario_library_scenarios`

- same shape as `generated_scenarios`, keyed by `library_id` and optionally `version`

### `scenario_library_risk_summary`

- `library_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `value TEXT NOT NULL`

### `scenario_library_coverage_gaps`

- `library_id TEXT NOT NULL`
- `position INTEGER NOT NULL`
- `value TEXT NOT NULL`

---

## Index Plan

Minimum useful indexes:

- `runs(status, created_at DESC)`
- `runs(plan_feature_area, plan_mode, created_at DESC)`
- `runs(plan_scenario_library_id)`
- `runs(plan_environment, plan_target_url)`
- `run_events(run_id, timestamp)`
- `step_results(run_id, step_number)`
- `artifacts(run_id, type)`
- `scenario_libraries(feature_area, environment, role)`
- `scenario_libraries(name)`
- `scenario_library_versions(library_id, version DESC)`

Optional later:

- partial index on active runs: `status IN ('queued', 'running')`

---

## Storage Interface Plan

The public storage API should remain stable for the rest of the app.

At minimum, the backend interface needs methods for:

- list runs
- get run
- create run
- update run state
- append event
- append warning
- list run events
- list scenario libraries
- get scenario library
- upsert scenario library from run

Recommended rule:

- routes and runtime code should not know whether JSON or SQLite is in use

### Suggested implementation order

1. Extract current JSON logic into `json-store.ts`
2. Define a shared `QaStoreBackend` interface
3. Make `store.ts` delegate to the selected backend
4. Implement SQLite backend with the same contract

---

## Migration Strategy

### Phase 0: Preparation

Tasks:

- add storage abstraction without changing behavior
- move current JSON logic into a dedicated backend file
- preserve all current tests and runtime behavior

Acceptance criteria:

- app still works exactly as before using JSON backend
- no API route signatures change

### Phase 1: SQLite bootstrap

Tasks:

- add `better-sqlite3`
- create DB initialization helper
- add migration runner
- create initial schema migration
- choose DB path, recommended: `.data/qa-agent.db`

Acceptance criteria:

- app can initialize a blank SQLite DB locally
- migrations are idempotent

### Phase 2: Read path migration

Tasks:

- implement SQLite read methods first:
  - listRuns
  - getRun
  - listScenarioLibraries
  - getScenarioLibrary
  - listRunEvents
- verify UI screens render correctly from SQLite-backed reads

Acceptance criteria:

- Draft, Monitor, Review, Library, and Settings load with the same user-visible data as JSON

### Phase 3: Write path migration

Tasks:

- implement create/update methods for runs, events, warnings, step results, artifacts, and libraries
- ensure run execution paths update SQLite atomically
- replace full-record rewrites with transaction-based updates

Acceptance criteria:

- creating runs, starting runs, updating progress, and saving libraries all behave correctly under polling

### Phase 4: JSON import

Tasks:

- add importer from `.data/qa-runs.json`
- add importer from `.data/qa-scenario-libraries.json`
- de-duplicate imported scenario libraries where necessary by id and coordinates
- preserve artifact references

Acceptance criteria:

- existing local data imports successfully into a fresh SQLite database
- imported counts match expected counts

### Phase 5: Default backend switch

Tasks:

- switch the default backend from JSON to SQLite
- keep JSON fallback for one release window or local opt-out

Acceptance criteria:

- all core QA workflows pass using SQLite as default

### Phase 6: Cleanup

Tasks:

- document the new local DB
- add maintenance commands if needed
- optionally remove JSON backend after confidence period

Acceptance criteria:

- codebase no longer depends on JSON implementation details outside the backend layer

---

## Import and Backfill Rules

### Run import

For each JSON run:

- create row in `runs`
- insert child rows for parsed steps, scenarios, risk summary, coverage gaps, step results, artifacts, defects, insights, events, and warnings

### Library import

For each JSON library:

- create row in `scenario_libraries`
- insert version history rows
- insert current scenarios and change summaries

### Duplicate policy

Do not silently merge distinct historical library ids during the first import.

Instead:

- preserve ids exactly as stored
- optionally emit a reconciliation report for name collisions

This avoids destructive migration behavior.

---

## Transaction Plan

Use SQLite transactions for all compound write operations.

Examples:

- create run
  - insert parent run
  - insert parsed steps
  - insert generated scenarios
  - insert summaries

- persist run checkpoint
  - update run state
  - optionally append event/warning rows in same transaction

- save scenario library
  - update parent library row
  - insert version row if needed
  - replace current scenario summary rows atomically

Goal:

- avoid partial state that is currently possible across multiple JSON write steps if a process is interrupted

---

## API and Runtime Impact

Expected API contract impact:

- none for external route shapes

Expected implementation impact:

- `app/api/runs/route.ts`
- `app/api/runs/[runId]/route.ts`
- `app/api/runs/[runId]/events/route.ts`
- `app/api/runs/[runId]/start/route.ts`
- `app/api/runs/[runId]/cancel/route.ts`
- `app/api/scenario-libraries/route.ts`
- `lib/qa/run-queue.ts`
- `lib/qa/runtime-coordinator.ts`
- `lib/qa/execution-engine.ts`
- `lib/qa/store.ts`

Most of those files should remain storage-consumer only.

The real implementation work should stay concentrated in the storage layer.

---

## Validation Plan

### Functional validation

Must verify:

1. Create run from Draft
2. Parse steps and generate scenarios
3. Start run from Monitor
4. Review artifacts and step timeline
5. Save As Library and Update Library
6. Rerun from Library into Draft
7. Settings counts and environment cards

### Data validation

Compare JSON and SQLite outputs for:

- run counts
- library counts
- latest run ids
- active run counts
- terminal run counts
- scenario counts per library
- artifact counts per run
- version counts per library

### Failure-path validation

Must verify:

- interrupted run updates do not corrupt the DB
- duplicate library save does not create unintended extra rows
- cancelled runs remain queryable and reviewable
- stale active-run cleanup can be repaired without hand-editing flat files

### Performance validation

Measure at minimum:

- list runs latency under polling
- get run plus events latency
- library list load time
- write latency during active execution

---

## Rollout Plan

### Stage 1

- ship storage abstraction with JSON backend only

### Stage 2

- add SQLite backend behind environment flag

### Stage 3

- import existing JSON data into SQLite on a dev branch or manual command

### Stage 4

- validate all workflows locally against SQLite

### Stage 5

- make SQLite default for local development

### Stage 6

- keep JSON fallback temporarily for recovery

---

## Risks and Mitigations

### Risk: schema sprawl from many child arrays

Mitigation:

- normalize only where the UI/runtime benefits from queryability
- keep some low-value nested data as serialized text only if needed later

### Risk: migration complexity for existing historical data

Mitigation:

- build importer with count verification and dry-run reporting

### Risk: accidental behavior changes in store logic

Mitigation:

- preserve public storage API shape
- validate behavior against known manual workflows

### Risk: secrets remain stored inline

Mitigation:

- keep current behavior stable first
- treat credential-vault work as a separate follow-on effort

### Risk: SQLite file locking surprises

Mitigation:

- keep access server-side in one process
- use transactions consistently
- avoid long-running write transactions

---

## Acceptance Criteria

SQLite implementation is complete when all of the following are true:

1. The application can run locally using SQLite as its primary store.
2. Existing JSON data can be imported into SQLite with verified counts.
3. Draft, Monitor, Review, Library, and Settings all load correct real data from SQLite.
4. Run execution updates remain consistent under active polling.
5. Scenario library create and update flows work without introducing duplicate records for identical saves.
6. Artifacts remain reviewable and downloadable.
7. JSON backend can be disabled without breaking normal development workflows.

---

## Recommended First Implementation Slice

If implementation starts immediately, the first practical slice should be:

1. extract JSON backend from `lib/qa/store.ts`
2. add SQLite initialization plus schema migration runner
3. implement SQLite reads for runs and libraries
4. implement SQLite writes for create run and update run state
5. validate Monitor and Review polling against SQLite

That slice is large enough to prove the architecture and small enough to keep rollback simple.
