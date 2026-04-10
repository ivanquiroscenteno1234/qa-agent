## 2025-04-08 - GEMINI_API_KEY Leakage Prevention
**Vulnerability:** The `GEMINI_API_KEY` was vulnerable to leakage in system logs and run events (Gap 9.2).
**Learning:** Even with existing log sanitization regex patterns for explicit secrets (`apikey=...`), dynamic runtime keys loaded from the environment (`process.env.GEMINI_API_KEY`) can still leak if model SDK errors echo request contents unexpectedly.
**Prevention:** Always implement explicit, dynamic string replacement for loaded runtime keys in central log sanitization functions (like `sanitizeLogMessage` in `lib/qa/storage/shared.ts`) in addition to regex pattern matching.

## 2025-04-10 - Catastrophic Log Redaction and QA_LOCAL_SECRET_KEY Leakage
**Vulnerability:** The `QA_LOCAL_SECRET_KEY` could leak into logs if it was echoed unexpectedly, and the string replacement method for dynamic runtime keys was vulnerable to catastrophic redaction if keys were misconfigured to be very short (e.g. 1 character).
**Learning:** Explicit dynamic string replacement of runtime keys using `.replaceAll()` must include a minimum length safeguard. Without it, a short or accidentally empty string could redact critical content across all system logs. Moreover, all critical environmental secrets should be added to the sanitization process.
**Prevention:** Always require a minimum string length (e.g., `>= 8`) before adding dynamic strings to the redaction pipeline, and periodically review all loaded environment variables to ensure newly introduced keys are included.
