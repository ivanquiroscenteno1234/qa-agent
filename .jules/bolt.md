## 2024-04-10
**Task:** Optimize N+1 Query in Run Seeding Loop in SQLite
**Learnings:**
- To optimize bulk inserts in better-sqlite3 within this project, use chunked multi-row batching (e.g., `VALUES (?, ?), (?, ?)`) to reduce Node.js/C++ boundary crossings and SQLite VM operations.
- Ensure the Map caching these dynamically generated prepared statements is placed in module scope (not inside the function) to properly reuse compiled statements across calls and avoid performance degradation.
- When replacing single-record insertions that use `DELETE FROM` to clean up child associations, remember to retain idempotency by performing chunked batched `DELETE` statements based on the chunk's IDs before inserting the child records.
