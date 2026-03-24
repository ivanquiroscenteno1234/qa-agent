# QA Web Testing Agent Implementation Plan

## Goal

Design a production-capable QA agent that can:

- execute plain-language web testing steps provided by a user
- behave like a strong QA engineer rather than a brittle recorder
- generate meaningful test scenarios from requirements, flows, and risk areas
- collect evidence, classify outcomes, and report failures clearly
- operate with explicit runtime controls, approvals, and observability

---

## User Job To Be Done

The primary user job is:

- give the agent a target web application, environment details, credentials, and a testing objective
- optionally provide explicit steps in plain text
- ask the agent to execute those steps, validate expected behavior, and report pass or fail with evidence
- ask the agent to think like QA and generate additional scenarios that should also be tested
- receive structured results, defects, traces, screenshots, and reusable test artifacts

Representative input:

```text
Go to site YYY.COM
Login using credentials testuser and password123
Go to the Menu view in the left side menu options
Open the Menu section "Desserts"
Make sure you can edit it. If you can, report success. If you can't, report failed.
```

The user is not asking for a raw browser automation bot. They are asking for an agent that can combine:

- deterministic execution of explicit instructions
- adaptive reasoning when the UI differs from expectation
- QA-style scenario generation
- defect-oriented reporting

---

## Why An Agent Is Needed

### Decision ladder

#### Single model call

Not sufficient.

Reason:

- the system must interact with a live browser and validate outcomes from environmental feedback

#### Retrieval-augmented generation

Not sufficient by itself.

Reason:

- retrieval may help with product requirements, prior bugs, test data, and documentation, but it does not execute the application

#### Deterministic workflow

Insufficient as the sole architecture.

Reason:

- some user flows are known in advance, but real sites vary in labels, layouts, popups, authentication steps, loading states, and error recovery paths
- a fixed script becomes brittle when the environment differs even slightly from the described steps

#### Tool-using bounded agent

Required.

Reason:

- the agent must react to page state, choose navigation and inspection actions, recover from partial mismatch, and decide when it has enough evidence to declare success or failure

#### Multi-agent system

Not required initially.

Reason:

- the core product can be implemented as a single bounded agent with well-structured submodes
- specialization can be encoded in deterministic phases rather than separate autonomous agents
- multi-agent coordination would add overhead before proving value

### Architecture conclusion

The recommended baseline is:

- planner-executor style bounded QA agent
- deterministic phase transitions
- browser automation as the primary execution tool
- optional retrieval over requirements, bug history, and application metadata

This is more capable than a script runner and less complex than a multi-agent system.

---

## What A Real QA Engineer Typically Does

The plan should mirror actual QA work rather than only replaying steps.

### Core QA responsibilities relevant to this agent

- understand the feature or user story being tested
- identify test scope, assumptions, and risks
- verify happy paths and business-critical flows
- probe negative cases, edge cases, and error handling
- compare observed behavior with expected behavior
- capture reproducible evidence when behavior is incorrect
- classify issues by severity, impact, and confidence
- maintain regression coverage for previously verified behavior
- escalate unclear expected behavior instead of inventing acceptance criteria

### Testing modes the agent should support

- smoke testing
- functional testing
- end-to-end flow validation
- regression testing
- exploratory testing
- negative and boundary testing
- role and permission testing
- data validation and state transition testing
- cross-browser execution when required

### QA behaviors the agent must emulate

- treat explicit user steps as a starting point, not the entire test strategy
- think in terms of preconditions, actions, expected outcomes, and risks
- test user-visible behavior rather than implementation details
- separate observation from interpretation
- document enough evidence for a developer or product owner to reproduce the result
- timebox exploratory activity and keep its charter explicit

External references used for this plan support these behaviors:

