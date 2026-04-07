# QA Web Testing Agent MVP

This workspace now contains an initial implementation of the QA web testing agent plan as a Next.js application.

## What is implemented

- run setup UI for environment, credentials, mode, risk, and plain-text steps
- step parsing API that turns natural-language steps into structured actions
- QA scenario generation API that expands coverage beyond explicit user steps
- run creation and a real Playwright execution engine with safety-aware outcomes
- no-step exploratory discovery runs that log in, crawl visible navigation, and suggest manual tests
- structured crawl artifacts and exported manual test plans for exploratory sessions
- results view for risk summary, coverage gaps, artifacts, and defect candidates

## What is still intentionally incomplete

- credential vault integration
- database-backed persistence beyond the local file store
- bug tracker integration
- event-streaming execution updates
- recursive cross-route exploration beyond the current top-level navigation walk

## Current Fit

The current MVP is useful across most conventional web applications when the target has:

- standard username and password login flows
- visible navigation and section labels
- common form-driven workflows
- straightforward visibility and editability checks
- settings or configuration surfaces with visible edit affordances

It remains strongest on guided step execution, exploratory discovery, evidence capture, and lightweight deterministic checks.

Known current limits still include:

- role and permission boundary workflows that need stronger dedicated evidence
- targets with weak accessibility metadata or ambiguous visible labels
- SSO, MFA, CAPTCHA, iframe-heavy, upload/download, drag-and-drop, and canvas-heavy interaction models

It should not yet be described as a universal QA agent for arbitrary web applications.

## Documentation

- [QA Agent Operator Guide](docs/QA_AGENT_OPERATOR_GUIDE.md)
- [Target App Compatibility Matrix](docs/QA_AGENT_TARGET_APP_COMPATIBILITY_MATRIX.md)
- [Arbitrary Web App Readiness Roadmap](docs/plans/QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md)
- [Security Notes](docs/SECURITY_NOTES.md)

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Key routes

- `/` dashboard UI
- `/api/steps/parse` parse plain-text steps
- `/api/scenarios/generate` generate QA scenarios
- `/api/runs` create and list runs
- `/api/runs/[runId]` fetch a run
- `/api/runs/[runId]/artifacts/[artifactId]` download crawl, trace, screenshot, or manual-plan artifacts
- `/api/runs/[runId]/start` execute the Playwright-backed run

## Next implementation target

Expand the exploratory crawler into a deeper site map, add save-flow assertions for safe approved writes, and integrate bug filing while preserving the typed run state and API contract.