# QA Agent Full Manual Test Plan

## Purpose

Define a complete manual QA plan for the QA Agent application so a later agent can execute the plan through browser tooling such as Chrome DevTools MCP, validate all major behaviors, and produce a detailed findings report.

This plan is written against the current application behavior in this repository as of 2026-03-25.

## Primary Test Target

- Website under test: `https://restaurant-partner-p-dev.onrender.com`
- Seed credential username: `ivanquiroscenteno@gmail.com`
- Seed credential password: `zxcvFDSAqwer1234@`

## Important Handling Note

These credentials are included because they were explicitly provided for testing and are intended to be used to seed the app's saved environment and credential profile flows during the manual QA process.

## Test Objectives

1. Validate every user-facing workflow in the QA Agent app.
2. Validate all required fields and current field-format enforcement.
3. Validate success and failure behavior for all Draft actions.
4. Validate environment, credential, and scenario-library persistence flows.
5. Validate monitor, review, settings, and library screens against real app behavior.
6. Validate that execution, saved profiles, and review artifacts work together end to end.
7. Produce a plan that a later agent can execute step by step and convert into a structured findings report.

## In Scope

- Draft route behavior
- Monitor route behavior
- Review route behavior
- Library route behavior
- Settings route behavior
- Run creation and run execution
- Step parsing
- Scenario generation
- Scenario library save and update
- Environment profile save and update
- Credential profile save and update
- Client-side validations
- API-backed validation behavior visible through UI and direct request checks where needed
- Persistence behavior using the active local store backend

## Out Of Scope

- External bug tracker integrations not implemented in the app
- Cloud secret manager integrations not implemented in the app
- True multi-user permission testing
- Production monitoring beyond what the current app surfaces

## Preconditions

1. The app builds and starts successfully.
2. The active backend is known before testing starts.
3. Browser automation can access the QA Agent UI.
4. The Restaurant Partner target site is reachable.
5. The provided credentials remain valid.
6. The local QA Agent store has been fully reset so testing starts from a blank baseline.

## Recommended Test Environment

- QA Agent app running locally in production or dev mode
- Visible browser mode supported
- Local store backend recorded at start of test run
- Fresh browser session for each major end-to-end scenario where cross-run contamination could affect results

## Required Seed Data

Create these saved records first so later scenarios can reuse them.

### Seed Environment Profile

- Environment Profile Name: `Restaurant Partner Staging`
- Environment: `Partner Staging`
- Target URL: `https://restaurant-partner-p-dev.onrender.com`
- Role: `Admin`
- Browser: `Chromium`
- Device: `Desktop`
- Safe Mode: `true`
- Risk Level: `moderate`

### Seed Credential Profile

- Credential Profile Label: `Restaurant Partner Admin`
- Username: `ivanquiroscenteno@gmail.com`
- Password: `zxcvFDSAqwer1234@`
- Secret Mode: `stored-secret`
- Status: `active`
- Reference: optional

### Seed Scenario Library Name

- `Restaurant Partner Discovery Baseline`

## Route Inventory To Cover

- `/draft`
- `/monitor`
- `/review`
- `/library`
- `/settings`

## API Inventory To Cover Indirectly Or Directly

- `POST /api/steps/parse`
- `POST /api/scenarios/generate`
- `GET /api/runs`
- `POST /api/runs`
- `GET /api/runs/summary`
- `GET /api/runs/[runId]`
- `POST /api/runs/[runId]/start`
- `POST /api/runs/[runId]/cancel`
- `GET /api/runs/[runId]/events`
- `GET /api/runs/[runId]/artifacts/[artifactId]`
- `GET /api/environments`
- `POST /api/environments`
- `PATCH /api/environments/[environmentLibraryId]`
- `GET /api/credentials`
- `POST /api/credentials`
- `PATCH /api/credentials/[credentialLibraryId]`
- `GET /api/scenario-libraries`
- `POST /api/scenario-libraries`

## Current Validation Rules To Verify

These rules are current implementation facts and should be tested explicitly.

### Draft Action Validation

- `Target URL` is required for `Create Run`.
- `Target URL` must be a valid `http://` or `https://` URL for `Create Run`.
- `Target URL` is required for `Generate Scenarios`.
- `Target URL` must be a valid `http://` or `https://` URL for `Generate Scenarios`.
- `Plain-Text Steps` is required for `Parse Steps`.
- `Plain-Text Steps` is required for `Execute Steps` mode before run creation.
- `Plain-Text Steps` is required for `Execute And Expand` mode before run creation.
- `Plain-Text Steps` is required for `Execute Steps` mode before scenario generation.
- `Plain-Text Steps` is required for `Execute And Expand` mode before scenario generation.
- `Saved Scenario Library` is required for `Regression Run` mode before run creation.
- `Saved Scenario Library` is required for `Regression Run` mode before scenario generation.
- Inline credentials must be either fully blank or include both email and password for run creation.

### API Validation Rules To Verify

- Run creation requires `timeboxMinutes` to be a positive integer.
- Run creation requires `riskLevel` to be one of `low`, `moderate`, or `high`.
- Run creation requires `mode` to be one of the supported modes.
- Parse API requires non-empty `stepsText`.
- Environment profile API requires a non-empty trimmed `name`.
- Environment profile API requires a non-empty trimmed `targetUrl`.
- Credential profile API requires a non-empty trimmed `label`.
- Credential profile API requires a non-empty trimmed `username`.
- Credential profile API requires a password when `secretMode` is `stored-secret`.
- Credential profile API requires a reference when `secretMode` is `reference-only`.
- Scenario library mutation requires at least one generated scenario.
- Scenario library update requires a target scenario library id.

## Known Gaps That Must Be Tested As Findings Candidates

These are not necessarily bugs, but they must be tested and reported if behavior is weak or missing.

- `Login Email` currently appears to be presence-validated, not format-validated.
- Environment profile save flow appears to require non-empty `targetUrl`, but may not enforce valid URL format at save time through the UI.
- Many free-text fields are optional and may allow arbitrary text without sanitization-specific UX.
- Numeric range enforcement for `Timebox Minutes` should be tested in both UI and API layers because the UI hints at min/max while the schema only requires a positive integer.

## Test Execution Strategy

Run the plan in this order:

1. Fresh-store baseline verification
2. App bootstrap and smoke checks
3. Saved profile seeding
4. Draft validation matrix
5. Step parsing and scenario generation checks
6. Run creation matrix by mode
7. Execution and monitoring checks
8. Review and artifact checks
9. Scenario library lifecycle checks
10. Settings and persistence checks
11. Negative and resilience checks
12. Reporting and evidence packaging

## Phase 0: Fresh Store Baseline Verification

### TC-000 Verify Full Reset Baseline

- Objective: confirm the test session starts from a fully wiped local store.
- Steps:
  1. Open `/draft`, `/monitor`, `/review`, `/library`, and `/settings` before creating any new data.
  2. Confirm there are no previously saved runs, scenario libraries, environment profiles, or credential profiles.
  3. Confirm Draft saved-profile selectors are empty.
  4. Confirm Library has no saved scenario-library inventory.
  5. Confirm Settings shows zero or empty-state behavior for runs, scenario libraries, environments, and credentials.
- Expected:
  - No historical runs are present.
  - No historical scenario libraries are present.
  - No historical environment profiles are present.
  - No historical credential profiles are present.
  - The app is ready to be seeded entirely from scratch.

## Phase 1: App Bootstrap And Smoke Checks

### TC-001 Load Draft Route

- Objective: confirm the main authoring screen loads.
- Steps:
  1. Open `/draft`.
  2. Confirm the page shell, metrics, sections, and Draft controls render.
- Expected:
  - The Draft page loads without a fatal error.
  - The store badge is visible.
  - The main sections render: Mission Parameters, Runtime Controls, Step Definition, Saved Profiles, Scenario Source, Parse Preview, Scenario Studio.

### TC-002 Load All Main Routes

- Objective: confirm route-level availability.
- Steps:
  1. Open `/draft`.
  2. Open `/monitor`.
  3. Open `/review`.
  4. Open `/library`.
  5. Open `/settings`.
- Expected:
  - No route returns a fatal render failure.
  - Each page shows route-appropriate primary content.

### TC-003 Verify Initial Empty Or Baseline State Messaging

- Objective: confirm the UI handles low-data state gracefully.
- Steps:
  1. Observe counts, loading indicators, and zero-state copy.
  2. Confirm the app does not show misleading broken placeholders.
- Expected:
  - Loading states are explicit.
  - Empty-state messages are understandable.

## Phase 2: Seed Saved Profiles For The Later Test Flow

### TC-010 Save Seed Credential Profile

- Objective: create the reusable credential profile used by later tests.
- Steps:
  1. Go to `/draft`.
  2. Enter `ivanquiroscenteno@gmail.com` in `Login Email`.
  3. Enter `zxcvFDSAqwer1234@` in `Login Password`.
  4. Enter `Restaurant Partner Admin` in `Credential Profile Label`.
  5. Click `Save Credential`.
- Expected:
  - Save succeeds.
  - The saved credential appears in the `Saved Credential Profile` selector.
  - The selected credential summary reflects stored-secret behavior.
  - No raw password is shown back in UI summaries.

### TC-011 Save Seed Environment Profile

