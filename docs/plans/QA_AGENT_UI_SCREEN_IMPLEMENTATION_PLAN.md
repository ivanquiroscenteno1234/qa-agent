# QA Agent UI Screen Implementation Plan

## Goal

Translate the design exports in `resources/QA-Agent` into a reusable UI implementation plan that fits the current Next.js application and existing QA runtime.

This plan is intentionally implementation-focused rather than purely visual. It defines:

- the reusable components implied by the design files
- the new screens and routes that need to exist
- how those screens map to current code and data
- the recommended delivery sequence
- acceptance criteria for each phase

This document does not implement the redesign yet. It creates the blueprint to do that safely and incrementally.

---

## Implementation Status

Status as of 2026-03-24:

- The first-pass redesign described in this plan is implemented.
- Route-backed Draft, Monitor, Review, Library, and Settings screens now exist and run inside the shared shell.
- Shared layout primitives and domain-specific components from this plan were implemented as reusable React components rather than copied export markup.
- Runtime behavior for Draft, Monitor, Review, artifact handling, and scenario-library flows was preserved during the redesign.

Items that remain intentionally deferred or partial relative to the broader design vision:

- Optional later routes remain unimplemented:
  - `/archives`
  - `/library/[libraryId]`
  - `/review/[runId]`
  - `/settings/credentials`
  - `/settings/environments`
- Library actions that require additional backend support remain browse-first or disabled, including rename, archive, duplicate, and version-history drill-down flows.
- Settings remains operationally honest to the current local-file architecture and does not implement enterprise secret-vault behavior.

This means the planned first-pass UI implementation is complete, while the plan's explicitly later-stage extensions remain future work.

---

## Source Design Files

The following exported screens were reviewed from `resources/QA-Agent`:

- `QA_Command_Center_Draft.html`
- `QA_Command_Center_Monitor.html`
- `QA_Command_Center_Review.html`
- `Scenario_Library_Management.html`
- `System_Configuration_Settings.html`

These files establish a shared visual system and a broader information architecture than the current app.

---

## Current UI Baseline

The current app already has a working functional split between the main QA workflows:

- Draft
- Monitor
- Review

Relevant current files:

- `app/page.tsx`
- `components/qa-command-center.tsx`
- `components/qa/workflow-bar.tsx`
- `components/qa/run-workspace.tsx`
- `components/qa/draft-workflow-view.tsx`
- `components/qa/monitor-workflow-view.tsx`
- `components/qa/review-workflow-view.tsx`
- `components/qa/artifact-review.tsx`
- `app/globals.css`

The current structure is functionally strong, but the designs introduce larger-shell navigation, denser operational summaries, and two new major screen areas:

- Scenario Library Management
- System Configuration / Settings

---

## Design System Direction

The reviewed designs are internally consistent and should be implemented as a shared design language rather than as one-off screen rewrites.

### Core visual traits

- warm paper-like background surfaces
- muted graphite primary palette
- serif editorial headings with sans-serif operational body text
- ruled dividers, evidence panels, and archival language
- narrow uppercase micro-labels
- restrained accent colors for risk and status
- left rail navigation plus top application bar
- dense but intentional information grouping

### Typography model

- Headline font: `Newsreader`
- Body font: `Inter`
- Monospace font where needed in Monitor: `JetBrains Mono`

### Token families to formalize

Create app-level CSS variables or design tokens for:

- surfaces
- borders and outline variants
- primary ink colors
- muted text colors
- status colors for draft, queued, running, pass, fail, blocked, cancelled, inconclusive
- spacing scale
- radius scale
- shadow presets
- typography sizes for headline, section title, label, micro-label, mono detail

### Recommendation

Do not implement this redesign as raw Tailwind copied from the exported HTML.

Instead:

- extract the style intent into reusable tokens in `app/globals.css`
- keep React components semantic and data-driven
- avoid hardcoded content and duplicated shell markup across screens

---

## Target Information Architecture

The designs imply the following primary application structure:

1. Draft
2. Monitor
3. Review
4. Library
5. Settings

There are also secondary shell destinations implied by the designs:

- Archives
- Help
- Notifications
- Search
- New Mission / New Scenario global actions

