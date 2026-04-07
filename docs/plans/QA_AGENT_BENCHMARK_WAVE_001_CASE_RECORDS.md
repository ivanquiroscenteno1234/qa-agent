# QA Agent Benchmark Wave 001 Case Records

## Purpose

This document stores the executed benchmark case records for wave 001 in a reusable format derived from the benchmark case template.

Only the cases executed in wave 001 are included here.

---

## A1-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `A1-001` |
| Tier | `A` |
| Archetype ID | `A1` |
| Archetype Name | Standard admin dashboard |
| Benchmark Wave | `wave-001-baseline` |
| Owner | GitHub Copilot |
| Date | `2026-03-31` |
| Expected Current Status | `Supported` |
| Target Type | `existing-local` |
| Target Name | QA Agent App |
| Target URL Or Fixture ID | `http://127.0.0.1:3022/` |
| Run Mode | `exploratory-session` |
| Release Gate Relevance | `Gate 0`, `Gate 1` |

### Why This Case Matters

This case represents the product's strongest current-fit claim: a conventional admin-style application shell with visible navigation, visible modules, and a form surface.

### Required User Flow

1. Open the local QA Agent app root.
2. Let the agent perform exploratory discovery.
3. Confirm the agent completes the crawl and retained evidence is produced.

### Required Assertions

- Navigation reachability: pass
- Visibility assertion reliability: pass
- Review evidence quality: pass
- Blocked versus fail accuracy: pass

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
| 1 | `run_z7074043` | pass | exploratory discovery completed with 7 artifacts |
| 2 | `run_5p8p8bel` | pass | repeated pass with matching artifact count and findings |

### Final Verdict

Final verdict: `Supported`

### Reasoning

The flow completed twice without operator rescue, produced retained evidence, and surfaced explainable findings instead of a shallow pass.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | none blocking this case |
| Auth or session gap | not applicable |
| Locator or page-structure gap | surfaced placeholder-only labeling and indistinct content after navigation |
| Evidence or diagnostics gap | none blocking this case |
| Regression gap | not applicable |
| Target instability | none observed |

### Recommended Follow-Up

- keep as Supported and include in release-gate evidence

---

## A2-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `A2-001` |
| Tier | `A` |
| Archetype ID | `A2` |
| Archetype Name | Conventional CRUD form workflow |
| Benchmark Wave | `wave-001-baseline` |
| Owner | GitHub Copilot |
| Date | `2026-03-31` |
| Expected Current Status | `Supported` |
| Target Type | `existing-local` |
| Target Name | QA Agent App |
| Target URL Or Fixture ID | `http://127.0.0.1:3022/` |
| Run Mode | `execute-steps` |
| Release Gate Relevance | `Gate 0`, `Gate 1` |

### Why This Case Matters

This case confirms the product can operate against a visible form-driven workflow using first-class supported actions rather than exploratory luck alone.

### Required User Flow

1. Open the local QA Agent app root.
2. Confirm the `Environment` field is visible.
3. Confirm the `Target URL` field is editable.

### Required Assertions

- Navigation reachability: pass
- Visibility assertion reliability: pass
- Editability confidence: pass
- Review evidence quality: pass

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
| 1 | `run_bqg60ib6` | pass | step-based execution validated visible and editable form controls |

### Final Verdict

Final verdict: `Supported`

### Reasoning

The case completed successfully using supported action types and retained explainable evidence. The only reason this case is weaker than A1 or A3 for release-gate purposes is that wave 001 recorded one clean benchmark attempt rather than two.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | none blocking this case |
| Auth or session gap | not applicable |
| Locator or page-structure gap | none blocking this case |
| Evidence or diagnostics gap | repeatability evidence could be strengthened in a later wave |
| Regression gap | not applicable |
| Target instability | none observed |

### Recommended Follow-Up

- keep as Supported and include in release-gate evidence

---

## A3-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `A3-001` |
| Tier | `A` |
| Archetype ID | `A3` |
| Archetype Name | Protected-route application with simple username and password login |
| Benchmark Wave | `wave-001-baseline` |
| Owner | GitHub Copilot |
| Date | `2026-03-31` |
| Expected Current Status | `Supported` |
| Target Type | `existing-controlled-external` |
| Target Name | Restaurant Partner Staging |
| Target URL Or Fixture ID | `https://restaurant-partner-p-dev.onrender.com` |
| Run Mode | `exploratory-session` |
| Release Gate Relevance | `Gate 0`, `Gate 1` |

### Why This Case Matters

This case tests the strongest external-auth claim that the current product can reasonably make today: standard username-and-password login against a conventional protected business web application.

### Required User Flow

1. Open the protected external target.
2. Authenticate with the controlled benchmark credentials.
3. Complete exploratory discovery of the reachable authenticated UI surface.

