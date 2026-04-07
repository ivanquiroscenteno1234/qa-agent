# QA Agent Benchmark Case Template

## Purpose

Use this template to define one benchmark case in a way that is repeatable, reviewable, and compatible with the benchmark verdict model.

Each case should describe one archetype-specific test target and one representative flow.

---

## Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `A1-001` |
| Tier | `A`, `B`, or `C` |
| Archetype ID | `A1`, `B3`, `C2`, etc. |
| Archetype Name | |
| Benchmark Wave | |
| Owner | |
| Date | |
| Expected Current Status | `Supported`, `Partial`, or `Unsupported` |
| Target Type | `existing-local`, `existing-controlled-external`, or `planned-local-fixture` |
| Target Name | |
| Target URL Or Fixture ID | |
| Run Mode | `execute-steps`, `exploratory-session`, `generate-scenarios`, or `regression-run` |
| Release Gate Relevance | `Gate 0`, `Gate 1`, `Gate 2` |

---

## Why This Case Matters

Describe why this case is representative of its archetype and why it matters to product-positioning decisions.

### Example Prompt

This case represents a conventional admin dashboard with visible navigation and standard forms. It matters because this is the product's current strongest-fit claim and must remain defensible before broader claims are considered.

---

## Preconditions

- Target environment is reachable.
- Required credentials or seed data are available.
- Reset instructions have been applied.
- QA Agent environment is running with the intended backend and configuration.
- Any target-specific constraints have been reviewed before execution.

---

## Required User Flow

List the exact benchmark flow that must be executed.

1. 
2. 
3. 
4. 

---

## Required Assertions

List the minimum assertions required for this case to count as meaningfully exercised.

- Navigation reachability:
- Authentication handling:
- Visibility assertion reliability:
- Editability or state transition confidence:
- Review evidence quality:
- Blocked versus fail accuracy:

Only include the dimensions that are relevant to this archetype.

---

## Evidence Checklist

- [ ] Run ID recorded
- [ ] Benchmark verdict recorded
- [ ] Critical-path screenshots captured
- [ ] Review artifact summary captured
- [ ] Operator notes written
- [ ] Product limitation versus target-app defect classified
- [ ] Any instability or invalidation reason documented

---

## Verdict Rubric

### Supported

Mark this only when all of the following are true:

- [ ] The flow completed without operator rescue.
- [ ] The result used intended product capabilities.
- [ ] The evidence explains the result clearly.
- [ ] Repeated runs are materially stable.

### Partial

Mark this when all of the following are true:

- [ ] Meaningful operator value exists.
- [ ] At least one important step still needs manual follow-up, workaround, or unsupported behavior.
- [ ] The evidence makes the product boundary clear.

### Unsupported

Mark this when any of the following are true:

- [ ] A first-class runtime capability required by the case is missing.
- [ ] The flow cannot be completed safely or deterministically.
- [ ] A pass result would rely on interpretation rather than real execution.

### Invalid

Mark this when the benchmark itself is compromised by:

- [ ] Broken fixture or target environment
- [ ] Expired credentials
- [ ] Target instability unrelated to the agent
- [ ] Missing evidence caused by operator error

---

## Execution Record

| Attempt | Run ID | Outcome | Notes |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## Final Verdict

Final verdict: `Supported`, `Partial`, `Unsupported`, or `Invalid`

### Reasoning

Write a short evidence-based explanation of why the final verdict was chosen.

---

## Product Gap Mapping

If the case is not Supported, map it to the most relevant product gap.

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | |
| Auth or session gap | |
| Locator or page-structure gap | |
| Evidence or diagnostics gap | |
| Regression gap | |
| Target instability | |

---

## Recommended Follow-Up

Choose one:

- keep as Supported and include in release-gate evidence
- keep as Partial and prioritize follow-up work
- keep as Unsupported and preserve current documentation limits
- rerun because the result was Invalid