# QA Agent Benchmark Wave 002 B2 Result Sheet

## Benchmark Wave Metadata

| Field | Value |
| --- | --- |
| Benchmark Wave ID | `wave-002-tier-b-b2` |
| Date Range | `2026-04-01` |
| Product Revision | current local repository state after the state-transition fixture and benchmark-hardening updates |
| Store Backend | `SQLITE` |
| Environment Type | `local-benchmark-fixture` |
| Operator | GitHub Copilot |
| Goal | establish evidence for the multi-step state-transition Tier B archetype using a deterministic local fixture |

---

## Case Rollup Table

| Case ID | Archetype ID | Archetype Name | Target | Run Mode | Expected Status | Final Verdict | Evidence Complete | Release Gate Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B2-001 | B2 | Multi-step state transition workflow | State Transition Fixture | execute-steps | Partial | Partial | yes | contributes a second strong Tier B Partial, but Gate 1 still remains unsatisfied | accepted run covered review, approval handoff, scheduled state, and reset; earlier invalid attempts were excluded from verdict counting |

---

## Rollup Summary

| Category | Count |
| --- | --- |
| Supported | 0 |
| Partial | 1 |
| Unsupported | 0 |
| Invalid | 0 |
| Not Executed | 0 |

| Tier | Supported | Partial | Unsupported | Invalid | Not Executed |
| --- | --- | --- | --- | --- | --- |
| Tier B | 0 | 1 | 0 | 0 | 0 |

---

## Product Gap Summary

| Gap Family | Affected Cases | Priority | Notes |
| --- | --- | --- | --- |
| Step-parser label sensitivity | B2-001 | high | approval-style control wording was normalized to navigation until the fixture label was changed to parser-stable phrasing |
| Benchmark-fixture hardening | B2-001 | medium | the first fixture draft exposed future stage labels too early, so unreached-state visibility had to be tightened before verdict counting |
| Remaining Tier B coverage | B3-001, B4-001, B5-001 | high | Gate 1 still depends on broader fixture coverage and executed cases |

---

## Release Gate Evaluation Delta

### Gate 1

| Check | Status | Evidence |
| --- | --- | --- |
| At least three Tier B archetypes are Supported or strong Partial | fail | B1 and B2 now provide two Tier B Partial results, which is still below the threshold of three |
| Tier B evidence now covers dense-table and multi-step progression patterns | pass | B1 covers row-action flow on a dense table and B2 covers sequential visible state changes with reset |
| No verdict counted from invalid benchmark setup | pass | the false-positive fixture draft and parser-mismatch attempt were both excluded from the final verdict |

### Gate 2

| Check | Status | Evidence |
| --- | --- | --- |
| Most Tier B archetypes are Supported | fail | only two Tier B archetypes have evidence so far, and both remain Partial |

---

## Decision Memo

### Current Allowed Claim

The product remains correctly described as a local QA-agent MVP for conventional web applications with standard login, visible navigation, and lightweight deterministic checks.

### Decision

Keep the current claim unchanged.

### Why

Wave 002 now adds evidence for two Tier B archetypes, but both remain Partial and there is still not enough Tier B breadth to satisfy Gate 1.

---

## Documentation Follow-Up

- [x] README remains unchanged because no release gate was satisfied
- [x] Operator guide remains unchanged because no broader claim is yet supported
- [x] Compatibility matrix remains unchanged pending more Tier B evidence
- [x] Readiness roadmap priority remains focused on parser robustness and additional Tier B fixtures

---

## Sign-Off

| Role | Name | Date |
| --- | --- | --- |
| Benchmark owner | GitHub Copilot | 2026-04-01 |
| Reviewer | pending | pending |
| Product claim approver | pending | pending |
