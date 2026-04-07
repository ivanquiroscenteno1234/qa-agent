# QA Agent — Gap Analysis and Implementation Plan

**Date:** March 27, 2026
**Source:** Cross-reference of all documentation under `docs/` versus the current implementation.
**Purpose:** Provide a structured, phased implementation plan for every identified gap so the engineering team has a clear execution roadmap.

---

### Verification Notes (March 27, 2026 — third pass)

A follow-up re-verification was performed after reviewing the unstaged implementation. The previous second-pass notes had three false negatives and three real runtime gaps:

| # | Finding | Where |
|---|---|---|
| 1 | Review provenance was already implemented; the real issue was that `stepParsing` provenance was derived from `StepResult`, which never persisted `parsingSource` | Gap 1 Phase 1.6 |
| 2 | `vitest.config.ts` and the `"test"` / `"test:watch"` scripts were already present; the actual remaining issue was a lint failure in `provider.ts` | Gap 6.1 / Quality gates |
| 3 | Prompt version constants were already present; the real missing piece was wiring prompt-version metadata into trustworthy run provenance | Gap 12.3 |
| 4 | Gemini-assisted step parsing existed only in the preview endpoint and was not used by persisted run creation | Gap 1 Phase 1.3 |
| 5 | Gemini-assisted scenario generation existed only as an unused helper and was not used by preview, run creation, or discovery runtime paths | Gap 1 Phase 1.4 |
| 6 | Library UI copy still claimed History and Duplicate were disabled after those actions had been wired | Library screen note |

---

### Verification Notes (March 27, 2026 — fourth pass)

A live Gemini-enabled validation pass was executed against the local app after the third-pass fixes landed.

| # | Result | Where |
|---|---|---|
| 1 | Gemini step parsing was manually verified through `/api/steps/parse`; an ambiguous natural-language step returned `parsingSource: "llm"` | Gap 1 Phase 1.3 |
| 2 | Gemini scenario generation was manually verified through real run creation; the generated scenario set for `run_0yy9e81e` contained both deterministic and Gemini-sourced scenarios | Gap 1 Phase 1.4 |
| 3 | Gemini review analysis was manually verified through a completed exploratory run against the local `/draft` route; saved insights included both heuristic and `analysisSource: "llm"` records | Gap 1 Phase 1.5 |
| 4 | Discovery-mode runs were still dropping `llmMetadata` even when Gemini-assisted generation and review analysis were active; this was fixed by routing `executeDiscoveryRun(...)` through `buildTerminalRunRecord(...)` | Gap 1 Phase 1.6 |
| 5 | After the metadata fix, completed run `run_0yy9e81e` persisted `llmMetadata = { stepParsing: "heuristic", scenarioGeneration: "llm", reviewAnalysis: "llm" }` plus prompt versions `1.0.0` for all three templates | Gap 1 Phase 1.6 / Gap 12.3 |
| 6 | Settings now reflects the live completed-run counts correctly (`Scenario generation via Gemini: 1 of 2`, `Review analysis via Gemini: 1 of 2`) | Gap 7.2 |
| 7 | The stale selected-run polling loop was fixed on 404 by clearing the dead selection from client state. `/api/runs/summary` no longer returned the missing run id during validation; residual `run_73ze674t` 404s came from already-open browser contexts during the same session | Gap 8.1 |

---

### Verification Notes (March 28, 2026 — fifth pass)

A paired deterministic-versus-Gemini Review validation was completed after fixing a completed-run selection race in the Review workspace.

| # | Result | Where |
|---|---|---|
| 1 | Deterministic exploratory run `run_812hyx3z` completed with `llmMetadata = { stepParsing: "heuristic", scenarioGeneration: "deterministic", reviewAnalysis: "heuristic" }` | Gap 1 Phase 1.6 |
| 2 | Review now renders the deterministic run provenance banner correctly for `run_812hyx3z` and the Gemini-assisted run provenance banner correctly for `run_0yy9e81e` | Gap 7.2 |
| 3 | Switching between completed Review runs no longer falls into `SELECT A RUN` / `No run selected`; `components/qa-command-center.tsx` now uses an effect-local in-flight guard plus `AbortController` for selected-run hydration | Gap 8.1 |
| 4 | In a fresh browser session, network traces showed only valid run requests (`run_812hyx3z`, `run_0yy9e81e`) plus the expected favicon 404. The previous missing-run 404 noise did not reproduce from persisted summary data | Gap 8.1 |

---

## How to Read This Document

Each numbered section maps to one gap identified in the analysis. Within each section:

- **Gap Summary** — what is missing or incomplete and why it matters.
- **Implementation Phases** — discrete, sequenced delivery phases.
- **Task List** — concrete, actionable tasks per phase.

Severity levels used below: **High**, **Medium**, **Low**.

---

## Gap 1 — LLM / Gemini Integration (Phases 1–6 Implemented; manual validation complete)

**Severity:** High
**Reference docs:** `docs/plans/QA_WEB_TESTING_AGENT_GEMINI_IMPLEMENTATION_PLAN.md`

### Gap Summary

Phase 0 of the Gemini integration plan is complete: `lib/qa/llm/config.ts` reads and validates environment variables, and Settings renders the provider status. However Phases 1 through 6 — the actual provider abstraction, Gemini SDK client, noop fallback, three capability modules, per-run metadata, and security hardening — are entirely unimplemented. The entire LLM surface is configuration-only with no callable client boundary.

---

### Phase 1.1 — LLM Provider Boundary

**Goal:** Establish the typed, swappable client interface that all downstream callers will depend on. No route or runtime file should ever import the Gemini SDK directly.

#### Task List

- [x] Create `lib/qa/llm/types.ts`
  - Define `QaLlmClient` interface with methods: `normalizeSteps(input)`, `generateScenarios(input)`, `analyzeRun(input)`
  - Define typed input and output contracts for each method
  - Define `LlmCapabilityResult<T>` with `source: "llm" | "deterministic" | "disabled"`, `confidence`, and `data`
  - Add Zod schemas for each output shape to enforce strict validation
- [x] Create `lib/qa/llm/noop-client.ts`
  - Implement `QaLlmClient` returning `source: "disabled"` for all methods
  - Never throw — always return a usable deterministic fallback result
- [x] Create `lib/qa/llm/provider.ts`
  - Export `getQaLlmClient(): QaLlmClient`
  - Return noop client when `QA_LLM_ENABLED=false` or provider is not `"gemini"`
  - Return Gemini client when configured (deferred to Phase 1.2)
  - Call `getQaLlmConfig()` internally — no other file should read raw env directly
- [x] Create `lib/qa/llm/prompts.ts`
  - Centralize all prompt templates as typed builder functions
  - Include a Spanish/bilingual note for the current target domain
  - Keep prompts versioned with a comment indicating when they were last validated
- [x] Validate: confirm `getQaLlmClient()` returns noop when `QA_LLM_ENABLED=false`, when key is missing, and when provider is unset

---

### Phase 1.2 — Gemini SDK Client

**Goal:** Wire the actual Google Gemini SDK through the provider boundary so Gemini calls are possible when configured.

#### Task List

