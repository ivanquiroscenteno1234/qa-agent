# Security Notes

This document describes the current security posture of the QA Agent local deployment, known limitations, and explicit out-of-scope items.

---

## Credential Storage

### Local AES-256 Encryption

Saved credential passwords are encrypted at rest using AES-256-CBC.

- The encryption key is read from the environment variable `QA_LOCAL_SECRET_KEY`.
- The key must be a 32-byte hex string (64 hex characters). If absent or malformed, the application refuses to start.
- Encrypted payloads are stored as `{iv}:{authTag}:{ciphertext}` in the credential library record.
- The `revealCredentialSecret()` function in `lib/qa/credential-secret.ts` decrypts only when needed for execution; the decrypted value is never persisted.

### Credential Profile Preference (Gap 9.1)

When a run is created with a saved `credentialLibraryId`, the API route strips `loginEmail` and `loginPassword` from the persisted `RunRecord.plan`. Only inline-credential runs (no `credentialLibraryId`) retain those fields.

At execution time, `resolveCredentials()` in `lib/qa/auth-session.ts` prefers `credentialLibraryId` over inline fields so that runs created before this fix still work.

### Known Limitation — Legacy Run Records

Run records created before the Gap 9.1 fix may contain plaintext `loginEmail` and `loginPassword` in their persisted `plan` payload. There is currently no backfill migration. Operators who wish to remove legacy inline credentials must manually delete or re-create those runs.

---

## Gemini API Key Handling

- The `GEMINI_API_KEY` environment variable is read at runtime only; it is never stored in the database or run records.
- `.env.local` is included in `.gitignore` and must not be committed.
- When the Gemini client is implemented (Gap 1), all SDK errors must be caught and sanitized before being emitted as `RunEvent` or `ExecutionWarning` entries. The sanitization must strip any substring matching the API key value using the same redaction regex used for credential redaction.

---

## Redaction Scope

The following values are redacted or excluded from stored run data:

| Data | Treatment |
|---|---|
| `loginPassword` (inline runs) | Kept in `RunRecord.plan` for inline-credential runs; stripped when `credentialLibraryId` is set (Gap 9.1) |
| Encrypted credential passwords | Stored as ciphertext only; never written as plaintext to any table |
| `GEMINI_API_KEY` | Not stored; redaction enforced in Gemini client error paths (Gap 9.2, pending) |
| Run event messages | Not currently redacted — no plaintext credentials should appear in events |

---

## Out of Scope (Local Deployment)

The following scenarios are explicitly out of scope for the current local deployment model:

- **Multi-user secret sharing**: The `QA_LOCAL_SECRET_KEY` is a single shared key for the local instance. There is no per-user key derivation.
- **Key rotation**: Rotating `QA_LOCAL_SECRET_KEY` requires re-encrypting all stored credential payloads. No rotation tooling exists.
- **External vault integration**: Integration with HashiCorp Vault, AWS Secrets Manager, or similar is not implemented.
- **Audit log**: There is no tamper-evident audit trail for credential access or modification.

---

## Known Open Items

| # | Item | Status |
|---|---|---|
| 9.1 | Strip inline credentials from run plan when credentialLibraryId is set | ✅ Implemented |
| 9.2 | Sanitize Gemini API errors to prevent key leakage in run events | ⬜ Pending (blocked on Gap 1) |
| 9.3 | This document | ✅ Created |
