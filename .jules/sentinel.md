## 2025-04-08 - GEMINI_API_KEY Leakage Prevention
**Vulnerability:** The `GEMINI_API_KEY` was vulnerable to leakage in system logs and run events (Gap 9.2).
**Learning:** Even with existing log sanitization regex patterns for explicit secrets (`apikey=...`), dynamic runtime keys loaded from the environment (`process.env.GEMINI_API_KEY`) can still leak if model SDK errors echo request contents unexpectedly.
**Prevention:** Always implement explicit, dynamic string replacement for loaded runtime keys in central log sanitization functions (like `sanitizeLogMessage` in `lib/qa/storage/shared.ts`) in addition to regex pattern matching.