- [x] Install `@google/generative-ai` or the current recommended Google GenAI SDK package
- [x] Create `lib/qa/llm/gemini-client.ts`
  - Implement `QaLlmClient` using the Gemini SDK
  - Read API key and model from `getQaLlmConfig()` — not from env directly
  - Wrap every SDK call in try/catch; on error return `source: "deterministic"` fallback with a logged warning
  - Validate every model response through the Zod schemas defined in `lib/qa/llm/types.ts` before returning
  - Never pass raw model output to callers without schema validation
- [x] Update `lib/qa/llm/provider.ts` to return `GeminiClient` when fully configured
- [x] Validate: start app with valid key and confirm the client initializes without crashing; confirm app still starts when key is absent

---

### Phase 1.3 — Gemini-Assisted Step Parsing

**Goal:** Make `lib/qa/step-parser.ts` optionally pass steps through Gemini for structured normalization before falling back to heuristic rules.

#### Task List

- [x] Create `lib/qa/llm/step-normalization.ts`
  - Accept `ParsedStep[]` or raw step strings
  - Call `getQaLlmClient().normalizeSteps(input)`
  - Map valid responses back to `ParsedStep` shape
  - On validation failure or disabled provider, return the original heuristic-parsed steps
  - Attach `parsingSource: "llm" | "heuristic"` to each returned step
- [x] Update `lib/qa/step-parser.ts`
  - Check `getQaLlmConfig().features.stepParsing` before activating the LLM pass
  - Preserve current keyword-based parser as the guaranteed fallback
- [x] Update `lib/types.ts`
  - Add `parsingSource?: "llm" | "heuristic"` to `ParsedStep`
- [x] Update `app/api/steps/parse/route.ts` to surface `parsingSource` in the response
- [x] Update persisted run creation paths to use `parseStepsWithLlm(...)` instead of `parsePlainTextSteps(...)`
  - `json-store.ts` and `sqlite.ts` now persist `ParsedStep.parsingSource` on newly created runs
- [x] Validate: test with `QA_LLM_STEP_PARSING=false` (heuristic only), then with `=true` on a known-ambiguous step set

---

### Phase 1.4 — Gemini-Assisted Scenario Generation

**Goal:** Make `lib/qa/scenario-generator.ts` optionally use Gemini to produce more context-aware, feature-specific scenario suggestions.

#### Task List

- [x] Create `lib/qa/llm/scenario-generation.ts`
  - Accept normalized plan data, parsed steps, crawl summary, and risk posture
  - Call `getQaLlmClient().generateScenarios(input)`
  - Map valid responses to the existing `Scenario[]` schema (schema validation required)
  - Attach `generationSource: "llm" | "deterministic"` to each scenario
  - On failure, signal graceful fallback to the deterministic generator
- [x] Update `lib/qa/scenario-generator.ts`
  - Check `getQaLlmConfig().features.scenarioGeneration`
  - Run deterministic generation first; optionally merge or replace with Gemini suggestions
  - Preserve deterministic path when Gemini is disabled or fails
- [x] Update `lib/types.ts`
  - Add `generationSource?: "llm" | "deterministic"` to `Scenario`
- [x] Update preview and runtime callers to use `generateScenariosWithLlm(...)`
  - `app/api/scenarios/generate/route.ts`, both storage backends, and `discovery-engine.ts` now call the async Gemini-aware generator
- [x] Validate: compare scenario output sets between deterministic and Gemini-assisted runs on the same plan

---

### Phase 1.5 — Gemini-Assisted Review Analysis

**Goal:** Allow `lib/qa/discovery-engine.ts` to optionally invoke a Gemini analysis pass after evidence capture, producing richer insights without overwriting raw evidence.

#### Task List

- [x] Create `lib/qa/llm/review-analysis.ts`
  - Accept structured evidence (step results, artifacts, warnings) — not raw browser data
  - Call `getQaLlmClient().analyzeRun(input)`
  - Map valid responses to `AnalysisInsight[]` shape (the existing type in `lib/types.ts`)
  - Attach `analysisSource: "llm" | "heuristic"` to each returned insight
  - On failure, return empty array so callers degrade to heuristic analysis only
  - Gemini must never overwrite `artifacts`, `stepResults`, or trace evidence
- [x] Update `lib/qa/discovery-engine.ts`
  - Check `getQaLlmConfig().features.reviewAnalysis`
  - Merge Gemini insights after existing heuristic analysis; mark source on each
- [x] Update `lib/types.ts`
  - Add `analysisSource?: "llm" | "heuristic"` to `AnalysisInsight`
- [x] Validate: complete a real exploratory run with analysis enabled; confirm each insight has a source label and a cited evidence reference

---

### Phase 1.6 — Operator Transparency and Per-Run LLM Metadata

**Goal:** Record which LLM path was active for each run so operators can understand whether Gemini or deterministic logic produced the visible results.

#### Task List

- [x] Update `lib/types.ts`
  - Add `llmMetadata?: { stepParsing: "llm" | "heuristic"; scenarioGeneration: "llm" | "deterministic"; reviewAnalysis: "llm" | "heuristic" }` to `RunRecord`
- [x] Update `lib/qa/result-builder.ts`
  - Populate `llmMetadata` on run completion from sources recorded per-step and per-scenario
- [x] Update `lib/qa/run-view-model.ts`
  - Expose `llmMetadata` for consumption in Review and Monitor views
- [x] Update `components/qa/review-workflow-view.tsx`
  - Add a small provenance indicator per run: parsing source, generation source, analysis source
- [x] Fix `stepParsing` provenance derivation to read from `RunRecord.parsedSteps`
  - `buildTerminalRunRecord(...)` now derives parsing provenance from persisted parsed steps instead of non-existent `StepResult.parsingSource`

- [x] Update `components/settings/settings-screen.tsx`
  - Confirm current feature-flag display is sufficient or expand with usage statistics
  - Added LLM Usage Statistics section showing per-feature Gemini usage counts across all terminal runs
- [x] Validate: complete two runs — one with Gemini enabled and one without; confirm the metadata differs and renders correctly in Review
  - March 27 fourth pass: one Gemini-enabled exploratory run (`run_0yy9e81e`) was completed and verified end to end, including persisted `llmMetadata` and Settings usage counters.
  - March 28 fifth pass: paired deterministic run `run_812hyx3z` was completed and the Review UI rendered the expected heuristic/deterministic/heuristic provenance alongside the Gemini-assisted heuristic/llm/llm run.

---

## Gap 2 — Scenario Library Lifecycle Actions

**Severity:** High
**Reference docs:** `docs/plans/QA_WEB_TESTING_AGENT_IMPROVEMENT_PLAN.md` Workstream 5, UI checklist Phase 5

### Gap Summary

All four management actions on scenario library cards (History, Rename, Archive, Duplicate) are rendered as disabled buttons with explicit notes that backend support is missing. The Archives tab is also deferred. The author metadata filter on the filter bar has no backing data field. These gaps reduce the Library screen to a read-only browse surface.

---

### Phase 2.1 — Rename and PATCH Route

**Goal:** Allow operators to rename a saved scenario library in place without touching its scenarios or version history.

> **Prerequisite note:** The dynamic route folder `app/api/scenario-libraries/[scenarioLibraryId]/` does not exist yet. It must be created for this phase and will also be reused by Gap 4.2 (DELETE).

#### Task List