- Atlassian emphasizes that exploratory testing is simultaneous learning, test design, and execution and is useful for finding edge cases beyond scripted flows.
- Atlassian also distinguishes smoke, functional, end-to-end, acceptance, and performance testing, which maps well to explicit testing modes in the product.
- Playwright best practices reinforce resilient automation through user-facing locators, isolated runs, web-first assertions, traces, and debugging artifacts.

---

## Product Scope

### In scope for version 1

- browser-based web application testing
- plain-text step ingestion
- login and authenticated flows
- validation of visible UI behavior and editable states
- screenshot and trace capture
- structured pass, fail, blocked, and inconclusive outcomes
- QA-generated additional scenarios from a known feature or flow
- reusable test runs with environment and credential profiles

### Out of scope for version 1

- native mobile apps
- deep API performance testing
- full accessibility certification
- unrestricted destructive production actions
- autonomous bug filing into external systems without approval
- unbounded exploratory sessions with no runtime limits

---

## Recommended Architecture Pattern

### Pattern

- bounded planner-executor agent with deterministic phase gates

### Why this fits

- planning is needed to convert plain text instructions into executable intent
- execution must adapt to environmental feedback from the browser
- deterministic phases keep the system observable and testable
- approvals can be attached to specific risky transitions

### Phases

1. Intake and normalization
2. Test understanding and requirement extraction
3. Scenario generation and prioritization
4. Execution planning
5. Browser execution
6. Validation and evidence collection
7. Result classification
8. Defect report generation
9. Artifact packaging and final summary

The agent may iterate within phases 4 through 6, but transitions between phases should be explicit and traceable.

---

## Capability Model

### Mode 1: Step Executor

Purpose:

- execute user-provided steps faithfully against a target environment

Responsibilities:

- parse steps into structured actions
- resolve ambiguous UI references using page evidence
- perform actions safely
- verify stated expectations
- stop and report when blocked or when confidence drops below threshold

Example outputs:

- step-by-step status timeline
- pass or fail outcome
- screenshots and DOM evidence
- reproduction notes

### Mode 2: Scenario Generator

Purpose:

- generate test scenarios as a human QA engineer would

Responsibilities:

- infer feature intent from user stories, UI content, and explicit scope
- generate happy path, negative, edge, permission, state, and regression scenarios
- identify missing test data or ambiguous acceptance criteria
- propose priority by business risk and defect likelihood

Example outputs:

- scenario matrix
- risk-based prioritization
- coverage gaps

### Mode 3: Exploratory QA

Purpose:

- explore the product within a charter and timebox

Responsibilities:

- create a concise exploratory charter
- test for usability failures, inconsistent states, weak validations, broken navigation, and role-specific issues
- convert interesting findings into reproducible scenarios

Example outputs:

- exploratory session notes
- discovered defects
- candidate scripted regression tests

### Mode 4: Regression Runner

Purpose:

- rerun approved scenarios or previously failed issues across builds and environments

Responsibilities:

- execute predefined scenarios consistently
- compare results with baseline
- highlight regressions and flaky behavior

---

## Required Inputs

The UI and API should capture these inputs explicitly.

### Minimum run inputs

- target URL or environment selection
- testing objective
- testing mode
- plain-text steps or scenario selection
- success criteria or expected outcomes

### Recommended run inputs

- credentials reference
- user role
- browser and device target
- environment notes
- build or release identifier
- feature area
- risk level
- timebox
- attachments such as requirements, screenshots, or prior bug links

### High-value optional context

- product requirements or acceptance criteria
- known bug history
- data setup instructions
- allowed and forbidden actions
- selectors or stable test IDs if available
- cleanup instructions

---

## Structured State Model

The agent should maintain explicit structured state rather than relying on prompt history.

### Run state

- run_id
- tenant_id or workspace_id
- user_id
- environment_id
- browser_target
- start_time
- deadline
- current_phase
- final_status

### Test context state

- feature_name
- user_goal
- mode
- provided_steps_raw
- provided_steps_structured
- expected_results
- assumptions
- blocked_by

### Execution state