- Objective: create the reusable environment profile used by later tests.
- Steps:
  1. Enter `Restaurant Partner Staging` in `Environment Profile Name`.
  2. Enter `Partner Staging` in `Environment`.
  3. Enter `https://restaurant-partner-p-dev.onrender.com` in `Target URL`.
  4. Enter `Admin` in `Role`.
  5. Confirm `Browser` is `Chromium`.
  6. Confirm `Device` is `Desktop`.
  7. Confirm `Safe Mode` is enabled.
  8. Confirm `Risk Level` is `moderate`.
  9. Select the saved credential profile if available.
  10. Click `Save Environment`.
- Expected:
  - Save succeeds.
  - The saved environment appears in the `Saved Environment Profile` selector.
  - The selected environment summary reflects the saved target and default credential linkage if assigned.

### TC-012 Reload And Reuse Saved Profiles

- Objective: verify saved profile persistence and rehydration.
- Steps:
  1. Reload `/draft`.
  2. Select `Restaurant Partner Staging` from `Saved Environment Profile`.
  3. Verify the fields populate.
  4. Select `Restaurant Partner Admin` from `Saved Credential Profile` if not linked automatically.
- Expected:
  - Environment fields repopulate from the saved profile.
  - Credential selection applies cleanly.
  - Inline password does not need to be re-entered for saved-profile usage.

## Phase 3: Draft Validation Matrix

### TC-020 Required Field Validation For Target URL

- Objective: verify Draft blocks actions requiring target URL.
- Steps:
  1. Clear `Target URL`.
  2. Observe `Create Run` and `Generate Scenarios`.
  3. Try to click them if enabled.
- Expected:
  - Both actions are disabled.
  - The inline notes explain why.
  - The field is visually invalid.
  - The callout panels describe the requirement.

### TC-021 URL Format Validation For Target URL

- Objective: verify invalid URL format is blocked.
- Test values:
  - `restaurant-partner-p-dev.onrender.com`
  - `ftp://restaurant-partner-p-dev.onrender.com`
  - `not-a-url`
- Steps:
  1. Enter each invalid value in `Target URL`.
  2. Observe `Generate Scenarios` and `Create Run`.
- Expected:
  - Actions remain disabled.
  - The reason states that the URL must be valid `http://` or `https://`.

### TC-022 Valid URL Format Acceptance

- Objective: verify valid URLs unlock dependent actions when no other blockers exist.
- Test values:
  - `https://restaurant-partner-p-dev.onrender.com`
  - `http://example.com`
- Steps:
  1. Enter each URL.
  2. Observe action enablement in exploratory mode.
- Expected:
  - Target URL validation clears.
  - `Generate Scenarios` becomes eligible if no other mode-specific blockers exist.
  - `Create Run` becomes eligible if no other blockers exist.

### TC-023 Parse Requires Plain-Text Steps

- Objective: verify Parse Steps is gated independently.
- Steps:
  1. Clear `Plain-Text Steps`.
  2. Observe `Parse Steps`.
- Expected:
  - `Parse Steps` is disabled.
  - The `Required Before Step Parsing` callout appears.
  - `Plain-Text Steps` shows invalid state.

### TC-024 Execute Steps Requires Plain-Text Steps

- Objective: verify run creation and scenario generation block in `Execute Steps` mode without steps.
- Steps:
  1. Set `Mode` to `Execute Steps`.
  2. Clear `Plain-Text Steps`.
  3. Observe `Generate Scenarios` and `Create Run`.
- Expected:
  - Both actions are disabled.
  - Explanations refer to required steps.

### TC-025 Execute And Expand Requires Seed Steps

- Objective: verify step requirements in `Execute And Expand` mode.
- Steps:
  1. Set `Mode` to `Execute And Expand`.
  2. Clear `Plain-Text Steps`.
  3. Observe `Generate Scenarios` and `Create Run`.
- Expected:
  - Both actions are disabled.
  - Explanations refer to required seed steps.

### TC-026 Regression Run Requires Saved Scenario Library

- Objective: verify regression mode library dependency.
- Steps:
  1. Set `Mode` to `Regression Run`.
  2. Leave `Saved Scenario Library` unselected.
  3. Observe `Generate Scenarios` and `Create Run`.
- Expected:
  - Both actions are disabled.
  - The scenario library field shows required and invalid state.
  - Guidance explains that a saved scenario library is required.

### TC-027 Incomplete Inline Credential Validation

- Objective: verify inline credential completeness validation.
- Test pairs:
  - Email only
  - Password only
- Steps:
  1. Enter only one of the two inline credential fields.
  2. Keep `Target URL` valid.
  3. Observe `Create Run`.
- Expected:
  - Run creation is blocked.
  - Both login fields show invalid state.
  - Messaging explains that both values are required if either is used.

### TC-028 Fully Blank Inline Credentials Allowed When Saved Credential Exists

- Objective: verify inline credentials are optional when using a saved credential.
- Steps:
  1. Select the saved credential profile.
  2. Clear both inline credential fields.
  3. Keep `Target URL` valid.
- Expected:
  - No inline-credential validation error is shown.
  - Run creation can proceed if other requirements are satisfied.

### TC-029 Free-Text Field Tolerance Matrix

- Objective: document how the app handles optional text fields.
- Fields to test:
  - Environment
  - Feature Area
  - Build Version
  - Role
  - Credential Reference
  - Testing Objective
  - Expected Outcomes
  - Acceptance Criteria
  - Preconditions
  - Cleanup Instructions
  - Risk Focus
- Test values:
  - empty string
  - short plain text
  - long text
  - punctuation-heavy text
  - multi-line text where field type allows it
- Expected:
  - The UI accepts values without crashing.
  - No unexpected layout breakage occurs.
  - Any missing validation should be recorded as an observation, not assumed correct.

### TC-030 Timebox Minutes Boundary Checks

- Objective: validate UI behavior and API assumptions for timebox.
- Test values:
  - empty input
  - `0`
  - `1`
  - `5`
  - `60`
  - `61`
  - negative value
  - decimal value
- Expected:
  - UI behavior is documented exactly.
  - API-backed run creation only accepts positive integers.
  - Any mismatch between UI and API behavior is reported.

## Phase 4: Saved Profile Validation Matrix

### TC-040 Save Environment Requires Name

- Objective: validate environment-profile name requirement.
- Steps:
  1. Clear `Environment Profile Name`.
  2. Attempt `Save Environment`.
- Expected:
  - Save is disabled.
  - The disabled reason explains the missing profile name.

### TC-041 Save Environment Requires Target URL

- Objective: validate environment-profile target dependency.
- Steps:
  1. Set `Environment Profile Name`.
  2. Clear `Target URL`.
  3. Attempt `Save Environment`.
- Expected:
  - Save is disabled.
  - The reason explains that target URL is required.

### TC-042 Save Environment With Invalid URL Candidate

- Objective: document whether environment-profile save enforces URL format or only non-empty presence.
- Steps:
  1. Enter `not-a-url` in `Target URL`.
  2. Enter a valid environment profile name.
  3. Observe whether `Save Environment` is enabled.
  4. If save succeeds, record as a validation gap.
- Expected:
  - Actual behavior must be recorded precisely.

### TC-043 Update Existing Environment Profile

- Objective: verify environment profile update path.
- Steps:
  1. Select the saved environment profile.
  2. Modify `Role` or `Risk Level`.
  3. Click `Update Environment`.
  4. Reload and reselect the profile.
- Expected:
  - The change persists.

### TC-044 Save Credential Requires Label

- Objective: validate credential label requirement.
- Steps:
  1. Clear `Credential Profile Label`.
  2. Attempt `Save Credential`.
- Expected:
  - Save is disabled.
  - Disabled reason explains that the label is required.

### TC-045 Save Credential Requires Username Or Email

- Objective: validate credential profile identity requirement.
- Steps:
  1. Clear `Login Email`.
  2. Ensure no selected credential profile with carried-over username.
  3. Attempt `Save Credential`.
- Expected:
  - Save is disabled.
  - Disabled reason explains the username requirement.

### TC-046 Save Credential Requires Password Or Reference

- Objective: validate secret requirement.
- Steps:
  1. Enter a label.
  2. Enter a username.
  3. Leave password blank.
  4. Leave credential reference blank.
  5. Attempt `Save Credential`.
- Expected:
  - Save is disabled.
  - Disabled reason explains that password or reference is required.

### TC-047 Save Stored-Secret Credential Success

- Objective: verify stored-secret credential save path.
- Steps:
  1. Enter label, username, and password.
  2. Save the credential.
  3. Open Settings later and confirm the record exists.
- Expected:
  - Credential is saved.
  - UI does not expose the raw password.

### TC-048 Reference-Only Credential Negative API Check

- Objective: verify the API rejects reference-only credentials without a reference handle.
- Steps:
  1. Use direct request tooling or browser network tools to send a credential create request with `secretMode=reference-only` and missing `reference`.
- Expected:
  - API returns `REFERENCE_REQUIRED`.

### TC-049 Stored-Secret Credential Negative API Check

- Objective: verify the API rejects stored-secret credentials without a password.
- Steps:
  1. Use direct request tooling or browser network tools to send a credential create request with `secretMode=stored-secret` and missing `password`.
- Expected:
  - API returns `PASSWORD_REQUIRED`.

### TC-050 Update Existing Credential Profile

- Objective: verify credential update path.
- Steps:
  1. Select the saved credential profile.
  2. Modify the label or reference.
  3. Click `Update Credential`.
  4. Reload and confirm the update persists.
- Expected:
  - The selected credential updates successfully.

## Phase 5: Parse And Scenario Generation Tests

### TC-060 Parse Valid Step Set

