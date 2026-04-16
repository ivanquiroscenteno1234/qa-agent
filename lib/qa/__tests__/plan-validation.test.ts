import { describe, expect, it } from "vitest";

import {
  isLocalTarget,
  isProductionLikeEnvironment,
  isValidTargetUrl
} from "../plan-validation";

describe("isValidTargetUrl", () => {
  it("returns true for valid http and https URLs", () => {
    expect(isValidTargetUrl("http://example.com")).toBe(true);
    expect(isValidTargetUrl("https://example.com")).toBe(true);
    expect(isValidTargetUrl("HTTPS://EXAMPLE.COM")).toBe(true);
    expect(isValidTargetUrl("http://localhost:3000")).toBe(true);
  });

  it("returns false for invalid protocols", () => {
    expect(isValidTargetUrl("ftp://example.com")).toBe(false);
    expect(isValidTargetUrl("mailto:test@example.com")).toBe(false);
    expect(isValidTargetUrl("javascript:alert(1)")).toBe(false);
    expect(isValidTargetUrl("ws://example.com")).toBe(false);
    expect(isValidTargetUrl("wss://example.com")).toBe(false);
    expect(isValidTargetUrl("file:///etc/passwd")).toBe(false);
    expect(isValidTargetUrl("data:text/html,<html>")).toBe(false);
  });

  it("returns false for malformed URLs", () => {
    expect(isValidTargetUrl("not-a-url")).toBe(false);
    expect(isValidTargetUrl("://missing-protocol")).toBe(false);
    expect(isValidTargetUrl("http://")).toBe(false);
    expect(isValidTargetUrl("https://")).toBe(false);
    expect(isValidTargetUrl("http://:8080")).toBe(false);
    expect(isValidTargetUrl("http://?query=1")).toBe(false);
    expect(isValidTargetUrl("http://#hash")).toBe(false);
  });

  it("returns false for URLs with invalid ports", () => {
    expect(isValidTargetUrl("http://localhost:65536")).toBe(false);
    expect(isValidTargetUrl("http://localhost:invalid")).toBe(false);
  });

  it("returns false for relative paths", () => {
    expect(isValidTargetUrl("/api/test")).toBe(false);
    expect(isValidTargetUrl("./relative")).toBe(false);
  });

  it("returns false for empty or whitespace strings", () => {
    expect(isValidTargetUrl("")).toBe(false);
    expect(isValidTargetUrl("   ")).toBe(false);
  });

  it("handles URLs with surrounding whitespace", () => {
    expect(isValidTargetUrl("  https://example.com  ")).toBe(true);
  });

  it("returns true for URLs with IPv4 and IPv6 addresses", () => {
    expect(isValidTargetUrl("http://192.168.1.1")).toBe(true);
    expect(isValidTargetUrl("https://[::1]")).toBe(true);
  });

  it("returns true for URLs with credentials", () => {
    expect(isValidTargetUrl("https://user:pass@example.com")).toBe(true);
  });
});

describe("isLocalTarget", () => {
  it("returns true for local hostnames", () => {
    expect(isLocalTarget("http://localhost")).toBe(true);
    expect(isLocalTarget("https://127.0.0.1")).toBe(true);
    expect(isLocalTarget("http://0.0.0.0:8080")).toBe(true);
    expect(isLocalTarget("localhost")).toBe(true);
  });

  it("returns false for non-local hostnames", () => {
    expect(isLocalTarget("https://example.com")).toBe(false);
    expect(isLocalTarget("http://123.123.123.123")).toBe(false);
    expect(isLocalTarget("https://google.com/search?q=localhost")).toBe(false);
    expect(isLocalTarget("https://my-localhost.com")).toBe(false);
    expect(isLocalTarget("https://127.0.0.1.example.com")).toBe(false);
  });

  it("handles case-insensitive hostnames", () => {
    expect(isLocalTarget("http://LOCALHOST")).toBe(true);
  });
});

describe("isProductionLikeEnvironment", () => {
  it("returns true for environment names containing 'prod'", () => {
    expect(isProductionLikeEnvironment("production", "http://localhost")).toBe(true);
    expect(isProductionLikeEnvironment("PROD-1", "http://localhost")).toBe(true);
  });

  it("returns true for non-local target URLs even if environment name doesn't contain 'prod'", () => {
    expect(isProductionLikeEnvironment("staging", "https://example.com")).toBe(true);
    expect(isProductionLikeEnvironment("dev", "https://api.myapp.com")).toBe(true);
  });

  it("returns false for local target URLs in non-production environments", () => {
    expect(isProductionLikeEnvironment("staging", "http://localhost")).toBe(false);
    expect(isProductionLikeEnvironment("dev", "http://127.0.0.1")).toBe(false);
  });
});