### Required Assertions

- Authentication handling: pass
- Navigation reachability: pass
- Review evidence quality: pass
- Blocked versus fail accuracy: pass

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
| 1 | `run_v78jso5t` | pass | authenticated exploratory discovery completed with 8 artifacts |
| 2 | `run_75u7k2er` | pass | repeated authenticated pass with matching insight profile |

### Final Verdict

Final verdict: `Supported`

### Reasoning

The product authenticated successfully twice on a controlled external target, completed discovery without operator rescue, and produced retained evidence and meaningful findings.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | none blocking this case |
| Auth or session gap | no auth failure observed in this wave |
| Locator or page-structure gap | heading clarity and indistinct navigation surfaced as target-side findings |
| Evidence or diagnostics gap | none blocking this case |
| Regression gap | not applicable |
| Target instability | none observed during wave 001 |

### Recommended Follow-Up

- keep as Supported and include in release-gate evidence

---

## A4-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `A4-001` |
| Tier | `A` |
| Archetype ID | `A4` |
| Archetype Name | Mixed navigation and editable settings workflow |
| Benchmark Wave | `wave-001-baseline` |
| Owner | GitHub Copilot |
| Date | `2026-03-31` |
| Expected Current Status | `Partial` |
| Target Type | `existing-local` |
| Target Name | QA Agent App |
| Target URL Or Fixture ID | `http://127.0.0.1:3022/settings` |
| Run Mode | `execute-steps` |
| Release Gate Relevance | `Gate 1` |

### Why This Case Matters

This case tests whether the product can combine navigation into a secondary workspace and editable-field confirmation. It matters because a stronger compatibility claim must handle more than landing-page form fields.

### Required User Flow

1. Open the local QA Agent app.
2. Navigate to the `Settings` section.
3. Confirm the settings workspace is visible.
4. Confirm a visible field in that workspace is editable.

### Required Assertions

- Navigation reachability: pass
- Visibility assertion reliability: pass
- Editability confidence: pass
- Review evidence quality: pass

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
| 1 | `run_6qvr7hul` | pass | navigation and editable-field confirmation worked on the local settings route |

### Final Verdict

Final verdict: `Partial`

### Reasoning

The product completed the requested workflow, but the benchmark target is still a weak proxy for a stronger settings-management archetype with meaningful configuration edits. Marking it Supported would overstate target representativeness.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | no blocking failure was observed |
| Auth or session gap | not applicable |
| Locator or page-structure gap | none blocking this case |
| Evidence or diagnostics gap | repeatability evidence could be strengthened in a later wave |
| Regression gap | not applicable |
| Target instability | none observed |

### Recommended Follow-Up

- keep as Partial and prioritize follow-up work

---

## A5-001

### Case Metadata

| Field | Value |
| --- | --- |
| Benchmark Case ID | `A5-001` |
| Tier | `A` |
| Archetype ID | `A5` |
| Archetype Name | Bilingual or mixed-language UI with visible labels |
| Benchmark Wave | `wave-001-baseline` |
| Owner | GitHub Copilot |
| Date | `2026-03-31` |
| Expected Current Status | `Supported` |
| Target Type | `existing-controlled-external` |
| Target Name | Restaurant Partner Staging |
| Target URL Or Fixture ID | `https://restaurant-partner-p-dev.onrender.com` |
| Run Mode | `exploratory-session` |
| Release Gate Relevance | `Gate 0`, `Gate 1` |

### Why This Case Matters

This case verifies that the product remains usable against a bilingual target and can surface mixed-language risks explicitly instead of silently treating them as noise.

### Required User Flow

1. Open the controlled external target.
2. Authenticate successfully.
3. Complete exploratory discovery of the bilingual reachable UI surface.
4. Confirm the evidence captures the mixed-language risk where present.

### Required Assertions

- Authentication handling: pass
- Navigation reachability: pass
- Review evidence quality: pass
- Mixed-language risk surfaced: pass

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
| 1 | `run_v78jso5t` | pass | mixed-language insight surfaced during successful exploratory discovery |
| 2 | `run_75u7k2er` | pass | repeated pass with matching mixed-language evidence |

### Final Verdict

Final verdict: `Supported`

### Reasoning

The product remained usable on the bilingual target twice and explicitly surfaced the mixed-language labeling risk in its retained insights.

### Product Gap Mapping

| Gap Type | Detail |
| --- | --- |
| Core interaction gap | none blocking this case |
| Auth or session gap | no auth failure observed in this wave |
| Locator or page-structure gap | mixed-language UI remains usable but still benefits from stronger locator robustness over time |
| Evidence or diagnostics gap | none blocking this case |
| Regression gap | not applicable |
| Target instability | none observed during wave 001 |

### Recommended Follow-Up

- keep as Supported and include in release-gate evidence