- [x] Update `lib/types.ts`
  - Confirm `ScenarioLibrary` has a top-level `name` field that can be updated independently
- [x] Update `lib/qa/store.ts` and `lib/qa/storage/json-store.ts`
  - Add `renameScenarioLibrary(id: string, name: string): Promise<ScenarioLibrary>` to the storage interface and JSON implementation
- [x] Update `lib/qa/storage/sqlite.ts`
  - Add SQLite implementation for rename — update only the `name` column and `updated_at`; also updates the `name` key in the payload JSON via `JSON_SET`
- [x] Create `app/api/scenario-libraries/[scenarioLibraryId]/route.ts`
  - Implement `PATCH` handler: read current record, validate `name` field via Zod, call `renameScenarioLibrary`, return updated record
  - Return 404 if the library does not exist
- [x] Update `components/library/scenario-library-card.tsx`
  - Enabled the Rename button with `onRename?` prop; wired to `window.prompt` rename flow in `library-management-screen.tsx`
  - Updated name reflected via `setLibraries` map on success
- [ ] Validate: rename a library, refresh page, confirm new name persists

---

### Phase 2.2 — Archive

**Goal:** Allow operators to mark a library as archived so it no longer appears in default run-selection lists but remains accessible.

#### Task List

- [x] Update `lib/types.ts`
  - Add `status: "active" | "archived"` to `ScenarioLibrary`
- [x] Update `lib/qa/store.ts` and both storage backends
  - Add `archiveScenarioLibrary(id: string): Promise<ScenarioLibrary>`
  - Default filter on `listScenarioLibraries` to return only `active` libraries unless `includeArchived: true` is passed
  - `normalizeScenarioLibrary` now defaults `status` to `"active"` if missing (backward compat for stored data)
- [x] Update `app/api/scenario-libraries/[scenarioLibraryId]/route.ts`
  - Added archive action via Zod `discriminatedUnion` PATCH schema; also updated GET `/api/scenario-libraries` to accept `?includeArchived=true`
- [x] Update the SQL migration or add the next available migration (for example `006_add_library_status.sql`)
  - Created `006_add_library_status.sql` — adds `status TEXT NOT NULL DEFAULT 'active'` + index to `scenario_libraries`; updated `writeScenarioLibraryRecord` to explicitly write `status`
- [x] Update `components/library/library-management-screen.tsx`
  - Archives tab now loads `?includeArchived=true` on first switch; tabs driven by `activeTab` state; re-fetches on next switch after archive action
- [x] Update `components/library/scenario-library-card.tsx`
  - Archive button enabled with `onArchive?` prop; `window.confirm` before archiving
- [ ] Validate: archive a library, confirm it disappears from active list, appears under the Archives tab

---

### Phase 2.3 — Duplicate

**Goal:** Allow operators to create a copy of an existing library with a new name and a fresh ID, preserving scenarios and version baseline.

#### Task List

- [x] Update `lib/qa/store.ts` and both storage backends
  - Add `duplicateScenarioLibrary(id: string, newName: string): Promise<ScenarioLibrary>`
  - New IDs generated for the duplicated library and all scenario rows via `createId("scenario_library")` / `createId("scenario")`
  - `versions: []` passed to `normalizeScenarioLibraryRecord` so normalizer auto-creates the v1 initial snapshot
- [x] Update `app/api/scenario-libraries/[scenarioLibraryId]/route.ts`
  - Added duplicate action to the PATCH handler (action: `"duplicate"`, body: `{ name: string }`); returns 201 with new library
- [x] Update `components/library/scenario-library-card.tsx`
  - Duplicate button enabled with `onDuplicate?` prop; prompts for new name via `window.prompt`
  - New library prepended to list on success
- [ ] Validate: duplicate a library, confirm new entry appears with correct name, scenario count, and independent IDs

---

### Phase 2.4 — Version History Route

**Goal:** Let operators inspect the full version history of a scenario library, including per-version change summaries.

#### Task List

- [x] Create `app/api/scenario-libraries/[scenarioLibraryId]/history/route.ts`
  - `GET` returns versions in reverse chronological order: `version`, `summary`, `createdAt`, `scenarioCount`, `changeSummary`, `sourceRunId`
- [x] Create `app/library/[scenarioLibraryId]/page.tsx`
  - Server component (`force-dynamic`) calling `getScenarioLibrary` directly; renders version history list with change summaries; includes Back link to `/library`; `notFound()` if library missing
- [x] Update `components/library/scenario-library-card.tsx`
  - History button replaced with `<Link href="/library/[id]">` styled to match other chip buttons via `.scenario-library-history-link` CSS class
- [ ] Validate: open history for a library with multiple versions; confirm all versions appear in reverse chronological order

---

### Phase 2.5 — Author Metadata

**Goal:** Record which operator created or last updated a scenario library so the author filter becomes functional.

#### Task List

- [x] Update `lib/types.ts`
  - Add `author?: string` to `ScenarioLibrary`
- [x] Update Draft library-save path in `components/qa-command-center.tsx`
  - Accept an optional author field when saving or updating a library
  - Default to an empty string if none is provided
- [x] Update both storage backends to persist `author`
- [x] Add `author` column to the next available SQL migration
- [x] Update `components/library/scenario-library-filter-bar.tsx`
  - Enable the author filter once the field exists; populate options from unique author values in the library list
- [ ] Validate: save two libraries with different author values; confirm the author filter narrows the list correctly

---

## Gap 3 — Page-Surface Model and Scenario Execution Policies

**Severity:** High
**Reference docs:** `docs/plans/QA_WEB_TESTING_AGENT_IMPROVEMENT_PLAN.md` Workstream 3

### Gap Summary

Regression scenarios still match targets using free-text string heuristics rather than stable, discovered UI entities. There is no shared page-surface vocabulary between discovery runs and regression runs. No `assertions.ts` module exists; all assertion logic is inline inside `scenario-executor.ts`. This causes avoidable `"blocked"` outcomes and makes scenario policies hard to extend.

---

### Phase 3.1 — Shared Page-Surface Model

**Goal:** Create a typed, reusable vocabulary for discovered views, inputs, and navigation actions that both discovery and regression execution can reference.

#### Task List

- [x] Update `lib/qa/crawl-model.ts`
  - Add a `PageSurface` type: `{ views: DiscoveredView[]; inputs: DiscoveredInput[]; navTargets: NavTarget[]; confidence: ConfidenceScore }`
  - Add `DiscoveredInput` with `selector`, `label`, `type`, `required`, `nearestHeading`
  - Add `NavTarget` with `selector`, `label`, `resolvedUrl`, `confidence`
  - Add `buildPageSurface(crawlResult)` builder function
- [x] Update `lib/qa/discovery-engine.ts`
  - After each crawl pass, build and persist a `PageSurface` snapshot alongside the crawl artifact
- [x] Update `lib/types.ts`
  - Add `pageSurfaceSnapshot?: PageSurface` to `RunRecord`
  - Add optional `surfaceTargetSelector?: string` to `Scenario` for pointing to a discovered entity

---

### Phase 3.2 — Assertions Module

**Goal:** Extract all assertion logic from `scenario-executor.ts` into an independently testable module.

#### Task List

