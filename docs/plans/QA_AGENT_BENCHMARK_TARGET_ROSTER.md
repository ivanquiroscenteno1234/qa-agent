# QA Agent Benchmark Target Roster

## Purpose

This document freezes the initial benchmark archetype inventory and assigns at least one candidate target or fixture to every archetype in the benchmark plan.

The roster intentionally prefers local or controlled targets.

---

## Archetype Inventory

### Tier A

| ID | Archetype Name | Why It Is In Scope |
| --- | --- | --- |
| A1 | Standard admin dashboard | Core current-fit claim |
| A2 | Conventional CRUD form workflow | Core current-fit claim |
| A3 | Protected-route application with simple username and password login | Core auth-fit claim |
| A4 | Mixed navigation and editable settings workflow | Core navigation and editability claim |
| A5 | Bilingual or mixed-language UI with visible labels | Current known real-world target pattern |

### Tier B

| ID | Archetype Name | Why It Is In Scope |
| --- | --- | --- |
| B1 | Table-heavy enterprise UI with filters and row actions | Common business-software pattern |
| B2 | Multi-step state transition workflow | Common business-process pattern |
| B3 | Role and permission boundary workflow | Important correctness and security-adjacent pattern |
| B4 | Application with modal-heavy interaction | Common UI pattern not yet strongly covered |
| B5 | Application with weak accessibility metadata but visible text labels | Realistic locator-stress pattern |

### Tier C

| ID | Archetype Name | Why It Is In Scope |
| --- | --- | --- |
| C1 | iframe-heavy application | Explicit current limitation |
| C2 | SSO or MFA-gated application | Explicit current limitation |
| C3 | Upload and download workflow | Explicit current limitation |
| C4 | Drag-and-drop workflow | Explicit current limitation |
| C5 | Canvas-heavy or highly custom widget UI | Explicit current limitation |

The archetype list above is now the frozen starting set for the first benchmark wave.

---

## Existing Targets

### Existing Local Target: QA Agent App

| Field | Value |
| --- | --- |
| Target Name | QA Agent App |
| Target Type | existing-local |
| Primary Use | A1, A2 |
| Access Pattern | local application routes under `/draft`, `/monitor`, `/review`, `/library`, `/settings` |
| Credential Source | none required for current route access |
| Statefulness | medium |
| Reset Strategy | run against a clean benchmark store snapshot; until a dedicated benchmark reset flow exists, use a fresh local store or a restored benchmark snapshot before execution |
| Environment Notes | use the same local backend and app mode for all runs in the same benchmark wave |
| Constraints | not suitable for auth archetypes because it has no app-level login boundary |

### Existing Controlled External Target: Restaurant Partner Staging

| Field | Value |
| --- | --- |
| Target Name | Restaurant Partner Staging |
| Target Type | existing-controlled-external |
| Primary Use | A3, A5 |
| Access Pattern | controlled staging target already used in repo manual QA |
| Credential Source | use the controlled benchmark credential source already documented in [docs/plans/QA_AGENT_FULL_MANUAL_TEST_PLAN.md](docs/plans/QA_AGENT_FULL_MANUAL_TEST_PLAN.md) |
| Statefulness | high |
| Reset Strategy | verify availability and credential validity before each wave; treat data drift or target instability as potential Invalid benchmark causes |
| Environment Notes | use only for cases where current local targets cannot represent the archetype |
| Constraints | external uptime, external data drift, and account validity can compromise repeatability |

---

## Implemented Local Benchmark Fixtures

### Settings Workflow Fixture

| Field | Value |
| --- | --- |
| Fixture Name | Settings Workflow Fixture |
| Fixture ID | benchmark-settings-workflow-fixture |
| Route | local application route `/benchmark/settings-workflow` |
| Primary Use | A4 |
| Access Pattern | direct route access, no login required |
| Credential Source | none |
| Statefulness | medium |
| Reset Strategy | use the on-page `Reset settings workspace` control before each benchmark case |
| Environment Notes | designed to replace the weaker production settings route as the representative A4 target with deterministic section navigation and editability checks |
| Constraints | synthetic local fixture; useful for benchmark representativeness, not for production-realism claims |

### Enterprise Grid Fixture

| Field | Value |
| --- | --- |
| Fixture Name | Enterprise Grid Fixture |
| Fixture ID | benchmark-enterprise-grid-fixture |
| Route | local application route `/benchmark/enterprise-grid` |
| Primary Use | B1 |
| Access Pattern | direct route access, no login required |
| Credential Source | none |
| Statefulness | medium |
| Reset Strategy | use the on-page `Reset dataset` control before each benchmark case |
| Environment Notes | designed to stay local, deterministic, and isolated from the main QA-agent workflows |
| Constraints | synthetic data model; good for repeatable Tier B benchmarking, not for product realism claims |

### State Transition Fixture

| Field | Value |
| --- | --- |
| Fixture Name | State Transition Fixture |
| Fixture ID | benchmark-state-transition-fixture |
| Route | local application route `/benchmark/state-transition` |
| Primary Use | B2 |
| Access Pattern | direct route access, no login required |
| Credential Source | none |
| Statefulness | medium |
| Reset Strategy | use the on-page `Reset workflow` control before each benchmark case |
| Environment Notes | designed to keep workflow phases, ownership handoffs, and reset behavior deterministic for benchmark runs |
| Constraints | synthetic data model; good for repeatable Tier B benchmarking, not for product realism claims |

### Modal Workflow Fixture

