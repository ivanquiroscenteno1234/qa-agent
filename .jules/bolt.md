## 2024-04-10
**Task:** Optimize N+1 Query in Run Seeding Loop in SQLite
**Learnings:**
- To optimize bulk inserts in better-sqlite3 within this project, use chunked multi-row batching (e.g., `VALUES (?, ?), (?, ?)`) to reduce Node.js/C++ boundary crossings and SQLite VM operations.
- Ensure the Map caching these dynamically generated prepared statements is placed in module scope (not inside the function) to properly reuse compiled statements across calls and avoid performance degradation.
- When replacing single-record insertions that use `DELETE FROM` to clean up child associations, remember to retain idempotency by performing chunked batched `DELETE` statements based on the chunk's IDs before inserting the child records.
# Bolt Persona: Performance Optimization Learnings

## 2024-03-XX: SQLite Insert Batching Optimization
- **Problem:** Loop iterations calling `insert.run()` (e.g. for `run_events`, `step_results`, `run_artifacts`) exhibit the N+1 anti-pattern, repeatedly crossing the Node.js / C++ boundary even inside a transaction.
- **Solution:** Utilize chunked batching with multi-row `VALUES (?, ?), (?, ?)` inserts.
- **Learning:** `better-sqlite3` is highly optimized for prepared statement loops inside a transaction, so raw wall-clock time reduction might appear small on local NVMe storage. However, batching reduces the number of SQLite VM operations and the boundary crossings by a factor of the chunk size (e.g., 100x), significantly reducing CPU overhead per insert, memory churn, and potential transaction lock duration under load.

## 2024-06-25 - Discovery Engine Queue O(N) linear search bottleneck
**Learning:** In the discovery engine's graph traversal logic (`collectDeepDiscoveryCrawl`), checking if a candidate child node was already queued used `Array.prototype.some` over an array of objects requiring multiple string normalizations per check. This nested $O(N)$ operation inside the discovery loop scales poorly with dense UI surfaces and creates significant CPU overhead, stealing ticks from active Playwright commands and potentially triggering timeouts in budget-constrained discovery runs.
**Action:** Always maintain a parallel Set (`queuedLabels`) of normalized queue entries to reduce queue containment checks from $O(N)$ to $O(1)$. Ensure the Set remains synchronized by populating on `queue.push()` and evicting on `queue.shift()`.
## 2024-04-15 - SQLite O(N) Read Bottleneck and Bulk IN Hydration
**Learning:** Sequential `.map()` calls over database result rows that internally trigger subsequent `.get()` or `.all()` SQL queries create an O(N) N+1 query bottleneck. Even though SQLite is in-process and fast, performing hundreds of individual boundary crossings for hydration severely impacts Node.js event loop performance and memory during large list rendering (like `listRunsInternal`).
**Action:** Always replace row-by-row hydration loops with bulk fetching using chunked `WHERE IN (?, ...)` clauses (chunk sizes of 100). Store fetched relational data in a Map, then do a single pass to stitch related entities in-memory. This transforms an O(N) operation into O(1) database queries.
## 2024-04-18 - SQLite Batch Query Hydration Optimization
**Learning:** Refactoring list queries to use chunked `WHERE IN (?, ...)` fetching instead of querying relational data on a row-by-row mapping strategy drastically reduces overhead by mitigating the N+1 query problem, making listing robust without relying on prepared statement micro-optimizations.
**Action:** When working on collection queries mapping multiple relations, leverage bulk fetch algorithms immediately and ensure proper array chunking (e.g. 100 rows per query) to avoid variable bind limits.
## 2024-08-01 - Memoize expensive unicode string operations in discovery loop
**Learning:** `normalizeText` performs several regex string replacements and Unicode normalizations (`.normalize("NFD")`). Because it is heavily utilized in graph traversals for discovery tasks—where the same navigation labels and DOM inputs are repeatedly matched—it consumes significant event loop ticks inside Node.js.
**Action:** Use a memoized module-scoped cache `Map` for simple, fast-path lookups when repeatedly normalizing known UI element text to avoid duplicate computation on the exact same strings.
