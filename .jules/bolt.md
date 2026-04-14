# Bolt Persona: Performance Optimization Learnings

## 2024-03-XX: SQLite Insert Batching Optimization
- **Problem:** Loop iterations calling `insert.run()` (e.g. for `run_events`, `step_results`, `run_artifacts`) exhibit the N+1 anti-pattern, repeatedly crossing the Node.js / C++ boundary even inside a transaction.
- **Solution:** Utilize chunked batching with multi-row `VALUES (?, ?), (?, ?)` inserts.
- **Learning:** `better-sqlite3` is highly optimized for prepared statement loops inside a transaction, so raw wall-clock time reduction might appear small on local NVMe storage. However, batching reduces the number of SQLite VM operations and the boundary crossings by a factor of the chunk size (e.g., 100x), significantly reducing CPU overhead per insert, memory churn, and potential transaction lock duration under load.

## 2024-06-25 - Discovery Engine Queue O(N) linear search bottleneck
**Learning:** In the discovery engine's graph traversal logic (`collectDeepDiscoveryCrawl`), checking if a candidate child node was already queued used `Array.prototype.some` over an array of objects requiring multiple string normalizations per check. This nested $O(N)$ operation inside the discovery loop scales poorly with dense UI surfaces and creates significant CPU overhead, stealing ticks from active Playwright commands and potentially triggering timeouts in budget-constrained discovery runs.
**Action:** Always maintain a parallel Set (`queuedLabels`) of normalized queue entries to reduce queue containment checks from $O(N)$ to $O(1)$. Ensure the Set remains synchronized by populating on `queue.push()` and evicting on `queue.shift()`.
