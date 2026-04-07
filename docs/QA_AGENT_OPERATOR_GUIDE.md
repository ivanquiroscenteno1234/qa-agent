# QA Agent Operator Guide

## Purpose

This guide explains how a QA engineer should use the current QA Agent MVP.

It is written for the product as it exists in this repository today, not for the broader future vision described in the implementation plans.

## Product Position

The current app is best treated as:

- a local, single-operator QA workspace
- a Playwright-backed assistant for most conventional web applications with standard login, visible navigation, and common form-driven workflows
- a tool for guided step execution, exploratory discovery, scenario generation, and lightweight regression reuse

It is not yet a universal browser automation platform for arbitrary web applications.

Use it confidently when the target application has:

- a normal web UI
- visible navigation and buttons
- a conventional username and password login form
- common form-driven or settings-style workflows
- flows that can be described in plain language such as "go to", "open", "login", "make sure visible", or "make sure editable"

Expect limitations when the target application depends on:

- SSO, MFA, or CAPTCHA
- iframe-heavy workflows
- file upload or download verification
- drag-and-drop interactions
- complex rich text editors or canvas-heavy UIs
- network inspection or API assertions

See the compatibility matrix in [QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md](QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md) before pointing the tool at an unfamiliar product.

## Best-Fit Use Cases

The current MVP is a good fit for:

- smoke checks on known dashboard flows
- exploratory discovery on a new admin or operations UI
- validating that key sections are reachable and visibly correct
- confirming that a section appears editable without submitting changes
- multi-section settings or configuration workspaces with visible section labels and edit controls
- generating a manual-test backlog from a feature area
- rerunning a saved scenario library for lightweight regression comparison

## Quick Start

1. Start the app locally.

   ```bash
   npm install
   npm run dev
   ```

2. Open the Draft workflow at `http://localhost:3000/draft`.

3. Fill in the run context:

   - Environment
   - Target URL
   - Feature Area
   - Testing Objective
   - Browser
   - Role
   - Mode
   - Safe Mode

4. Prefer a saved credential profile over inline credentials.

   Reason:

   - saved profiles are better for repeat use
   - inline credentials are intended for quick local checks and should be avoided when the run history must remain cleaner

5. Choose the mode that matches the task.

6. If you have a known flow, write one action per line in Plain-Text Steps.

7. Use Parse Preview to inspect how the agent interpreted the steps.

8. Use Generate Scenarios when you want broader QA coverage beyond explicit steps.

9. Create the run.

10. Go to Monitor and start the run.

11. Review the final artifacts, evidence timeline, suggested manual scenarios, and defect candidates in Review.

## Choosing The Right Mode

| Mode | Best For | What It Produces | Current Caveat |
| --- | --- | --- | --- |
| Execute Steps | Known guided flow | Step-by-step execution evidence | Only a narrow set of step actions is executable today |
| Generate Scenarios | Coverage ideation | Risk-based scenario list | Generated scenarios are not equivalent to a full executable suite |
| Exploratory Session | Unfamiliar product area | Discovery evidence and manual test suggestions | Exploration depth is still limited |
| Regression Run | Reuse of saved scenario libraries | Lightweight regression comparison | Current regression execution is broader than smoke checks, but narrower than full end-to-end replay |

## Writing Effective Steps

The current parser and executor work best when steps are short, concrete, and user-facing.

### Good Patterns

- `Go to https://example.com`
- `Login using the saved admin account`
- `Open the Orders section`
- `Open the Pending Orders tab`
- `Make sure the Export button is visible`
- `Make sure the Customer Details section is editable`

### Avoid These Patterns

- long paragraphs with multiple actions in one line
- CSS selectors or XPath references
- implementation terms that a user would never see
- branching instructions like "if this fails then try that"
- mixed expectations inside one step

### Step Authoring Rules

1. Use one action per line.
2. Refer to visible labels, section names, menu names, and URLs.
3. Prefer explicit verbs such as `Go to`, `Login`, `Open`, and `Make sure`.
4. Split a complex workflow into smaller steps.
5. If the parse preview looks wrong, rewrite the steps before starting the run.

## Credential Guidance

### Preferred Pattern

Use a saved credential profile whenever possible.

### When Inline Credentials Are Acceptable

Use inline credentials only for short-lived local checks where you intentionally want to provide the credentials directly in the run form.

### Operator Rules

1. Use test accounts, not personal or production accounts.
2. Keep Safe Mode on for the first run against a new target.
3. Prefer staging or sandbox environments.
4. Treat saved credentials as target-specific and do not reuse them loosely across unrelated domains.