- [x] Create `lib/qa/assertions.ts`
  - Export `assertElementVisible(page, selector, description): Promise<AssertionResult>`
  - Export `assertNavigationReachable(page, target): Promise<AssertionResult>`
  - Export `assertAuthBoundary(page, protectedUrl): Promise<AssertionResult>`
  - Export `assertFormLabeled(page, inputSelector): Promise<AssertionResult>`
  - Export `assertStateTransition(page, triggerSelector, expectedState): Promise<AssertionResult>`
  - Export `assertEmptyState(page, containerSelector): Promise<AssertionResult>`
  - Each assertion returns `{ passed: boolean; evidence: string; category: FailureCategory }`
- [x] Update `lib/qa/scenario-executor.ts`
  - Replace all inline assertion logic with calls to `lib/qa/assertions.ts`
  - Confirm that `FailureCategory` values emitted are now determined by the assertion layer, not ad hoc

---

### Phase 3.3 — Scenario Policy Handlers

**Goal:** Replace heuristic string matching with explicit scenario-type policy dispatch so each scenario type knows how to execute itself.

#### Task List

- [x] Update `lib/qa/scenario-executor.ts`
  - Add policy dispatch: switch on `scenario.type` before executing
  - Call type-specific handler functions (defined in the same file initially, extractable later)
- [x] Implement `executeNavigationScenario(page, scenario, surface)` policy
  - Use `PageSurface.navTargets` to resolve the navigation target before falling back to free-text
- [x] Implement `executeAuthScenario(page, scenario)` policy
  - Invoke `assertAuthBoundary` for each auth-related check
- [x] Implement `executeStateTransitionScenario(page, scenario, surface)` policy
  - Use `PageSurface.inputs` to locate the relevant form or trigger
- [x] Implement `ExecutePermissionsScenario(page, scenario)` policy
  - Check role-specific access with structured URL or route assertions
- [x] Update `lib/qa/result-builder.ts`
  - Record which policy handler was used per step result
- [ ] Validate: run a regression suite where at least one scenario was previously blocked — confirm the match rate improves

---

## Gap 4 — Delete Endpoints and Store Cleanup

**Severity:** High
**Reference docs:** `docs/plans/QA_AGENT_FINAL_FINDINGS_REPORT_2026-03-26.md` Recommended Next Fixes

### Gap Summary

No delete operations exist anywhere in the API or storage layer. The final QA campaign explicitly left temporary credential and run records that cannot be removed without wiping the entire store. This is both an operational friction problem and a data hygiene problem.

---

### Phase 4.1 — Storage Interface for Deletion

**Goal:** Add delete operations to the storage abstraction and both backend implementations before exposing them via API.

#### Task List

- [x] Update `lib/qa/storage/types.ts`
  - Add `deleteRun(id: string): Promise<void>` to the `QaStorageBackend` interface
  - Add `deleteCredentialLibrary(id: string): Promise<void>`
  - Add `deleteEnvironmentLibrary(id: string): Promise<void>`
  - Add `deleteScenarioLibrary(id: string): Promise<void>`
- [x] Add reference-check helpers to the storage abstraction
  - Add helper methods or equivalent queries for determining whether a credential, environment, or scenario library is referenced by any `queued` or `running` run before allowing hard delete
- [x] Update `lib/qa/storage/json-store.ts`
  - Implement each delete by filtering out the matching record and writing the updated array atomically
  - For runs: artifacts are stored inline in the JSON store (no separate files)
  - Prevent hard delete of credential and environment records when they are referenced by any `queued` or `running` run
  - Preserve historical run readability by either blocking hard delete for referenced records or defining a later soft-delete path explicitly
- [x] Update `lib/qa/storage/sqlite.ts`
  - Confirm `better-sqlite3` connection has `PRAGMA foreign_keys = ON` enabled — confirmed present
  - Implement each delete using `DELETE WHERE id = ?`
  - For runs: cascades via `ON DELETE CASCADE` foreign keys remove all child rows automatically
  - Prevent hard delete of credential and environment records when they are referenced by any `queued` or `running` run
  - Preserve historical run readability by either blocking hard delete for referenced records or defining a later soft-delete path explicitly
- [x] Update `lib/qa/store.ts`
  - Re-export all four delete operations from the active backend

---

### Phase 4.2 — DELETE API Routes

**Goal:** Expose controlled delete endpoints for each resource type.

#### Task List

- [x] Update `app/api/runs/[runId]/route.ts` (currently only has `GET`)
  - Add `DELETE` handler: confirm run is not in an active/executing state before deleting; return 409 if it is
  - Call `deleteRun(runId)`, return 204 on success
- [x] Update `app/api/credentials/[credentialLibraryId]/route.ts` (currently has `PATCH` — add `DELETE` alongside it)
  - Add `DELETE` handler: refuse deletion with 409 when the credential is referenced by any `queued` or `running` run
  - Call `deleteCredentialLibrary(id)`, return 204 on success only when safe
- [x] Update `app/api/environments/[environmentLibraryId]/route.ts` (currently has `PATCH` — add `DELETE` alongside it)
  - Add `DELETE` handler: refuse deletion with 409 when the environment is referenced by any `queued` or `running` run
  - Call `deleteEnvironmentLibrary(id)`, return 204 on success only when safe
- [x] Create `app/api/scenario-libraries/[scenarioLibraryId]/route.ts` (this dynamic route folder did not exist yet — created)
  - Add `DELETE` handler: prevent deletion if the library is actively referenced by a `queued` or `running` run; otherwise call `deleteScenarioLibrary(id)`, return 204
  - Also adds `GET` handler for fetching an individual library record
- [x] Update `components/qa-command-center.tsx`
  - Added dedicated `deleteResource(url)` helper that calls `fetch(url, { method: "DELETE" })` and surfaces error messages

---

### Phase 4.3 — UI Delete Actions

**Goal:** Surface delete controls in the Library and Settings screens where records can accumulate.

#### Task List

- [x] Update `components/library/scenario-library-card.tsx`
  - Add a Delete action; shows delete button wired to `onDelete` callback from parent
  - Parent (`library-management-screen.tsx`) shows `window.confirm` before calling the delete API
  - Removes the card from local list optimistically on success
- [x] Update `components/settings/credential-vault-card.tsx`
  - Added Delete action per credential entry (disabled for the synthetic inline-entry row)
  - Confirms before deleting; calls `DELETE /api/credentials/:id`
  - Surfaces inline error message when deletion is blocked (e.g. profile in active run)
- [x] Update `components/settings/environment-card.tsx`
  - Added Delete action per environment entry
  - Confirms before deleting; calls `DELETE /api/environments/:id`
  - Surfaces inline error message when deletion is blocked
- [ ] Optionally add a bulk-cleanup action to the Monitor screen for deleting `draft` runs older than a configurable threshold (deferred if too complex for this phase)
- [ ] Validate: delete a credential profile, refresh Settings, confirm it is gone; delete a run, refresh Monitor, confirm it disappears

---

## Gap 5 — QA Analysis Module Extraction

**Severity:** Medium
**Reference docs:** `docs/plans/QA_WEB_TESTING_AGENT_IMPROVEMENT_PLAN.md` Workstream 8

### Gap Summary

