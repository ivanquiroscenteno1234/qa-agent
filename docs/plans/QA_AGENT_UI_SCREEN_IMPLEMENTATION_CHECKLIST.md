# QA Agent UI Screen Implementation Checklist

## Goal

Convert the UI screen implementation plan into an execution checklist for building the redesigned QA Agent screens from the design files in `resources/QA-Agent`.

Reference plan:

- `docs/plans/QA_AGENT_UI_SCREEN_IMPLEMENTATION_PLAN.md`

---

## Working Rules

- [x] Do not copy the exported HTML directly into the app.
- [x] Rebuild the designs as reusable React components.
- [x] Keep current runtime and API behavior stable during UI refactors.
- [x] Preserve current Draft, Monitor, and Review functionality while reskinning.
- [x] Keep Settings copy aligned with current local-file architecture and avoid implying unsupported vault infrastructure.

---

## Phase 1: Shared UI Foundation

### 1. Design Tokens And Global Styles

- [x] Audit `app/globals.css` and identify current tokens/styles that should be preserved.
- [x] Add typography tokens for headline, body, label, micro-label, and mono usage.
- [x] Add color tokens for surface layers, primary ink, muted text, borders, and accent states.
- [x] Add status tokens for draft, queued, running, pass, fail, blocked, cancelled, and inconclusive.
- [x] Add spacing, radius, and shadow tokens based on the design exports.
- [x] Add utility classes for ruled dividers, section framing, archival labels, and evidence-chip patterns.
- [x] Add responsive layout rules for left rail plus top bar shell behavior.

Files:

- `app/globals.css`

Acceptance criteria:

- [x] Shared design tokens exist in one place.
- [x] Core surfaces and status colors can be reused across all screens.

### 2. Font And Layout Baseline

- [x] Update app layout to load `Newsreader`, `Inter`, and `JetBrains Mono` appropriately.
- [x] Ensure font loading does not break existing rendering.
- [x] Define global typography usage conventions for headings, labels, and mono panels.

Files:

- `app/layout.tsx`
- `app/globals.css`

Acceptance criteria:

- [x] Typography matches the design direction consistently.
- [x] Monitor can use mono styling without local ad hoc font setup.

### 3. App Shell Components

- [x] Create `components/layout/app-shell.tsx`.
- [x] Create `components/layout/side-nav.tsx`.
- [x] Create `components/layout/top-bar.tsx`.
- [x] Define a shared nav-item model for Draft, Monitor, Review, Library, Settings, and Archives.
- [x] Add active-state support in the shell.
- [x] Add support for contextual header title, badge, utilities, and per-screen actions.
- [x] Add operator-profile slot in the side rail.

Files:

- `components/layout/app-shell.tsx`
- `components/layout/side-nav.tsx`
- `components/layout/top-bar.tsx`

Acceptance criteria:

- [x] A single shell can host all major screens.
- [x] Active nav state is configurable rather than hardcoded.

### 4. Shared Primitive Components

- [x] Create `components/ui/page-header.tsx`.
- [x] Create `components/ui/section-frame.tsx`.
- [x] Create `components/ui/status-badge.tsx`.
- [x] Create `components/ui/metric-card.tsx`.
- [x] Create `components/ui/action-bar.tsx`.
- [x] Create `components/ui/filter-bar.tsx` if a generic filter row abstraction is useful.
- [x] Make sure these components are data-driven and not screen-specific.

Files:

- `components/ui/page-header.tsx`
- `components/ui/section-frame.tsx`
- `components/ui/status-badge.tsx`
- `components/ui/metric-card.tsx`
- `components/ui/action-bar.tsx`
- `components/ui/filter-bar.tsx`

Acceptance criteria:

- [x] Shared UI primitives can be reused across at least 3 screens.
- [x] No screen duplicates the same section-shell markup manually.

---

## Phase 2: Draft Screen Reskin

### 5. Draft Layout Refactor