- current_url
- current_page_title
- auth_state
- active_modal_or_popup
- last_action
- last_observation
- executed_step_index
- retries_used
- tool_calls_used

### Evidence state

- screenshots
- trace_id
- console_errors
- network_failures
- DOM snapshots
- field_values_observed
- assertions_passed
- assertions_failed

### QA analysis state

- generated_scenarios
- risks_identified
- coverage_gaps
- defect_candidates
- confidence_score

---

## Tool Catalog

Design tools with narrow purpose and typed input and output.

### Browser navigation tool

Use for:

- open URL
- go back
- refresh

Returns:

- URL reached
- load state
- title
- navigation errors

### Page observation tool

Use for:

- read visible content
- inspect headings, forms, buttons, menus, tables, dialogs, validation messages

Returns:

- structured UI snapshot
- element candidates with confidence
- notable warnings such as overlays or auth redirects

### Browser action tool

Use for:

- click, type, select, hover, press keys, drag, upload

Returns:

- action attempted
- target resolution evidence
- success or failure
- actionability errors

### Assertion tool

Use for:

- visible text checks
- enabled or disabled state checks
- editable checks
- URL checks
- toast or alert checks
- table row or form state checks

Returns:

- assertion name
- expected value
- actual value
- pass or fail
- confidence

### Evidence capture tool

Use for:

- screenshots
- trace capture
- console logs
- network request summaries

Returns:

- artifact IDs and paths

### Scenario generation tool

Use for:

- produce structured QA scenarios from feature context

Returns:

- scenario list
- risk tags
- prerequisites
- expected outcomes

### Requirement retrieval tool

Use for:

- fetch user story, acceptance criteria, prior defects, and known constraints

Returns:

- cited source excerpts
- unresolved ambiguity list

### Defect packaging tool

Use for:

- create structured defect summaries for user review

Returns:

- title
- severity proposal
- steps to reproduce
- expected result
- actual result
- evidence bundle

### Credential vault tool

Use for:

- retrieve credentials by reference only

Rules:

- never inject raw secrets into prompt text
- credentials must be fetched just in time and redacted from logs

---

## Plain-Text Step Parsing Strategy

Users will provide natural language, not formal test code. The agent must normalize text into an executable representation.

### Parsing output shape

Each step should become:

- action type
- target description
- input data if any
- expected result if any
- fallback interpretation rules
- risk classification

### Example normalization

Input:

```text
Go to site YYY.COM
Login using credentials testuser and password123
Go to the Menu view in the left side menu options
Open the Menu section "Desserts"
Make sure you can edit it, if you can report as success, if you cant, report as failed.
```

Normalized interpretation:

1. Navigate to URL `YYY.COM`
2. Authenticate with provided credential reference
3. Find left-side navigation item matching `Menu`
4. Open section matching `Desserts`
5. Determine whether the selected item is editable
6. Report pass if editable controls are actionable, fail otherwise

### Ambiguity handling rules

- if multiple elements match, prefer user-visible label and local context
- if login fields are unclear, search for common auth patterns before failing
- if the exact label is absent, look for semantically close alternatives and record the substitution
- if the expected outcome is underspecified, stop with an ambiguity flag unless the system can infer a safe, user-visible validation

---

## Test Scenario Generation Strategy

This is the part that makes the system a QA agent instead of only a browser runner.

### Scenario categories

- happy path
- negative path
- boundary and limit cases
- field validation cases
- role and permission cases
- navigation and state persistence cases
- error handling and recovery cases
- regression cases based on prior failures
- exploratory charters for unknown risk areas

### Scenario design heuristics

Use these heuristics explicitly:

- equivalence-style grouping of valid versus invalid input classes
- boundary thinking for min, max, empty, null, and overlong values
- state transition thinking for draft, saved, published, archived, locked, or disabled states
- role-based thinking for admin, editor, viewer, guest, and unauthorized users
- interruption thinking for refresh, back navigation, modal dismissal, timeout, and network disturbance
- data integrity thinking for duplicate names, conflicting edits, stale records, and partial saves