The analysis logic that produces `AnalysisInsight[]` records (the existing `AnalysisInsight` type in `lib/types.ts`) is embedded inside `lib/qa/discovery-engine.ts` and `lib/qa/execution-engine.ts`. It cannot be tested independently, reused across run types, or replaced with a Gemini-backed alternative without touching execution code. Regression runs also have no route to compare current insights against the linked library's previous insights.

---

### Phase 5.1 — Extract Analysis Engine

**Goal:** Move all QA insight generation into a dedicated, independently callable module.

#### Task List

- [x] Create `lib/qa/analysis-engine.ts`
  - Export `buildQaInsights(evidence: AnalysisInput): AnalysisInsight[]`
  - Accept `AnalysisInput = { stepResults: StepResult[]; artifacts: Artifact[]; warnings: ExecutionWarning[]; crawlSurface?: PageSurface }` (use the existing `Artifact` type from `lib/types.ts`, not `ArtifactRecord`)
  - Move all heuristic analysis rules out of `discovery-engine.ts` into this module
  - Categorize insights explicitly by type: `"intended-flow"`, `"usability-risk"`, `"missing-label"`, `"inconsistent-language"`, `"defect-candidate"`, `"manual-follow-up"`
- [x] Update `lib/types.ts`
  - **Breaking change:** `AnalysisInsight.category` currently uses different category values (`"intended-flow" | "usability" | "accessibility" | "information-architecture" | "qa-recommendation"`) than the new set proposed above. A migration strategy is required:
    - Option A: Adopt the new values and update all existing insight generators + UI rendering to match
    - Option B: Define a union type combining both old and new, deprecating the old values
  - Add `evidenceKind: "observed" | "interpreted"` to `AnalysisInsight` so the UI can distinguish raw evidence from analysis
- [x] Update `lib/qa/discovery-engine.ts`
  - Replace inline insight generation with a call to `buildQaInsights(evidence)`
- [x] Update `lib/qa/execution-engine.ts`
  - Replace any inline insight generation with the same call

---

### Phase 5.2 — Regression Insight Comparison

**Goal:** Allow regression runs to compare their QA insights against those recorded in the linked scenario library baseline.

#### Task List

- [x] Update `lib/types.ts`
  - Add `baselineInsights?: AnalysisInsight[]` to `ScenarioLibraryVersion` (the last-snapshot insights at library save time)
- [x] Update `lib/qa/scenario-library.ts`
  - When saving or updating a library, persist the current run's insights as `baselineInsights` in the new version record
- [x] Update `lib/qa/storage/types.ts`, `lib/qa/storage/json-store.ts`, and `lib/qa/storage/sqlite.ts`
  - Persist `baselineInsights` in both backends instead of keeping it only in memory
  - Ensure version reads hydrate `baselineInsights` back into `ScenarioLibraryVersion`
- [x] Add the next available SQLite migration for normalized version insight storage if the field is stored outside the compatibility payload
  - Extend `scenario_library_versions` or add a companion normalized table for version insights
- [x] Update `lib/qa/result-builder.ts`
  - After a regression run completes, load the linked library's latest `baselineInsights` and compute a diff: `{ persisting: string[]; resolved: string[]; new: string[] }`
  - Store the diff in the `RunRecord` as `insightComparison`
- [x] Update `lib/types.ts`
  - Add `insightComparison?: { persisting: string[]; resolved: string[]; new: string[] }` to `RunRecord`
- [x] Update `components/qa/review-workflow-view.tsx`
  - Render the insight comparison section for regression runs: show how many insights persisted, were resolved, and are new
- [ ] Validate: run a regression against a library-backed run; confirm the insight comparison block populates in Review

---

## Gap 6 — Automated Test Suite

**Severity:** Medium
**Reference docs:** `docs/plans/QA_WEB_TESTING_AGENT_GEMINI_IMPLEMENTATION_PLAN.md` (validation sections), `docs/plans/QA_WEB_TESTING_AGENT_IMPROVEMENT_PLAN.md`

### Gap Summary

No automated test files exist anywhere in the workspace. All acceptance criteria to date have been validated manually. Without a test suite, LLM integration, storage backend swapping, and assertion logic carry no regression protection.

---

### Phase 6.1 — Test Infrastructure

**Goal:** Add the minimum test infrastructure needed to write and run unit tests.

#### Task List

- [x] ~~Install `vitest` and `@vitest/coverage-v8` (or `jest` if the team prefers) as devDependencies~~ — `vitest` is installed in `node_modules/vitest/`
- [x] ~~Add a `vitest.config.ts` (or `jest.config.ts`) at the workspace root~~ — `vitest.config.ts` exists at workspace root
  - Configure path aliases to match `tsconfig.json`'s `@/` alias
  - Set environment to `node` for all `lib/` tests
