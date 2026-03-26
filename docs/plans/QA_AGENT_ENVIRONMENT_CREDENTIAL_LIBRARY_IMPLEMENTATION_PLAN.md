# QA Agent Environment And Credential Library Implementation Plan

## Goal

Add a reusable library for target URLs, environment metadata, and test credential references so operators do not need to re-enter login details for every run.

This plan is based on the current implementation and on a completed manual exploratory run against `https://restaurant-partner-p-dev.onrender.com`, which confirmed that the app can authenticate and execute discovery successfully but still stores credentials at the run-plan level.

---

## Current State Summary

What exists today:

- `ScenarioLibrary` stores `name`, `environment`, `targetUrl`, `role`, scenario versions, coverage gaps, and risk summaries.
- `RunPlan` stores `credentialReference`, `loginEmail`, and `loginPassword` directly.
- the Draft workflow allows operators to type a target URL and direct credentials inline.
- Settings renders credential posture cards, but those cards are observational only and do not represent a functioning vault or reusable credential resource.

What is missing:

- no first-class library for reusable environment records
- no first-class library for reusable test credentials
- no binding between an environment record and an approved credential record
- no way to choose a saved target plus credential bundle in Draft without retyping secrets
- no migration path away from per-run inline credential storage

---

## Root Problem

The current storage model mixes two different concerns:

- reusable target metadata such as environment name, URL, role, and safe-mode expectations
- per-run operator input such as email and password

That coupling creates predictable problems:

- repeated manual entry increases operator friction and input mistakes
- secrets are copied into run records instead of being referenced through a reusable resource
- the Settings screen can report credential usage but cannot manage or validate credential entities
- scenario libraries partially overlap with environment setup but are not designed to own credentials

The goal is not to build a production-grade external secrets manager in this phase.

The goal is to establish a clean internal model for reusable environment and credential references, then route Draft and run creation through that model.

---

## Product Decision

Recommended direction:

- keep `ScenarioLibrary` focused on scenarios, coverage, and risk metadata
- add a separate `EnvironmentLibrary` for target metadata
- add a separate `CredentialLibrary` for test-only credential records or local encrypted credential payloads
- allow `EnvironmentLibrary` records to optionally reference a default credential entry
- allow Draft to start from an environment record, then override fields only when needed

Why this is the right split:

- scenario libraries and environment setup evolve at different rates
- one target environment may support multiple scenario libraries
- one credential set may be reused across multiple targets or roles
- separating these records makes migration, auditing, and future vault integration simpler

---

## Scope

### In Scope

- environment records with name, URL, browser defaults, role defaults, and safety defaults
- credential records with label, username or email, secret storage strategy, and status metadata
- optional linkage between an environment record and a default credential record
- Draft workflow support for selecting a saved environment profile
- run creation that stores credential references by default instead of raw passwords when a saved credential is used
- Settings updates so credential and environment cards represent real saved records instead of inferred posture only
- local storage support in both JSON and SQLite backends
- migration logic for existing runs and scenario libraries where practical

### Out Of Scope For This Phase

- cloud secret managers
- role-based access control for secret access
- encryption key escrow or multi-user secret sharing
- automatic credential rotation against third-party identity systems
- remote sync across machines

---

## Proposed Data Model

### Environment Library Record

Recommended shape:

