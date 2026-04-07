# QA Agent Benchmark Wave 002 B2 Case Records

## Purpose

This document stores the executed benchmark case record for the multi-step state-transition benchmark fixture.

Only the executed case is included here.

---

## B2-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `B2-001` |
| Tier | `B` |
| Archetype ID | `B2` |
| Archetype Name | Multi-step state transition workflow |
| Benchmark Wave | `wave-002-tier-b-b2` |
| Owner | GitHub Copilot |
| Date | `2026-04-01` |
| Expected Current Status | `Partial` |
| Target Type | `local-benchmark-fixture` |
| Target Name | State Transition Fixture |
| Target URL Or Fixture ID | `http://127.0.0.1:3022/benchmark/state-transition` |
| Run Mode | `execute-steps` |
| Release Gate Relevance | `Gate 1`, `Gate 2` |

### Why This Case Matters

This case tests whether the current QA runtime can move through more than one visible business state in sequence, retain evidence at each stage, and recover to a seeded baseline without operator rescue.

### Required User Flow

1. Open the local state-transition fixture.
2. Confirm the workflow tracker is visible.
3. Advance the workflow into review.
4. Confirm the review state label is visible.
5. Confirm the approval handoff.
6. Confirm the approved state label is visible.
7. Schedule the release.
8. Confirm the scheduled state label is visible.
9. Reset the workflow.
10. Confirm the draft state label is restored.

### Required Assertions

- Workflow reachability: pass
- Visible phase progression: pass
- Deterministic reset restoration: pass
- Parser resilience across natural approval-control wording: not fully evidenced

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
| 1 | `run_iiolcljb` | invalid | unreached stage labels were visible in the first fixture version, which allowed false-positive visibility checks; fixture was corrected before counting verdicts |
| 2 | `run_hcw2g3dj` | invalid | approval control wording was normalized to `navigate`, causing a benchmark-script mismatch; the control label was renamed to parser-stable wording before rerun |
| 3 | `run_f6amc9cb` | pass | accepted benchmark run passed 10 steps with 15 retained artifacts and no warnings or defects |

### Final Verdict

Final verdict: `Partial`

### Reasoning

The accepted run completed a real multi-step workflow progression and deterministic reset path without operator rescue. The case still remains Partial rather than Supported because the valid benchmark depended on parser-stable control wording after an earlier approval-style label was normalized incorrectly, which indicates the runtime is still sensitive to natural variation in transition-control language.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | none blocked visible multi-step progression on the accepted run |
| Auth or session gap | not applicable |
| Locator or page-structure gap | parser normalization remains sensitive to approval-style control wording, which required fixture label hardening before the accepted run |
| Evidence or diagnostics gap | the fixture had to be hardened once to prevent false-positive visibility before verdict counting |
| Regression gap | only one accepted clean benchmark run has been recorded so far |
| Target instability | none observed |

### Recommended Follow-Up

- harden step parsing so common approval or progression verbs are not normalized to navigation
- rerun B2 after parser improvements to determine whether this archetype can move from strong Partial to Supported