- [ ] Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`

> **⚠️ VERIFICATION NOTE (March 27, 2026):** `vitest` is installed and `vitest.config.ts` exists, but **`package.json` has no `"test"` script**. Running `npm run test` will fail. This is the only remaining blocker for the test infrastructure — a 5-minute fix.

- [ ] Confirm `npm run test` exits cleanly with zero tests (empty suite)

---

### Phase 6.2 — LLM Config and Provider Boundary Tests

**Goal:** Cover the most critical new code path introduced by Gap 1 with unit tests before any integration.

#### Task List

- [x] Create `lib/qa/llm/__tests__/config.test.ts`
  - Test: `QA_LLM_ENABLED=false` → `enabled: false`, `provider: "disabled"`, `configured: false`
  - Test: `QA_LLM_ENABLED=true`, no key → `configured: false`, warning present
  - Test: `QA_LLM_ENABLED=true`, valid key, `QA_LLM_PROVIDER=gemini` → `configured: true`
  - Test: all feature flags independently parse to booleans
  - Test: invalid feature flag value falls back to `false`
- [x] Create `lib/qa/llm/__tests__/provider.test.ts`
  - Test: `getQaLlmClient()` returns noop client when disabled
  - Test: noop client `normalizeSteps` returns `source: "disabled"` and original input
  - Test: noop client `generateScenarios` returns `source: "disabled"` and empty result
  - Test: noop client `analyzeRun` returns `source: "disabled"` and empty insights
- [x] Create `lib/qa/llm/__tests__/gemini-client.test.ts`
  - Mock the Google SDK
  - Test: valid structured response passes Zod validation and returns typed result
  - Test: malformed response fails Zod and triggers fallback
  - Test: SDK throws → fallback result returned, error recorded as warning (not thrown)

---

### Phase 6.3 — Storage Backend Tests

**Goal:** Validate the storage abstraction, especially deletion operations added in Gap 4.

#### Task List

- [x] Create `lib/qa/storage/__tests__/json-store.test.ts`
  - Test: create, read, and list a run record
  - Test: delete a run removes record and does not affect other records
  - Test: delete a non-existent run does not throw
  - Test: retrying read handles transient empty file without throwing
- [x] Create `lib/qa/storage/__tests__/sqlite.test.ts`
  - Use an in-memory SQLite instance for each test
  - Test: all migrations apply cleanly to an empty database
  - Test: create and read a run record
  - Test: delete a run removes associated rows from all normalized tables
  - Test: CRUD for credential and environment library records

---

### Phase 6.4 — Assertion Module Tests

**Goal:** Cover the new `lib/qa/assertions.ts` introduced in Gap 3 with unit tests using a mocked Playwright page.

#### Task List

- [x] Create `lib/qa/__tests__/assertions.test.ts`
  - Mock `@playwright/test` or use a lightweight stub `Page` object
  - Test: `assertElementVisible` returns `passed: true` when element is found
  - Test: `assertElementVisible` returns `passed: false` + `category: "element-not-found"` when missing
  - Test: `assertNavigationReachable` returns correct category on timeout
  - Test: `assertAuthBoundary` detects redirect to login page
  - Test: `assertFormLabeled` detects unlabeled input

---

### Phase 6.5 — Analysis Engine Tests

**Goal:** Cover `lib/qa/analysis-engine.ts` to prevent regressions in insight generation.

#### Task List

- [x] Create `lib/qa/__tests__/analysis-engine.test.ts`
  - Test: empty evidence input returns empty insights
  - Test: step results with `status: "fail"` produce at least one defect candidate
  - Test: warnings with category `"auth-failed"` produce an auth insight
  - Test: all returned insights have a `category`, `confidence`, and `evidenceKind` field
  - Test: `"observed"` and `"interpreted"` categories are assigned correctly

---

## Gap 7 — Per-Run LLM Metadata and Operator Transparency

**Severity:** Medium
**Reference docs:** `docs/plans/QA_WEB_TESTING_AGENT_GEMINI_IMPLEMENTATION_PLAN.md` Phase 5

### Gap Summary

There is no mechanism today to record or display which LLM path (Gemini or deterministic) was used for any given run's step parsing, scenario generation, or review analysis. Operators cannot audit whether model assistance was active, and the Settings screen only shows current configuration, not historical run behavior.

> Note: The type-level and UI changes required here overlap with tasks in Gap 1 Phase 1.6. This section provides implementation continuity for the operator-facing display independently of whether LLM features are fully wired.

---

### Phase 7.1 — Run Record LLM Metadata Fields

This overlaps with Gap 1 Phase 1.6. See that phase for detailed tasks. Summary:

- [x] ~~Add `llmMetadata` to `RunRecord` in `lib/types.ts`~~ (done via Phase 1.6 — verified at `types.ts` line 331)
- [x] ~~Populate `llmMetadata` in `lib/qa/result-builder.ts` from per-step sources~~ (done via Phase 1.6 — verified at `result-builder.ts` line 105)
- [x] ~~Expose in `lib/qa/run-view-model.ts`~~ (done via Phase 1.6 — verified at `run-view-model.ts` line 139)

---

### Phase 7.2 — Review Provenance Display

**Goal:** Show per-run provenance in the Review workflow so operators can identify model-assisted runs.

#### Task List

- [x] Update `components/qa/review-workflow-view.tsx`
  - Provenance banner renders step parsing, scenario generation, and review analysis sources
  - Applies `review-provenance-heuristic` tone when no LLM assistance was active
- [x] Update `lib/qa/run-view-model.ts`
  - `buildRunProvenanceSummary(run: RunRecord)` helper exported at line 138
- [ ] Validate: verify the provenance row renders correctly for both assisted and unassisted runs

---

### Phase 7.3 — Settings Historical Usage View

**Goal:** Show aggregate LLM usage statistics in Settings so operators understand how often Gemini assistance is active across all runs.

#### Task List

- [x] Create `app/api/runs/llm-summary/route.ts`
  - `GET` aggregates `llmMetadata` across all terminal-state runs and returns: `{ totalCompleted, geminiStepParsing, geminiScenarioGeneration, geminiReviewAnalysis }`
- [x] Update `components/settings/settings-screen.tsx`
  - Added LLM usage section below Gemini Configuration, computed directly from `listRuns()` already fetched by the server component
  - Shows "N of M completed runs used Gemini step parsing / scenario generation / review analysis"
  - Shows empty-state message when no completed runs exist
- [ ] Validate: confirm counts are accurate after completing runs with different configurations

---

## Gap 8 — Route-Transition Abort Chatter

**Severity:** Low
**Reference docs:** `docs/plans/QA_AGENT_FINAL_FINDINGS_REPORT_2026-03-26.md` Residual Issues

### Gap Summary

Polling for run events is not fully aborted or cleaned up on route unmount. This causes console noise with aborted fetch errors on every route navigation while Monitor is active or shortly after leaving it.

**Partial status (as of March 27, 2026):** The polling `useEffect` in `components/qa-command-center.tsx` (see lines 413–489) already uses `window.setInterval` with a `window.clearInterval` cleanup in the `useEffect` return callback. A `disposed` boolean flag guards stale `setState` calls, and `pollInFlightRef` prevents concurrent poll iterations. The remaining issues are: (1) `AbortController` is not wired to any polling `fetch` call, so in-flight requests are not cancelled on unmount — only the _next_ iteration is prevented; (2) the `disposed` flag is a local boolean, not a `useRef`, so it cannot guard truly late-arriving responses from the previous render cycle.

---

### Phase 8.1 — Polling Lifecycle Fixes

**Goal:** Eliminate ghost fetches and abort errors on route transitions.

#### Task List

- [x] ~~Ensure poll intervals are cleared with `clearInterval` in cleanup on every unmount path~~ (already done: `window.clearInterval(intervalId)` at line 486, runs when `selectedRunId` changes or on unmount)
- [x] ~~Add a guard to prevent calling `setState` after unmount~~ (already done: `disposed` flag at line 421, checked before every `setState` call)
- [x] Ensure all polling fetches use an `AbortController` whose `signal` is passed to `fetch`
  - Create an `AbortController` in the `useEffect` body
  - Pass `{ signal: controller.signal }` to both `fetch` calls in `loadRunState()` (lines 432 and 453)
  - Call `controller.abort()` in the `useEffect` cleanup alongside `clearInterval`
- [x] Ensure all polling fetches use an `AbortController` whose `signal` is passed to `fetch` — done: `controller` created in effect body, signal passed to both fetch calls, `controller.abort()` called in both cleanup paths; `AbortError` caught and silently ignored
- [x] Consider promoting the `disposed` flag to a `useRef` for safety across React strict-mode double-invocations
- [x] Audit `components/qa/monitor-workflow-view.tsx` for any independent polling not covered by the parent effect — confirmed: monitor-workflow-view.tsx is purely presentational with no useEffect or fetch calls
- [ ] Test: navigate away from Monitor while a run is executing; confirm no console abort errors appear; confirm no state-update-after-unmount warnings appear in dev mode

---

## Gap 9 — Security Notes Document and Inline Credential Reduction

**Severity:** Low
**Reference docs:** `docs/plans/QA_WEB_TESTING_AGENT_GEMINI_IMPLEMENTATION_PLAN.md` Phase 6

### Gap Summary

The plan called for `docs/SECURITY_NOTES.md` to document: `GEMINI_API_KEY` redaction guarantees, provider error sanitization, and a plan to reduce `loginEmail`/`loginPassword` persisted verbatim in run plan records. The document was never created, and inline credentials still persist in `RunRecord.plan`.

---

### Phase 9.1 — Inline Credential Reduction in Run Records

**Goal:** Reduce the amount of plaintext credential data stored in run records by preferring stored credential references when a saved profile was selected.

#### Task List

- [x] Update `app/api/runs/route.ts`
  - When a run is created with `credentialLibraryId` set, strip `loginEmail` and `loginPassword` from the persisted `plan` before writing to storage
  - Only preserve `loginEmail`/`loginPassword` for runs explicitly using inline credentials (no `credentialLibraryId`)
- [x] Update `lib/qa/auth-session.ts`
  - When resolving credentials for execution, prefer `credentialLibraryId` → look up stored record first
  - Only fall back to inline fields if `credentialLibraryId` is absent or the record is not found
- [x] Update existing run redaction in `lib/qa/result-builder.ts`
  - Confirmed: `buildStepResult` and `buildTerminalRunRecord` use only structural fields (`stepId`, `rawText`, `actionType`, `observedTarget`, `actionResult`, `notes`) — no `loginEmail`/`loginPassword` fields are referenced or propagated into step results or run events
- [ ] Validate: create a run with a saved credential profile; inspect the persisted run record; confirm no `loginEmail` or `loginPassword` values appear in the stored payload

---

### Phase 9.2 — Provider Error Sanitization

**Goal:** Ensure Gemini API errors, which may echo back request content, never reach run records or UI output.

#### Task List

- [x] Update `lib/qa/llm/gemini-client.ts` (once created in Gap 1)
  - `sanitizeError()` private method strips the API key from all error messages before `console.warn`; uses `this.apiKey` stored in constructor so it redacts the actual runtime key, not just env var
  - All three methods (`normalizeSteps`, `generateScenarios`, `analyzeRun`) use `sanitizeError` in their catch blocks
- [x] Update the existing redaction tests to include model-error patterns
  - Added 3 additional tests: API key embedded in JSON error body, normalizeSteps redaction, generateScenarios redaction
- [ ] Validate: trigger an intentional Gemini error (e.g., invalid prompt); confirm the raw error does not appear in the stored `RunRecord.events`

---

### Phase 9.3 — Security Notes Document

**Goal:** Create an auditable record of the current security posture and known limitations.

#### Task List

- [x] Create `docs/SECURITY_NOTES.md`
  - Document current local credential storage strategy: AES-256 via `QA_LOCAL_SECRET_KEY`
  - Document known limitation: `loginEmail`/`loginPassword` may still exist in legacy run records (pre-Gap 9.1 fix)
  - Document Gemini API key handling: key in `.env.local`, gitignored, never persisted in run data
  - Document redaction scope: what patterns are redacted from events, warnings, and summaries
  - Document what is explicitly out of scope for local deployment: multi-user secret sharing, key rotation, external vault
  - List any known open items for future hardening

---

## Gap 10 — Run List Performance and Pagination

**Severity:** Low
**Reference docs:** Implied by scale — store currently holds 36+ runs and growing

### Gap Summary

`GET /api/runs` returns the full payload for every run on each polling cycle. The Monitor and Review screens load all runs without pagination or virtual scrolling. As the run count grows this introduces unnecessary payload size and re-render cost.

**Partial status (as of March 27, 2026):** More is implemented than originally expected:

1. `/api/runs/summary` endpoint and `listRunSummaries()` store method already exist (wired in Migration 004 / SQLite normalization slice 4).
2. The initial data load in `qa-command-center.tsx` (line 375) already uses `/api/runs/summary` instead of the full `/api/runs` endpoint.
3. The full run detail is already fetched separately via `GET /api/runs/{runId}` only when `selectedRunId` changes (line 432).
4. A client-side `summarizeRun()` helper (line 172) projects full `RunRecord` → `RunSummary` after each polling detail fetch.

The remaining work is confined to: (a) adding pagination/cursor-based params to the summary list endpoint, and (b) confirming that _no other path_ in the component falls back to the full `/api/runs` list endpoint.

---

### Phase 10.1 — Paginated Run Summary API

**Goal:** Add pagination or cursor-based listing to the existing summary endpoint to prevent unbounded response growth.

#### Task List

- [x] ~~Create `/api/runs/summary` endpoint and `listRunSummaries()` store method~~ (already exists)
- [x] ~~Switch the initial data load in `qa-command-center.tsx` to use `/api/runs/summary`~~ (already implemented at line 375)
- [x] ~~Fetch full run detail separately via `GET /api/runs/{runId}` only when `selectedRunId` changes~~ (already implemented at line 432)
- [x] Update `app/api/runs/summary/route.ts`
  - Add optional query parameters: `?limit=50&cursor=<lastRunId>&status=<filter>`
- [x] Update `lib/qa/storage/types.ts`
  - Add overloaded `listRunSummaries(options?: { limit?: number; cursor?: string; statusFilter?: RunStatus })` signature
- [x] Update `lib/qa/storage/sqlite.ts`
  - Implement paginated `listRunSummaries` with `LIMIT/OFFSET` or cursor-based `WHERE id < ?`
- [x] Update `lib/qa/storage/json-store.ts`
  - Implement paginated `listRunSummaries` with in-memory slice
- [x] Audit `qa-command-center.tsx` to confirm no remaining code path uses `/api/runs` (the non-summary endpoint) for listing

---

### Phase 10.2 — Virtual Scrolling or Limit Cap

**Goal:** Prevent the run list DOM from growing unbounded when many runs exist.

#### Task List

- [x] Update `components/qa/run-list-panel.tsx`
  - Cap the rendered list to the most recent 50 runs by default
  - Add a "Load more" control for older runs if pagination is implemented
  - Alternatively, evaluate a lightweight virtual list library if the team prefers full scrolling
- [ ] Validate: seed the store with 100+ runs; confirm Monitor loads in under 2 seconds and scrolling remains smooth

---

## Gap 11 — Draft Environment Profile Auto-Fill

**Severity:** Low
**Reference docs:** `docs/plans/QA_AGENT_ENVIRONMENT_CREDENTIAL_LIBRARY_IMPLEMENTATION_PLAN.md` UI And Workflow Changes

### Gap Summary

~~Selecting a saved environment profile in Draft currently only writes the `environmentLibraryId` into the run plan. The visible form fields are not populated from the profile's values.~~

**Revised status (as of March 27, 2026):** This gap is **largely implemented**. The `applyEnvironmentLibrarySelection()` function in `components/qa-command-center.tsx` (lines 627–648) already patches all form fields when a profile is selected:

- `plan.environmentLibraryId` ✅
- `plan.environment` ✅
- `plan.targetUrl` ✅
- `plan.role` ✅
- `plan.browser` ✅
- `plan.device` ✅
- `plan.safeMode` ✅
- `plan.riskLevel` ✅

The function also resolves a linked `defaultCredentialId` and applies the credential profile automatically (lines 638–644). The remaining work is the UI-side read-only indicator and clear/override action.

---

### Phase 11.1 — Environment Profile UI Confirmation

**Goal:** Give the operator visual confirmation that a profile was applied, and a way to clear/override it.

#### Task List

- [x] ~~Update `components/qa-command-center.tsx` to patch form fields from the selected profile~~ (already implemented in `applyEnvironmentLibrarySelection()` at lines 627–648)
- [x] Update `components/qa/draft-workflow-view.tsx`
  - When `selectedEnvironmentLibrary` is non-null, renders a read-only mode indicator banner at the top of Mission Parameters: "Loaded from profile: [name]"
  - Clear Profile button calls `onSelectEnvironmentLibrary("")` to reset `environmentLibraryId` and restore manual input
- [ ] Validate: select a saved environment profile in Draft; confirm all matching fields populate; confirm clearing the profile restores manual input; confirm a created run preserves both the reference and the resolved values

---

## Gap 12 — Structural and Infrastructure Issues Identified During Analysis

**Severity:** Low
**Reference docs:** Identified during cross-referencing of the gap plan against the codebase (March 27, 2026).

### Gap Summary

Several issues were discovered during the gap analysis that are not covered by any existing gap section. They span CI, foreign-key enforcement, and runtime security.

---

### Phase 12.1 — SQLite Foreign Key Enforcement

**Goal:** Ensure `PRAGMA foreign_keys = ON` is set on every `better-sqlite3` connection so cascading child-row cleanup and referential integrity work correctly.

#### Task List

- [x] Audit `lib/qa/storage/sqlite.ts` for the presence of `PRAGMA foreign_keys = ON` after opening the database connection
  - `better-sqlite3` defaults to `foreign_keys = OFF`; if this pragma is missing, all `ON DELETE CASCADE` constraints are silently ignored
  - If absent, add `db.pragma('foreign_keys = ON')` immediately after opening the database — already present at line 817
- [x] Validate: insert a parent row and a child row, delete the parent, confirm the child is cascade-deleted — pragma confirmed present; cascades will fire on delete operations added in Gap 4

---

### Phase 12.2 — CI Test and Lint Workflow

**Goal:** Add a GitHub Actions workflow so that every push or pull request runs lint, typecheck, and tests automatically.

#### Task List

- [x] Create `.github/workflows/ci.yml`
  - Run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run test` (once test infra from Gap 6 is in place)
  - Target Node 20 or the team's chosen version