- Objective: verify successful step parsing.
- Suggested step set:
  1. `Open the Restaurant Partner login page.`
  2. `Sign in with the admin account.`
  3. `Navigate to the main dashboard.`
  4. `Review visible metrics and active orders.`
- Expected:
  - Parsed steps are returned.
  - Assumptions and ambiguities render.

### TC-061 Parse Large Step Set

- Objective: verify the parser handles a realistic multi-step flow.
- Steps:
  1. Paste 10 to 15 realistic steps.
  2. Parse.
- Expected:
  - The app remains responsive.
  - Structured output is shown.

### TC-062 Generate Scenarios In Exploratory Mode

- Objective: verify scenario generation on a valid target.
- Steps:
  1. Set `Mode` to `Exploratory Session`.
  2. Set a valid target URL.
  3. Click `Generate Scenarios`.
- Expected:
  - Scenario preview appears.
  - Coverage gaps and risk summary appear.

### TC-063 Generate Scenarios In Execute Steps Mode With Steps

- Objective: verify scenario generation succeeds when step requirements are satisfied.
- Steps:
  1. Set `Mode` to `Execute Steps`.
  2. Provide valid steps.
  3. Provide valid URL.
  4. Generate scenarios.
- Expected:
  - Scenarios are generated.

### TC-064 Generate Scenarios Failure Without URL

- Objective: verify scenario generation remains blocked without a target.
- Steps:
  1. Clear the target URL.
  2. Try to generate scenarios.
- Expected:
  - The action is blocked.

## Phase 6: Scenario Library Lifecycle Tests

### TC-070 Save Scenario Library From Generated Scenarios

- Objective: create a reusable scenario library.
- Steps:
  1. Generate scenarios from a valid target.
  2. Enter `Restaurant Partner Discovery Baseline` in `Library Name`.
  3. Click `Save As Library`.
- Expected:
  - Save succeeds.
  - The library appears in the scenario library selector and `/library` view.

### TC-071 Save Scenario Library Requires Name

- Objective: validate save-as library naming requirement.
- Steps:
  1. Generate scenarios.
  2. Clear `Library Name`.
  3. Observe `Save As Library`.
- Expected:
  - Save is disabled.

### TC-072 Save Scenario Library Requires Scenarios

- Objective: validate that a library cannot be saved without scenario data.
- Steps:
  1. Ensure no generated scenarios and no selected saved library.
  2. Attempt to save.
- Expected:
  - Save is disabled in the UI.
  - API should reject empty generated scenario sets if called directly.

### TC-073 Update Existing Scenario Library

- Objective: verify scenario library update path.
- Steps:
  1. Select an existing scenario library.
  2. Generate or load scenario content.
  3. Click `Update Library`.
- Expected:
  - Update succeeds.
  - Version metadata or updated content remains consistent with current behavior.

### TC-074 Regression Mode Uses Saved Scenario Library

- Objective: verify the regression-run dependency on saved scenario libraries.
- Steps:
  1. Set `Mode` to `Regression Run`.
  2. Select the saved scenario library.
  3. Ensure other blockers are cleared.
- Expected:
  - Run creation becomes eligible.

## Phase 7: Run Creation Matrix By Mode

### TC-080 Create Exploratory Session Run

- Objective: verify exploratory run creation.
- Steps:
  1. Select saved environment profile.
  2. Select saved credential profile.
  3. Set `Mode` to `Exploratory Session`.
  4. Click `Create Run`.
- Expected:
  - A draft run is created.
  - The run appears in Draft, then in Monitor after handoff.

### TC-081 Create Execute Steps Run

- Objective: verify step-driven run creation.
- Steps:
  1. Use valid target.
  2. Set `Mode` to `Execute Steps`.
  3. Provide valid steps.
  4. Create the run.
- Expected:
  - Run creation succeeds.

### TC-082 Create Execute And Expand Run

- Objective: verify execute-and-expand run creation.
- Steps:
  1. Use valid target.
  2. Set `Mode` to `Execute And Expand`.
  3. Provide seed steps.
  4. Create the run.
- Expected:
  - Run creation succeeds.

### TC-083 Create Regression Run

- Objective: verify regression-run creation.
- Steps:
  1. Use a valid target.
  2. Set `Mode` to `Regression Run`.
  3. Select a saved scenario library.
  4. Create the run.
- Expected:
  - Run creation succeeds.

### TC-084 Create Run With Saved Profiles And Blank Inline Credentials

- Objective: verify new runs rely on saved profile references, not copied inline secrets.
- Steps:
  1. Select saved environment and credential profiles.
  2. Clear inline email and password.
  3. Create a run.
  4. Inspect resulting run state if accessible in UI or API.
- Expected:
  - Run creation succeeds.
  - Saved profile linkage is preserved.
  - Inline password is not required.

### TC-085 Create Run With Manual Inline Override

- Objective: verify inline credentials can override saved credential selection.
- Steps:
  1. Select a saved credential profile.
  2. Enter different inline credential values.
  3. Create a run.
- Expected:
  - Run creation succeeds if both inline fields are complete.
  - The app should use the override path at execution time.

## Phase 8: Monitor And Runtime Execution Tests

### TC-090 Start Run From Monitor

- Objective: verify a created run can be started.
- Steps:
  1. Open `/monitor`.
  2. Select a draft run.
  3. Start it.
- Expected:
  - Status transitions through queued and active states.
  - The run detail view updates.

### TC-091 Cancel Active Run

- Objective: verify run cancellation.
- Steps:
  1. Start a run.
  2. Cancel while active if timing allows.
- Expected:
  - Cancellation is recorded.
  - UI reflects the terminal cancelled or stopped state according to current implementation.

### TC-092 Live Event Feed Updates

- Objective: verify events stream into Monitor.
- Steps:
  1. Observe the active run console panel.
- Expected:
  - Events appear during execution.
  - Current activity and step or scenario context update when available.

### TC-093 Exploratory Login And Discovery End To End

- Objective: verify the real target works through saved profiles.
- Steps:
  1. Use `Restaurant Partner Staging` and `Restaurant Partner Admin`.
  2. Create and start an exploratory run.
  3. Observe login and discovery behavior.
- Expected:
  - The run authenticates successfully if the target still requires login.
  - Discovery produces artifacts and insights.

### TC-094 Safe Mode Warning Behavior

- Objective: verify warnings around visibility and credential use.
- Steps:
  1. Use visible browser mode with credentials on the real target.
  2. Toggle safe mode off.
  3. Observe warnings.
- Expected:
  - Warnings about visible browser and interactive posture are surfaced.

## Phase 9: Review Screen And Artifact Validation

### TC-100 Review Completed Run

- Objective: verify the Review route renders completed run detail.
- Steps:
  1. Complete a run.
  2. Open `/review` and select it.
- Expected:
  - Summary, risk, coverage, artifacts, and result context render.

### TC-101 Evidence Timeline Renders Screenshots

- Objective: verify screenshot linkage in review.
- Steps:
  1. Open a run with screenshots.
  2. Inspect the evidence timeline.
- Expected:
  - Timeline entries render their linked screenshots where available.

### TC-102 Artifact Grouping And Downloads

- Objective: verify grouped artifact behavior.
- Steps:
  1. Inspect screenshots, crawl artifacts, reports, and trace outputs if present.
  2. Attempt download or open flows.
- Expected:
  - Artifacts appear in the correct group.
  - Download-only artifacts still resolve via the artifact route.

### TC-103 Save Run As Library Or Update Linked Library

- Objective: verify review-side library actions.
- Steps:
  1. Open a completed run that is not linked to a library and confirm save behavior if available.
  2. Open a run linked to a library and confirm update behavior.
- Expected:
  - Actions and disabled states align with available source data.

## Phase 10: Library Screen Tests

### TC-110 Library Screen Lists Scenario Libraries

- Objective: verify saved libraries render with metadata.
- Steps:
  1. Open `/library`.
  2. Confirm the saved scenario library appears.
- Expected:
  - Cards render with scenario counts and metadata.

### TC-111 Library Rerun Handoff To Draft

- Objective: verify the `Run` action preloads Draft.
- Steps:
  1. From `/library`, choose a saved scenario library.
  2. Trigger the rerun action.
- Expected:
  - The app routes to `/draft`.
  - Draft preloads the selected library content.

### TC-112 Library Filtering And Browse UX

- Objective: validate browse usability.
- Steps:
  1. Use available browse and filter controls.
  2. Confirm the UI remains stable with multiple libraries.
- Expected:
  - Filtering and display behave predictably.

## Phase 11: Settings Screen Tests

### TC-120 Settings Shows Store And LLM Status

- Objective: verify high-level configuration visibility.
- Steps:
  1. Open `/settings`.
- Expected:
  - Store backend appears.
  - LLM provider appears.
  - Run, scenario library, environment profile, and credential profile counts appear.

### TC-121 Settings Shows Saved Environment Profiles

- Objective: verify environment inventory cards reflect saved entities.
- Steps:
  1. Confirm the saved environment profile appears.
- Expected:
  - The environment card uses saved profile data.

### TC-122 Settings Shows Saved Credential Profiles

- Objective: verify credential posture cards reflect saved entities.
- Steps:
  1. Confirm the saved credential profile appears.
- Expected:
  - The credential card renders the saved profile metadata without exposing the password.

### TC-123 Inline Secret Risk Metric

- Objective: verify inline-secret posture reporting.
- Steps:
  1. Create at least one run using inline credentials.
  2. Open `/settings`.
- Expected:
  - The inline secret risk metric increments appropriately.

## Phase 12: Direct Negative API Checks

These checks are important because some UI flows only partially expose API-side validation.

