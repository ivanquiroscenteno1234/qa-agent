import { expect, test } from "vitest";
import { createSqliteStoreBackend } from "../storage/sqlite";
import fs from "node:fs";

test("benchmark sqlite seeding", async () => {
    console.log("Setting up DB for benchmark...");
    const numTrials = 20;
    let totalTime = 0;

    for (let i = 0; i < numTrials; i++) {
        if (fs.existsSync(".data/qa-agent.db")) {
            fs.unlinkSync(".data/qa-agent.db");
        }
        if (fs.existsSync(".data/qa-agent.db-wal")) {
            fs.unlinkSync(".data/qa-agent.db-wal");
        }
        if (fs.existsSync(".data/qa-agent.db-shm")) {
            fs.unlinkSync(".data/qa-agent.db-shm");
        }

        const start = performance.now();
        const store = createSqliteStoreBackend();

        // listRuns will trigger openDatabase(), which will run the migrations and seeding process
        await store.listRuns();

        const end = performance.now();
        totalTime += (end - start);
    }

    console.log(`\n\nDatabase seeding average over ${numTrials} trials took: ${(totalTime / numTrials).toFixed(2)}ms\n\n`);
});