### Example scenarios for the sample request

#### Core validation

- editor can open `Desserts` and access edit controls
- editor can modify a field and save successfully
- viewer can open `Desserts` but cannot edit

#### Negative scenarios

- invalid credentials prevent access and show an error
- missing `Desserts` section is reported as a navigation failure rather than a false pass
- unsaved changes warning appears when leaving edit mode after modification

#### Edge scenarios

- `Desserts` opens from different menu states such as collapsed or expanded sidebar
- long section names or localized labels still allow correct resolution
- edit controls are visible but disabled due to permission or state lock

#### Exploratory charter

- explore the menu management area for inconsistent editable states, broken save flows, stale data after refresh, and role leakage between viewer and editor permissions

### Output format for generated scenarios

Each generated scenario should include:

- scenario ID
- title
- priority
- type
- prerequisites
- steps
- expected result
- risk rationale
- whether it is approved for automated execution

---

## Execution Model

### Phase 1: Intake and validation

Tasks:

- validate required inputs
- retrieve credentials by reference
- identify whether this is a scripted run, scenario generation request, or combined run
- classify risk and environment

### Phase 2: Planning

Tasks:

- parse plain-text steps
- create structured execution plan
- generate or import scenarios if requested
- request approval if the plan includes risky actions

### Phase 3: Environment readiness

Tasks:

- launch browser context
- select browser and device profile
- verify environment availability
- perform login if needed
- confirm user role after login

### Phase 4: Execution loop

Loop structure:

1. observe page
2. resolve intended target
3. take one action
4. wait for resulting UI change
5. assert the expected outcome
6. capture evidence if outcome is unexpected
7. retry only within bounded rules

### Phase 5: QA expansion

If enabled, the agent should:

- propose additional scenarios
- execute only approved scenarios
- timebox exploratory checks

### Phase 6: Reporting

Tasks:

- classify each scenario as pass, fail, blocked, skipped, or inconclusive
- produce defect candidates
- summarize risk and coverage gaps
- attach artifacts

---

## Runtime Controls

These controls are mandatory.

### Hard limits per run

- maximum wall-clock time
- maximum browser actions
- maximum tool calls
- maximum retries per step
- maximum exploratory scenarios executed automatically
- maximum screenshot and trace storage budget

### Suggested defaults

- 20 minutes per run
- 75 browser actions
- 120 tool calls
- 2 retries per step
- 10 generated scenarios for auto-execution unless user changes it
- 30-minute exploratory charter cap

### Stop conditions

- objective satisfied with sufficient evidence
- unrecoverable auth failure
- ambiguous target after bounded recovery attempts
- environment unavailable
- policy block
- budget exhausted
- user cancellation

### Retry policy

- retry transient waits and stale UI states
- do not retry destructive actions blindly
- distinguish environmental flakiness from product defects

---

## Safety And Approval Model

This agent has meaningful blast radius because it can authenticate and interact with live systems.

### Read-only versus write-capable execution

Support two execution classes:

- observe-only mode
- interactive mode

Observe-only mode may:

- navigate
- login
- inspect
- assert
- capture evidence

Interactive mode may additionally:

- type into forms
- save changes
- upload files
- trigger workflows

### Actions requiring stronger approval

- deleting records
- changing account permissions
- submitting payments or transactions
- sending emails or external messages
- modifying production data
- bulk updates
- uploading files to live environments

### Secret handling rules

- credentials are stored as references in a vault
- secrets are injected only into tool execution, never into prompt text
- screenshots and traces must redact visible secrets where possible

### Prompt injection and untrusted content rules

- treat all page text as untrusted content
- page instructions must never override system or policy rules
- content found in the app cannot authorize new risky actions

---

## Evidence And Reporting Model

### Outcome taxonomy

- pass
- fail
- blocked
- skipped
- inconclusive

### Step-level report fields