- [x] Wrap the Draft screen in the new shell.
- [x] Replace the lightweight workflow bar presentation with the new page header and shell navigation.
- [x] Split Draft into numbered archival sections matching the design intent.
- [x] Group fields into:
  - [x] Environment & Target
  - [x] Execution Parameters
  - [x] Mission Brief / Step Definition
  - [x] Scenario Source / Library Controls
  - [x] Parse Preview
  - [x] Scenario Coverage Matrix

Files:

- `components/qa/draft-workflow-view.tsx`
- `components/qa-command-center.tsx`
- `components/layout/*`
- `components/ui/*`

Acceptance criteria:

- [x] All existing Draft controls remain available.
- [x] Sections read clearly and follow the design hierarchy.

### 6. Draft Actions And Warnings

- [x] Restyle Parse Steps, Generate Scenarios, Create Run, Save As Library, and Update Library actions using shared primitives.
- [x] Add explicit disabled-state explanation patterns for unavailable actions.
- [x] Promote operator risk warnings visually using a shared warning treatment.
- [x] Preserve current library-name behavior and scenario-library enablement logic.

Files:

- `components/qa/draft-workflow-view.tsx`
- `components/qa-command-center.tsx`

Acceptance criteria:

- [x] Disabled library actions are understandable.
- [x] Existing library lifecycle behavior still works.

---

## Phase 3: Monitor Screen Reskin

### 7. Monitor Summary Row

- [x] Add the shell-based Monitor screen wrapper.
- [x] Add a metric summary row for active, queued, draft, and completed runs.
- [x] Decide which summary metrics use existing counts versus derived values.
- [x] Add visual state treatment for live uplink / active execution.

Files:

- `components/qa/monitor-workflow-view.tsx`
- `components/qa-command-center.tsx`
- `components/ui/metric-card.tsx`

Acceptance criteria:

- [x] Monitor communicates current operational state at a glance.

### 8. Run List And Run Detail Redesign

- [x] Create `components/qa/run-list-panel.tsx`.
- [x] Extract `RunDetailHeader` or equivalent from current monitor/review detail sections.
- [x] Rework the run list into denser operational cards aligned with the design.
- [x] Preserve selection logic based on `selectedRunId`.
- [x] Keep active-run cancel action visible.

Files:

- `components/qa/run-list-panel.tsx`
- `components/qa/monitor-workflow-view.tsx`
- `components/qa/run-workspace.tsx`

Acceptance criteria:

- [x] Selecting runs still works without rerender bounce.
- [x] Active and terminal runs are visually distinguishable.

### 9. Live Console And Warning Treatment

- [x] Create `components/qa/live-console-panel.tsx`.
- [x] Apply `JetBrains Mono` styling to event rows and timestamps.
- [x] Improve warning panel styling while preserving current warning data.
- [x] Keep polling logic stable during the UI refactor.

Files:

- `components/qa/live-console-panel.tsx`
- `components/qa/monitor-workflow-view.tsx`
- `components/qa-command-center.tsx`

Acceptance criteria:

- [x] Live events remain readable and current.
- [x] Warnings are clearly separated from informational events.

---

## Phase 4: Review Screen Reskin

### 10. Review Header And Comparison Summary

- [x] Wrap Review in the new shell and page header.
- [x] Add a run summary header with status, duration, and library actions.
- [x] Create `components/qa/comparison-bento.tsx`.
- [x] Convert existing comparison deltas into 4-up metric cards.

Files:

- `components/qa/review-workflow-view.tsx`
- `components/qa/comparison-bento.tsx`

Acceptance criteria:

- [x] Review surfaces comparison data without requiring list scanning.

### 11. Evidence Timeline Extraction

- [x] Create `components/qa/evidence-timeline.tsx`.
- [x] Move current step timeline rendering into that component.
- [x] Preserve screenshot linkage and historical fallback behavior.
- [x] Keep timeline scanability strong on both desktop and smaller widths.

