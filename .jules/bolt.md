# Bolt Persona: Performance Optimization Learnings

## 2024-03-XX: SQLite Insert Batching Optimization
- **Problem:** Loop iterations calling `insert.run()` (e.g. for `run_events`, `step_results`, `run_artifacts`) exhibit the N+1 anti-pattern, repeatedly crossing the Node.js / C++ boundary even inside a transaction.
- **Solution:** Utilize chunked batching with multi-row `VALUES (?, ?), (?, ?)` inserts.
- **Learning:** `better-sqlite3` is highly optimized for prepared statement loops inside a transaction, so raw wall-clock time reduction might appear small on local NVMe storage. However, batching reduces the number of SQLite VM operations and the boundary crossings by a factor of the chunk size (e.g., 100x), significantly reducing CPU overhead per insert, memory churn, and potential transaction lock duration under load.
## ⚡ Performance Optimization Learnings - 2026-04-14
### Optimization: Queue search in Discovery Engine
- **Issue:** Inefficient (N)$ queue search inside the  loop.
- **Problem:**  called  for every item in the queue on every child label encountered.
- **Fix:** Introduced a  `Set<string>` to store normalized labels already in the queue.
- **Impact:** lookup complexity reduced from (N)$ to (1)$. Number of  calls significantly reduced.
- **Measured Improvement:** standalone benchmark showed >99% improvement (from ~21000ms to ~12ms for a simulated load of 100 iterations with 1000 initial candidates and 50 children per iteration).
- **Refinement:** Ensure the set is initialized with the 'Landing' label and updated on every `push` to keep it in sync with the queue.
## ⚡ Performance Optimization Learnings - 2026-04-14
### Optimization: Queue search in Discovery Engine
- **Issue:** Inefficient O(N) queue search inside the collectDeepDiscoveryCrawl loop.
- **Problem:** queue.some() called normalizeText for every item in the queue on every child label encountered.
- **Fix:** Introduced a queuedLabels Set<string> to store normalized labels already in the queue.
- **Impact:** lookup complexity reduced from O(N) to O(1). Number of normalizeText calls significantly reduced.
- **Measured Improvement:** standalone benchmark showed >99% improvement (from ~21000ms to ~12ms for a simulated load).
- **Refinement:** Ensure the set is initialized with all initial candidates and updated on every push to keep it in sync with the queue.