### Recommended route model

Move from a single-screen-only shell toward route-backed screens while preserving the current working stateful behavior.

Recommended routes:

- `/` or `/draft`
- `/monitor`
- `/review`
- `/library`
- `/settings`

Optional later routes:

- `/archives`
- `/library/[libraryId]`
- `/review/[runId]`
- `/settings/credentials`
- `/settings/environments`

### Migration note

The current `QaCommandCenter` can remain the source of truth initially. Route-backed screens should be introduced in phases by extracting shared state and screen-specific containers, not by rewriting the runtime first.

---

## Reusable Component Plan

The exported screens strongly suggest a layered component system.

### Layer 1: App Shell

These components should be shared across all screens.

#### `AppShell`

Purpose:

- global page frame
- left nav + top bar + content area

Responsibilities:

- render navigation state
- host page title and top actions
- support per-screen content injection

#### `SideNav`

Purpose:

- persistent primary workflow navigation

Items:

- Draft
- Monitor
- Review
- Library
- Settings
- Archives

Features:

- active state styling
- icon + label layout
- bottom utility actions
- operator profile block

#### `TopBar`

Purpose:

- global header with contextual title and utilities

Features:

- context title such as `Mission Control` or `Scenario Library`
- optional environment/run badge
- search field
- notification/help/terminal/settings actions
- support for per-screen header actions

### Layer 2: Shared Layout Primitives

#### `PageHeader`

Purpose:

- consistent screen intro with eyebrow, title, subtitle, and optional actions

Use on:

- Draft
- Monitor
- Review
- Library
- Settings

#### `SectionFrame`

Purpose:

- consistent section container with ruled header and optional archival reference metadata

Use on:

- Draft form groups
- Review evidence sections
- Library filter panels
- Settings cards

#### `MetricCard`

Purpose:

- display key operational counts and deltas

Variants:

- neutral
- running
- warning
- success
- failure

Use on:

- Monitor summary row
- Review run comparison bento cards
- Library health/success-rate cards

#### `StatusBadge`

Purpose:

- standardized run or risk state representation

Statuses:

- draft
- queued
- running
- pass
- fail
- blocked
- cancelled
- inconclusive
- low, moderate, high risk

#### `ActionBar`

Purpose:

- collect primary, secondary, and quiet actions consistently

Use on:

- Draft mission actions
- Review library actions
- Library management actions
- Settings actions

### Layer 3: Domain-Specific Components

#### `RunListPanel`

Purpose:

- list runs with density optimized for Monitor and Review

Features:

- status badge
- progress bar or summary state
- feature/environment metadata
- selected state
- optional filters/sort controls

#### `RunDetailHeader`

Purpose:

- top portion of selected run detail

Contents:

- run name / feature area
- mode, browser, role, environment
- status summary
- current activity
- action buttons

#### `LiveConsolePanel`

Purpose:

- render monitor event stream with mono typography and severity treatment

Features:

- timestamped entries
- severity grouping
- auto-scroll option
- empty state

#### `WarningPanel`

Purpose:

- show execution warnings or operator risk warnings consistently

#### `ComparisonBento`

Purpose:

- reusable 4-up comparison card row for Review and later Library analytics

Cards:

- scenarios
- defects
- artifacts
- timeline size or execution volume

#### `EvidenceTimeline`

Purpose:

- render step timeline with screenshots and per-step evidence links

This should evolve from the current step timeline logic in `review-workflow-view.tsx`.

#### `ArtifactGroupSection`

Purpose:

- render grouped artifacts by evidence type

Groups already validated in the current app:

- Evidence Captures
- Discovery Data
- Reports
- Debug Archives

#### `EvidenceTagList`

Purpose:

- standardize chips for QA analysis references and artifact labels

Types:

- view
- surface
- input
- defect
- artifact

#### `ScenarioLibraryCard`

Purpose:

- represent a reusable scenario library item in the Library screen

Contents from design:

- title and version
- risk band
- step count
- last-run metadata
- success velocity mini-chart
- tags
- quick actions

#### `ScenarioLibraryFilterBar`

Purpose:

- filter Library items by feature area, risk profile, and author

