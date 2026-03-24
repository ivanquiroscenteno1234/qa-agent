# QA Web Testing Agent Gemini Integration Implementation Plan

## Goal

Add an optional Gemini-backed intelligence layer to the current QA web testing application without breaking the existing deterministic Playwright runtime.

This plan is implementation-focused. It converts the current documentation review and code review findings into a concrete delivery sequence.

Highest priority:

1. create local environment configuration via `.env.local`
2. wire in a Gemini API key safely
3. establish a provider abstraction so Gemini use is optional rather than required for all runs

This plan does not implement the integration by itself. It is the approved delivery blueprint for doing that safely.

---

## Current State Summary

The current QA Agent works today without Gemini, ChatGPT, or any other hosted model provider because the runtime is deterministic and local-first.

Current implementation facts:

- browser execution is handled by Playwright
- input validation is handled by Zod
- step parsing is heuristic and rule-based
- scenario generation is template-driven and crawl-assisted
- exploratory analysis is heuristic and evidence-driven
- persistence is local via JSON or SQLite
- no provider SDK, model client, or LLM API key is currently wired into the app runtime

This means the current product is best understood as a bounded QA automation system with heuristic reasoning, not yet a provider-backed LLM agent.

---

## Root Problem

The product is already useful, but several high-value capabilities are still limited by heuristic logic:

- ambiguous step parsing degrades quickly when phrasing differs from expected keywords
- scenario generation is generic rather than context-aware
- post-run QA analysis is narrow and based on hand-authored rules
- there is no provider abstraction for future Gemini or OpenAI support
- there is no environment-level secret setup for model access

The immediate problem to solve first is not "make everything AI-driven."

The immediate problem is:

- establish a secure and explicit configuration path for Gemini
- add Gemini as an optional intelligence layer
- preserve deterministic fallback behavior when the key is missing, invalid, or the provider is unavailable

---

## Implementation Principles

1. Keep deterministic execution primary.
2. Make Gemini additive, not foundational, in phase one.
3. Never require a hosted model to run the existing Playwright executor.
4. Keep read-only reasoning and browser write actions clearly separated.
5. Treat all model outputs as untrusted until validated.
6. Preserve current local-first development workflows.
7. Add observability and eval hooks before expanding model scope too far.

---

## Target Outcome

By the end of this implementation plan, the app should support:

- local Gemini configuration via `.env.local`
- explicit provider selection via environment flags
- startup-time validation for missing or inconsistent LLM configuration
- a single shared LLM client boundary instead of model calls scattered across routes
- Gemini-assisted step normalization, scenario generation, and review analysis behind controlled feature flags
- deterministic fallback when Gemini is unavailable
- clear UI and API messaging indicating whether a run used Gemini assistance or deterministic fallback

---

## Delivery Sequence

### Phase 0: Environment And Secret Setup

Purpose:

- create the first safe and explicit Gemini configuration path for local development

Why this is first:

- nothing else should be built on top of hidden or ad hoc secret handling
- current documentation and code both show there is no real secret manager yet
- the current app persists inline credentials in run state, so model configuration needs to be more disciplined than the existing login-input posture

Files expected to be created or modified:

- new file: `.env.local`
- new file: `.env.example`
- new file: `lib/qa/llm/config.ts`
- optional docs update: `README.md`

Planned environment variables:

```bash
QA_STORE_BACKEND=sqlite
QA_LLM_PROVIDER=gemini
GEMINI_API_KEY=replace_me
GEMINI_MODEL=gemini-2.5-flash
QA_LLM_ENABLED=true
QA_LLM_STEP_PARSING=false
QA_LLM_SCENARIO_GENERATION=false
QA_LLM_REVIEW_ANALYSIS=false
```

Notes:

- `.env.local` should contain the real secret and remain gitignored
- `.env.example` should document required variables without secrets
- `QA_LLM_ENABLED` allows a global on or off switch
- the per-capability flags allow narrow rollout before broad adoption
- if the chosen Gemini model name changes, only configuration should need updating

Implementation tasks:

1. add `.env.example` with all non-secret placeholders and short comments
2. add `.env.local` locally with the operator-supplied Gemini API key
3. create `lib/qa/llm/config.ts` to:
   - read env vars once
   - validate required combinations
   - expose a typed config object
   - produce explicit errors or warnings for invalid setup
