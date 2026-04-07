# QA Agent Benchmark And Release Gate Plan

## Goal

Define a concrete, repeatable benchmark program that can answer one product question with evidence:

- when is it defensible to say the QA Agent works for most normal web applications?

This plan turns the benchmark and release-gate workstream from the readiness roadmap into an executable validation program.

It is intentionally conservative. The benchmark must prevent the team from upgrading product claims based on a few successful demos or one favorable target.

---

## Root Problem

The current product is useful, but its runtime breadth is still narrower than the phrase "any web application" implies.

Right now the repo has:

- truthful operator-facing scope documentation
- a bounded browser-based runtime
- useful discovery, evidence, and lightweight regression flows

What it does not yet have is a benchmark suite that proves where the system works reliably, where it only partially works, and where it is still unsupported.

Without that benchmark, product positioning will drift faster than implementation reality.

---

## Current Positioning Baseline

Per the current documentation, the most accurate claim remains:

- local QA-agent MVP for conventional web applications
- strongest on guided step execution, exploratory discovery, and evidence review
- best suited to standard login flows, visible navigation, and conventional UI patterns

This benchmark plan exists to determine when that claim can be expanded.

---

## Benchmark Program Objectives

The benchmark program must answer all of the following:

1. Which target-app archetypes are supported today without operator workarounds?
2. Which archetypes are only partially supported and require manual follow-up?
3. Which archetypes are unsupported and must remain outside product claims?
4. What evidence threshold must be met before README and operator docs can claim broader compatibility?
5. Which product gaps most directly block the next compatibility claim upgrade?

---

## Scope

### In Scope

- target-app compatibility benchmarking
- benchmark verdict rules
- release-gate criteria for documentation and product-claim changes
- benchmark evidence expectations
- benchmark execution workflow for local validation

### Out Of Scope

- implementing broader runtime support in this phase
- rewriting the runtime to satisfy unsupported archetypes
- CI automation for the full benchmark suite in the first pass
- performance benchmarking or load testing
- security certification or accessibility certification

---

## Benchmark Design Principles

The benchmark should follow these rules:

1. Prefer archetype coverage over ad hoc app selection.
2. Score behavior, not intent.
3. Treat blocked as distinct from fail.
4. Require evidence for every verdict.
5. Separate product limitation from target-app defect.
6. Keep benchmark environments legal, local, and repeatable.
7. Do not count manual operator recovery as automation success.

---

## Target-App Archetypes

The initial benchmark set should cover these archetypes.

### Tier A: Expected Near-Term Fit

1. Standard admin dashboard
2. Conventional CRUD form workflow
3. Protected-route application with simple username and password login
4. Mixed navigation and editable settings workflow
5. Bilingual or mixed-language UI with visible labels

### Tier B: Important But Harder Fit

1. Table-heavy enterprise UI with filters and row actions
2. Multi-step state transition workflow
3. Role and permission boundary workflow
4. Application with modal-heavy interaction
5. Application with weak accessibility metadata but visible text labels

### Tier C: Explicit Stretch Or Unsupported Archetypes

1. iframe-heavy application
2. SSO or MFA-gated application
3. Upload and download workflow
4. Drag-and-drop workflow
5. Canvas-heavy or highly custom widget UI

Tier C is included to keep the benchmark honest. These targets are not expected to pass in the current product state.

---

## Benchmark Cases Per Archetype

Each archetype should be tested through the same benchmark case structure.

### Case Structure

Every benchmark case should define:

- archetype name
- target application or local fixture
- why the archetype matters
- required user flow
- required assertions
- expected current status: supported, partial, or unsupported
- evidence required to close the case
- known blockers or caveats

### Required Flow Dimensions

Every benchmark case should test some or all of these dimensions, depending on fit:

- navigation reachability
- authentication handling
- visibility assertion reliability
- editability or state transition confidence
- scenario generation usefulness
- review evidence quality
- blocked versus fail accuracy

---

## Verdict Model

Each benchmark case should end in one of these verdicts.

### Supported

Use this only when:

- the target flow completes without operator rescue
- the runtime uses intended product capabilities rather than incidental luck
- the review artifacts make the outcome explainable
- repeated runs remain materially stable

### Partial

Use this when:

- part of the flow works reliably
- meaningful operator value exists
- at least one important step still requires manual follow-up or workaround

### Unsupported

Use this when:

