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