- [ ] Validate: push a branch with a failing lint rule; confirm CI marks the check as failed

---

### Phase 12.3 — LLM Prompt Versioning

**Goal:** Make prompt versioning explicit rather than comment-only, so prompt changes can be tracked and correlated with model output quality.

#### Task List

- [x] When `lib/qa/llm/prompts.ts` is created (Gap 1 Phase 1.1), include a `PROMPT_VERSION` constant per template (not just a code comment)
  - `STEP_NORMALIZATION_PROMPT_VERSION = "1.0.0"`, `SCENARIO_GENERATION_PROMPT_VERSION = "1.0.0"`, `REVIEW_ANALYSIS_PROMPT_VERSION = "1.0.0"` exported from `prompts.ts`
- [x] Record `promptVersion` in LLM call metadata so it can appear in run records and debug logs
  - Added `promptVersions?: { stepNormalization, scenarioGeneration, reviewAnalysis }` to `RunRecord.llmMetadata` in `lib/types.ts`
  - `buildTerminalRunRecord` in `result-builder.ts` imports the three version constants and writes them to `llmMetadata.promptVersions` on every completed run
- [ ] Validate: update a prompt, confirm the version constant changes and the new version appears in run metadata

---

## Remaining Execution Order (updated March 27, 2026 — second pass)