4. define one rule for missing secret behavior:
   - do not crash the whole app at startup
   - disable Gemini-backed features and log a clear warning

Acceptance criteria:

- the app can start with or without `GEMINI_API_KEY`
- the app clearly knows whether Gemini-backed features are enabled
- local developers have a documented `.env.local` contract
- no route reads raw provider env vars directly except through the config module

Risks and tradeoffs:

- storing the real key in `.env.local` is acceptable for local development but not a production secret management strategy
- failing hard on missing env would slow down local development, so graceful disablement is preferable

Validation:

- run the app with `QA_LLM_ENABLED=false`
- run the app with `QA_LLM_ENABLED=true` and no key
- run the app with `QA_LLM_ENABLED=true` and a key present
- confirm the exposed config state matches the environment in all three cases

---

### Phase 1: LLM Provider Boundary

Purpose:

- add Gemini through a single, typed, swappable service boundary

Why this is necessary:

- the current codebase has no provider abstraction
- direct provider calls inside API routes would create future migration and testing problems
- a boundary is required if the product later supports OpenAI, Azure OpenAI, or a local model

Files expected to be created or modified:

- new file: `lib/qa/llm/types.ts`
- new file: `lib/qa/llm/provider.ts`
- new file: `lib/qa/llm/gemini-client.ts`
- new file: `lib/qa/llm/noop-client.ts`
- optional new file: `lib/qa/llm/prompts.ts`

Recommended boundary design:

- `QaLlmClient`
  - `normalizeSteps(input)`
  - `generateScenarios(input)`
  - `analyzeRun(input)`
- `getQaLlmClient()`
  - returns Gemini client when configured
  - returns deterministic no-op client when disabled

Implementation tasks:

1. define typed input and output contracts for each LLM-assisted capability
2. create a Gemini client implementation using the official Google SDK selected at implementation time
3. create a no-op fallback client that returns `unsupported` or `disabled` status rather than throwing
4. ensure the route layer and QA runtime depend only on the shared interface
5. centralize prompt templates and response schema definitions instead of embedding them inline

Acceptance criteria:

- no route or runtime file imports the Gemini SDK directly except the provider module
- the client returns typed, schema-validated results
- disabled or failed Gemini calls can degrade to deterministic logic without collapsing the run

Risks and tradeoffs:

- a provider boundary adds upfront structure, but it avoids a much more expensive cleanup later
- schema validation adds implementation overhead, but it is mandatory if model output will influence execution planning

Validation:

- unit-test config-disabled behavior
- unit-test invalid provider response handling
- unit-test JSON schema or Zod validation failures

---

### Phase 2: Gemini-Assisted Step Parsing

Purpose:

- improve natural-language step understanding while preserving the current rule-based parser as fallback

Current weakness:

- current parsing is based on fixed keyword heuristics and quickly falls back to generic observation when phrasing is unfamiliar

Files expected to be created or modified:

- `lib/qa/step-parser.ts`
- new file: `lib/qa/llm/step-normalization.ts`
- `app/api/steps/parse/route.ts`
- `lib/types.ts`

Approach:

- keep the current parser as the baseline path
- add an optional Gemini normalization pass before or after heuristic parsing
- require structured output that maps into the existing `ParsedStep` shape

Recommended execution order:

1. if `QA_LLM_STEP_PARSING=false`, use current parser only
2. if enabled, send the step text to Gemini for structured normalization
3. validate the response strictly
4. if validation fails or confidence is low, fall back to current heuristic parsing
5. persist metadata showing whether Gemini or heuristic parsing was used

Acceptance criteria:

- ambiguous user steps produce better structured actions when Gemini is enabled
- invalid or low-confidence responses fall back safely
- existing consumers of `ParseStepsResponse` remain compatible

Validation:

- compare current parser output and Gemini-assisted output on a seed set of real user step examples
- include English, Spanish, mixed-language, and vague phrasing cases
- include malformed provider response tests

---

### Phase 3: Gemini-Assisted Scenario Generation

Purpose:

- make scenario suggestions more relevant to the stated feature, role, and discovered UI surface

Current weakness:

- the current generator is coherent but largely template-based and repetitive across products

Files expected to be created or modified:

- `lib/qa/scenario-generator.ts`
- new file: `lib/qa/llm/scenario-generation.ts`
- `app/api/scenarios/generate/route.ts`
- `lib/types.ts`