Files:

- `components/qa/evidence-timeline.tsx`
- `components/qa/review-workflow-view.tsx`

Acceptance criteria:

- [x] Step-to-screenshot linkage remains intact.
- [x] Timeline is visually closer to the design without losing evidence clarity.

### 12. Artifact Review Integration

- [x] Keep grouped artifact rendering introduced in the current app.
- [x] Evolve grouped artifact sections to match the new review composition.
- [x] Decide whether `ArtifactGroupSection` should be a separate reusable component or remain inside `artifact-review.tsx`.
- [x] Preserve download and inline preview behavior.

Files:

- `components/qa/artifact-review.tsx`
- `components/qa/review-workflow-view.tsx`

Acceptance criteria:

- [x] Grouped sections remain: Evidence Captures, Discovery Data, Reports, Debug Archives.
- [x] No regression in artifact previews or downloads.

### 13. QA Analysis, Defects, And Library Alignment

- [x] Standardize evidence chips in a shared `EvidenceTagList` pattern.
- [x] Restyle defect candidate and risk summary sections.
- [x] Preserve `Save Run As Library` and `Update Linked Library` actions.
- [x] Ensure library alignment remains understandable in the new layout.

Files:

- `components/qa/review-workflow-view.tsx`
- `components/ui/*` or `components/qa/*` for evidence tag extraction

Acceptance criteria:

- [x] QA analysis remains evidence-driven.
- [x] Library actions are still reachable and context-aware.

---

## Phase 5: Scenario Library Screen

### 14. Library Route Scaffolding

- [x] Create `app/library/page.tsx`.
- [x] Route it through the new app shell.
- [x] Define the initial screen state when no libraries exist.

Files:

- `app/library/page.tsx`
- `components/layout/*`

Acceptance criteria:

- [x] `/library` exists and renders within the shared shell.

### 15. Library Screen Components

- [x] Create `components/library/scenario-library-card.tsx`.
- [x] Create `components/library/scenario-library-filter-bar.tsx`.
- [x] Add a library summary header and global action bar.
- [x] Add feature/risk/author filtering UI.
- [x] Add quick actions for run, history, rename, archive, and duplicate.
- [x] Mark unsupported actions as future or disabled if backend support is not yet present.

Files:

- `components/library/scenario-library-card.tsx`
- `components/library/scenario-library-filter-bar.tsx`
- `app/library/page.tsx`

Acceptance criteria:

- [x] Operators can browse existing libraries in a dedicated screen.
- [x] Risk, version, scenario count, and last-updated signals are visible.

### 16. Library Data Wiring

- [x] Reuse existing `/api/scenario-libraries` listing data.
- [x] Build a view-model helper for library cards.
- [x] Decide how rerun-from-library entry points flow back into Draft or direct execution.
- [x] Document which library actions need future API work.

Implementation note:

- First pass keeps the operator in Draft before execution. Library `Run` now routes to `/draft`, preloads the selected saved library into the mission brief, and lets the operator review parameters before creating a run.

Files:

- `app/library/page.tsx`
- `lib/qa/*` or helper layer for view-model builders
- optional new helper files

Acceptance criteria:

- [x] The first pass works with current library persistence.
- [x] Future API gaps are explicit.

---

## Phase 6: Settings Screen

### 17. Settings Route Scaffolding

- [x] Create `app/settings/page.tsx`.
- [x] Add it to shell navigation.
- [x] Define shell-compatible search/action treatment for the screen.

Files:

- `app/settings/page.tsx`
- `components/layout/*`

Acceptance criteria:

- [x] `/settings` exists and matches the shared shell.

### 18. Credential And Environment Components

- [x] Create `components/settings/credential-vault-card.tsx`.
- [x] Create `components/settings/environment-card.tsx`.
- [x] Add credentials section with active/revoked states.
- [x] Add environments section with health, endpoint, latency, uptime, and actions.
- [x] Make it visually aligned with the exported design but operationally honest.

