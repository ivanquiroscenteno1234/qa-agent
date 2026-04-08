import { describe, expect, it } from "vitest";

import { hasCredentialSource } from "../auth-session";
import type { RunPlan } from "@/lib/types";

describe("hasCredentialSource", () => {
  const createBasePlan = (): Partial<RunPlan> => ({
    credentialLibraryId: undefined,
    credentialReference: "",
    loginEmail: "",
    loginPassword: "",
  });

  it("returns false when no credential source is provided", () => {
    const plan = { ...createBasePlan() } as RunPlan;
    expect(hasCredentialSource(plan)).toBe(false);
  });

  it("returns false when fields contain only whitespace", () => {
    const plan = {
      ...createBasePlan(),
      credentialLibraryId: "   ",
      credentialReference: "   ",
      loginEmail: "   ",
      loginPassword: "   ",
    } as RunPlan;
    expect(hasCredentialSource(plan)).toBe(false);
  });

  it("returns true when a valid credentialLibraryId is provided", () => {
    const plan = { ...createBasePlan(), credentialLibraryId: "lib_123" } as RunPlan;
    expect(hasCredentialSource(plan)).toBe(true);
  });

  it("returns true when a valid credentialReference is provided", () => {
    const plan = { ...createBasePlan(), credentialReference: "ref_123" } as RunPlan;
    expect(hasCredentialSource(plan)).toBe(true);
  });

  it("returns true when both loginEmail and loginPassword are provided", () => {
    const plan = {
      ...createBasePlan(),
      loginEmail: "user@example.com",
      loginPassword: "password123",
    } as RunPlan;
    expect(hasCredentialSource(plan)).toBe(true);
  });

  it("returns false when only loginEmail is provided", () => {
    const plan = {
      ...createBasePlan(),
      loginEmail: "user@example.com",
    } as RunPlan;
    expect(hasCredentialSource(plan)).toBe(false);
  });

  it("returns false when only loginPassword is provided", () => {
    const plan = {
      ...createBasePlan(),
      loginPassword: "password123",
    } as RunPlan;
    expect(hasCredentialSource(plan)).toBe(false);
  });
});