Approach:

- keep the current deterministic generator as the guaranteed baseline
- add Gemini as an optional scenario suggestion engine that receives:
  - normalized plan data
  - parsed steps
  - crawl summary
  - risk posture
- require structured scenario output using the existing `Scenario` schema or a close extension of it

Acceptance criteria:

- scenarios become more feature-specific and less generic
- model output never bypasses schema validation
- current deterministic generation remains available for local or offline use

Validation:

- compare deterministic vs Gemini-assisted scenarios over a curated sample of flows
- review for duplication, unsupported assertions, and invented acceptance criteria

---

### Phase 4: Gemini-Assisted Review Analysis

Purpose:

- improve the usefulness of post-run QA analysis without letting the model alter raw evidence

Current weakness:

- the current analysis layer is bounded and useful, but limited to hand-authored heuristics

Files expected to be created or modified:

- `lib/qa/discovery-engine.ts`
- new file: `lib/qa/llm/review-analysis.ts`
- `lib/types.ts`
- `components/qa/review-workflow-view.tsx`

Approach:

- Gemini analysis should operate only after evidence capture is complete
- it should consume structured evidence, not raw browser authority
- it may generate:
  - insight candidates
  - human-readable summaries
  - stronger defect narratives
- it must never overwrite raw artifacts, step results, or trace evidence

Acceptance criteria:

- review insights become more specific and actionable
- every generated insight references actual stored evidence
- deterministic evidence remains the source of truth

Validation:

- confirm every generated insight cites existing evidence references
- compare generated summaries against raw artifacts for hallucination risk

---

### Phase 5: UI And Operator Transparency

Purpose:

- make it explicit to operators when Gemini was used, where it was used, and when fallback occurred

Files expected to be created or modified:

- `components/qa/draft-workflow-view.tsx`
- `components/qa/monitor-workflow-view.tsx`
- `components/qa/review-workflow-view.tsx`
- `components/settings/settings-screen.tsx`
- `lib/qa/run-view-model.ts`
- `lib/types.ts`

Implementation tasks:

1. show provider posture in Settings
2. show whether Gemini is configured, enabled, partially enabled, or unavailable
3. show per-run metadata such as:
   - parsing source: heuristic or Gemini
   - scenario generation source: deterministic or Gemini
   - review analysis source: heuristic or Gemini
4. surface fallback warnings when Gemini is enabled but failed

Acceptance criteria:

- the operator never has to guess whether model assistance was active
- failures in Gemini assistance are visible but do not imply browser execution failure automatically

---

### Phase 6: Security And Secret Handling Hardening

Purpose:

- avoid compounding the current local-secret posture with an equally loose model-secret posture

Current concerns already visible in the repo:

- login email and password exist in the persisted run plan shape
- Settings already admits there is no real vault backend

Files expected to be created or modified:

- `lib/qa/store.ts`
- `lib/types.ts`
- `components/settings/settings-screen.tsx`
- new file: `docs/SECURITY_NOTES.md` or plan follow-up

Implementation tasks:

1. ensure `GEMINI_API_KEY` is never persisted in app data, events, warnings, or artifacts
2. ensure provider errors are sanitized before surfacing to UI or storage
3. add explicit redaction tests for model-related errors
4. begin a follow-on plan to reduce persisted inline login credentials in run state

Acceptance criteria:

- no provider secret appears in run records, logs, warnings, or traces
- model-related failures are visible but safe to retain

---

### Phase 7: Evaluation And Release Gates

Purpose:

- keep the Gemini rollout measurable and reversible

Why this matters:

- the documentation set already establishes that trace capture, tool versioning, and evaluation gates are required for serious agent behavior
- without evaluation, the team will not know whether Gemini improves quality or simply changes style

Files expected to be created or modified:

- new file: `docs/plans/QA_WEB_TESTING_AGENT_GEMINI_EVAL_PLAN.md`
- new file: `resources/QA-Agent/evals/` or equivalent test fixtures
- optional tests under `lib/qa/`

Evaluation dataset should include:

1. happy-path explicit steps
2. ambiguous step wording
3. missing expected outcomes
4. mixed-language input
5. login and permission-sensitive flows
6. unsupported or unsafe requests
7. provider timeout or malformed output
8. no-key fallback scenarios

Release gate metrics:

