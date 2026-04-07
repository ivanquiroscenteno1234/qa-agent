# QA Agent Benchmark Result Sheet Template

## Purpose

Use this sheet to summarize one full benchmark wave across all selected cases.

This document is the roll-up companion to the per-case benchmark template.

---

## Benchmark Wave Metadata

| Field | Value |
| --- | --- |
| Benchmark Wave ID | |
| Date Range | |
| Product Revision | |
| Store Backend | |
| Environment Type | |
| Operator | |
| Goal | |

---

## Case Rollup Table

| Case ID | Archetype ID | Archetype Name | Target | Run Mode | Expected Status | Final Verdict | Evidence Complete | Release Gate Impact | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1-001 | A1 | | | | | | `yes` or `no` | | |
| A2-001 | A2 | | | | | | | | |
| A3-001 | A3 | | | | | | | | |
| A4-001 | A4 | | | | | | | | |
| A5-001 | A5 | | | | | | | | |
| B1-001 | B1 | | | | | | | | |
| B2-001 | B2 | | | | | | | | |
| B3-001 | B3 | | | | | | | | |
| B4-001 | B4 | | | | | | | | |
| B5-001 | B5 | | | | | | | | |
| C1-001 | C1 | | | | | | | | |
| C2-001 | C2 | | | | | | | | |
| C3-001 | C3 | | | | | | | | |
| C4-001 | C4 | | | | | | | | |
| C5-001 | C5 | | | | | | | | |

---

## Rollup Summary

| Category | Count |
| --- | --- |
| Supported | |
| Partial | |
| Unsupported | |
| Invalid | |

| Tier | Supported | Partial | Unsupported | Invalid |
| --- | --- | --- | --- | --- |
| Tier A | | | | |
| Tier B | | | | |
| Tier C | | | | |

---

## Product Gap Summary

| Gap Family | Affected Cases | Priority | Notes |
| --- | --- | --- | --- |
| Core interactions | | | |
| Auth and session depth | | | |
| Locator and page structure | | | |
| Evidence and diagnostics | | | |
| Regression credibility | | | |
| Target instability | | | |

---

## Release Gate Evaluation

### Gate 0

| Check | Status | Evidence |
| --- | --- | --- |
| Current baseline claim remains accurate | | |

### Gate 1

| Check | Status | Evidence |
| --- | --- | --- |
| All Tier A archetypes are Supported | | |
| At least three Tier B archetypes are Supported or strong Partial | | |
| No Tier A case produced unexplained false passes | | |
| Review evidence explains all blocked outcomes | | |
| README, operator guide, and compatibility matrix are ready for coordinated update | | |

### Gate 2

| Check | Status | Evidence |
| --- | --- | --- |
| All Tier A archetypes are Supported | | |
| Most Tier B archetypes are Supported | | |
| Tier C statuses remain evidence-backed | | |
| Core roadmap gaps required for broader claim are implemented and validated | | |
| Benchmark was rerun after those runtime changes | | |

---

## Decision Memo

### Current Allowed Claim

Write the product claim that remains justified after this benchmark wave.

### Decision

Choose one:

- keep current claim unchanged
- broaden claim to Gate 1 level
- broaden claim to Gate 2 level
- rerun benchmark before changing claims

### Why

Write a short evidence-based explanation referencing the case rollup and gate checks.

---

## Documentation Follow-Up

- [ ] README reviewed against benchmark evidence
- [ ] Operator guide reviewed against benchmark evidence
- [ ] Compatibility matrix reviewed against benchmark evidence
- [ ] Readiness roadmap reprioritized if needed

---

## Sign-Off

| Role | Name | Date |
| --- | --- | --- |
| Benchmark owner | | |
| Reviewer | | |
| Product claim approver | | |