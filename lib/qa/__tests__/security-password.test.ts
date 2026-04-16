import { describe, expect, it, vi, beforeAll } from "vitest";
import { protectCredentialSecret, isEncryptedCredentialSecret, revealCredentialSecret } from "../credential-secret";
import { resolveCredentials } from "../auth-session";
import { sanitizeRunRecord } from "../storage/shared";
import type { RunPlan, RunRecord } from "@/lib/types";

// Mocking dependencies for resolveCredentials
vi.mock("../store", () => ({
  getStoredCredentialLibrary: vi.fn(),
  touchCredentialLibraryLastUsed: vi.fn(),
}));

describe("Security Password Protection", () => {
  const password = "my-secret-password";

  beforeAll(() => {
    process.env.QA_LOCAL_SECRET_KEY = "test-secret-key-at-least-32-chars-long-!!!";
  });

  it("should encrypt and decrypt inline passwords", () => {
    const encrypted = protectCredentialSecret(password);
    expect(encrypted).not.toBe(password);
    expect(encrypted).toBeDefined();
    expect(isEncryptedCredentialSecret(encrypted)).toBe(true);

    const decrypted = revealCredentialSecret(encrypted);
    expect(decrypted).toBe(password);
  });

  it("should resolve encrypted inline passwords in resolveCredentials", async () => {
    const encrypted = protectCredentialSecret(password);
    const plan = {
      loginEmail: "test@example.com",
      loginPassword: encrypted,
    } as RunPlan;

    const credentials = await resolveCredentials(plan, []);
    expect(credentials.password).toBe(password);
  });

  it("should mask loginPassword in sanitizeRunRecord", () => {
    const record = {
      plan: {
        loginPassword: "encrypted-stuff",
      },
    } as RunRecord;

    const sanitized = sanitizeRunRecord(record);
    expect(sanitized.plan.loginPassword).toBe("********");
  });

  it("should handle empty password in sanitizeRunRecord", () => {
    const record = {
      plan: {
        loginPassword: "",
      },
    } as RunRecord;

    const sanitized = sanitizeRunRecord(record);
    expect(sanitized.plan.loginPassword).toBe("");
  });
});
