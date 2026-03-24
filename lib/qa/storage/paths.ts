import path from "node:path";

export const dataDirectory = path.join(process.cwd(), ".data");
export const runStorePath = path.join(dataDirectory, "qa-runs.json");
export const scenarioLibraryStorePath = path.join(dataDirectory, "qa-scenario-libraries.json");
export const sqliteDatabasePath = path.join(dataDirectory, "qa-agent.db");
export const sqliteMigrationsDirectory = path.join(process.cwd(), "lib", "qa", "storage", "migrations");