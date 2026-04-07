# QA Agent Benchmark Wave 002 B1 Result Sheet

## Benchmark Wave Metadata

| Field | Value |
| --- | --- |
| Benchmark Wave ID | `wave-002-tier-b-b1` |
| Date Range | `2026-04-01` |
| Product Revision | current local repository state after the enterprise-grid fixture was added |
| Store Backend | `SQLITE` |
| Environment Type | `local-benchmark-fixture` |
| Operator | GitHub Copilot |
| Goal | establish the first evidence-backed Tier B result using the local enterprise-grid benchmark fixture |

---

## Case Rollup Table

| Case ID | Archetype ID | Archetype Name | Target | Run Mode | Expected Status | Final Verdict | Evidence Complete | Release Gate Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1-001 | B1 | Table-heavy enterprise UI with filters and row actions | Enterprise Grid Fixture | execute-steps | Partial | Partial | yes | contributes one strong Tier B Partial, but does not satisfy Gate 1 alone | row action and deterministic reset passed; filter controls were not directly exercised |

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
| Filter and search control execution | B1-001 | high | the current executor can click visible labels and buttons, but it does not yet drive search or select-style filter controls as first-class actions |
| Evidence depth and repeatability | B1-001 | medium | one clean pass exists, but repeated confirmation is still desirable after filter support lands |
| Remaining Tier B coverage | B2-001, B3-001, B4-001, B5-001 | high | broader Gate 1 evaluation still depends on additional fixtures and executed cases |

---

## Release Gate Evaluation Delta

### Gate 1

| Check | Status | Evidence |
| --- | --- | --- |
| At least three Tier B archetypes are Supported or strong Partial | fail | wave 002 adds one strong Partial for B1, but only one Tier B archetype has been executed so far |
| Tier B evidence is now more representative than wave 001 | pass | B1 now has retained run evidence against a purpose-built local fixture |

### Gate 2

| Check | Status | Evidence |
| --- | --- | --- |
| Most Tier B archetypes are Supported | fail | only B1 has benchmark evidence and it remains Partial |

---

## Decision Memo

### Current Allowed Claim

The product remains correctly described as a local QA-agent MVP for conventional web applications with standard login, visible navigation, and lightweight deterministic checks.

### Decision

Keep the current claim unchanged.

### Why

Wave 002 improves Tier B evidence by showing that the runtime can interact with a dense table and row action in a purpose-built fixture. The result still remains Partial because filter-driving is not yet benchmarked, and one Tier B Partial is not enough to change the release-gate decision.

---

## Documentation Follow-Up

- [x] README remains unchanged because no release gate was satisfied
- [x] Operator guide remains unchanged because no broader claim is yet supported
- [x] Compatibility matrix remains unchanged pending more Tier B evidence
- [x] Readiness roadmap priority remains focused on runtime interaction depth and additional Tier B fixtures

---

## Sign-Off

| Role | Name | Date |
| --- | --- | --- |
| Benchmark owner | GitHub Copilot | 2026-04-01 |
| Reviewer | pending | pending |
| Product claim approver | pending | pending |
