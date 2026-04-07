import { describe, expect, it, vi } from "vitest";

import {
  assertAuthBoundary,
  assertElementVisible,
  assertFormLabeled,
  assertNavigationReachable
} from "@/lib/qa/assertions";

// ---------------------------------------------------------------------------
// Lightweight Playwright Page stub factory
// ---------------------------------------------------------------------------

function makePage(url = "https://app.example.com") {
  return {
    url: () => url,
    locator: (_selector: string) => ({
      first: () => ({
        isVisible: (_opts?: unknown) => Promise.resolve(true)
      })
    }),
    goto: (_url: string, _opts?: unknown) =>
      Promise.resolve({ status: () => 200 }),
    waitForLoadState: (_state: string, _opts?: unknown) => Promise.resolve()
  } as unknown as import("playwright").Page;
}

// ---------------------------------------------------------------------------
// assertElementVisible
// ---------------------------------------------------------------------------

describe("assertElementVisible", () => {
  it("passes when element is visible", async () => {
    const page = makePage();
    const result = await assertElementVisible(page, "button[type=submit]", "Submit");
    expect(result.passed).toBe(true);
    expect(result.evidence).toContain("Submit");
  });

  it("fails when element.isVisible returns false", async () => {
    const page = {
      url: () => "https://app.example.com",
      locator: () => ({
        first: () => ({
          isVisible: () => Promise.resolve(false)
        })
      })
    } as unknown as import("playwright").Page;
    const result = await assertElementVisible(page, "#missing", "Missing element");
    expect(result.passed).toBe(false);
    expect(result.category).toBe("element-not-found");
  });

  it("fails gracefully when isVisible rejects", async () => {
    const page = {
      url: () => "https://app.example.com",
      locator: () => ({
        first: () => ({
          isVisible: () => Promise.reject(new Error("timeout"))
        })
      })
    } as unknown as import("playwright").Page;
    const result = await assertElementVisible(page, "#bad", "Broken");
    expect(result.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assertNavigationReachable
// ---------------------------------------------------------------------------

describe("assertNavigationReachable", () => {
  it("passes when navigation returns HTTP 200", async () => {
    const page = makePage();
    const result = await assertNavigationReachable(page, "https://app.example.com/menu");
    expect(result.passed).toBe(true);
  });

  it("fails when navigation returns HTTP 404", async () => {
    const page = {
      url: () => "https://app.example.com",
      goto: () => Promise.resolve({ status: () => 404 })
    } as unknown as import("playwright").Page;
    const result = await assertNavigationReachable(page, "https://app.example.com/missing");
    expect(result.passed).toBe(false);
    expect(result.category).toBe("navigation-failed");
    expect(result.evidence).toContain("404");
  });

  it("returns navigation-timeout category when goto throws", async () => {
    const page = {
      url: () => "https://app.example.com",
      goto: () => Promise.reject(new Error("net::ERR_CONNECTION_REFUSED"))
    } as unknown as import("playwright").Page;
    const result = await assertNavigationReachable(page, "https://bad.example.com");
    expect(result.passed).toBe(false);
    expect(result.category).toBe("navigation-timeout");
  });
});

// ---------------------------------------------------------------------------
// assertAuthBoundary
// ---------------------------------------------------------------------------

describe("assertAuthBoundary", () => {
  it("passes when navigation redirects to login URL", async () => {
    // Simulate redirect to /login
    const page = {
      url: vi.fn().mockReturnValue("https://app.example.com/login"),
      goto: () => Promise.resolve(),
      waitForLoadState: () => Promise.resolve(),
      locator: () => ({
        first: () => ({
          isVisible: () => Promise.resolve(false)
        })
      })
    } as unknown as import("playwright").Page;
    const result = await assertAuthBoundary(page, "https://app.example.com/protected");
    expect(result.passed).toBe(true);
    expect(result.category).toBe("auth-failed");
  });

  it("fails when protected page is served without auth challenge", async () => {
    const protectedUrl = "https://app.example.com/protected";
    const page = {
      url: vi.fn().mockReturnValue(protectedUrl),
      goto: () => Promise.resolve(),
      waitForLoadState: () => Promise.resolve(),
      locator: () => ({
        first: () => ({
          isVisible: () => Promise.resolve(false)
        })
      })
    } as unknown as import("playwright").Page;
    const result = await assertAuthBoundary(page, protectedUrl);
    expect(result.passed).toBe(false);
  });

  it("fails gracefully when goto throws", async () => {
    const page = {
      url: () => "",
      goto: () => Promise.reject(new Error("network error")),
      waitForLoadState: () => Promise.resolve()
    } as unknown as import("playwright").Page;
    const result = await assertAuthBoundary(page, "https://app.example.com/protected");
    expect(result.passed).toBe(false);
    expect(result.category).toBe("auth-failed");
  });
});

// ---------------------------------------------------------------------------
// assertFormLabeled
// ---------------------------------------------------------------------------

describe("assertFormLabeled", () => {
  it("passes when input has an aria-label", async () => {
    const page = {
      url: () => "https://app.example.com",
      evaluate: (_fn: unknown, _selector: unknown) =>
        Promise.resolve({ found: true, hasLabel: true, evidence: "Email address" })
    } as unknown as import("playwright").Page;
    const result = await assertFormLabeled(page, "input[name=email]");
    expect(result.passed).toBe(true);
    expect(result.evidence).toContain("Email address");
  });

  it("fails when input has no accessible label", async () => {
    const page = {
      url: () => "https://app.example.com",
      evaluate: (_fn: unknown, _selector: unknown) =>
        Promise.resolve({ found: true, hasLabel: false, evidence: "" })
    } as unknown as import("playwright").Page;
    const result = await assertFormLabeled(page, "input[type=text]");
    expect(result.passed).toBe(false);
    expect(result.category).toBe("accessibility-violation");
  });

  it("fails when element is not found in DOM", async () => {
    const page = {
      url: () => "https://app.example.com",
      evaluate: (_fn: unknown, _selector: unknown) =>
        Promise.resolve({ found: false, hasLabel: false, evidence: "" })
    } as unknown as import("playwright").Page;
    const result = await assertFormLabeled(page, "#ghost");
    expect(result.passed).toBe(false);
    expect(result.category).toBe("element-not-found");
  });
});