#### `CredentialVaultCard`

Purpose:

- render settings-side credential entries with status and actions

States:

- active
- revoked
- rotated recently

#### `EnvironmentCard`

Purpose:

- render managed environment nodes in Settings

Contents:

- environment name
- health state
- endpoint
- latency and uptime
- actions such as connect, edit, disable

---

## Screen Implementation Plan

### Screen 1: Draft Mission Brief

Design source:

- `QA_Command_Center_Draft.html`

Current implementation anchor:

- `components/qa/draft-workflow-view.tsx`

Key changes required:

- replace current lightweight workflow bar layout with shell-based page header and left rail navigation
- reorganize the form into numbered archival sections
- formalize grouped form sections:
  - Environment & Target
  - Execution Parameters
  - Mission Brief / Step Definition
  - Scenario Source / Library Controls
  - Parse Preview
  - Scenario Coverage Matrix
- preserve existing actions:
  - Parse Steps
  - Generate Scenarios
  - Create Run
  - Save As Library
  - Update Library
- add stronger visual explanation for disabled actions and risky combinations

Component dependencies:

- `AppShell`
- `PageHeader`
- `SectionFrame`
- `ActionBar`
- `WarningPanel`
- `StatusBadge`

Data mapping notes:

- keep `RunPlan` as the source of truth
- keep parse/scenario preview APIs unchanged initially
- bind existing warning logic from `buildRunPlanWarnings`

Acceptance criteria:

- all current Draft behaviors remain functional
- current library actions remain available and understandable
- numbered sections match the design hierarchy
- operator warnings are more prominent than in the current UI

### Screen 2: Monitor

Design source:

- `QA_Command_Center_Monitor.html`

Current implementation anchor:

- `components/qa/monitor-workflow-view.tsx`
- `components/qa/run-workspace.tsx`

Key changes required:

- introduce shell-based Monitor route or screen wrapper
- add top summary metrics row
- redesign run list into denser operational stream cards
- enhance selected-run detail area to feel like a mission-control workspace
- restyle live event console with mono detail treatment
- surface active uplink / live-run status more clearly
- maintain cancel action and current activity visibility

Component dependencies:

- `MetricCard`
- `RunListPanel`
- `RunDetailHeader`
- `LiveConsolePanel`
- `WarningPanel`

Data mapping notes:

- current polling and queue model remain valid
- current `runEvents` and `runWarnings` payloads are sufficient for first pass
- percent-complete display may need a derived progress heuristic because the current app does not expose a universal completion percentage for all run types

Acceptance criteria:

- active runs remain selectable without state bounce
- current events and warnings remain visible
- active versus queued versus terminal runs are visually distinct
- Monitor is denser and more legible than the current implementation

### Screen 3: Review

Design source:

- `QA_Command_Center_Review.html`

Current implementation anchor:

- `components/qa/review-workflow-view.tsx`
- `components/qa/artifact-review.tsx`

Key changes required:

- add large summary header with run metadata and primary actions
- formalize run-to-run comparison as a first-class bento section
- preserve and visually elevate:
  - step timeline
  - grouped artifacts
  - defect candidates
  - scenario library alignment
  - QA analysis evidence tags
- reorganize layout into asymmetric evidence-review composition similar to the design

Component dependencies:

- `PageHeader`
- `ComparisonBento`
- `EvidenceTimeline`
- `ArtifactGroupSection`
- `EvidenceTagList`
- `ActionBar`

Data mapping notes:

- current review data already supports most of this screen
- additional derived summaries may be useful for duration, artifact totals, and comparison deltas
- the current grouped artifact work can be reused rather than replaced

Acceptance criteria:

- Review remains fully evidence-driven
- `Save Run As Library` and `Update Linked Library` stay accessible
- comparison deltas are visible without scanning long text blocks
- timeline and artifact relationships remain clear

### Screen 4: Scenario Library Management

Design source:

- `Scenario_Library_Management.html`

Current implementation anchor:

- partially present today through library controls in Draft and Review
- no dedicated route currently exists

New screen scope:

- dedicated route for browsing, filtering, comparing, and triggering scenario libraries

Required capabilities:

