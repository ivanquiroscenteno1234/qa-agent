## 2025-04-08 - GEMINI_API_KEY Leakage Prevention
**Vulnerability:** The `GEMINI_API_KEY` was vulnerable to leakage in system logs and run events (Gap 9.2).
**Learning:** Even with existing log sanitization regex patterns for explicit secrets (`apikey=...`), dynamic runtime keys loaded from the environment (`process.env.GEMINI_API_KEY`) can still leak if model SDK errors echo request contents unexpectedly.
**Prevention:** Always implement explicit, dynamic string replacement for loaded runtime keys in central log sanitization functions (like `sanitizeLogMessage` in `lib/qa/storage/shared.ts`) in addition to regex pattern matching.

## 2026-04-16 - Path Traversal Prevention in Artifact Retrieval
**Vulnerability:** The artifact download endpoint (`app/api/runs/[runId]/artifacts/[artifactId]/route.ts`) previously allowed reading arbitrary server files if a malicious path was injected into the `artifact.content` database field.
**Learning:** Checking if a path starts with a directory string without appending the path separator (`path.sep`) creates a prefix-matching loophole (e.g., `.data/artifacts` matches `.data/artifacts_secret/secrets.txt`).
**Prevention:** When validating safe file paths, always use `path.resolve` to normalize the path and ensure it strictly starts with the base directory appended with `path.sep` (e.g., `absolutePath.startsWith(artifactDirectory + path.sep)`).