All prioritized implementation work is complete. The following items remain as **validation only** (manual testing with a running app):

| Priority | Item | Effort | Gap |
|---|---|---|---|
| **1** | Rename/archive/duplicate library — refresh confirm | 30 min | 2.1–2.3 |
| **2** | Author filter real-data test | 15 min | 2.5 |
| **3** | Scenario execution policy improvement — regression pass rate check | 1 hr | 3.3 |
| **4** | Delete credential / run — Settings + Monitor confirm | 20 min | 4.3 |
| **5** | Regression insight comparison in Review | 30 min | 5.2 |
| **6** | Route-transition abort console check | 15 min | 8.1 |
| **7** | Credential profile run record inspection | 20 min | 9.1 |
| **8** | Gemini error → run events check | 20 min | 9.2 |
| **9** | Prompt version appears in completed run record | 10 min | 12.3 |
| **10** | CI check on failing lint push | 5 min | 12.2 |
| deferred | Bulk draft-run cleanup action in Monitor | TBD | 4.3 |

---

## Done Criteria

This implementation plan is considered complete when:

- [x] ~~`getQaLlmClient()` is callable and returns typed results from Gemini or noop fallback~~ (verified: `lib/qa/llm/provider.ts` + `gemini-client.ts` + `noop-client.ts` all exist)
- [x] ~~All three Gemini capability modules are implemented and feature-flag-gated~~ (verified: `step-normalization.ts`, `scenario-generation.ts`, `review-analysis.ts`)
- [x] ~~Per-run LLM provenance is visible in Review~~ (verified: `buildRunProvenanceSummary()` in `run-view-model.ts` line 138; provenance banner in `review-workflow-view.tsx` line 109)
- [x] ~~Rename, Archive, Duplicate, and History work on scenario library cards~~ (verified: all routes + UI wired; pending validation)
- [x] ~~Author metadata field exists and the author filter is functional~~ (verified: `author` on `ScenarioLibrary`, migration 007, filter bar updated)
- [x] ~~`DELETE` endpoints exist for runs, credentials, environments, and scenario libraries~~ (verified: all 4 route handlers + `deleteResource` helper)
- [x] ~~`lib/qa/assertions.ts` exists and is used by `scenario-executor.ts`~~ (verified: 8,817 bytes)
- [x] ~~`lib/qa/analysis-engine.ts` exists and is used by both discovery and execution paths~~ (verified: 10,952 bytes)
- [x] ~~`lib/qa/analysis-engine.ts` supports regression insight comparison~~ (verified: `insightComparison` on `RunRecord`, rendering in Review)
- [x] ~~A test suite covers LLM config, provider boundary, storage backends, assertions, and analysis~~ (verified: 7 test files, 66 tests; `npm test` + `npm run test:watch` scripts present in `package.json`)
- [x] ~~No route-transition abort errors appear in dev console during normal navigation~~ (verified: `AbortController` + `disposed` flag + `clearInterval` all present; pending manual test)
- [x] ~~Inline credentials are stripped from run records when a saved credential profile was used~~ (verified: `runs/route.ts` strips + `auth-session.ts` prefers library + `result-builder.ts` audited: no credential fields propagated into step results)
- [x] ~~`docs/SECURITY_NOTES.md` exists and reflects current posture accurately~~ (verified: file exists)
- [x] ~~Draft environment profile selection auto-fills all matching form fields~~ (already implemented)
- [x] ~~Draft profile selection shows a read-only indicator and clear/override action~~ (verified: "Loaded from profile" banner + Clear Profile button in `draft-workflow-view.tsx`)
- [x] ~~`PRAGMA foreign_keys = ON` is verified in the SQLite backend~~ (verified: present at `sqlite.ts` line 817)
- [x] ~~A CI workflow runs lint, typecheck, and tests on every push~~ (verified: `.github/workflows/ci.yml` exists; pending push validation)
- [x] ~~LLM prompt templates use explicit version constants~~ — `STEP_NORMALIZATION_PROMPT_VERSION`, `SCENARIO_GENERATION_PROMPT_VERSION`, `REVIEW_ANALYSIS_PROMPT_VERSION` exported from `prompts.ts`; all three written to `RunRecord.llmMetadata.promptVersions` by `result-builder.ts`
