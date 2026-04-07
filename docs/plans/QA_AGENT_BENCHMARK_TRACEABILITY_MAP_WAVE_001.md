# QA Agent Benchmark Traceability Map Wave 001

## Purpose

Map the results of benchmark wave 001 back to the product roadmap and identify which gaps are benchmark-program gaps versus runtime capability gaps.

This document is the Phase 4 implementation-to-benchmark traceability map for the first executed wave.

---

## Inputs

This traceability map is based on:

- [QA_AGENT_BENCHMARK_WAVE_001_BASELINE_REPORT.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_001_BASELINE_REPORT.md)
- [QA_AGENT_BENCHMARK_TARGET_ROSTER.md](docs/plans/QA_AGENT_BENCHMARK_TARGET_ROSTER.md)
- [QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md](docs/plans/QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md)

---

## Observed Wave 001 Mapping

| Case Or Archetype | Current Status | Gap Type | Mapped Workstream | Why It Maps There | Priority |
| --- | --- | --- | --- | --- | --- |
| A1-001 placeholder-only input labeling and indistinct navigation content | Supported with target findings | reviewable target-surface limitation | Workstream 5 Evidence and diagnostics | the current product correctly surfaced the findings; future evidence improvements should make these findings even easier to triage in Review | medium |
| A2-001 single-pass evidence only | Supported with lighter repeatability evidence | benchmark evidence depth | Workstream 7 Benchmark and release gate | the product worked, but future release-gate confidence should include repeated passes for more cases | medium |
| A3-001 no auth failure observed | Supported | no benchmark blocker observed | Workstream 3 Authentication and session depth remains important for future archetypes, but wave 001 did not expose a failure here | low |
| A4-001 weak settings-target representativeness | Partial | benchmark target limitation | Workstream 7 Benchmark and release gate | the case needs a stronger benchmark fixture or a better target before it can support a broader claim | high |
| A5-001 mixed-language UI remains usable | Supported with target findings | locator and evidence robustness opportunity | Workstream 4 Page structure and locator robustness | future broader support should continue to improve reliability on mixed-language and less-uniform UI surfaces | medium |

---

## Partial Archetypes Mapped To Improvements

### A4-001 Mixed Navigation And Editable Settings Workflow

**Observed benchmark outcome:**

- the product successfully navigated and confirmed an editable visible field
- the verdict stayed `Partial` because the local target is not a strong enough proxy for a broader settings-management archetype

**What would move it toward Supported:**

1. Add a stronger benchmark target with meaningful configuration fields and clearer business settings behavior.
2. Prefer a benchmark target that includes multiple settings subsections or nested configuration areas.
3. Re-run the case with at least two successful passes on that stronger target.

**Mapped workstream:**

- Workstream 7 Benchmark and release gate

---

## Weak-Evidence Cases Mapped To Diagnostics Or Benchmark Gaps

### A2-001 Conventional CRUD Form Workflow

**Weakness observed:**

- one clean benchmark pass exists, but not the same degree of repeatability evidence recorded for A1 and A3

**Improvement path:**

1. Add a second clean benchmark pass in a future wave.
2. Preserve the same step-based assertions so repeatability can be compared cleanly.

**Mapped workstream:**

- Workstream 7 Benchmark and release gate

### A4-001 Mixed Navigation And Editable Settings Workflow

**Weakness observed:**

- one clean pass exists, but the benchmark target itself is the larger limitation

**Improvement path:**

1. Replace or supplement the current local target with a more representative settings-management benchmark fixture.
2. Re-run the same case on that stronger target.

**Mapped workstream:**

- Workstream 7 Benchmark and release gate

---

## Unsupported Archetypes Mapped To Runtime Capability Gaps

These archetypes were not executed in wave 001, but they are already classified as expected unsupported or not-ready in the benchmark roster and compatibility matrix. The purpose of this section is to connect them to the roadmap work required before they can be benchmarked credibly.

| Archetype ID | Archetype | Why Not Ready | Mapped Workstream | Repo Areas Likely Affected |
| --- | --- | --- | --- | --- |
| B1 | Table-heavy enterprise UI with filters and row actions | stronger locator strategies and structured table interactions are not yet benchmarked | Workstream 2 Core interaction expansion and Workstream 4 Page structure and locator robustness | `lib/qa/browser-runtime.ts`, `lib/qa/scenario-executor.ts`, `lib/types.ts` |
| B2 | Multi-step state transition workflow | current state-transition coverage is narrower than a broader claim requires | Workstream 2 Core interaction expansion and Workstream 6 Regression credibility | `lib/qa/browser-runtime.ts`, `lib/qa/scenario-executor.ts`, `lib/qa/result-builder.ts` |
| B3 | Role and permission boundary workflow | current benchmark program lacks a dedicated role-boundary fixture | Workstream 3 Authentication and session depth and Workstream 7 Benchmark and release gate | `lib/qa/auth-session.ts`, `components/settings/`, benchmark fixtures |
| B4 | Modal-heavy interaction | current runtime and benchmark suite do not yet prove modal-heavy resilience | Workstream 4 Page structure and locator robustness | `lib/qa/browser-runtime.ts`, `lib/qa/navigation-discovery.ts` |
| B5 | Weak accessibility metadata but visible labels | current runtime can sometimes cope through visible text, but reliability is not benchmarked | Workstream 4 Page structure and locator robustness | `lib/qa/browser-runtime.ts`, `lib/qa/navigation-discovery.ts` |
| C1 | iframe-heavy application | no explicit iframe-targeting strategy exists today | Workstream 4 Page structure and locator robustness | `lib/qa/browser-runtime.ts`, `lib/qa/discovery-engine.ts` |
| C2 | SSO or MFA-gated application | no dedicated support for these auth patterns exists today | Workstream 3 Authentication and session depth | `lib/qa/auth-session.ts`, `lib/qa/execution-engine.ts` |
| C3 | Upload and download workflow | no first-class upload or target-download handling exists today | Workstream 2 Core interaction expansion and Workstream 5 Evidence and diagnostics | `lib/qa/browser-runtime.ts`, `lib/qa/artifact-builder.ts` |
| C4 | Drag-and-drop workflow | no first-class drag-and-drop action exists today | Workstream 2 Core interaction expansion | `lib/qa/browser-runtime.ts`, `lib/types.ts` |
| C5 | Canvas-heavy or highly custom widget UI | this remains outside the current reliable locator model | no near-term roadmap fit beyond preserving Unsupported positioning until explicit capability work is funded | future scope decision required |

---

## Auth-Related Failure Mapping

Wave 001 did not produce any auth-related benchmark failures.

What this means:

- no Phase 4 auth-failure mapping was required for this wave's executed cases
- Workstream 3 remains important because future benchmark archetypes still depend on it
- the Phase 4 checklist item for auth-related failure mapping should remain open until a wave actually produces auth failures that need tracing

---

## Summary

Wave 001 points to two immediate truths:

1. The current product claim is better supported than it was before the benchmark wave.
2. The next blockers to a broader claim are benchmark fixture depth and broader archetype coverage, not failure of the currently executed Tier A cases.

The highest-value next benchmark step is therefore not a claim change. It is building or selecting the first Tier B benchmark fixture so the suite can move beyond the current two ready-now targets.