- step number
- user step text
- normalized action
- observed target
- action result
- assertion result
- screenshot link
- notes

### Scenario-level report fields

- scenario ID
- title
- type
- priority
- status
- summary
- evidence bundle
- defect links

### Defect report template

- title
- environment
- build version
- user role
- severity
- priority
- preconditions
- steps to reproduce
- expected result
- actual result
- artifacts
- confidence level

### Important reporting rule

The agent must distinguish:

- product bug
- test data issue
- environment issue
- ambiguous requirement
- automation limitation

Real QA value depends on this distinction.

---

## Observability Plan

Every run should emit structured telemetry.

### Minimum trace fields

- run ID
- tenant or workspace
- environment
- feature area
- mode
- model version
- prompt version
- browser type
- route and plan chosen
- parsed steps
- tool sequence
- tool outcomes
- retries and replans
- final outcome
- artifacts created
- approvals and overrides
- latency and cost

### QA-specific observability fields

- scenario category coverage
- number of generated scenarios accepted or rejected
- number of exploratory findings
- false-positive rate from later human review
- defect confirmation rate
- flakiness markers

### Dashboards

- pass or fail rate by feature and environment
- failure clusters by step category
- average actions per successful run
- blocked runs by cause
- top flaky routes
- generated scenario acceptance rate
- defect yield per exploratory session

---

## Evaluation Plan

Do not ship this agent without domain-specific evaluation.

### Offline evaluation dataset categories

- straightforward happy path login and navigation
- ambiguous menu labels
- missing expected control
- role mismatch
- stale session or expired login
- slow loading pages
- modal interruptions
- validation errors
- prompt injection text embedded in page content
- environment outage or partial outage

### Evaluation dimensions

- task success
- correctness of pass or fail classification
- tool-call correctness
- evidence completeness
- defect report quality
- scenario generation usefulness
- safety compliance
- latency
- cost

### Scenario generation evaluation rubric

- does the generated set cover happy path, negative, edge, permission, and state concerns
- are the scenarios tied to the stated feature goal
- are priorities defensible
- does the agent expose missing assumptions instead of fabricating them

### Human review sample policy

- sample at least 20 percent of failed runs initially
- sample at least 10 percent of passed runs initially to detect false passes
- review all blocked high-priority runs

### Regression suite for the agent itself

Maintain benchmark tasks for:

- login flows
- side navigation discovery
- form editing detection
- permission detection
- result classification
- defect summarization

---

## Recommended Technical Stack

### Browser automation

- Playwright

Reason:

- strong cross-browser support
- resilient user-facing locator model
- good debugging artifacts such as traces, screenshots, and network inspection
- proven fit for end-to-end web testing

### Orchestration runtime

- start simple with a direct application orchestration layer or low-level state machine
- move to LangGraph only if durable multi-step state and human interrupts become central

Reason:

- this product needs explicit control more than framework abstraction
- avoid adopting a multi-agent framework before the single-agent baseline proves insufficient

### Storage

- structured run store for state and outcomes
- artifact store for screenshots, traces, and logs
- scenario library for reusable generated and approved tests

### Integrations

- credential vault
- optional bug tracker integration with approval
- optional requirement retrieval source

---

## UI Implementation Plan

The UI must help the user provide enough context for the agent to behave like QA.

### Primary workflow

1. Select environment
2. Define testing objective
3. Choose mode
4. Provide steps or ask for scenario generation
5. Attach context and credentials
6. Review execution plan
7. Approve risky actions if needed
8. Watch run progress
9. Review results, evidence, and generated scenarios
10. Save scenarios for regression reuse

### Screen 1: Run setup

Required UI elements:

- environment selector
- URL field
- feature area field
- test objective text area
- mode selector with `Execute Steps`, `Generate Scenarios`, `Execute And Expand`, `Exploratory Session`, `Regression Run`
- browser selector
- device selector
- user role selector
- credential reference selector
- build version field
- timebox field