| Field | Value |
| --- | --- |
| Fixture Name | Modal Workflow Fixture |
| Fixture ID | benchmark-modal-workflow-fixture |
| Route | local application route `/benchmark/modal-workflow` |
| Primary Use | B4 |
| Access Pattern | direct route access, no login required |
| Credential Source | none |
| Statefulness | medium |
| Reset Strategy | use the on-page `Reset decision board` control before each benchmark case |
| Environment Notes | designed to keep modal visibility, confirm and dismiss actions, and post-modal status changes deterministic for benchmark runs |
| Constraints | synthetic data model; good for repeatable Tier B benchmarking, not for product realism claims |

---

## Planned Local Benchmark Fixtures

These fixtures remain selected as benchmark candidates, but they are not yet implemented.

| Fixture ID | Purpose | Planned Statefulness | Planned Reset Strategy |
| --- | --- | --- | --- |
| benchmark-auth-fixture | simple username and password login with protected route | medium | restore seeded auth fixture state before each wave |
| benchmark-permission-boundary-fixture | role and permission boundary behavior | medium | reseed role assignments and baseline data before each wave |
| benchmark-weak-a11y-fixture | visible labels with intentionally weak accessibility metadata | low | restore fixture build to baseline |
| benchmark-iframe-fixture | iframe-targeted interaction flow | low | restore fixture build to baseline |
| benchmark-sso-mfa-fixture | auth pattern beyond standard login | medium | restore auth fixture state before each wave |
| benchmark-upload-download-fixture | upload and download interactions | medium | clear uploaded files and generated downloads before each wave |
| benchmark-drag-drop-fixture | drag-and-drop interaction model | low | restore fixture build to baseline |
| benchmark-canvas-fixture | canvas-heavy or custom widget interaction | low | restore fixture build to baseline |

For planned stateful fixtures, the common benchmark seed credential should be:

- Username: `benchmark.user@example.test`
- Password: `Benchmark123!`

This is a fixture-design default for future local fixtures, not a current production or staging credential.

---

## Archetype-To-Target Mapping

| Archetype ID | Archetype Name | Primary Candidate | Candidate Type | Availability | Credential Source | Reset Strategy | Constraints |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Standard admin dashboard | QA Agent App | existing-local | ready now | none | clean benchmark store snapshot | local state drift if benchmark data is not reset |
| A2 | Conventional CRUD form workflow | QA Agent App | existing-local | ready now | none | clean benchmark store snapshot | current app stores benchmark-created records unless reset |
| A3 | Protected-route application with simple username and password login | Restaurant Partner Staging | existing-controlled-external | ready now | controlled benchmark credential from manual test plan | verify account and target reachability before run | external availability and data drift |
| A4 | Mixed navigation and editable settings workflow | Settings Workflow Fixture | local-benchmark-fixture | ready now | none | use the on-page `Reset settings workspace` control | synthetic local fixture replaces the weaker production settings route for stronger A4 representativeness |
| A5 | Bilingual or mixed-language UI with visible labels | Restaurant Partner Staging | existing-controlled-external | ready now | controlled benchmark credential from manual test plan | verify account and target reachability before run | external availability and data drift |
| B1 | Table-heavy enterprise UI with filters and row actions | Enterprise Grid Fixture | local-benchmark-fixture | ready now | none | use the on-page `Reset dataset` control | synthetic local fixture, so results should be interpreted as Tier B benchmark evidence rather than product realism |
| B2 | Multi-step state transition workflow | State Transition Fixture | local-benchmark-fixture | ready now | none | use the on-page `Reset workflow` control | synthetic local fixture, so results should be interpreted as Tier B benchmark evidence rather than product realism |
| B3 | Role and permission boundary workflow | benchmark-permission-boundary-fixture | planned-local-fixture | fixture required | benchmark fixture seed credential | reseed roles and baseline data | not yet implemented |
| B4 | Application with modal-heavy interaction | Modal Workflow Fixture | local-benchmark-fixture | ready now | none | use the on-page `Reset decision board` control | synthetic local fixture, so results should be interpreted as Tier B benchmark evidence rather than product realism |
| B5 | Application with weak accessibility metadata but visible text labels | benchmark-weak-a11y-fixture | planned-local-fixture | fixture required | none unless auth is added | restore fixture build to baseline | not yet implemented |
| C1 | iframe-heavy application | benchmark-iframe-fixture | planned-local-fixture | fixture required | none unless auth is added | restore fixture build to baseline | expected Unsupported in current runtime |
| C2 | SSO or MFA-gated application | benchmark-sso-mfa-fixture | planned-local-fixture | fixture required | benchmark fixture seed credential plus simulated second-factor path | restore auth fixture state | expected Unsupported in current runtime |
| C3 | Upload and download workflow | benchmark-upload-download-fixture | planned-local-fixture | fixture required | none unless auth is added | clear uploaded and downloaded artifacts | expected Unsupported in current runtime |
| C4 | Drag-and-drop workflow | benchmark-drag-drop-fixture | planned-local-fixture | fixture required | none unless auth is added | restore fixture build to baseline | expected Unsupported in current runtime |
| C5 | Canvas-heavy or highly custom widget UI | benchmark-canvas-fixture | planned-local-fixture | fixture required | none unless auth is added | restore fixture build to baseline | expected Unsupported in current runtime |

---

## Selection Notes

### Why Existing Targets Are Mixed

The current repo has one strong existing local benchmark candidate and one controlled external candidate already used in prior manual QA.

That is enough to begin a baseline benchmark wave for current-fit claims, but not enough to exercise the full archetype set without dedicated fixtures.

### Why Planned Fixtures Are Included Now

The plan requires at least one candidate target or fixture for every archetype.

For several Tier B and Tier C archetypes, the honest choice is to lock the candidate fixture now rather than pretend the current repo already has a suitable stable target.

### How To Treat Planned Fixtures In The First Wave

Cases tied to planned fixtures should remain in the roster and backlog, but only existing-ready targets should be used for a benchmark wave unless those fixtures are built first.