### TC-130 Invalid Run Payload

- Objective: verify API rejects malformed run payloads.
- Cases:
  - missing `mode`
  - invalid `riskLevel`
  - non-positive `timeboxMinutes`
  - missing required array shape for `riskFocus`
- Expected:
  - API returns `INVALID_REQUEST` or the current validation error.

### TC-131 Invalid Scenario Library Update Payload

- Objective: verify update requires a scenario library id.
- Expected:
  - API returns `SCENARIO_LIBRARY_ID_REQUIRED`.

### TC-132 Empty Scenario Save Payload

- Objective: verify scenario library save rejects empty scenarios.
- Expected:
  - API returns `SCENARIOS_REQUIRED`.

## Phase 13: Resilience And Regression Checks

### TC-140 Page Reload Persistence

- Objective: verify saved data survives page reload.
- Steps:
  1. Save profiles and libraries.
  2. Reload each route.
- Expected:
  - Data remains available after reload.

### TC-141 Multi-Route Consistency

- Objective: verify counts and entities are consistent across screens.
- Steps:
  1. Compare Draft selectors, Library cards, Monitor counts, Review lists, and Settings metrics after creating new data.
- Expected:
  - Counts are internally consistent or any lag is documented.

### TC-142 Stale Polling Noise Observation

- Objective: monitor whether historical polling noise still appears.
- Steps:
  1. Navigate between Draft, Monitor, and Review during active and completed runs.
- Expected:
  - Note any `events` polling failures or stale-run requests as findings candidates.

## Evidence Collection Requirements

For every executed case, collect:

1. Case id
2. Title
3. Preconditions
4. Exact steps performed
5. Actual result
6. Expected result
7. Pass or fail status
8. Screenshot or artifact reference when relevant
9. Severity if failed
10. Notes on whether the issue is a validation gap, UX issue, functional bug, persistence issue, or observability issue

## Findings Severity Model

- Critical: blocks core end-to-end usage or risks destructive misuse
- High: major workflow broken or incorrect persistence or security behavior
- Medium: validation, reporting, or route behavior incorrect but workaround exists
- Low: copy, styling, UX clarity, or non-blocking inconsistency

## Required Final Report Structure For A Later Agent

The later execution report should include:

1. Test session metadata
   - app commit or working copy reference
   - store backend
   - date and time
   - target site
2. Coverage summary
   - total cases planned
   - total executed
   - passed
   - failed
   - blocked
3. Findings ordered by severity
4. Validation coverage map
   - required fields covered
   - format validations covered
   - success scenarios covered
   - failure scenarios covered
5. Persistence observations
6. Route-by-route summary
7. Recommended next fixes

## Recommended Execution Batches For A Later Agent

Batch 1:

- fresh-store baseline verification
- bootstrap
- saved profile seeding
- Draft validation matrix

Batch 2:

- parse
- scenario generation
- scenario library lifecycle

Batch 3:

- run creation by mode
- monitor execution
- cancellation

Batch 4:

- review artifacts
- library rerun handoff
- settings persistence

Batch 5:

- direct negative API checks
- resilience checks
- full findings report

## Exit Criteria

The manual QA effort is complete when:

1. All main routes have been exercised.
2. All Draft action validations have been verified.
3. All saved-profile flows have been tested.
4. At least one real exploratory execution has run against `https://restaurant-partner-p-dev.onrender.com` using the saved profiles.
5. At least one scenario library has been created and reused.
6. Monitor and Review have been validated against real runs.
7. Settings has been validated against saved entities and inline-secret posture.
8. Failure cases have been documented with evidence.
9. A final route-by-route findings report has been produced.

## Confirmed Baseline Assumption

This plan now assumes the local QA Agent store has already been fully wiped before execution begins. All profile creation, scenario-library creation, run creation, monitoring, review, and reporting steps should therefore be executed from scratch within the same test campaign.

## Execution Log - 2026-03-25

### Test Session Metadata

- Execution date: 2026-03-25
- QA Agent URL: `http://127.0.0.1:3012`
- Active store backend: `SQLITE`
- Target website: `https://restaurant-partner-p-dev.onrender.com`

### Executed Success Cases

#### PASS - TC-000 Verify Full Reset Baseline

- Preconditions:
  - Local store wiped before execution.
  - Fresh production server running on port `3012`.
- Steps performed:
  1. Opened `/draft`, `/monitor`, `/review`, `/library`, and `/settings`.
  2. Queried `GET /api/runs/summary`, `GET /api/scenario-libraries`, `GET /api/environments`, and `GET /api/credentials`.
- Actual result:
  - APIs returned empty arrays for runs, scenario libraries, environments, and credentials.
  - `/draft`, `/monitor`, `/review`, `/library`, and `/settings` all showed zero-state or empty-state behavior once loading settled.
- Expected result:
  - No historical runs, libraries, environments, or credentials are present.
- Status: Pass
- Notes:
  - Baseline wipe validated successfully against both UI and API layers.

#### PASS - TC-001 Load Draft Route

- Preconditions:
  - App running locally on port `3012`.
- Steps performed:
  1. Opened `/draft`.
  2. Verified the page shell, metrics, mission sections, and controls rendered.
- Actual result:
  - Draft loaded successfully.
  - Store badge displayed `Store: SQLITE`.
  - Main sections rendered, including Mission Parameters, Runtime Controls, Step Definition, Saved Profiles, Library Control, Interpretation, and QA Coverage Matrix.
- Expected result:
  - Draft page loads without fatal error and route-appropriate content renders.
- Status: Pass

#### PASS - TC-002 Load All Main Routes

- Preconditions:
  - App running locally on port `3012`.
- Steps performed:
  1. Opened `/draft`.
  2. Opened `/monitor`.
  3. Opened `/review`.
  4. Opened `/library`.
  5. Opened `/settings`.
- Actual result:
  - All five routes loaded without fatal render failures.
  - Each route displayed route-appropriate content and resolved to a valid empty state.
- Expected result:
  - All major routes load successfully.
- Status: Pass

#### PASS - TC-003 Verify Initial Empty Or Baseline State Messaging

- Preconditions:
  - Fresh baseline with no saved entities.
- Steps performed:
  1. Observed route counts, loading indicators, and zero-state copy across Draft, Monitor, Review, Library, and Settings.
  2. Waited for initial loading states to settle on data-driven screens.
- Actual result:
  - The app used explicit loading states during bootstrap.
  - After loading completed, the UI showed understandable zero-state messaging such as `0 env · 0 cred`, `0 saved`, `0 active`, and empty review/library messages.
- Expected result:
  - Low-data state is clear and not misleading.
- Status: Pass
- Notes:
  - Data-driven routes briefly show loading placeholders before client hydration completes.

#### PASS - TC-010 Save Seed Credential Profile

- Preconditions:
  - Fresh Draft screen with no saved credentials.
- Steps performed:
  1. Entered `ivanquiroscenteno@gmail.com` in `Login Email`.
  2. Entered `zxcvFDSAqwer1234@` in `Login Password`.
  3. Replaced the generated credential label with `Restaurant Partner Admin`.
  4. Clicked `Save Credential`.
- Actual result:
  - Save succeeded.
  - Saved credential appeared in the `Saved Credential Profile` selector.
  - Selected credential summary showed `Mode: stored-secret`, `Status: active`, and `Stored secret: Yes`.
  - Raw password was not displayed in UI summaries.
- Expected result:
  - Seed credential profile is created and available for reuse.
- Status: Pass
- Notes:
  - After save, the free-text `Credential Reference` field was auto-populated with `Restaurant Partner Admin` even though no reference handle was explicitly entered.

#### PASS - TC-011 Save Seed Environment Profile

- Preconditions:
  - Saved credential profile already exists.
- Steps performed:
  1. Set `Environment Profile Name` to `Restaurant Partner Staging`.
  2. Entered `Partner Staging` in `Environment`.
  3. Entered `https://restaurant-partner-p-dev.onrender.com` in `Target URL`.
  4. Entered `Admin` in `Role`.
  5. Left `Browser` as `Chromium` and `Device` as `Desktop`.
  6. Used the selected saved credential profile linkage.
  7. Clicked `Save Environment`.
- Actual result:
  - Save persisted successfully.
  - `GET /api/environments` returned an environment record with the expected target URL, environment name, role, browser, device, `safeMode=true`, `riskLevel=moderate`, and linked `defaultCredentialId`.
  - Draft displayed `Saved environment profile Restaurant Partner Staging.`
- Expected result:
  - Seed environment profile is created and available for reuse.
- Status: Pass
- Notes:
  - The UI auto-suggested a derived profile name during input, but the final saved name matched `Restaurant Partner Staging`.

#### PASS - TC-012 Reload And Reuse Saved Profiles

- Preconditions:
  - Saved environment and credential profiles exist.
- Steps performed:
  1. Reloaded `/draft`.
  2. Confirmed saved environment and credential options were still present in their selectors.
  3. Re-selected `Restaurant Partner Staging` from `Saved Environment Profile`.
- Actual result:
  - Saved profiles persisted across reload.
  - Selecting the saved environment repopulated the target URL, environment, role, and linked credential state.
  - The saved credential was also available and selected after the environment profile was loaded.
- Expected result:
  - Saved profile data persists and can be re-applied cleanly.
- Status: Pass
- Notes:
  - Immediately after reload, Draft first showed the empty bootstrap state before hydration restored the saved profile inventory.
  - Saved profiles were not auto-selected after reload; they remained available and worked when re-selected.

#### PASS - TC-020 Required Field Validation For Target URL