Files:

- `components/settings/credential-vault-card.tsx`
- `components/settings/environment-card.tsx`
- `app/settings/page.tsx`

Acceptance criteria:

- [x] The screen reflects current backend realities.
- [x] Unsupported vault semantics are not implied as fully functional.

### 19. Settings Behavior Constraints

- [x] Decide which settings actions are real in phase one versus placeholders.
- [x] Add disabled or informational states for unsupported actions.
- [x] Add explicit copy about local credential storage limitations where relevant.

Files:

- `app/settings/page.tsx`
- `components/settings/*`

Acceptance criteria:

- [x] No misleading security claims appear in the UI.

---

## Phase 7: Routing And State Migration

### 20. Route Strategy For Existing Screens

- [x] Decide whether phase-one Draft, Monitor, and Review remain one orchestrated page under the hood or move to separate routes immediately.
- [x] If using separate routes, create:
  - [x] `app/draft/page.tsx`
  - [x] `app/monitor/page.tsx`
  - [x] `app/review/page.tsx`
- [x] Keep `QaCommandCenter` as the short-term orchestration owner if that reduces risk.

Files:

- `app/page.tsx`
- `app/draft/page.tsx`
- `app/monitor/page.tsx`
- `app/review/page.tsx`
- `components/qa-command-center.tsx`

Acceptance criteria:

- [x] Routing changes do not break run selection or polling.

### 21. View-Model Extraction

- [x] Add derived view-model helpers for monitor metrics.
- [x] Add derived view-model helpers for run list items.
- [x] Add derived view-model helpers for review comparison summary.
- [x] Add derived view-model helpers for scenario library cards.
- [x] Add derived view-model helpers for settings environment and credential cards.

Suggested outputs:

- `buildMonitorSummaryMetrics(runs)`
- `buildRunListItems(runs)`
- `buildReviewComparisonSummary(selectedRun, previousRun)`
- `buildScenarioLibraryCards(libraries)`
- `buildEnvironmentCards(config)`

Acceptance criteria:

- [x] Formatting logic is reduced inside JSX-heavy screen files.
- [x] Screen components become more presentational and easier to maintain.

---

## Phase 8: QA, Validation, And Hardening

### 22. Visual Regression And Interaction Validation

- [x] Validate Draft actions after the reskin.
- [x] Validate Monitor selection and live polling after the reskin.
- [x] Validate Review evidence rendering after the reskin.
- [x] Validate Library browse/filter behavior.
- [x] Validate Settings empty, disabled, and informational states.

Acceptance criteria:

- [x] No previously working operator workflow regresses.

### 23. Technical Validation

- [x] Run `npm run typecheck` after each major phase.
- [x] Run editor diagnostics on touched files.
- [x] Confirm the app boots after layout and routing changes.
- [x] Confirm no new artifact route regressions are introduced.

Acceptance criteria:

- [x] The app remains type-safe and routable.

### 24. Documentation Cleanup

- [x] Update plan docs if route or component decisions change during implementation.
- [x] Add implementation notes for deferred backend-dependent actions.
- [x] Update repository memory or internal project notes after major milestones.

Acceptance criteria:

- [x] The execution checklist stays aligned with the actual code path.

---

## Recommended Build Order

- [x] Shared shell and tokens
- [x] Draft reskin
- [x] Monitor reskin
- [x] Review reskin
- [x] Library route
- [x] Settings route
- [x] Route/state cleanup
- [x] Validation pass

---

## Done Criteria

- [x] Shared shell exists across Draft, Monitor, Review, Library, and Settings.
- [x] Exported designs have been translated into reusable React components.
- [x] Current QA runtime behaviors remain intact.
- [x] Library is a first-class management screen.
- [x] Settings has a dedicated operational home that matches backend reality.
- [x] Reusable primitives exist for repeated UI patterns.
- [x] The app can continue expanding without rebuilding the shell again.
