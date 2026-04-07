# QA Agent Benchmark Wave 001 Result Sheet

## Benchmark Wave Metadata

| Field | Value |
| --- | --- |
| Benchmark Wave ID | `wave-001-baseline` |
| Date Range | `2026-03-31` |
| Product Revision | current local repository state on benchmark day |
| Store Backend | `SQLITE` |
| Environment Type | mixed: `existing-local` and `existing-controlled-external` |
| Operator | GitHub Copilot |
| Goal | establish the first benchmark-backed compatibility baseline for the ready-now Tier A archetypes |

---

## Case Rollup Table

| Case ID | Archetype ID | Archetype Name | Target | Run Mode | Expected Status | Final Verdict | Evidence Complete | Release Gate Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1-001 | A1 | Standard admin dashboard | QA Agent App local root | exploratory-session | Supported | Supported | yes | Gate 0 support | repeated pass on local admin-style shell |
| A2-001 | A2 | Conventional CRUD form workflow | QA Agent App draft form | execute-steps | Supported | Supported | yes | Gate 0 support | visible/editable field validation passed |
| A3-001 | A3 | Protected-route login workflow | Restaurant Partner Staging | exploratory-session | Supported | Supported | yes | Gate 0 support | repeated authenticated pass on controlled external target |
| A4-001 | A4 | Mixed navigation and editable settings workflow | QA Agent App settings route | execute-steps | Partial | Partial | yes | blocks Gate 1 | target is a weak proxy for a stronger settings-management archetype |
| A5-001 | A5 | Bilingual or mixed-language UI with visible labels | Restaurant Partner Staging | exploratory-session | Supported | Supported | yes | Gate 0 support | mixed-language handling worked and surfaced meaningful insight |
| B1-001 | B1 | Table-heavy enterprise UI with filters and row actions | benchmark-enterprise-grid-fixture | pending | Partial | not executed | no | none yet | local benchmark fixture not yet implemented |
| B2-001 | B2 | Multi-step state transition workflow | benchmark-state-transition-fixture | pending | Partial | not executed | no | none yet | local benchmark fixture not yet implemented |
| B3-001 | B3 | Role and permission boundary workflow | benchmark-permission-boundary-fixture | pending | Partial | not executed | no | none yet | local benchmark fixture not yet implemented |
| B4-001 | B4 | Modal-heavy interaction workflow | benchmark-modal-workflow-fixture | pending | Partial | not executed | no | none yet | local benchmark fixture not yet implemented |
| B5-001 | B5 | Weak accessibility metadata but visible labels | benchmark-weak-a11y-fixture | pending | Partial | not executed | no | none yet | local benchmark fixture not yet implemented |
| C1-001 | C1 | iframe-heavy application | benchmark-iframe-fixture | pending | Unsupported | not executed | no | none yet | planned unsupported fixture not yet implemented |
| C2-001 | C2 | SSO or MFA-gated application | benchmark-sso-mfa-fixture | pending | Unsupported | not executed | no | none yet | planned unsupported fixture not yet implemented |
| C3-001 | C3 | Upload and download workflow | benchmark-upload-download-fixture | pending | Unsupported | not executed | no | none yet | planned unsupported fixture not yet implemented |
| C4-001 | C4 | Drag-and-drop workflow | benchmark-drag-drop-fixture | pending | Unsupported | not executed | no | none yet | planned unsupported fixture not yet implemented |
| C5-001 | C5 | Canvas-heavy or highly custom widget UI | benchmark-canvas-fixture | pending | Unsupported | not executed | no | none yet | planned unsupported fixture not yet implemented |

---

## Rollup Summary

| Category | Count |
| --- | --- |
| Supported | 4 |
| Partial | 1 |
| Unsupported | 0 |
| Invalid | 0 |
| Not Executed | 10 |

| Tier | Supported | Partial | Unsupported | Invalid | Not Executed |
| --- | --- | --- | --- | --- | --- |
| Tier A | 4 | 1 | 0 | 0 | 0 |
| Tier B | 0 | 0 | 0 | 0 | 5 |
| Tier C | 0 | 0 | 0 | 0 | 5 |

---

## Product Gap Summary

| Gap Family | Affected Cases | Priority | Notes |
| --- | --- | --- | --- |
| Benchmark target representativeness | A4-001 | high | a stronger settings-management target is needed before treating A4 as broadly supported |
| Evidence depth and repeatability | A2-001, A4-001 | medium | these cases would benefit from a second clean pass in a future wave |
| Tier B benchmark coverage | B1-001, B2-001, B3-001, B4-001, B5-001 | high | planned fixtures must exist before broader claim evaluation |
| Tier C benchmark coverage | C1-001, C2-001, C3-001, C4-001, C5-001 | high | planned fixtures must exist before unsupported boundaries can be benchmark-confirmed |

---

## Release Gate Evaluation

### Gate 0

| Check | Status | Evidence |
| --- | --- | --- |
| Current baseline claim remains accurate | pass | Tier A performed strongly and the current product claim remains conservative |

### Gate 1

| Check | Status | Evidence |
| --- | --- | --- |
| All Tier A archetypes are Supported | fail | A4-001 remains Partial |
| At least three Tier B archetypes are Supported or strong Partial | fail | no Tier B archetypes executed in wave 001 |
| No Tier A case produced unexplained false passes | pass | baseline report records evidence and caveats for each executed case |
| Review evidence explains all blocked outcomes | pass | no blocked outcomes in the executed Tier A set; evidence was retained for all cases |
| README, operator guide, and compatibility matrix are ready for coordinated update | hold | no broader claim is justified yet |

### Gate 2

| Check | Status | Evidence |
| --- | --- | --- |
| All Tier A archetypes are Supported | fail | A4-001 remains Partial |
| Most Tier B archetypes are Supported | fail | no Tier B archetypes executed |
| Tier C statuses remain evidence-backed | fail | Tier C fixtures are not yet implemented |
| Core roadmap gaps required for broader claim are implemented and validated | fail | current roadmap gaps remain open |
| Benchmark was rerun after those runtime changes | fail | this is the first baseline wave |

---

## Decision Memo

### Current Allowed Claim

The product remains correctly described as a local QA-agent MVP for conventional web applications with standard login, visible navigation, and lightweight deterministic checks.

### Decision

Keep the current claim unchanged.

### Why

Wave 001 materially strengthens confidence in the current positioning, but it does not satisfy Gate 1 because Tier B coverage is still absent and A4-001 remains Partial due to target representativeness.

---

## Documentation Follow-Up

- [x] README reviewed against benchmark evidence
- [x] Operator guide reviewed against benchmark evidence
- [x] Compatibility matrix reviewed against benchmark evidence
- [x] Readiness roadmap reprioritized if needed

No documentation broadening is required after this wave.

---

## Sign-Off

| Role | Name | Date |
| --- | --- | --- |
| Benchmark owner | GitHub Copilot | 2026-03-31 |
| Reviewer | pending | pending |
| Product claim approver | pending | pending |