- Preconditions:
  - Saved environment and credential profiles exist.
  - Draft loaded with a valid saved environment selected.
- Steps performed:
  1. Cleared `Target URL`.
  2. Observed `Generate Scenarios` and `Create Run`.
- Actual result:
  - `Generate Scenarios` and `Create Run` became disabled.
  - Inline messages stated that target URL is required.
  - Requirement callouts for run creation and scenario generation appeared.
- Expected result:
  - Actions requiring `Target URL` are blocked when the field is empty.
- Status: Pass

#### PASS - TC-021 URL Format Validation For Target URL

- Preconditions:
  - Draft loaded with saved profile state available.
- Steps performed:
  1. Entered `not-a-url` into `Target URL`.
  2. Observed `Generate Scenarios` and `Create Run`.
- Actual result:
  - `Generate Scenarios` and `Create Run` remained disabled.
  - Inline validation explicitly stated that the target URL must be a valid `http://` or `https://` address.
- Expected result:
  - Invalid URL formats block the Draft actions that depend on a valid target.
- Status: Pass

#### PASS - TC-022 Valid URL Format Acceptance

- Preconditions:
  - Draft loaded with no step-specific blockers for exploratory mode.
- Steps performed:
  1. Replaced the invalid target URL with `https://restaurant-partner-p-dev.onrender.com`.
  2. Observed action enablement in `Exploratory Session` mode.
- Actual result:
  - Target URL validation cleared.
  - `Generate Scenarios` and `Create Run` became enabled.
- Expected result:
  - A valid target URL restores action eligibility when no other blockers remain.
- Status: Pass

#### PASS - TC-023 Parse Requires Plain-Text Steps

- Preconditions:
  - Draft loaded with `Plain-Text Steps` empty.
- Steps performed:
  1. Observed `Parse Steps` while no steps were entered.
- Actual result:
  - `Parse Steps` remained disabled.
  - The `Required Before Step Parsing` callout remained visible.
- Expected result:
  - Step parsing stays blocked until at least one plain-text step is provided.
- Status: Pass

#### PASS - TC-024 Execute Steps Requires Plain-Text Steps

- Preconditions:
  - Draft loaded with valid target URL.
  - `Plain-Text Steps` empty.
- Steps performed:
  1. Switched `Mode` to `Execute Steps`.
  2. Observed `Generate Scenarios` and `Create Run`.
- Actual result:
  - Both actions became disabled.
  - Messaging explicitly stated that `Execute Steps` mode requires plain-text steps.
- Expected result:
  - Step-dependent actions are gated in `Execute Steps` mode when no steps exist.
- Status: Pass

#### PASS - TC-026 Regression Run Requires Saved Scenario Library

- Preconditions:
  - No saved scenario library exists yet.
  - Valid target URL present.
- Steps performed:
  1. Switched `Mode` to `Regression Run`.
  2. Left `Saved Scenario Library` unselected.
  3. Observed `Generate Scenarios` and `Create Run`.
- Actual result:
  - Both actions were disabled.
  - The scenario library selector showed a required state.
  - Messaging explained that regression mode requires a saved scenario library.
- Expected result:
  - Regression mode is blocked until a scenario library is selected.
- Status: Pass

#### PASS - TC-027 Incomplete Inline Credential Validation

- Preconditions:
  - Draft in `Exploratory Session` mode.
  - Valid target URL present.
  - Saved credential profile selected.
- Steps performed:
  1. Entered only `Login Email` and left `Login Password` blank.
  2. Observed `Create Run`.
- Actual result:
  - `Create Run` became disabled.
  - Inline messaging stated that both login email and password are required when either inline credential field is used.
- Expected result:
  - Partial inline credential entry blocks run creation.
- Status: Pass

#### PASS - TC-028 Fully Blank Inline Credentials Allowed When Saved Credential Exists

- Preconditions:
  - Saved credential profile selected.
  - Valid target URL present.
- Steps performed:
  1. Cleared the inline `Login Email` field again, leaving both inline credential inputs blank.
  2. Observed `Create Run`.
- Actual result:
  - `Create Run` became enabled again.
  - No inline credential validation error remained.
- Expected result:
  - Blank inline credentials are allowed when a saved credential profile is in use.
- Status: Pass

### Executed Failure Cases

#### FAIL - TC-042 Save Environment With Invalid URL Candidate

- Preconditions:
  - Draft had a valid environment profile name available.
  - `Target URL` was changed to an invalid value.
- Steps performed:
  1. Entered `not-a-url` in `Target URL`.
  2. Observed the `Save Environment` button state.
- Actual result:
  - `Generate Scenarios` and `Create Run` correctly rejected the invalid URL.
  - `Save Environment` remained enabled even while the URL was invalid.
- Expected result:
  - Environment profile save should be blocked or explicitly validated when `Target URL` is not a valid `http://` or `https://` URL.
- Status: Fail
- Severity: Medium
- Error / finding:
  - Environment profile save currently appears to enforce only non-empty presence for `Target URL`, not URL format validity, through the Draft UI.

### Open Observations

- The Draft `Credential Reference` free-text field auto-populated with the saved credential label after credential save. This did not block the workflow, but it may be a confusing UX side effect because the field implies a user-entered external reference handle.
- Draft reload behavior shows a temporary empty bootstrap state before client hydration restores saved profile options. This resolved correctly and did not cause data loss during this execution segment.

## Execution Log Continuation - 2026-03-25

### Validation Fix Verification

#### PASS - TC-042 Re-Test Save Environment With Invalid URL Candidate

- Preconditions:
  - Draft loaded with the saved environment profile available.
  - Validation fix applied to Draft and environments API.
- Steps performed:
  1. Loaded `Restaurant Partner Staging` in Draft.
  2. Replaced `Target URL` with `not-a-url`.
  3. Observed `Save Environment` and `Update Environment`.
  4. Sent a direct `POST /api/environments` request with `targetUrl=not-a-url`.
- Actual result:
  - `Save Environment` and `Update Environment` were disabled.
  - Draft displayed explicit messages requiring a valid `http://` or `https://` URL.
  - The API returned `INVALID_REQUEST` with `targetUrl: Target URL must be a valid http:// or https:// address.`
- Expected result:
  - Environment profile save and update reject invalid URL formats consistently in both UI and API.
- Status: Pass
- Notes:
  - This re-test confirms the previously logged failure was fixed.

### Additional Executed Success Cases

#### PASS - TC-060 Parse Valid Step Set

- Preconditions:
  - Valid target URL present.
  - Draft in active editable state.
- Steps performed:
  1. Entered a four-step Restaurant Partner flow covering login, dashboard navigation, and metric review.
  2. Clicked `Parse Steps`.
- Actual result:
  - Draft parsed `4` steps.
  - The interpretation panel showed structured parsed steps.
  - One ambiguity warning was surfaced.
- Expected result:
  - Valid natural-language steps are parsed into structured actions with assumptions and ambiguities.
- Status: Pass

#### PASS - TC-061 Parse Large Step Set

- Preconditions:
  - Valid target URL present.
- Steps performed:
  1. Replaced the short step set with a `10`-step Restaurant Partner flow covering login, dashboard checks, active orders, and inventory navigation.
  2. Clicked `Parse Steps`.
- Actual result:
  - Draft parsed `10` steps successfully.
  - The interpretation panel remained responsive and rendered all parsed steps.
  - Assumptions and ambiguities were still shown.
- Expected result:
  - Larger realistic step sets parse without breaking the UI.
- Status: Pass

#### PASS - TC-062 Generate Scenarios In Exploratory Mode

- Preconditions:
  - Valid target URL present.
  - Draft set to `Exploratory Session`.
- Steps performed:
  1. Generated scenarios from the Restaurant Partner target while in exploratory mode.
- Actual result:
  - Draft generated `5` QA scenarios.
  - The coverage matrix rendered scenario cards, risk summary, and coverage gaps.
- Expected result:
  - Scenario generation succeeds and presents preview content for exploratory mode.
- Status: Pass

#### PASS - TC-063 Generate Scenarios In Execute Steps Mode With Steps

- Preconditions:
  - Valid target URL present.
  - Ten valid steps entered in `Plain-Text Steps`.
- Steps performed:
  1. Switched Draft to `Execute Steps` mode.
  2. Clicked `Generate Scenarios`.
- Actual result:
  - Scenario generation succeeded in `Execute Steps` mode.
  - Draft again rendered `5` scenarios, and the scenario text updated when `Feature Area` was later changed to `Inventory`.
- Expected result:
  - Scenario generation remains available when step-dependent mode requirements are satisfied.
- Status: Pass

#### PASS - TC-064 Generate Scenarios Failure Without URL

- Preconditions:
  - Fresh Draft page loaded with no target URL.
- Steps performed:
  1. Opened a clean Draft page with `Target URL` empty.
  2. Observed `Generate Scenarios`.
- Actual result:
  - `Generate Scenarios` was disabled.
  - Draft displayed the message `Target URL is required to generate scenarios.`
- Expected result:
  - Scenario generation remains blocked until a valid target URL is provided.
- Status: Pass

#### PASS - TC-070 Save Scenario Library From Generated Scenarios

- Preconditions:
  - Generated scenario preview available with `5` scenarios.
- Steps performed:
  1. Entered `Restaurant Partner Discovery Baseline` in `Library Name`.
  2. Clicked `Save As Library`.
- Actual result:
  - Save succeeded.
  - Draft selected the saved scenario library automatically.
  - The selected library summary showed `Version: v1` and `History: 1 version entries`.
