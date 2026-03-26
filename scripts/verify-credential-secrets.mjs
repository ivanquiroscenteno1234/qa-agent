import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const root = process.cwd();
const dataDirectory = path.join(root, ".data");
const sqliteDatabasePath = path.join(dataDirectory, "qa-agent.db");
const jsonCredentialPath = path.join(dataDirectory, "qa-credentials.json");
const encryptedPrefix = "enc:v1:";

function isStoredSecret(credential) {
  return credential && credential.secretMode === "stored-secret";
}

function hasEncryptedPassword(credential) {
  return typeof credential.password === "string" && credential.password.startsWith(encryptedPrefix);
}

function verifyJsonCredentials() {
  if (!existsSync(jsonCredentialPath)) {
    return [];
  }

  const credentials = JSON.parse(readFileSync(jsonCredentialPath, "utf8"));
  return credentials
    .filter(isStoredSecret)
    .filter((credential) => credential.password && !hasEncryptedPassword(credential))
    .map((credential) => `JSON credential ${credential.id} is stored-secret but not encrypted.`);
}

function verifySqliteCredentials() {
  if (!existsSync(sqliteDatabasePath)) {
    return [];
  }

  const db = new Database(sqliteDatabasePath, { readonly: true });
  const rows = db.prepare("SELECT payload FROM credential_libraries").all();
  db.close();

  return rows
    .map((row) => JSON.parse(row.payload))
    .filter(isStoredSecret)
    .filter((credential) => credential.password && !hasEncryptedPassword(credential))
    .map((credential) => `SQLite credential ${credential.id} is stored-secret but not encrypted.`);
}

const failures = [...verifyJsonCredentials(), ...verifySqliteCredentials()];

if (failures.length) {
  console.error("Credential secret verification failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Credential secret verification passed.");