- the runtime lacks a first-class capability required by the target
- the agent cannot complete the flow safely or deterministically
- a "success" result would rely on interpretation rather than real execution

### Invalid Benchmark Result

Use this when the benchmark itself is compromised by:

- broken fixture or environment
- expired credentials
- target instability unrelated to the agent
- missing evidence due to operator error

Invalid results do not count toward release-gate decisions.

---

## Evidence Requirements

Every benchmark case must retain enough evidence for independent review.

### Minimum Evidence Per Case

- benchmark case identifier
- target archetype identifier
- run mode used
- run status and verdict
- screenshots from the critical path
- artifact summary from Review
- concise operator notes on what succeeded, blocked, or failed
- explicit mapping of failure to either product gap or target-app behavior

### Strong Evidence For Release Decisions

For any case used to justify a broader product claim, also require:

- at least two successful reruns on the same archetype
- clear explanation of why the case is representative
- no dependence on manual operator rescue in the passing path
- no contradiction with the compatibility matrix

---

## Release Gate

The release gate decides whether product-facing compatibility claims may change.

### Gate 0: Current Baseline

Allowed claim:

- local QA-agent MVP for conventional web applications

This remains the default until higher gates are satisfied.

### Gate 1: Broader Conventional Web App Claim

Candidate claim:

- useful across most conventional web applications with standard login, visible navigation, and common form-driven workflows

Required conditions:

1. All Tier A archetypes are Supported.
2. At least three Tier B archetypes are Supported or strong Partial.
3. No Tier A case produces unexplained false passes.
4. Review evidence is sufficient to explain all blocked outcomes.
5. README, operator guide, and compatibility matrix are updated together.

### Gate 2: Stronger General-Purpose Claim

Candidate claim:

- supports a broad range of normal business web applications with known limitations around advanced auth, iframe-heavy UIs, and specialized interaction models

Required conditions:

1. All Tier A archetypes are Supported.
2. Most Tier B archetypes are Supported.
3. Tier C cases are either Supported where expected or still explicitly documented as Unsupported.
4. Core interaction gaps from the readiness roadmap are implemented and validated.
5. The benchmark has been rerun after those runtime changes.

### Explicit Non-Gate Rule

No gate may be passed based on one successful customer demo, one favored internal target, or one exploratory run.

---

## Proposed Execution Phases

### Phase 1: Benchmark Definition

Goal:

- finalize the archetype list, verdict rubric, and evidence template

Tasks:

- define the benchmark case template
- assign target fixtures or applications to each archetype
- define what counts as Supported, Partial, Unsupported, and Invalid
- define a benchmark result sheet format

Expected output:

- approved benchmark inventory and rubric

### Phase 2: Fixture And Target Selection

Goal:

- select stable applications or local fixtures that represent each archetype

Tasks:

- prefer local or controlled targets where possible
- define credentials and reset instructions for stateful targets
- record any legal, operational, or stability limits per target

Expected output:

- benchmark target roster

### Phase 3: Baseline Current Product

Goal:

- execute the current product against the benchmark set without expanding runtime support first

Tasks:

- run the benchmark cases as the product exists now
- capture verdicts and evidence
- classify each blocker by product limitation, target instability, or operator error

Expected output:

- baseline compatibility report

### Phase 4: Gap Mapping

Goal:

- connect failed or partial archetypes to concrete roadmap workstreams

Tasks:

- map unsupported cases to missing runtime capabilities
- map weak evidence cases to review and artifact gaps
- map auth failures to auth-session depth gaps

Expected output:

- prioritized implementation-to-benchmark traceability map

### Phase 5: Release-Gate Review

Goal:

- decide whether product-facing claims may change

Tasks:

- compare benchmark results against Gate 0, Gate 1, and Gate 2
- decide whether docs should remain unchanged or be expanded
- record any claim changes as evidence-backed decisions

Expected output:

- release-gate decision memo

---

## Repo Areas Expected To Change During Implementation

This plan is documentation-only for now, but executing it will likely touch these areas.

### Documentation

- `README.md`
- `docs/QA_AGENT_OPERATOR_GUIDE.md`
- `docs/QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md`
- `docs/plans/QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md`
- new benchmark result docs under `docs/plans/` or a dedicated benchmark folder

### Runtime And Result Modeling

