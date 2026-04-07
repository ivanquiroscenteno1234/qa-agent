# QA Agent Arbitrary Web App Readiness Roadmap

## Goal

Define the minimum work needed before this product can credibly claim broad compatibility across unfamiliar web applications.

The current product is already useful as a local QA-agent MVP for conventional web UIs. This roadmap is about closing the gap between that reality and a stronger claim such as "a QA engineer can use this on almost any normal web app."

## Positioning Recommendation

Until the workstreams below are complete, position the app as:

- a local QA-agent MVP
- strongest on guided step execution, exploratory discovery, and evidence review
- best suited to conventional web applications with standard login and visible navigation

Do not position it as a universal browser automation or test platform yet.

## Exit Criteria For A Stronger Compatibility Claim

Before claiming broad target-app support, the product should be able to demonstrate all of the following:

1. Operators have clear documentation for setup, supported patterns, unsupported patterns, outcomes, and troubleshooting.
2. The runtime supports first-class click, fill, select, checkbox, keyboard, upload, and download workflows.
3. Authentication can handle more than a single conventional login-form path.
4. The runner can operate against applications with iframes, non-trivial forms, and richer UI structures.
5. Evidence includes enough diagnostics to explain blocked and failed runs without guesswork.
6. A benchmark suite of representative target-app patterns passes at an acceptable rate.

## Workstream 1: Documentation Truth Pass

### Priority

Immediate

### Why

The current engineering plans describe more capability than the runtime actually exposes. Operators need a truthful product contract before the runtime expands.

### Deliverables

- QA engineer operator guide
- target-app compatibility matrix
- README links and scope notes
- explicit supported and unsupported target patterns
- operator-facing explanation of pass, fail, blocked, cancelled, and inconclusive

### Exit Criteria

- an operator can read the docs and understand whether their target app is a good fit before starting
- the README no longer implies broader support than the code currently provides

### Primary Repo Areas

- `README.md`
- `docs/`

## Workstream 2: Core Interaction Expansion

### Priority

Highest product capability gap

### Why

The current runtime only supports a narrow action surface. That is the biggest blocker to broader target-app compatibility.

### Deliverables

- add first-class action types for:
  - click
  - fill or type
  - select option
  - check or uncheck
  - press key
  - assert URL
- add explicit result modeling for those actions
- add step-authoring guidance and quick templates that map to the expanded actions

### Exit Criteria

- operators can execute a broader set of business workflows without collapsing into generic observation mode
- the parser and executor agree on supported action vocabulary

### Primary Repo Areas

- `lib/types.ts`
- `lib/qa/step-parser.ts`
- `lib/qa/browser-runtime.ts`
- `lib/qa/execution-engine.ts`
- `components/qa/draft-workflow-view.tsx`

## Workstream 3: Authentication And Session Depth

### Priority

Highest target-app compatibility gap after core interactions

### Why

Arbitrary target apps rarely stop at a simple login form. Real QA work needs reusable authenticated state and multiple auth strategies.

### Deliverables

- saved authenticated browser state for supported targets
- multiple role profiles and clearer role handling
- API-auth bootstrap path where targets allow it
- improved session detection and recovery
- explicit operator guidance for unsupported auth patterns such as MFA and CAPTCHA

### Exit Criteria

- standard login-form flows remain stable
- authenticated reuse works for at least one supported pattern beyond per-run login
- operators can distinguish supported auth patterns from unsupported ones before execution

### Primary Repo Areas

- `lib/qa/auth-session.ts`
- `lib/qa/execution-engine.ts`
- `lib/qa/store.ts`
- `components/qa/draft-workflow-view.tsx`
- `components/settings/`

## Workstream 4: Page Structure And Locator Robustness

### Priority

High

### Why

Conventional menus are not enough. Broad target-app support requires stronger target resolution across richer UI structures.

### Deliverables

- iframe-aware targeting
- improved locator fallback order based on user-facing semantics first
- stable targeting guidance for `data-testid` or equivalent contracts when available
- stronger handling for dialogs, tables, tabs, and form groups
- continued regression alignment with saved page-surface evidence

### Exit Criteria

- target resolution failure rates drop for non-trivial UIs
- blocked outcomes become more meaningfully tied to actual unsupported patterns

### Primary Repo Areas

- `lib/qa/browser-runtime.ts`
- `lib/qa/discovery-engine.ts`
- `lib/qa/scenario-executor.ts`
- `lib/qa/navigation-discovery.ts`

## Workstream 5: Evidence And Diagnostics

### Priority

High

### Why

Broader automation is only useful if operators can understand why a run failed or blocked.

### Deliverables

- browser console capture from the target app
- network request summary or targeted request evidence
- download-event capture for target-application downloads
- richer failure-category presentation in the Review workflow
- explicit distinction between tool limitation, auth limitation, and target-app defect

### Exit Criteria

- operators can triage most failures from the Review screen without guessing
- blocked outcomes explain what capability is missing

### Primary Repo Areas

- `lib/qa/artifact-builder.ts`
- `lib/qa/runtime-coordinator.ts`
- `lib/qa/result-builder.ts`
- `components/qa/review-workflow-view.tsx`
- `components/qa/live-console-panel.tsx`

## Workstream 6: Regression Credibility

### Priority

Medium to high

### Why

Current regression mode is useful, but not yet broad enough to be treated as a reusable automation layer for rich workflows.

### Deliverables

- scenario execution policies tied to richer action support
- better blocked versus fail classification
- stronger mapping between generated scenarios and executable steps
- clearer operator guidance on when a saved library is trustworthy enough for regression reuse

### Exit Criteria

- saved scenario libraries can validate more than navigation reachability and auth boundaries
- regression runs become a reliable follow-up to exploratory discovery and step execution

### Primary Repo Areas

- `lib/qa/scenario-generator.ts`
- `lib/qa/scenario-executor.ts`
- `lib/qa/result-builder.ts`
- `components/qa/review-workflow-view.tsx`
- `components/library/`

## Workstream 7: Benchmark And Release Gate

### Priority

Required before changing product positioning

### Why

Compatibility claims should be evidence-based.

### Deliverables

- a benchmark set of representative target-app patterns such as:
  - standard admin dashboard
  - multi-step form flow
  - table-heavy enterprise UI
  - iframe-based app
  - SSO-gated app
  - upload and download workflow
- pass or blocked criteria for each benchmark target
- release gate for updating public product claims

### Exit Criteria

- the team can point to measured results instead of intuition when describing compatibility

### Primary Repo Areas

- `docs/plans/`
- benchmark validation assets to be defined later

## Recommended Execution Order

1. Documentation truth pass
2. Core interaction expansion
3. Authentication and session depth
4. Page structure and locator robustness
5. Evidence and diagnostics
6. Regression credibility
7. Benchmark and release gate

## Recommended Product Claim After This Pass

For the current repository state, the most accurate product claim is:

- "Local QA-agent MVP for conventional web applications with standard login, visible navigation, exploratory discovery, and evidence review."

Do not upgrade that claim until the benchmark gate and the core interaction, auth, and diagnostics workstreams are substantially complete.

## Related Docs

- [QA_AGENT_OPERATOR_GUIDE.md](../QA_AGENT_OPERATOR_GUIDE.md)
- [QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md](../QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md)
- [QA_WEB_TESTING_AGENT_IMPLEMENTATION_PLAN.md](QA_WEB_TESTING_AGENT_IMPLEMENTATION_PLAN.md)
- [QA_WEB_TESTING_AGENT_IMPROVEMENT_PLAN.md](QA_WEB_TESTING_AGENT_IMPROVEMENT_PLAN.md)