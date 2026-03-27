# QA Agent Final Findings Report

## Test Session Metadata

- Stakeholder summary: `docs/plans/QA_AGENT_FINAL_FINDINGS_SUMMARY_2026-03-26.md`

- Final verified app instance: `http://127.0.0.1:3022`
- Store backend: `SQLITE`
- Target site: `https://restaurant-partner-p-dev.onrender.com`
- Final verified credential path:
  - Inline credential execution passed
  - Saved credential execution passed after the stored-secret fix

## Executive Summary

- Manual QA coverage is complete for all `67` planned test-case ids.
- The QA campaign logged `8` additional retest entries on top of the first-pass coverage.
- End-to-end exploratory execution now passes against `https://restaurant-partner-p-dev.onrender.com` with both inline credentials and saved credential profiles.
- The final blocker was local to the QA Agent saved-secret path, not the target account.

## Final Root Cause

- The real defect was in `lib/qa/credential-secret.ts`.
- `revealCredentialSecret()` parsed encrypted values incorrectly by splitting the full `enc:v1:...` string instead of stripping the prefix before decoding the payload segments.
- After correcting that parser and rebuilding, saved-profile exploratory runs passed.

## Final Verification State

- Direct target login with `ivanquiroscenteno@gmail.com` and `ZXCVfdsaQWER1234@` succeeded.
- Inline exploratory run verification passed.
- Saved-credential exploratory verification passed.
- Draft-to-Monitor operator flow with saved profiles passed on the rebuilt app.

## Coverage Summary

- Planned test-case ids: `67`
- Unique planned test-case ids executed: `67`
- Additional TC retest entries logged: `8`
- Current run inventory on the final verified store snapshot:
  - `10` draft
  - `1` cancelled
  - `11` fail
  - `3` pass

## Current Findings Ordered By Severity

### High

- Resolved: saved stored-secret credentials could fail even when the target account was valid.
  - Root cause: encrypted credential parsing in `revealCredentialSecret()` did not strip the `enc:v1:` prefix before decoding the payload segments.
  - Verification: fixed in `lib/qa/credential-secret.ts` and revalidated through saved-profile exploratory runs `run_yvokma77` and `run_z68kb6n3`.

### Medium

- Historical, resolved: environment-profile save accepted invalid target URLs before validation was tightened.
  - Re-tested and confirmed fixed in both Draft and the environments API.
- Historical, resolved: Review save-path behavior auto-linked scenario libraries implicitly and hid useful operator feedback.
  - Re-tested and confirmed fixed.

### Low

- Residual route-transition abort chatter still appears occasionally during route changes.
  - The specific `/api/runs/[runId]/events` polling symptom improved in the latest recheck, but unrelated aborted requests can still appear during page transitions.
- Current store cleanup remains manual or API-limited.
  - Credential cleanup still lacks a delete path, so temporary QA evidence records remain unless the store is wiped again.

## Validation Coverage Map

- Required-field validation: covered across Draft, profiles, scenario-library actions, and direct API negative tests.
- Format validation: covered for target URL and run payload shape; current timebox behavior documented precisely.
- Success scenarios: covered for route load, profile persistence, scenario generation, run creation, Monitor execution, Review artifact rendering, Library rerun handoff, Settings inventory, and final exploratory discovery.
- Failure scenarios: covered for invalid URLs, incomplete inline credentials, invalid run payloads, invalid credential payloads, scenario-library mutation requirements, cancellation, and historical regressions that were subsequently fixed.

## Persistence Observations

- Saved environment, saved credential, scenario-library, run, and artifact persistence were all exercised repeatedly against the SQLite backend.
- The fixed build preserved stored-secret credentials correctly after the decryption parser correction.
- The test campaign intentionally left evidence data in the store, including temporary draft and completed runs plus the temporary credential profile `credential_library_wigkgigz`.

## Route-By-Route Summary

- `/draft`: validated for required fields, scenario generation, saved-profile flows, library actions, and final saved-profile run creation on the fixed build.
- `/monitor`: validated for start, queue, active-state transitions, cancellation coverage, and final saved-profile execution handoff.
- `/review`: validated for completed-run evidence rendering, grouped artifacts, screenshot linkage, save/update library behavior, and final completed exploratory evidence.
- `/library`: validated for listing, filtering, metadata rendering, and rerun handoff back to Draft.
- `/settings`: validated for backend/provider visibility, counts, environment inventory, credential posture, and inline-secret risk reporting.

## Recommended Next Fixes

1. Add credential and evidence cleanup endpoints or admin tooling so QA campaigns can remove temporary records without wiping the full store.
2. Reduce residual route-transition abort chatter so Monitor and route navigation stay quieter in the browser console.
3. Keep the full chronology in the main plan as an appendix, but use this file as the primary findings deliverable.