```ts
interface EnvironmentLibraryRecord {
  id: string;
  name: string;
  targetUrl: string;
  environment: string;
  role: string;
  browser: string;
  device: string;
  safeMode: boolean;
  riskLevel: RiskLevel;
  defaultCredentialId?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

### Credential Library Record

Recommended shape:

```ts
interface CredentialLibraryRecord {
  id: string;
  label: string;
  username: string;
  secretMode: "local-encrypted" | "reference-only";
  secretValue?: string;
  reference?: string;
  status: "active" | "revoked";
  notes: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Run Plan Changes

Target outcome for `RunPlan`:

- keep `credentialReference` for backward compatibility in the short term
- add `credentialLibraryId?: string`
- treat `loginEmail` and `loginPassword` as fallback-only fields for manual override flows
- prefer resolving credentials from the selected credential library record during execution

---

## Storage Strategy

### Phase 1 Storage Rule

Use local-only persistence consistent with the current app architecture.

- JSON backend: add new collections for environments and credentials
- SQLite backend: add dedicated tables for environments and credentials
- if secrets are stored locally, protect them with application-level encryption using a local key from environment configuration

### Minimum Security Bar

If local encrypted secret storage is implemented in this phase:

- add `QA_LOCAL_SECRET_KEY` to `.env.local`
- encrypt password values before persistence
- never expose decrypted passwords in Settings or Review APIs
- only resolve secrets inside server-side execution paths

If encryption cannot be completed safely in the same phase:

- support `reference-only` credential records first
- require operators to store a handle like `vault://restaurant-partner/staging/operator`
- keep inline username and password entry available only as explicit fallback

The safer fallback is preferable to pretending a vault exists when it does not.

---

## UI And Workflow Changes

### Draft Screen

Add a top-level selector for saved environment profiles.

Expected behavior:

- selecting an environment profile fills `environment`, `targetUrl`, `browser`, `device`, `role`, `safeMode`, and `riskLevel`
- if the profile has a linked credential record, Draft shows the credential label rather than raw secrets
- operator can optionally switch to manual override mode for email and password
- creating a run from a saved profile stores references where possible, not copied secrets

### Settings Screen

Replace inferred posture-only cards with real management sections:

- Environment Library
- Credential Library
- Inline Credential Risk

Expected behavior:

- saved environment records can be listed and inspected
- saved credential records can be listed with status, scope, and last-used metadata
- inline credential usage remains visible as a risk indicator until legacy runs are phased out

### Scenario Library Screen

Do not merge credentials into scenario libraries.

Instead:

- show which environment profile a scenario library most recently used
- optionally allow creating a scenario library from a run linked to an environment profile

---

## API Changes

Recommended new routes:

- `GET /api/environments`
- `POST /api/environments`
- `PATCH /api/environments/:id`
- `GET /api/credentials`
- `POST /api/credentials`
- `PATCH /api/credentials/:id`

Recommended run creation updates:

- extend `POST /api/runs` validation to accept `environmentLibraryId` and `credentialLibraryId`
- resolve referenced records server-side before execution
- preserve backward compatibility for existing payloads that still send `loginEmail` and `loginPassword`

---

## Migration Plan

### Existing Runs

Do not rewrite historical runs aggressively.

Instead:

- keep legacy run records readable as-is
- mark runs containing inline secrets as legacy inline credential usage
- allow operators to create reusable environment and credential records from an existing run where safe

### Existing Scenario Libraries

No destructive migration is required.

Optional enhancement:

- infer suggested environment records from existing scenario libraries using `environment`, `targetUrl`, and `role`
- let operators confirm those inferred records before saving them

---

## Delivery Sequence

### Phase 1: Types And Storage

Files expected to change:

- `lib/types.ts`
- `lib/qa/plan-validation.ts`
- `lib/qa/store.ts`
- `lib/qa/storage/shared.ts`
- `lib/qa/storage/json.ts`
- `lib/qa/storage/sqlite.ts`
- migration or rebuild helpers if needed

Tasks:

1. add environment and credential library types
2. add store interfaces for listing, reading, creating, and updating records
3. add JSON persistence support
4. add SQLite schema and read-write support
5. add backward-compatible run plan validation

Validation:

- create, list, and update environment records
- create, list, and update credential records
- verify old runs still load without migration failure

### Phase 2: Draft Workflow Integration

Files expected to change:

- `components/qa-command-center.tsx`
- `components/qa/draft-workflow-view.tsx`
- supporting UI components if needed
- `app/api/runs/route.ts`

Tasks:

1. add saved environment selector to Draft
2. add saved credential selector or linked credential display
3. support manual override mode explicitly
4. ensure new runs reference saved records when chosen

Validation:

- create a run from a saved environment and linked credential
- create a run from a saved environment with manual credential override
- create a run with no saved profile and confirm legacy flow still works

### Phase 3: Settings And Management Screens

Files expected to change:

- `components/settings/settings-screen.tsx`
- `components/settings/credential-vault-card.tsx`
- `components/settings/environment-card.tsx`
- new management UI components as needed
- `lib/qa/settings-view-model.ts`

Tasks:

1. replace observational-only credential cards with real credential records
2. add environment library management section
3. keep inline credential exposure visible as a risk posture metric
4. surface last-used metadata from actual saved entities

Validation:

- confirm saved entities appear in Settings
- confirm inline-only runs are still flagged separately
- confirm revoked credentials are clearly non-default and non-runnable

### Phase 4: Security Hardening

Files expected to change:

- `.env.example`
- `.env.local`
- new local secret utility module
- credential storage code paths

Tasks:

1. decide between encrypted local secret storage and reference-only phase-one rollout
2. if encrypting locally, add key validation and encryption helpers
3. ensure APIs do not echo secrets back to clients
4. redact sensitive fields in artifacts, logs, and review summaries

Validation:

- verify secrets are not returned in Settings API responses
- verify run records do not expose decrypted passwords when using saved credentials
- verify execution can still resolve credentials server-side

---

## Risks And Tradeoffs

### Keeping Inline Credentials Forever

Not recommended.

Reason:

- it preserves current operator friction and weakens the purpose of adding a credential library

### Merging Credentials Into Scenario Libraries

Not recommended.

Reason:

- scenario content and secret management have different lifecycles and access requirements

### Local Encryption

Useful, but only if implemented completely.

Risk:

- partial encryption work can create a false sense of security

Pragmatic rule:

- if encryption is not ready, ship reference-only credential records first and keep raw inline entry as an explicit fallback

---

## Acceptance Criteria

The work is complete when:

- operators can save and reuse environment profiles
- operators can save and reuse credential records or secure references
- Draft can create runs from saved profiles without retyping credentials each time
- runs prefer credential references over copied raw passwords
- Settings reflects real environment and credential entities
- legacy runs still load and remain reviewable
- secret values are not exposed in client-facing responses when saved credentials are used

---

## Validation Approach

Minimum validation for implementation:

1. automated typecheck and build
2. API validation for create, list, update flows of environments and credentials
3. manual browser validation of Draft selection and run creation
4. one authenticated exploratory run using a saved environment plus linked credential
5. review validation confirming secret redaction remains intact

Recommended live validation target for the first end-to-end pass:

- reuse the restaurant partner target validated in the current session and confirm the same discovery run can be launched from a saved environment profile instead of manual credential entry

---

## Recommended Next Step

Implement Phase 1 and Phase 2 together in one focused delivery slice.

Reason:

- storage-only changes do not provide user value by themselves
- Draft integration is the first point where the new model meaningfully reduces operator friction and removes repeated secret entry