- library list/grid view
- filter bar
- quick actions:
  - run library
  - inspect history
  - rename
  - archive
  - duplicate
- visible version/history metadata
- success trend or lightweight health indicator
- tags for feature area or risk focus

Recommended first-pass implementation:

- create a read-heavy library management screen first
- defer in-place editing until after browsing, selection, and rerun actions work

Component dependencies:

- `ScenarioLibraryFilterBar`
- `ScenarioLibraryCard`
- `MetricCard`
- `ActionBar`

Data/API notes:

- current `/api/scenario-libraries` is enough to power a first listing screen
- likely additional API work later:
  - archive action
  - rename action
  - duplicate action
  - version-history detail endpoint

Acceptance criteria:

- operator can browse all saved libraries on a dedicated screen
- operator can identify version, scenario count, source run, and last updated time quickly
- screen clearly separates browsing from mutation actions

### Screen 5: System Configuration / Settings

Design source:

- `System_Configuration_Settings.html`

Current implementation anchor:

- no dedicated settings route currently exists

New screen scope:

- operational configuration workspace for credentials and environments

Recommended initial scope:

- credentials overview only as a UI shell with local-safe placeholders
- environments overview derived from known app config patterns
- no actual secure vault promise beyond current local architecture

Important constraint:

- the current product is local-file based and does not have enterprise secret infrastructure
- the design should not imply capabilities the backend does not support yet

Recommended first-pass behavior:

- display credential references and environment metadata in a controlled, non-destructive management UI
- gate destructive actions behind placeholder or disabled affordances until supported by backend logic

Component dependencies:

- `CredentialVaultCard`
- `EnvironmentCard`
- `SectionFrame`
- `ActionBar`

Acceptance criteria:

- Settings route exists and fits the shared shell
- capabilities shown on screen accurately match current backend constraints
- credential handling language remains explicit about local-only storage limitations

---

## Delivery Strategy

### Phase 1: Shared UI Foundation

Purpose:

- establish the shell and token system once so later screens reuse it

Tasks:

- define design tokens in `app/globals.css`
- add font loading in app layout
- build `AppShell`, `SideNav`, `TopBar`, `PageHeader`, `SectionFrame`, `StatusBadge`, `MetricCard`, `ActionBar`
- create icon mapping strategy
- add responsive behavior for shell and stacked layouts

Output:

- no feature changes yet, but all future screens can render in the new design language

### Phase 2: Reskin Existing Core Screens

Purpose:

- apply the new design to the already-working Draft, Monitor, and Review experiences

Tasks:

- migrate Draft to sectioned mission brief layout
- migrate Monitor to operational stream layout
- migrate Review to editorial evidence workspace layout
- preserve all current run behaviors and API contracts

Output:

- the current app feels aligned with the design exports without adding net-new product surface yet

### Phase 3: Add Library Route

Purpose:

- introduce the first net-new screen that expands today’s functionality in an operator-friendly way

Tasks:

- create `/library`
- build filter bar and scenario cards
- wire existing scenario-library list data
- add read-first actions and rerun entry points

Output:

- scenario libraries become a first-class workspace rather than only a dropdown/source relation

### Phase 4: Add Settings Route

Purpose:

- complete the shell IA and provide a home for operational configuration

Tasks:

- create `/settings`
- build credentials and environments sections
- use constraint-aware copy for unsupported backend actions
- define which controls are real versus placeholder

Output:

- information architecture matches the design system and future operational features have a clear home

### Phase 5: Detail Pages and Advanced Interactions

Purpose:

- deepen the system after the main screens exist

Candidates:

- dedicated library detail page
- dedicated run review page by ID
- version history drill-down
- archives screen
- richer comparison diff view
- topology view for environments

---

## File and Folder Plan

### New shared UI folders

Recommended additions:

- `components/layout/`
- `components/ui/`
- `components/library/`
- `components/settings/`

### Suggested component file map