- Expected result:
  - Generated scenarios can be saved as a reusable scenario library.
- Status: Pass

#### PASS - TC-071 Save Scenario Library Requires Name

- Preconditions:
  - Generated scenario preview available.
- Steps performed:
  1. Cleared `Library Name`.
  2. Observed `Save As Library`.
- Actual result:
  - `Save As Library` became disabled.
  - Draft displayed `Provide a library name first.`
- Expected result:
  - Library save is blocked until a name is provided.
- Status: Pass

#### PASS - TC-072 Save Scenario Library Requires Scenarios

- Preconditions:
  - Fresh Draft page loaded with no generated scenarios and no selected scenario library.
- Steps performed:
  1. Opened a clean Draft page after library creation.
  2. Observed the `Library Control` section before generating scenarios or loading a library.
- Actual result:
  - `Save As Library` was disabled.
  - Draft displayed `Generate scenarios or load a library first.`
- Expected result:
  - Library save remains blocked when no scenario source exists.
- Status: Pass

#### PASS - TC-073 Update Existing Scenario Library

- Preconditions:
  - Saved library `Restaurant Partner Discovery Baseline` exists.
  - Scenario preview available.
- Steps performed:
  1. Changed `Feature Area` to `Inventory`.
  2. Regenerated scenarios.
  3. Clicked `Update Library`.
- Actual result:
  - Update succeeded.
  - Draft reported `Updated scenario library Restaurant Partner Discovery Baseline to v2.`
  - The selected library summary showed `Version: v2` and `History: 2 version entries`.
  - `GET /api/scenario-libraries` confirmed `version: 2` and updated scenario titles such as `Inventory core execution for Admin`.
- Expected result:
  - Existing scenario libraries can be updated and retain version history.
- Status: Pass

#### PASS - TC-074 Regression Mode Uses Saved Scenario Library

- Preconditions:
  - Saved scenario library exists and is selected.
  - Valid target URL present.
- Steps performed:
  1. Switched Draft to `Regression Run` mode.
  2. Kept `Restaurant Partner Discovery Baseline` selected in `Saved Scenario Library`.
  3. Observed the run actions.
- Actual result:
  - The saved scenario library remained selected in regression mode.
  - `Create Run` remained enabled.
- Expected result:
  - Regression mode becomes eligible when a saved scenario library is selected.
- Status: Pass

### Additional Executed Failure Cases

- No new failing test cases recorded in this execution segment.

### Additional Open Observations

- The generated scenario content uses generic labels like `The Active Orders Area` when the source steps do not explicitly name a concrete screen object. This did not break library save or update, but it remains a content-quality observation for scenario generation.

## Execution Log Continuation - 2026-03-26

### Additional Executed Success Cases

#### PASS - TC-080 Create Exploratory Session Run

- Preconditions:
  - Saved environment profile `Restaurant Partner Staging` exists.
  - Saved credential profile `Restaurant Partner Admin` exists.
- Steps performed:
  1. Created an exploratory-session run using the saved environment and saved credential profile references with blank inline credentials.
  2. Verified the created run through `GET /api/runs/summary` and `GET /api/runs/[runId]`.
- Actual result:
  - Draft run `run_adisup5d` was created successfully.
  - The run plan preserved the saved environment and credential linkage.
- Expected result:
  - Exploratory-session run creation succeeds with saved-profile configuration.
- Status: Pass

#### PASS - TC-081 Create Execute Steps Run

- Preconditions:
  - Valid target URL present.
  - Valid ten-step flow available.
- Steps performed:
  1. Created execute-steps runs using the validated Restaurant Partner step set.
  2. Verified the created run inventory in `GET /api/runs/summary`.
- Actual result:
  - Execute-steps draft runs were created successfully, including `run_b0mqc30v` and later `run_ehsbzptq`.
  - Summary payloads showed `parsedSteps: 10` and `generatedScenarios: 5`.
- Expected result:
  - Execute-steps run creation succeeds when step requirements are satisfied.
- Status: Pass

#### PASS - TC-082 Create Execute And Expand Run

- Preconditions:
  - Valid target URL present.
  - Seed steps available.
- Steps performed:
  1. Created execute-and-expand run `run_3vwgw80p` using a three-step seed flow.
  2. Verified the run through the backend API.
- Actual result:
  - Execute-and-expand run creation succeeded.
  - The run summary showed `parsedSteps: 3` and `generatedScenarios: 5`.
- Expected result:
  - Execute-and-expand run creation succeeds with seed steps.
- Status: Pass

#### PASS - TC-083 Create Regression Run

- Preconditions:
  - Saved scenario library `Restaurant Partner Discovery Baseline` exists.
- Steps performed:
  1. Created regression run `run_tximwpq4` from Draft with the saved scenario library selected.
  2. Verified the run through `GET /api/runs/summary` and `GET /api/runs/[runId]`.
- Actual result:
  - Regression-run creation succeeded.
  - The run plan carried `scenarioLibraryId=scenario_library_wxdszj6r` and a comparison summary showing `5 scenario(s) reused with no baseline changes.`
- Expected result:
  - Regression-run creation succeeds when a saved scenario library is selected.
- Status: Pass

#### PASS - TC-084 Create Run With Saved Profiles And Blank Inline Credentials

- Preconditions:
  - Saved environment and credential profiles exist.
- Steps performed:
  1. Created runs with saved environment and credential ids while leaving inline email and password blank.
  2. Inspected resulting run payloads.
- Actual result:
  - Runs such as `run_tximwpq4` and `run_adisup5d` were created successfully.
  - The run plans preserved `environmentLibraryId` and `credentialLibraryId` while keeping `loginEmail` and `loginPassword` empty.
- Expected result:
  - Saved-profile linkage works without requiring inline secrets.
- Status: Pass

#### PASS - TC-085 Create Run With Manual Inline Override

- Preconditions:
  - Saved credential profile exists.
- Steps performed:
  1. Created exploratory-session run `run_a4eoohq0` with a saved credential selected plus inline override credentials.
  2. Inspected the saved run payload.
- Actual result:
  - Run creation succeeded.
  - The run plan preserved `credentialLibraryId=credential_library_o9hkqp9a` and also stored inline values including `loginEmail=override@example.com` and a non-empty inline password.
- Expected result:
  - Inline override values are accepted when both fields are provided.
- Status: Pass

#### PASS - TC-090 Start Run From Monitor

- Preconditions:
  - Draft runs available in Monitor.
- Steps performed:
  1. Opened `/monitor`.
  2. Selected exploratory run `run_adisup5d` from the mission queue.
  3. Clicked `Start Run` from the Monitor detail panel.
- Actual result:
  - Monitor updated the run from `draft` to `queued`, then to `running`.
  - Monitor summary metrics updated from `0 active` to `1 active`.
  - The live console showed queue and preparation events.
- Expected result:
  - Monitor can start a draft run and reflect live status transitions.
- Status: Pass

#### PASS - TC-091 Cancel Active Run

- Preconditions:
  - Draft execute-and-expand run `run_3vwgw80p` available.
- Steps performed:
  1. Started `run_3vwgw80p` through the start API while it was in draft state.
  2. Immediately requested cancellation through the cancel API.
  3. Polled the run after a short delay.
- Actual result:
  - Start returned `202` with the run entering `queued`.
  - Cancellation request returned `200`.
  - After several seconds, the run reached terminal state `cancelled` with summary `The live browser run was cancelled before completion.`
- Expected result:
  - Cancellation requests should be honored for an active or queued run.
- Status: Pass
- Notes:
  - The Monitor UI changed too quickly for a reliable manual click on the cancel button, so the cancellation was verified deterministically through the API.

#### PASS - TC-092 Live Event Feed Updates

- Preconditions:
  - Exploratory run `run_adisup5d` started from Monitor.
- Steps performed:
  1. Observed the Monitor detail panel and event feed after starting the run.
  2. Queried run detail and events during execution.
- Actual result:
  - Event history showed `intake`, `queued`, and `preparing` transitions.
  - Current activity updated to `Preparing local browser execution.`
  - Monitor badges changed from `Awaiting operator action` to `Live uplink active`.
- Expected result:
  - Live event feed and activity context update during execution.
- Status: Pass
- Notes:
  - During active polling, the browser also reported repeated `GET /api/runs/[runId]/events` request failures with `net::ERR_ABORTED`. The feed still updated, but the polling noise should be tracked as an observability issue.

#### PASS - TC-094 Safe Mode Warning Behavior

- Preconditions:
  - Draft loaded with visible browser mode, saved credential, and non-local target URL.
- Steps performed:
  1. Confirmed Draft already showed the visible-browser warning for credentials on the non-local Restaurant Partner target.
  2. Toggled `Safe Mode` from `Observe-only` to `Interactive`.
- Actual result:
  - Draft displayed the additional warning: `Interactive mode with supplied credentials may perform live write actions. Confirm the target environment and account are safe for mutation.`
  - The prior visible-browser warning remained present.
- Expected result:
  - Draft surfaces relevant warnings when browser visibility and mutation risk increase.
- Status: Pass

### Additional Executed Failure Cases

#### FAIL - TC-093 Exploratory Login And Discovery End To End

- Preconditions:
  - Exploratory run `run_adisup5d` created with saved environment and saved credential profile.
- Steps performed:
  1. Started the exploratory run from Monitor.
  2. Observed queue and preparation transitions.
  3. Polled run detail after execution progressed.