## What Works Well Today

The current runtime is strong enough for:

- normal URL navigation
- conventional email and password login forms
- opening menus and sections by visible text
- checking whether a visible element exists
- checking whether an edit flow exposes editable fields
- moving across visible settings sections and repeating editability checks on the active section
- headless and visible browser execution
- basic Chromium, Firefox, and WebKit selection
- screenshot, trace, crawl, and summary artifact review

## What Is Partial Or Limited Today

The current runtime is usable but limited for:

- broader scenario-based regression validation
- cross-browser confidence beyond basic browser selection
- exploratory discovery outside top-level visible navigation
- language-heavy or ambiguous step phrasing
- role and permission boundary workflows
- non-standard UI component libraries with weak accessibility metadata

## What Is Not Yet Supported For Reliable Operator Use

Treat these as unsupported or manual-follow-up territory:

- SSO, OAuth, MFA, or CAPTCHA-heavy login flows
- API-based authentication bootstrap
- file uploads
- target-application download verification
- drag-and-drop workflows
- iframe-targeted interaction strategies
- explicit browser network assertions or response inspection
- browser console capture from the target app
- multi-role concurrent execution in one run
- true device emulation or mobile-browser fidelity

## Understanding Outcomes

The data model includes these run outcomes:

- `pass`
- `fail`
- `blocked`
- `cancelled`
- `inconclusive`

In current operator practice, most finished runs will end as `pass`, `fail`, `blocked`, or `cancelled`.

### Pass

The current supported checks succeeded.

Interpretation:

- the agent completed the supported flow it understood
- this does not imply full product correctness outside the tested surface

### Fail

The runtime attempted a supported check and observed behavior that contradicted the expected outcome.

Interpretation:

- review the timeline, screenshots, and artifacts first
- treat as a likely real defect or environment mismatch until disproven

### Blocked

The agent could not complete the scenario safely or deterministically.

Interpretation:

- this may be a target-app issue
- this may also reflect a current product limitation
- blocked does not mean pass

Examples:

- unsupported auth pattern
- target requires alternate credentials not configured for the run
- current runtime cannot map the requested scenario to a safe deterministic action

### Cancelled

The operator stopped the run.

### Inconclusive

This status exists in the model, but it is not a primary current operator outcome. Treat any inconclusive result as manual-review-required.

## Evidence You Can Expect

The Review workflow is currently strongest for these artifacts:

- per-step or per-scenario screenshots
- Playwright trace archive
- crawl artifact summarizing visible headings, links, buttons, and inputs
- run summary report
- manual test plan export
- generated scenario suggestions
- defect candidates based on observed failures

The current MVP does not yet provide:

- full browser console logs from the target application
- network request and response summaries
- target-app download capture and validation

## Troubleshooting

### The Parse Preview Looks Wrong

- simplify the language
- reduce each line to one explicit action
- replace vague words like `check everything` with one observable expectation

### The Run Is Blocked

Check whether the target flow needs something the runtime does not yet handle:

- alternate role
- invalid-credential scenario
- SSO or MFA
- upload or download behavior
- iframe-only interaction

If yes, convert the blocked path into a manual follow-up item.

### Login Failed

Check these in order:

1. The URL is correct.
2. The target exposes a normal login form.
3. The saved credential profile is active.
4. The account is valid for the target environment.

### The Agent Could Not Find A Target Section

- make the step more explicit
- use the exact visible label when possible
- start with an exploratory run to learn the current navigation surface first

### The Target App Is Richer Than The Current Runtime

If the app depends on uploads, downloads, complex widgets, or embedded frames, do not force the tool into a false pass. Use the tool for discovery and evidence capture, then record the unsupported gap for manual or future automation coverage.

## Recommended Operator Workflow

For an unfamiliar target app:

1. Start with an exploratory session in Safe Mode.
2. Review the crawl artifact and screenshots.
3. Generate scenarios from the discovered surface.
4. Save the best scenarios into a scenario library.
5. Use Execute Steps for the most business-critical deterministic checks.
6. Use Regression Run only after the saved scenarios reflect real product structure.

## Related Docs

- [QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md](QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md)
- [SECURITY_NOTES.md](SECURITY_NOTES.md)
- [QA_WEB_TESTING_AGENT_IMPLEMENTATION_PLAN.md](plans/QA_WEB_TESTING_AGENT_IMPLEMENTATION_PLAN.md)
- [QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md](plans/QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md)