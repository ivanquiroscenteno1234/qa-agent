import { describe, it, expect } from "vitest";
import { isEncryptedCredentialSecret } from "../credential-secret";

describe("isEncryptedCredentialSecret", () => {
  it("should return true for a string starting with the correct prefix", () => {
    expect(isEncryptedCredentialSecret("enc:v1:some-encrypted-data")).toBe(true);
  });

  it("should return false for a string without the prefix", () => {
    expect(isEncryptedCredentialSecret("some-unencrypted-data")).toBe(false);
  });

  it("should return false if the prefix is not at the start", () => {
    expect(isEncryptedCredentialSecret("data-enc:v1:some")).toBe(false);
  });

  it("should return false for an empty string", () => {
    expect(isEncryptedCredentialSecret("")).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isEncryptedCredentialSecret(undefined)).toBe(false);
  });
});
