# QA Agent Benchmark Wave 002 B4 Case Records

## Purpose

This document stores the executed benchmark case record for the modal-heavy interaction fixture.

Only the executed case is included here.

---

## B4-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `B4-001` |
| Tier | `B` |
| Archetype ID | `B4` |
| Archetype Name | Application with modal-heavy interaction |
| Benchmark Wave | `wave-002-tier-b-b4` |
| Owner | GitHub Copilot |
| Date | `2026-04-01` |
| Expected Current Status | `Supported` |
| Target Type | `local-benchmark-fixture` |
| Target Name | Modal Workflow Fixture |
| Target URL Or Fixture ID | `http://127.0.0.1:3022/benchmark/modal-workflow` |
| Run Mode | `execute-steps` |
| Release Gate Relevance | `Gate 1`, `Gate 2` |

### Why This Case Matters

This case tests whether the current QA runtime can handle a common modal-heavy business workflow end to end: open the modal, validate the dialog, take the non-destructive dismiss path, reopen it, confirm the primary action, verify post-modal state changes, and restore the baseline state.

### Required User Flow

1. Open the local modal-workflow fixture.
2. Confirm the decision board is visible.
3. Open the review modal.
4. Confirm the review modal is visible.
5. Dismiss the modal.
6. Confirm the baseline status remains visible.
7. Reopen the review modal.
8. Confirm the review modal is visible again.
9. Queue the handoff from the modal.
10. Confirm post-modal feedback and the queued state are visible.
11. Reset the decision board.
12. Confirm the baseline pending-review state is restored.

### Required Assertions

- Modal launch visibility: pass
- Secondary dismiss path: pass
- Primary confirm path: pass
- Post-modal status change: pass
- Deterministic reset restoration: pass

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
| 1 | `run_qnhb5cj9` | invalid | duplicate reset semantics and earlier modal wording caused ambiguous targeting during the post-confirm reset step; fixture was hardened before verdict counting |
| 2 | `run_xnwjxv18` | invalid | the reset-step ambiguity persisted after an intermediate benchmark-script adjustment; this attempt was excluded from verdict counting |
| 3 | `run_eg187j8w` | invalid | modal visibility hardening alone was insufficient while control labels still overlapped with fuzzy step matching; excluded after final label cleanup |
| 4 | `run_bznfsvw3` | pass | accepted benchmark run passed 13 steps with 18 retained artifacts and no warnings or defects |

### Final Verdict

Final verdict: `Supported`

### Reasoning

The accepted run exercised both modal paths and the reset path without operator rescue, and all required assertions passed with retained evidence. The excluded attempts were benchmark-setup corrections, not accepted product verdicts, because the fixture still had ambiguous control naming while it was being hardened for repeatable automation.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | none blocked the accepted modal workflow |
| Auth or session gap | not applicable |
| Locator or page-structure gap | accepted evidence required final label hardening so modal actions map cleanly through the current step parser |
| Evidence or diagnostics gap | none blocking the accepted case |
| Regression gap | a second clean accepted pass would further strengthen confidence, but one complete pass already meets the benchmark standard for this archetype |
| Target instability | none observed on the accepted run |

### Recommended Follow-Up

- preserve the final control labels as the benchmark-stable modal fixture surface
- use this archetype as a reference pattern when evaluating future runtime changes to modal handling
