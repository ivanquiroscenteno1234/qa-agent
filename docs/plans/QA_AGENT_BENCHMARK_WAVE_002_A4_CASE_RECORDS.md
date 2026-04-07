# QA Agent Benchmark Wave 002 A4 Case Records

## Purpose

This document stores the follow-up benchmark case record for the mixed-navigation settings archetype after the stronger local fixture was added.

This case supersedes the weaker representativeness of `A4-001` without rewriting the historical wave 001 baseline.

---

## A4-002

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `A4-002` |
| Tier | `A` |
| Archetype ID | `A4` |
| Archetype Name | Mixed navigation and editable settings workflow |
| Benchmark Wave | `wave-002-a4-target-strengthening` |
| Owner | GitHub Copilot |
| Date | `2026-04-01` |
| Expected Current Status | `Supported` |
| Target Type | `local-benchmark-fixture` |
| Target Name | Settings Workflow Fixture |
| Target URL Or Fixture ID | `http://127.0.0.1:3022/benchmark/settings-workflow` |
| Run Mode | `execute-steps` |
| Release Gate Relevance | `Gate 1`, `Gate 2` |

### Why This Case Matters

This case closes the main weakness from `A4-001`: the original production settings route was reachable and editable, but too shallow to represent a stronger settings-management workflow. The new fixture keeps the target local and deterministic while exercising real section switching, repeated visibility checks, repeated editability confirmation, and a reset path.

### Required User Flow

1. Go to the local settings-workflow fixture.
2. Confirm the settings workflow heading is visible.
3. Open `Notification routing`.
4. Confirm the `Notification routing profile` is visible.
5. Confirm the notification-routing section is editable.
6. Open `Environment access`.
7. Confirm the `Environment access profile` is visible.
8. Confirm the environment-access section is editable.
9. Open `Evidence retention`.
10. Confirm the `Evidence retention profile` is visible.
11. Confirm the evidence-retention section is editable.
12. Reset the settings workspace.
13. Confirm the `Evidence retention profile` baseline is visible again.

### Required Assertions

- Cross-section navigation reachability: pass
- Section visibility assertion reliability: pass
- Editability confidence across multiple settings sections: pass
- Deterministic reset restoration: pass
- Repeatability across reruns: pass

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
| 1 | `run_kfxss6cr` | pass | accepted benchmark run passed 13 steps with 18 retained artifacts and no warnings or defects |
| 2 | `run_ayinukch` | pass | first clean rerun matched the accepted run profile: 13 passing steps, 18 artifacts, 0 warnings, 0 defects |
| 3 | `run_pvugg9pr` | pass | second clean rerun matched the same profile again, strengthening repeatability for release-gate evidence |

### Final Verdict

Final verdict: `Supported`

### Reasoning

The stronger fixture removes the representativeness concern that kept `A4-001` at `Partial`. The accepted run plus two successful reruns show that the current QA runtime can repeatedly navigate across multiple settings sections, confirm each active section is visible, verify editability through the visible `Edit section` control, and restore the baseline state without operator rescue.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | none blocked the accepted settings workflow |
| Auth or session gap | not applicable on this local benchmark fixture |
| Locator or page-structure gap | none blocking the accepted run; section labels and profile headings remained parser-stable across all three executions |
| Evidence or diagnostics gap | none blocking the accepted case |
| Regression gap | repeatability concern was addressed by two additional clean reruns |
| Remaining scope boundary | the case validates navigation plus editability confidence in safe mode; it should not be stretched into a claim that persisted write flows are broadly validated |
| Target instability | none observed |

### Recommended Follow-Up

- treat `A4-002` as the representative A4 benchmark record for future release-gate reviews
- preserve the current section labels and single-active-editor pattern as the benchmark-stable fixture surface