- `components/layout/app-shell.tsx`
- `components/layout/side-nav.tsx`
- `components/layout/top-bar.tsx`
- `components/ui/page-header.tsx`
- `components/ui/section-frame.tsx`
- `components/ui/status-badge.tsx`
- `components/ui/metric-card.tsx`
- `components/ui/action-bar.tsx`
- `components/ui/filter-bar.tsx`
- `components/qa/run-list-panel.tsx`
- `components/qa/live-console-panel.tsx`
- `components/qa/evidence-timeline.tsx`
- `components/qa/comparison-bento.tsx`
- `components/library/scenario-library-card.tsx`
- `components/library/scenario-library-filter-bar.tsx`
- `components/settings/credential-vault-card.tsx`
- `components/settings/environment-card.tsx`

### Suggested route/file map

- `app/page.tsx` or `app/draft/page.tsx`
- `app/monitor/page.tsx`
- `app/review/page.tsx`
- `app/library/page.tsx`
- `app/settings/page.tsx`

### Refactor targets

Existing files likely to shrink or be restructured:

- `components/qa-command-center.tsx`
- `components/qa/draft-workflow-view.tsx`
- `components/qa/monitor-workflow-view.tsx`
- `components/qa/review-workflow-view.tsx`
- `components/qa/run-workspace.tsx`

---

## Data and State Strategy

The new screens should not force a runtime rewrite.

### State recommendation

Short term:

- keep `QaCommandCenter` as the orchestration owner for Draft, Monitor, and Review data
- pass normalized view models into redesigned presentational components

Medium term:

- extract screen-specific container hooks such as:
  - `useRunListState`
  - `useSelectedRunState`
  - `useScenarioLibraryState`
  - `useRunReviewState`

### View model recommendation

Introduce derived view-model helpers rather than mixing formatting logic into JSX.

Examples:

- `buildMonitorSummaryMetrics(runs)`
- `buildRunListItems(runs)`
- `buildReviewComparisonSummary(selectedRun, previousRun)`
- `buildScenarioLibraryCards(libraries)`
- `buildEnvironmentCards(config)`

This keeps the redesign maintainable and avoids another monolithic screen component.

---

## Implementation Risks

### Risk 1: UI rewrite disrupts working flows

Mitigation:

- keep API contracts stable
- change layout and composition before changing behavior
- preserve existing handlers during first-pass reskin

### Risk 2: Design files imply unsupported backend capabilities

Mitigation:

- mark placeholder or future actions clearly
- keep settings language honest about local-only storage
- do not ship fake secret-vault semantics

### Risk 3: Shared shell becomes over-coupled to current screens

Mitigation:

- separate shell, primitives, and domain widgets
- keep screen containers thin

### Risk 4: Tailwind-export markup creates duplication

Mitigation:

- treat exported HTML as reference only
- rebuild from React components and tokens

### Risk 5: Route migration breaks current selection/polling behavior

Mitigation:

- migrate Draft, Monitor, and Review progressively
- keep selected run and polling logic centralized until route-specific containers are ready

---

## Open Questions Before Implementation

1. Should Draft, Monitor, and Review remain one orchestrated page under the hood during the first redesign phase, or should they move to separate routes immediately?
2. Should Library support edit-in-place in phase one, or stay browse-first and action-light?
3. How much of Settings should be functional versus informational given the current local-file architecture?
4. Should Archives be included in the first IA rollout even though no dedicated design export was provided beyond shell references?
5. Should Monitor expose a computed progress percentage for every run type, or only where deterministic progress is available?

---

## Recommended First Implementation Slice

The best first slice is:

1. shared shell and tokens
2. Draft reskin
3. Monitor reskin
4. Review reskin

Reason:

- these screens already exist and already work
- they let the design system prove itself against real application behavior
- they reduce risk before adding the new Library and Settings screens

After that, the next slice should be:

1. dedicated Library route
2. settings route shell
3. settings subpanels for credentials and environments

---

## Definition Of Done For The Redesign Plan

This implementation effort should be considered complete when:

- the app uses a shared shell across Draft, Monitor, Review, Library, and Settings
- visual language matches the exported designs without raw HTML duplication
- current runtime behaviors remain intact
- scenario libraries have a dedicated management screen
- settings have a dedicated operational home aligned with backend reality
- reusable components exist for all repeated patterns introduced by the designs
- future screens can be added without rebuilding the shell or primitive components again