- `lib/qa/browser-runtime.ts`
- `lib/qa/execution-engine.ts`
- `lib/qa/scenario-executor.ts`
- `lib/qa/result-builder.ts`
- `lib/qa/auth-session.ts`
- `lib/types.ts`

### Review And Operator Experience

- `components/qa/review-workflow-view.tsx`
- `components/qa/live-console-panel.tsx`
- `components/qa/draft-workflow-view.tsx`

### Validation Assets

- possible new benchmark manifest and result files under `resources/` or `docs/`
- possible targeted tests once the benchmark format stabilizes

---

## Risks And Tradeoffs

### Risk: Overfitting To Friendly Targets

If the benchmark uses only apps that already match the current runtime, the results will be misleading.

Mitigation:

- keep Tier B and Tier C cases in scope even when they are expected to fail

### Risk: External Target Instability

Third-party or remote targets may fail for reasons unrelated to the product.

Mitigation:

- prefer local fixtures or controlled environments for benchmark gates
- mark unstable runs as Invalid rather than forcing a product verdict

### Risk: False Passes From Narrow Assertions

A flow may appear to pass because the runtime validated only a shallow surface.

Mitigation:

- require benchmark assertions that reflect real user-visible outcomes
- require review evidence, not only terminal run status

### Risk: Documentation Gets Ahead Of Evidence Again

Even a good plan fails if docs are updated before benchmark gates are met.

Mitigation:

- tie all claim changes to explicit gate decisions

### Tradeoff: Manual First Pass Versus Immediate Automation

Fully automating the benchmark harness now would slow down the initial truth-finding exercise.

Decision:

- run the first benchmark wave manually through the product UI and retained artifacts
- automate only after the verdict model and fixture set stabilize

---

## Validation Approach

The plan should be considered ready to execute when all of the following are true:

1. The archetype list is approved.
2. The verdict rubric is unambiguous.
3. At least one candidate target exists for each Tier A and Tier B archetype.
4. The evidence template is defined.
5. The release gates are specific enough to block premature product-claim changes.

The benchmark program itself should be considered successful when:

1. It produces a baseline compatibility report for the current product.
2. It highlights the next compatibility bottlenecks clearly.
3. It gives the team a defensible rule for when the README and operator docs may broaden product claims.

---

## Recommended Next Step After Plan Approval

After approving this plan, the next implementation step should be:

1. create the benchmark case template and roster document
2. select the initial Tier A and Tier B target fixtures
3. run a first baseline benchmark wave against the current product state

That sequence will produce the evidence needed to prioritize runtime work against real compatibility gaps rather than assumptions.

### Phase 1 And Phase 2 Working Artifacts

- [QA_AGENT_BENCHMARK_CASE_TEMPLATE.md](docs/plans/QA_AGENT_BENCHMARK_CASE_TEMPLATE.md)
- [QA_AGENT_BENCHMARK_RESULT_SHEET_TEMPLATE.md](docs/plans/QA_AGENT_BENCHMARK_RESULT_SHEET_TEMPLATE.md)
- [QA_AGENT_BENCHMARK_TARGET_ROSTER.md](docs/plans/QA_AGENT_BENCHMARK_TARGET_ROSTER.md)

---

## Implementation Checklist

### Phase 1: Benchmark Definition

- [x] Finalize the Tier A, Tier B, and Tier C archetype list.
- [x] Define the benchmark case template.
- [x] Define the benchmark result sheet format.
- [x] Define the verdict rubric for Supported, Partial, Unsupported, and Invalid.
- [x] Confirm required evidence for every benchmark case.

### Phase 2: Fixture And Target Selection

- [x] Select at least one candidate target or fixture for every Tier A archetype.
- [x] Select at least one candidate target or fixture for every Tier B archetype.
- [x] Select representative stretch targets for Tier C archetypes.
- [x] Record credentials, reset instructions, and environment notes for stateful targets.
- [x] Record legal, operational, or stability constraints for every target.

### Phase 3: Baseline Current Product

- [x] Execute the current product against the selected Tier A targets.
- [ ] Execute the current product against the selected Tier B targets.
- [ ] Execute the current product against the selected Tier C targets where safe and appropriate.
- [x] Capture benchmark verdicts for every executed case.
- [x] Capture screenshots, artifact summaries, and operator notes for every executed case.
- [x] Classify every blocker as product limitation, target instability, or operator error.
- [x] Produce the baseline compatibility report.

### Phase 3 Ongoing Evidence

