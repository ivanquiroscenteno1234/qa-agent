## 2026-04-07: Optimized SQLite Database Seeding Performance

**Problem:** The initial database seeding process executed N+1 queries. It looped over arrays of runs, scenario libraries, environment libraries, and credential libraries, calling wrapper functions that repeatedly prepared identical `better-sqlite3` statements and triggered redundant nested SQLite transactions (savepoints), leading to slow startup times.

**Solution:** I decoupled the core insert statements into internal helper functions (`writeNormalizedRunTables`, `writeScenarioLibraryRecordInternal`, etc.) that optionally accept a pre-compiled `statements` object. During initialization, `openDatabase()` now complies all prepared statements exactly once. It then iterates over the arrays, invoking the internal helpers to directly execute the cached statements inside a single transaction, bypassing all inner transaction wrappers.

**Result:** Bulk data seeding overhead dropped by >90% (from ~15-20ms to ~0.8ms average per trial).

**Key Takeaways:**
1. Avoid `db.prepare()` inside loops. Compile statements once and use `.run()`.
2. Avoid nesting `db.transaction()` calls in batch operations, as `better-sqlite3` maps nested transactions to savepoints which add unnecessary overhead.
3. Modules importing `server-only` break standard `ts-node`/`tsx` scripts. Use Vitest to run backend benchmark code instead.