- Actual result:
  - The run reached terminal state `fail`.
  - Final phase was `reporting`.
  - Summary was `The exploratory discovery run failed before it could complete the crawl.`
  - Current activity was `Discovery reporting failed unexpectedly.`
  - The run still produced `2` step results and `7` artifacts.
- Expected result:
  - Exploratory execution should authenticate successfully when credentials are valid and proceed through discovery to a stable terminal result with crawl insights.
- Status: Fail
- Severity: High
- Error / finding:
  - Exploratory execution against the live Restaurant Partner target failed unexpectedly during reporting before completing crawl/discovery.

#### FAIL - TC-090 / TC-100 Follow-On Execute-Steps Runtime Outcome

- Preconditions:
  - Execute-steps run `run_ehsbzptq` created successfully.
- Steps performed:
  1. Started `run_ehsbzptq`.
  2. Observed that it completed quickly and Review auto-focused the finished run.
  3. Inspected the Review workspace and run payload.
- Actual result:
  - The run finished with status `fail`.
  - Summary was `The live browser run found failures against the target application.`
  - Review displayed `1` potential defect, `6` artifacts, and a failed Step 1 timeline entry.
- Expected result:
  - Execute-steps run should either complete the scripted flow or provide richer step-level diagnostics if the live target blocks progress.
- Status: Fail
- Severity: High
- Error / finding:
  - The execute-steps live run failed against the target application and only exposed limited step-result detail in the fetched compact payload.

### Additional Open Observations

- Repeated `GET /api/runs/[runId]/events` polling requests surfaced in the browser as `net::ERR_ABORTED` during active-run monitoring, even while the UI still updated. This looks like transport or polling-noise rather than a total feed outage, but it should be documented for later resilience testing.
- The Monitor and Review workflows auto-shift quickly as runs terminate. This is useful, but it narrows the manual window to click `Cancel Run` from the UI on short-lived executions.

## Execution Log Continuation - 2026-03-26

### Additional Executed Success Cases

#### PASS - TC-100 Review Completed Run

- Preconditions:
  - Completed runs were present in the local SQLite store.
  - Failed execute-steps run `run_ehsbzptq` existed with reviewable artifacts.
- Steps performed:
  1. Opened `/review`.
  2. Allowed the review workspace to load and selected the current completed run inventory.
  3. Verified the focused run detail for `run_ehsbzptq`.
- Actual result:
  - Review loaded successfully and showed `3 completed` runs.
  - The selected run rendered summary, mode, browser, role, environment, duration, artifacts, and defect metrics.
  - The focused review state matched the known failed execute-steps run.
- Expected result:
  - Review renders completed run detail with appropriate evidence context.
- Status: Pass

#### PASS - TC-101 Evidence Timeline Renders Screenshots

- Preconditions:
  - Review run `run_ehsbzptq` included screenshot evidence.
- Steps performed:
  1. Inspected the `Step Timeline` section for the selected failed run.
  2. Verified the linked screenshot entry and inline image preview.
- Actual result:
  - Review rendered failed Step 1 with an `Open linked screenshot` action.
  - The timeline also showed an inline `Step 1` image preview for the same artifact.
- Expected result:
  - Timeline entries render their linked screenshots when available.
- Status: Pass

#### PASS - TC-102 Artifact Grouping And Downloads

- Preconditions:
  - Review run `run_ehsbzptq` included grouped artifacts.
- Steps performed:
  1. Inspected the `Evidence Package` section in Review.
  2. Verified grouped artifact buckets for screenshots, crawl data, reports, and debug archives.
  3. Sent a direct request to `/api/runs/run_ehsbzptq/artifacts/artifact_hw5rrcyi?download=1`.
- Actual result:
  - Review grouped artifacts into `Evidence Captures`, `Discovery Data`, `Reports`, and `Debug Archives`.
  - Download links were present for each artifact group.
  - The direct artifact request returned `HTTP 200 OK` with `content-type: image/png` and `content-disposition: attachment; filename="step-1.png"`.
- Expected result:
  - Artifacts render in the correct groups and resolve through the artifact download route.
- Status: Pass

#### PASS - TC-110 Library Screen Lists Scenario Libraries

- Preconditions:
  - Two scenario libraries existed in the store.
- Steps performed:
  1. Opened `/library`.
  2. Waited for the loading state to settle.
  3. Inspected rendered library cards and top-level metrics.
- Actual result:
  - Library settled to `Saved Libraries: 2`, `Scenarios: 10`, `Snapshots: 3`, and `Feature Areas: 2`.
  - Cards rendered for `Restaurant Partner Discovery Baseline` and `Inline Override Validation (Partner Staging)`.
  - Library metadata included risk badges, scenario counts, version labels, coverage-gap text, updated timestamps, and source-run references.
- Expected result:
  - Library cards render saved libraries with metadata.
- Status: Pass

#### PASS - TC-111 Library Rerun Handoff To Draft

- Preconditions:
  - Saved library `Restaurant Partner Discovery Baseline` was visible in `/library`.
- Steps performed:
  1. Clicked `Run` on `Restaurant Partner Discovery Baseline` from `/library`.
  2. Observed the resulting route and Draft content.
- Actual result:
  - The app routed to `/draft?scenarioLibraryId=scenario_library_wxdszj6r&source=library`.
  - Draft showed `Loaded saved scenario library Restaurant Partner Discovery Baseline from Scenario Library. Review mission parameters and create a run.`
  - The selected scenario-library summary in Draft showed the expected `v2` metadata and source-run linkage.
- Expected result:
  - Library rerun hands off to Draft with the chosen library preloaded.
- Status: Pass

#### PASS - TC-120 Settings Shows Store And LLM Status

- Preconditions:
  - Saved runs, libraries, environment profiles, and credential profiles existed.
- Steps performed:
  1. Opened `/settings` after the store was populated.
  2. Reloaded the route and re-read the settled state.
- Actual result:
  - Settings rendered `Store: SQLITE`, `Gemini configured`, and `No vault backend`.
  - Summary cards showed `Run Records: 8`, `Scenario Libraries: 2`, `Environment Profiles: 1`, `Credential Profiles: 1`, and `Inline Secret Risk: 1`.
  - Gemini provider information remained visible with rollout-disabled feature notices.
- Expected result:
  - Settings exposes store backend, model-provider status, and saved-entity counts.
- Status: Pass

#### PASS - TC-121 Settings Shows Saved Environment Profiles

- Preconditions:
  - Saved environment profile `Restaurant Partner Staging` existed.
- Steps performed:
  1. Inspected the `Execution Environments` section in `/settings`.
- Actual result:
  - Settings showed `Restaurant Partner Staging` with the correct endpoint `https://restaurant-partner-p-dev.onrender.com`.
  - The card also showed `8 recorded runs; 100% observe-only` and `2 scenario libraries match this target.`
- Expected result:
  - Environment inventory reflects the saved environment profile data.
- Status: Pass

#### PASS - TC-122 Settings Shows Saved Credential Profiles

- Preconditions:
  - Saved credential profile `Restaurant Partner Admin` existed.
- Steps performed:
  1. Inspected the `Credential Posture` section in `/settings`.
- Actual result:
  - Settings rendered the saved credential profile card for `Restaurant Partner Admin`.
  - The card showed `Local stored secret`, `active`, and usage metadata without exposing the raw password.
- Expected result:
  - Settings renders saved credential profile metadata without leaking secret values.
- Status: Pass

#### PASS - TC-123 Inline Secret Risk Metric

- Preconditions:
  - At least one run had been created with inline credential override values.
- Steps performed:
  1. Inspected the `Inline Secret Risk` metric and credential posture cards in `/settings`.
- Actual result:
  - Settings showed `Inline Secret Risk: 1`.
  - A separate `Inline operator entry` posture card explained that one run captured direct email or password plan input.
- Expected result:
  - Inline secret posture increments when direct credentials are included in run state.
- Status: Pass

#### PASS - TC-130 Invalid Run Payload

- Preconditions:
  - QA Agent API reachable on `http://127.0.0.1:3013`.
- Steps performed:
  1. Sent a direct malformed `POST /api/runs` request with invalid `mode`, invalid `riskLevel`, non-positive `timeboxMinutes`, and invalid `riskFocus` shape.
- Actual result:
  - API returned `400` with `INVALID_REQUEST`.
  - Error details included the invalid enum values and schema mismatch details for the malformed payload.
- Expected result:
  - API rejects malformed run payloads with validation errors.
- Status: Pass

#### PASS - TC-131 Invalid Scenario Library Update Payload

- Preconditions:
  - Scenario-library mutation route reachable.
  - Valid `plan` object and non-empty generated scenario set prepared so the request could pass schema validation.
- Steps performed:
  1. Sent a direct `POST /api/scenario-libraries` request with `action=update`, a fully valid `plan`, a one-scenario generated payload, and a blank `scenarioLibraryId`.
- Actual result:
  - API returned `400` with `SCENARIO_LIBRARY_ID_REQUIRED`.
  - Error message: `Update requires a target scenario library.`
- Expected result:
  - Scenario-library update rejects requests missing a target library id.
- Status: Pass
- Notes:
  - Earlier malformed negative payloads returned only top-level `INVALID_REQUEST` until the request was made schema-valid enough to reach this domain-specific branch.

#### PASS - TC-132 Empty Scenario Save Payload

- Preconditions:
  - Scenario-library mutation route reachable.
  - Valid `plan` object prepared.
- Steps performed:
  1. Sent a direct `POST /api/scenario-libraries` request with `action=create`, a fully valid `plan`, and an empty `generated.scenarios` array.
