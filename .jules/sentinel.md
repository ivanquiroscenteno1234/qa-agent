## 2025-04-08 - GEMINI_API_KEY Leakage Prevention
**Vulnerability:** The `GEMINI_API_KEY` was vulnerable to leakage in system logs and run events (Gap 9.2).
**Learning:** Even with existing log sanitization regex patterns for explicit secrets (`apikey=...`), dynamic runtime keys loaded from the environment (`process.env.GEMINI_API_KEY`) can still leak if model SDK errors echo request contents unexpectedly.
**Prevention:** Always implement explicit, dynamic string replacement for loaded runtime keys in central log sanitization functions (like `sanitizeLogMessage` in `lib/qa/storage/shared.ts`) in addition to regex pattern matching.

## 2025-04-12 - QA_LOCAL_SECRET_KEY Leakage & Catastrophic Redaction Prevention
**Vulnerability:** The `QA_LOCAL_SECRET_KEY` was vulnerable to leakage in system logs and run events. Furthermore, short dynamic runtime keys could cause catastrophic redactions (e.g., replacing 'a' with '[REDACTED]' everywhere).
**Learning:** Dynamic runtime key redaction must enforce minimum length constraints to prevent rendering logs useless, and all configured local secret keys must be actively redacted.
**Prevention:** Apply a minimum length constraint (e.g., `>= 8`) to dynamic keys loaded from the environment before redaction, and ensure all application-specific secret keys (like `QA_LOCAL_SECRET_KEY`) are included in central log sanitization.
