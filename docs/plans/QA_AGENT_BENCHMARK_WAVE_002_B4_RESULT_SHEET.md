# QA Agent Benchmark Wave 002 B4 Result Sheet

## Benchmark Wave Metadata

| Field | Value |
| --- | --- |
| Benchmark Wave ID | `wave-002-tier-b-b4` |
| Date Range | `2026-04-01` |
| Product Revision | current local repository state after the modal-workflow fixture hardening updates |
| Store Backend | `SQLITE` |
| Environment Type | `local-benchmark-fixture` |
| Operator | GitHub Copilot |
| Goal | establish evidence for the modal-heavy Tier B archetype using a deterministic local fixture |

---

## Case Rollup Table

| Case ID | Archetype ID | Archetype Name | Target | Run Mode | Expected Status | Final Verdict | Evidence Complete | Release Gate Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B4-001 | B4 | Application with modal-heavy interaction | Modal Workflow Fixture | execute-steps | Supported | Supported | yes | completes the minimum Tier B breadth needed for the Gate 1 strong-coverage subcheck | accepted run covered modal launch, dismiss, confirm, post-confirm status, and reset; earlier setup-correction runs were excluded |

---

## Rollup Summary

| Category | Count |
| --- | --- |
| Supported | 1 |
| Partial | 0 |
| Unsupported | 0 |
| Invalid | 0 |
| Not Executed | 0 |

| Tier | Supported | Partial | Unsupported | Invalid | Not Executed |
| --- | --- | --- | --- | --- | --- |
| Tier B | 1 | 0 | 0 | 0 | 0 |

---

## Product Gap Summary

| Gap Family | Affected Cases | Priority | Notes |
| --- | --- | --- | --- |
| Final control-label hardening | B4-001 | medium | the accepted run depended on making modal controls unique enough for repeatable parser-driven automation |
| Remaining Tier B coverage | B3-001, B5-001 | high | Tier B breadth is improved, but the full Tier B execution checklist still depends on more archetypes |
| Remaining Gate 1 blocker outside Tier B | A4-001 | high | Tier A still blocks the full Gate 1 decision even though Tier B breadth is now stronger |

---

## Release Gate Evaluation Delta

### Gate 1

| Check | Status | Evidence |
| --- | --- | --- |
| At least three Tier B archetypes are Supported or strong Partial | pass | B1 is a strong Partial, B2 is a strong Partial, and B4 is now Supported |
| Tier B evidence covers more than one interaction pattern | pass | current evidence spans dense-table row actions, multi-step state transitions, and modal-heavy workflows |
| All Tier A archetypes are Supported | fail | A4-001 remains Partial |

### Gate 2

| Check | Status | Evidence |
| --- | --- | --- |
| Most Tier B archetypes are Supported | fail | only three of five Tier B archetypes have evidence so far, and only one is currently Supported |

---

## Decision Memo

### Current Allowed Claim

The product remains correctly described as a local QA-agent MVP for conventional web applications with standard login, visible navigation, and lightweight deterministic checks.

### Decision

Keep the current claim unchanged.

### Why

Wave 002 now satisfies the Tier B breadth subcheck for Gate 1, but the overall Gate 1 decision still cannot pass because A4 remains Partial and broader benchmark coverage is still incomplete.

---

## Documentation Follow-Up

- [x] README remains unchanged because the overall release gate was not satisfied
- [x] Operator guide remains unchanged because no broader claim is yet supported
- [x] Compatibility matrix remains unchanged pending a stronger A4 result and more Tier B/Tier C coverage
- [x] Readiness roadmap priority now shifts slightly toward A4 representativeness and remaining Tier B fixtures

---

## Sign-Off

| Role | Name | Date |
| --- | --- | --- |
| Benchmark owner | GitHub Copilot | 2026-04-01 |
| Reviewer | pending | pending |
| Product claim approver | pending | pending |
