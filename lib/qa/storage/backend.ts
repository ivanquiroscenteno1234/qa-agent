import { createJsonStoreBackend } from "@/lib/qa/storage/json-store";
import { createSqliteStoreBackend } from "@/lib/qa/storage/sqlite";
import type { QaStoreBackend } from "@/lib/qa/storage/types";

let backend: QaStoreBackend | null = null;

export function getQaStoreBackendKind(): "json" | "sqlite" {
  return process.env.QA_STORE_BACKEND === "sqlite" ? "sqlite" : "json";
}

export function getQaStoreBackend(): QaStoreBackend {
  if (backend) {
    return backend;
  }

  backend = getQaStoreBackendKind() === "sqlite" ? createSqliteStoreBackend() : createJsonStoreBackend();
  return backend;
}