Helpful advanced elements:

- risk level selector
- safe mode toggle for observe-only
- approval requirement toggle by action class
- upload area for requirements, screenshots, or sample data

### Screen 2: Step and scenario authoring

Required UI elements:

- plain-text steps editor
- structured scenario table preview
- expected outcomes field
- prerequisites field
- cleanup instructions field

Helpful enhancements:

- parse preview showing how the agent interpreted each plain-text step
- ambiguity warnings panel
- quick-add templates for login, menu navigation, CRUD validation, role checks, and save flows

### Screen 3: Scenario generation workspace

Required UI elements:

- feature summary field
- acceptance criteria field
- risk focus multi-select
- generated scenario table with priority, type, and rationale
- approval checkboxes for scenarios eligible for execution

Suggested scenario filters:

- happy path
- negative
- boundary
- permissions
- state transitions
- regression
- exploratory

### Screen 4: Execution monitor

Required UI elements:

- current phase indicator
- step timeline
- live browser preview or latest screenshot
- active URL and page title
- action log
- retry and warning badges
- stop run button
- manual approve or deny prompts for risky actions

Helpful advanced elements:

- confidence indicator for target resolution
- detected popup or blocker panel
- network and console issue summary

### Screen 5: Results and defect review

Required UI elements:

- final run status
- per-step and per-scenario outcome table
- screenshot gallery
- trace download link
- defect candidate list
- coverage summary
- generated additional scenarios

Actions:

- approve and file defect
- mark as not a bug
- rerun failed scenario
- save scenario to regression suite
- export report

### Screen 6: Scenario library and regression management

Required UI elements:

- saved scenarios table
- filters by feature, environment, role, and priority
- last run status
- flakiness indicator
- schedule or trigger regression run

---

## API And Backend Contract Shape

### Core entities

- Run
- Scenario
- Step
- Artifact
- DefectCandidate
- EnvironmentProfile
- CredentialReference

### Core backend capabilities

- create run
- parse steps
- generate scenarios
- approve execution plan
- start run
- stream run events
- fetch artifacts
- create defect candidate
- save scenario to library

### Event stream examples

- `run.started`
- `phase.changed`
- `step.started`
- `step.completed`
- `assertion.failed`
- `approval.required`
- `artifact.created`
- `scenario.generated`
- `run.completed`

---

## Delivery Roadmap

### Phase 1: Reliable step execution

Deliver:

- step parsing
- browser execution
- login handling
- basic assertions
- screenshots and traces
- pass or fail reporting

### Phase 2: QA reporting maturity

Deliver:

- defect packaging
- environment versus product issue classification
- better evidence summaries
- scenario save and rerun

### Phase 3: Scenario generation

Deliver:

- structured scenario generator
- risk-based prioritization
- approval workflow for generated scenarios

### Phase 4: Exploratory QA support

Deliver:

- timeboxed exploratory charters
- finding capture
- conversion of findings into reusable regression scenarios

### Phase 5: Advanced enterprise controls

Deliver:

- multi-environment governance
- role-based approvals
- bug tracker integrations
- richer analytics and flakiness management

---

## Open Questions To Resolve Before Implementation

- Will the first release run only in staging and test environments, or also in production-like environments?
- What classes of write actions are acceptable without manual approval?
- How should credentials be stored and rotated?
- Is cross-browser coverage mandatory in version 1 or optional?
- Should generated scenarios be editable before execution, mandatory, or optional?
- What bug tracker or test management systems need integration?
- Is accessibility checking part of the QA agent scope or a separate toolchain?
- What is the acceptable false-pass rate for launch?

---

## Recommended Product Positioning

Position this as:

- a bounded QA automation and exploratory testing agent for web applications

Do not position it as:

- an unrestricted autonomous tester that can safely infer any action without review

The product should be opinionated about structured state, evidence, approval, and observability. That is what makes it credible as a replacement for a meaningful slice of real QA work instead of a fragile browser macro.