- [QA_AGENT_BENCHMARK_WAVE_001_BASELINE_REPORT.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_001_BASELINE_REPORT.md)
- [QA_AGENT_BENCHMARK_WAVE_002_A4_RESULT_SHEET.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_A4_RESULT_SHEET.md)
- [QA_AGENT_BENCHMARK_WAVE_002_A4_CASE_RECORDS.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_A4_CASE_RECORDS.md)
- [QA_AGENT_BENCHMARK_WAVE_002_B1_RESULT_SHEET.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_B1_RESULT_SHEET.md)
- [QA_AGENT_BENCHMARK_WAVE_002_B1_CASE_RECORDS.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_B1_CASE_RECORDS.md)
- [QA_AGENT_BENCHMARK_WAVE_002_B2_RESULT_SHEET.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_B2_RESULT_SHEET.md)
- [QA_AGENT_BENCHMARK_WAVE_002_B2_CASE_RECORDS.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_B2_CASE_RECORDS.md)
- [QA_AGENT_BENCHMARK_WAVE_002_B4_RESULT_SHEET.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_B4_RESULT_SHEET.md)
- [QA_AGENT_BENCHMARK_WAVE_002_B4_CASE_RECORDS.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_002_B4_CASE_RECORDS.md)

Phase 3 execution note:

- Wave 002 executed `A4-002`, `B1-001`, `B2-001`, and `B4-001` against stronger local benchmark fixtures and recorded `Supported`, `Partial`, `Partial`, and `Supported` benchmark verdicts respectively.
- `A4-002` replaced the weaker `A4-001` target with a stronger local settings-workflow fixture and passed once plus two clean reruns, resolving the final Tier A benchmark blocker.
- Gate 1 is now satisfied, and the coordinated README, operator-guide, and compatibility-matrix update was completed against the new evidence.
- The Tier B execution checklist item remains open because only three of the selected Tier B archetypes have been exercised so far.

### Phase 4: Gap Mapping

- [x] Map unsupported archetypes to concrete runtime capability gaps.
- [x] Map partial archetypes to product improvements that would move them toward Supported.
- [x] Map weak-evidence cases to review and diagnostics gaps.
- [ ] Map auth-related failures to authentication and session-depth gaps.
- [x] Produce the implementation-to-benchmark traceability map.

### Phase 4 Working Artifacts

- [QA_AGENT_BENCHMARK_WAVE_001_RESULT_SHEET.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_001_RESULT_SHEET.md)
- [QA_AGENT_BENCHMARK_WAVE_001_CASE_RECORDS.md](docs/plans/QA_AGENT_BENCHMARK_WAVE_001_CASE_RECORDS.md)
- [QA_AGENT_BENCHMARK_TRACEABILITY_MAP_WAVE_001.md](docs/plans/QA_AGENT_BENCHMARK_TRACEABILITY_MAP_WAVE_001.md)

### Phase 5: Release-Gate Review

- [x] Compare benchmark results against Gate 0 criteria.
- [x] Compare benchmark results against Gate 1 criteria.
- [x] Compare benchmark results against Gate 2 criteria.
- [x] Decide whether current product claims remain unchanged or can be broadened.
- [x] Record the release-gate decision memo.

### Phase 5 Working Artifact

- [QA_AGENT_RELEASE_GATE_DECISION_MEMO_WAVE_001.md](docs/plans/QA_AGENT_RELEASE_GATE_DECISION_MEMO_WAVE_001.md)

### Documentation And Product Claim Updates

- [ ] Update README only if a release gate has been satisfied.
- [ ] Update the operator guide only if benchmark evidence supports the new claim.
- [ ] Update the compatibility matrix to reflect benchmark-backed statuses.
- [ ] Update the readiness roadmap if benchmark results change implementation priorities.

### Validation And Quality Guardrails

- [x] Confirm that every Tier A and Tier B archetype has at least one candidate target.
- [x] Confirm that the evidence template is sufficient for independent review.
- [x] Confirm that no benchmark verdict relied on manual operator rescue and was still counted as Supported.
- [x] Confirm that no product-claim change was made without an explicit release-gate decision.
- [x] Confirm that the benchmark program produced a baseline compatibility report and clear next bottlenecks.

Wave 001 decision note:

- No documentation broadening is authorized from the current benchmark evidence.
- The conditional documentation-update tasks remain open until a higher release gate is actually satisfied.