- Actual result:
  - API returned `400` with `SCENARIOS_REQUIRED`.
  - Error message: `At least one scenario is required to save a scenario library.`
- Expected result:
  - Scenario-library save rejects empty generated scenario sets.
- Status: Pass

#### PASS - TC-140 Page Reload Persistence

- Preconditions:
  - Saved profiles, libraries, and runs already existed in the store.
- Steps performed:
  1. Reloaded `/settings`, `/library`, and `/review` in fresh page instances.
  2. Compared the reloaded UI state to the previously observed persisted state.
- Actual result:
  - Settings continued to show `8` run records, `2` scenario libraries, `1` environment profile, `1` saved credential profile, and `1` inline secret risk.
  - Library continued to show the same two saved libraries and the same summary metrics.
  - Review continued to show `3 completed` runs and the same focused failed run evidence.
- Expected result:
  - Saved data remains available after route reload.
- Status: Pass

#### PASS - TC-141 Multi-Route Consistency

- Preconditions:
  - Persisted run, library, environment, and credential data existed.
- Steps performed:
  1. Compared persisted-state cues across Draft, Review, Library, and Settings.
  2. Cross-checked the route summaries with `GET /api/runs/summary` and the rendered settings/library counts.
- Actual result:
  - Draft showed `8 recorded runs` and the preloaded library state from the rerun handoff.
  - Review showed `3 completed` runs.
  - Library showed `2 saved` libraries.
  - Settings showed `Run Records: 8`, `Scenario Libraries: 2`, `Environment Profiles: 1`, and `Credential Profiles: 1`.
  - `GET /api/runs/summary` returned the same eight persisted runs visible across the route summaries.
- Expected result:
  - Counts and persisted entities remain internally consistent across screens.
- Status: Pass

### Additional Executed Failure Cases

#### FAIL - TC-142 Stale Polling Noise Observation

- Preconditions:
  - Active and recently completed runs existed.
  - Operator navigated between Draft, Monitor, and Review while run polling was active or had recently completed.
- Steps performed:
  1. Observed run activity while navigating the app during and after live execution.
  2. Monitored browser-reported request failures associated with `/api/runs/[runId]/events` polling.
- Actual result:
  - The UI still updated with live and completed state correctly.
  - The browser repeatedly surfaced `GET /api/runs/[runId]/events` request failures as `net::ERR_ABORTED`.
- Expected result:
  - Event polling should remain quiet and not generate repeated aborted-request noise during normal navigation and monitoring.
- Status: Fail
- Severity: Medium
- Error / finding:
  - Run-event polling currently produces observable aborted-request noise during normal operator navigation, which weakens observability confidence even though state updates still arrive.

### Additional Open Observations

- `TC-103 Save Run As Library Or Update Linked Library` was only partially exercised in this segment. Review correctly exposed `Update Linked Library` for the library-linked failed run, but the unlinked review-side save path was not re-executed in this pass.
- The first attempted Phase 12 scenario-library negative requests were too malformed to reach the route's domain-specific validation branches. After switching to schema-valid payloads, both targeted domain errors were confirmed successfully.

## Execution Log Continuation - 2026-03-26

### Additional Executed Success Cases

#### PASS - TC-112 Library Filtering And Browse UX

- Preconditions:
  - Multiple saved scenario libraries existed in `/library`.
- Steps performed:
  1. Opened `/library` with all filters cleared.
  2. Set `Feature Area` to `Inventory`.
  3. Observed the visible-card count and remaining library cards.
  4. Then set `Risk Profile` to `high` while `Feature Area=Inventory` remained selected.
- Actual result:
  - With `Feature Area=Inventory`, Library reduced the grid to `1 visible` and showed only `Restaurant Partner Discovery Baseline`.
  - With `Risk Profile=high` layered onto the same filter, Library reduced the grid to `0 visible` and displayed `No libraries match the current filters.`
  - The filter controls and browse layout remained stable while the result set changed.
- Expected result:
  - Filtering reduces the visible library set predictably and handles no-match states cleanly.
- Status: Pass

#### PASS - TC-141 Multi-Route Consistency Re-Check After New Persisted Data

- Preconditions:
  - A new completed exploratory run had been added during this execution segment.
- Steps performed:
  1. Reloaded `/review`, `/library`, and `/settings` after the new run completed.
  2. Compared the refreshed route summaries with `GET /api/runs/summary` and `GET /api/scenario-libraries`.
- Actual result:
  - Review refreshed to `4 completed` and `9 recorded runs`.
  - Library refreshed to `3 saved` libraries, `15` saved scenarios, `4` snapshots, and `3` feature areas.
  - Settings refreshed to `Run Records: 9` and `Scenario Libraries: 3` while preserving the same environment and credential counts.
  - API responses matched the reloaded UI totals.
- Expected result:
  - Reloaded routes converge on the same persisted counts after new data is written.
- Status: Pass

### Additional Executed Failure Cases

#### FAIL - TC-103 Save Run As Library Or Update Linked Library

- Preconditions:
  - Review already exposed `Update Linked Library` for existing linked runs.
  - A new exploratory run was intentionally created without selecting a saved scenario library to exercise the unlinked review-side save path.
- Steps performed:
  1. Created exploratory run `run_u28g1rzc` without explicitly choosing a scenario library.
  2. Started the run and waited for it to complete.
  3. Queried `GET /api/runs/run_u28g1rzc`, `GET /api/scenario-libraries`, and reloaded `/review` and `/library`.
  4. Clicked `Update Linked Library` from the Review detail for `run_u28g1rzc`.
- Actual result:
  - The newly created run did not remain unlinked.
  - The run payload came back with `scenarioLibraryId=scenario_library_6fyi56w7` and a populated `scenarioLibraryComparison`.
  - `GET /api/scenario-libraries` confirmed a brand-new library `Unlinked Review Save Validation (Partner Staging)` was persisted automatically from the run.
  - Reloaded Review therefore exposed only `Update Linked Library`, not an unlinked save action.
  - Clicking `Update Linked Library` produced no visible success feedback, and the linked library version remained `v1`, so the actual effect of the action was not observable from the current UI or metadata.
- Expected result:
  - A run created without selecting a saved scenario library should either remain unlinked so the review-side save path can be exercised, or the product should make the auto-link behavior explicit and provide observable feedback when updating that linked library.
- Status: Fail
- Severity: Medium
- Error / finding:
  - The intended unlinked review-save path is currently not reachable in this flow because the app auto-persists and auto-links a scenario library during run creation, and the linked-library update action does not provide clear feedback.

### Additional Open Observations

- The open `/library` page continued to show `2` saved libraries until the route was reloaded, even though `GET /api/scenario-libraries` had already returned the newly auto-created third library. After reload, the Library page reconciled correctly to `3 saved`.
- The new exploratory run `run_u28g1rzc` reproduced the same high-level runtime failure pattern seen in the earlier exploratory run: it reached `fail` during reporting, still produced screenshots and artifacts, and ended with `Discovery reporting failed unexpectedly.`

## Execution Log Continuation - 2026-03-26

### Validation Fix Verification

#### PASS - TC-103 Re-Test Review Save Run As Library Path

- Preconditions:
  - Product fix applied so run creation no longer auto-links or auto-persists a scenario library unless one was explicitly selected.
  - Updated app instance launched on `http://127.0.0.1:3014`.
- Steps performed:
  1. Sent `POST /api/runs` for exploratory run `run_em3z0yuj` without `scenarioLibraryId`.
  2. Verified the returned run payload had no `plan.scenarioLibraryId`.
  3. Reloaded `/review` on `3014` and selected `run_em3z0yuj`.
  4. Confirmed Review rendered `Save Run As Library` instead of `Update Linked Library`.
  5. Clicked `Save Run As Library` from Review.
  6. Queried `GET /api/scenario-libraries` and reloaded `/library`.
- Actual result:
  - The run stayed unlinked after creation.
  - Review exposed the explicit `Save Run As Library` action for the unlinked run.
  - Review showed visible feedback: `Saved review run as scenario library Review Save Path Validation (Partner Staging).`
  - Only after the explicit save action did scenario-library inventory increase from `3` to `4`.
  - `/library` refreshed to show `Review Save Path Validation (Partner Staging)` as a new `v1` library sourced from `run_em3z0yuj`.
- Expected result:
  - Unlinked runs remain unlinked until an operator explicitly saves them as a library from Review.
- Status: Pass
- Notes:
  - This re-test confirms the earlier `TC-103` failure was caused by implicit auto-linking at run creation and is now fixed.

#### PASS - TC-103 Re-Test Review Update Linked Library Feedback

- Preconditions:
  - Linked review run `run_u28g1rzc` existed with `scenarioLibraryId=scenario_library_6fyi56w7`.
  - Review feedback banner rendering was added to the Review workflow.
- Steps performed:
  1. Reloaded `/review` on `3014`.
  2. Selected completed linked run `run_u28g1rzc`.
  3. Clicked `Update Linked Library`.
  4. Read the Review feedback banner and queried scenario-library metadata.
- Actual result:
  - Review displayed visible confirmation: `Updated linked scenario library Unlinked Review Save Validation (Partner Staging) from review.`
  - The linked library metadata reflected a new `updatedAt` timestamp after the action.
- Expected result:
  - Review-side linked-library updates provide operator-visible confirmation instead of silent background state changes.
- Status: Pass

### Additional Open Observations

- The exploratory runtime defect itself remains unresolved. The new unlinked run stayed in `draft` for this review-save-path re-test, while the earlier linked exploratory runs still fail during reporting against the Restaurant Partner target.