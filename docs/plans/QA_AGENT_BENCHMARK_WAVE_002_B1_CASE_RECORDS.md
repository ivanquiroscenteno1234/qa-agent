# QA Agent Benchmark Wave 002 B1 Case Records

## Purpose

This document stores the executed benchmark case record for the first Tier B benchmark wave against the local enterprise-grid fixture.

Only the executed case is included here.

---

## B1-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `B1-001` |
| Tier | `B` |
| Archetype ID | `B1` |
| Archetype Name | Table-heavy enterprise UI with filters and row actions |
| Benchmark Wave | `wave-002-tier-b-b1` |
| Owner | GitHub Copilot |
| Date | `2026-04-01` |
| Expected Current Status | `Partial` |
| Target Type | `local-benchmark-fixture` |
| Target Name | Enterprise Grid Fixture |
| Target URL Or Fixture ID | `http://127.0.0.1:3022/benchmark/enterprise-grid` |
| Run Mode | `execute-steps` |
| Release Gate Relevance | `Gate 1`, `Gate 2` |

### Why This Case Matters

This is the first evidence-backed Tier B execution against a purpose-built local benchmark fixture. It tests whether the current QA runtime can do more than just observe a dense business UI by exercising a row action and a deterministic reset path.

### Required User Flow

1. Open the local enterprise-grid fixture.
2. Confirm the operator work queue table is visible.
3. Trigger a visible row action.
4. Confirm the changed owner label appears.
5. Trigger the reset control.
6. Confirm the baseline owner label is restored.

### Required Assertions

- Dense table reachability: pass
- Visible row action execution: pass
- Deterministic reset restoration: pass
- Filter interaction coverage: not fully evidenced

### Evidence Checklist

- [x] Run ID recorded
- [x] Benchmark verdict recorded
- [x] Critical-path screenshots captured
- [x] Review artifact summary captured
- [x] Operator notes written
- [x] Product limitation versus target-app defect classified
- [x] Any instability or invalidation reason documented

### Execution Record

| Attempt | Run ID | Outcome | Notes |
| --- | --- | --- | --- |
| 1 | `run_ygl6tzmu` | pass | six-step execution passed with 11 retained artifacts and no warnings or defects |

### Final Verdict

Final verdict: `Partial`

### Reasoning

The executed run successfully covered table reachability, a row-level action, and deterministic reset recovery. However, the archetype is defined around filters and row actions together, and the current executor still lacks first-class search and select-control driving. Because the filter bar was not directly exercised, the evidence is not strong enough to classify B1 as Supported yet.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | current step parsing and browser execution do not expose first-class search or select-control actions for benchmark scripts |
| Auth or session gap | not applicable |
| Locator or page-structure gap | none blocking this fixture |
| Evidence or diagnostics gap | artifact retention was strong, but full archetype coverage still depends on filter-driving support |
| Regression gap | only one clean benchmark attempt has been recorded so far |
| Target instability | none observed |

### Recommended Follow-Up

- add first-class filter-driving support for search and select controls
- rerun B1 after that runtime support lands to determine Supported versus Partial