- parse quality improvement vs baseline
- scenario relevance improvement vs baseline
- hallucinated or unsupported scenario rate
- fallback frequency
- provider latency impact
- provider error rate

Acceptance criteria:

- Gemini is not considered production-ready without a baseline evaluation set
- model prompts, schemas, and selected model version are recorded per release

---

## Recommended File Map

### New files

- `.env.example`
- `lib/qa/llm/config.ts`
- `lib/qa/llm/types.ts`
- `lib/qa/llm/provider.ts`
- `lib/qa/llm/gemini-client.ts`
- `lib/qa/llm/noop-client.ts`
- `lib/qa/llm/step-normalization.ts`
- `lib/qa/llm/scenario-generation.ts`
- `lib/qa/llm/review-analysis.ts`
- `docs/plans/QA_WEB_TESTING_AGENT_GEMINI_EVAL_PLAN.md`

### Existing files likely to change

- `README.md`
- `lib/types.ts`
- `lib/qa/step-parser.ts`
- `lib/qa/scenario-generator.ts`
- `lib/qa/discovery-engine.ts`
- `lib/qa/store.ts`
- `app/api/steps/parse/route.ts`
- `app/api/scenarios/generate/route.ts`
- `components/settings/settings-screen.tsx`
- `components/qa/draft-workflow-view.tsx`
- `components/qa/review-workflow-view.tsx`

---

## Risks, Tradeoffs, And Edge Cases

### Risk 1: False confidence from model output

Gemini may produce plausible but unsupported structured steps or scenarios.

Mitigation:

- strict schema validation
- deterministic fallback
- evidence-linked review only

### Risk 2: Provider dependency undermines a working local tool

If Gemini becomes mandatory too early, the current useful local workflow becomes more fragile.

Mitigation:

- keep existing deterministic runtime intact
- treat Gemini as optional augmentation

### Risk 3: Secret handling debt gets worse

The current product already has weak local credential posture for login inputs.

Mitigation:

- keep Gemini key only in `.env.local`
- never persist model keys
- prioritize follow-up cleanup of inline login credential persistence

### Risk 4: Latency and cost regressions

Provider calls can slow parsing and scenario generation.

Mitigation:

- feature flags by capability
- lightweight model choice by default
- explicit timeout and fallback behavior

### Risk 5: Mixed source of truth confusion

Operators may not know whether a result came from heuristics or Gemini.

Mitigation:

- clear UI labels and run metadata

---

## Validation Strategy

Implementation should be validated in four layers.

### 1. Configuration validation

- env present and absent cases
- invalid provider settings
- missing model name
- key present but capability flags disabled

### 2. Contract validation

- model output passes schema validation
- malformed output falls back safely
- disabled client behaves predictably

### 3. Behavioral validation

- better parsing on ambiguous real-world instructions
- better scenario relevance for known product flows
- analysis summaries remain grounded in stored evidence

### 4. Safety validation

- provider secrets never appear in run artifacts or warnings
- model-generated content never directly triggers write actions without deterministic checks

---

## Recommended Execution Order

1. Phase 0: `.env.local`, `.env.example`, typed config, graceful disablement
2. Phase 1: provider abstraction and Gemini client boundary
3. Phase 2: Gemini-assisted step parsing behind a flag
4. Phase 3: Gemini-assisted scenario generation behind a separate flag
5. Phase 4: Gemini-assisted review analysis after evidence capture only
6. Phase 5: operator transparency in Settings, Draft, Monitor, and Review
7. Phase 6: secret-handling hardening and redaction tests
8. Phase 7: eval dataset and release gates

---

## Definition Of Done

This plan is considered implemented only when all of the following are true:

- `.env.local` and `.env.example` define a clear Gemini configuration contract
- Gemini can be enabled or disabled without breaking the current QA runtime
- the app uses a single provider abstraction rather than ad hoc SDK calls
- heuristic fallback remains available and verified
- operators can see where Gemini assistance was used
- provider secrets are not persisted
- an evaluation dataset exists before broad rollout

---

## Immediate Next Action

The first implementation task should be:

1. create `.env.example`
2. create `.env.local` locally with the Gemini key
3. add `lib/qa/llm/config.ts`
4. add a minimal Settings indicator that reports whether Gemini is configured

That is the smallest correct slice because it establishes configuration, validation, visibility, and a safe foundation before any model behavior is introduced.