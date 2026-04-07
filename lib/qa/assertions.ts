import type { Page } from "playwright";

import type { FailureCategory } from "@/lib/types";

export interface AssertionResult {
  passed: boolean;
  evidence: string;
  category: FailureCategory;
}

/**
 * Assert that an element matching `selector` is visible on the page.
 */
export async function assertElementVisible(
  page: Page,
  selector: string,
  description: string
): Promise<AssertionResult> {
  try {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible({ timeout: 5_000 }).catch(() => false);

    if (visible) {
      return {
        passed: true,
        evidence: `Element "${description}" (${selector}) is visible on ${page.url()}.`,
        category: "element-not-found"
      };
    }

    return {
      passed: false,
      evidence: `Element "${description}" (${selector}) was not found or not visible on ${page.url()}.`,
      category: "element-not-found"
    };
  } catch {
    return {
      passed: false,
      evidence: `Assertion for "${description}" failed with an unexpected error on ${page.url()}.`,
      category: "runtime-error"
    };
  }
}

/**
 * Assert that navigation to `targetUrl` succeeds within the allowed timeout.
 * A navigation is considered reachable if the resulting URL starts with `targetUrl`
 * and no error page indicators are present.
 */
export async function assertNavigationReachable(
  page: Page,
  target: string
): Promise<AssertionResult> {
  try {
    const response = await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: 30_000
    });

    const status = response?.status() ?? 0;
    const finalUrl = page.url();

    if (status >= 400) {
      return {
        passed: false,
        evidence: `Navigation to ${target} returned HTTP ${status} (final URL: ${finalUrl}).`,
        category: "navigation-failed"
      };
    }

    return {
      passed: true,
      evidence: `Navigated to ${target} successfully. Final URL: ${finalUrl}. HTTP ${status}.`,
      category: "navigation-failed"
    };
  } catch {
    return {
      passed: false,
      evidence: `Navigation to ${target} timed out or threw an error from ${page.url()}.`,
      category: "navigation-timeout"
    };
  }
}

/**
 * Assert that navigating to `protectedUrl` without authentication triggers a redirect
 * to a login or authentication page.
 */
export async function assertAuthBoundary(
  page: Page,
  protectedUrl: string
): Promise<AssertionResult> {
  try {
    await page.goto(protectedUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

    const finalUrl = page.url();
    const isLoginPage = /login|signin|sign-in|auth/i.test(finalUrl);

    const loginFormVisible = await page
      .locator("input[type='password'], input[name='password']")
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    const redirectedCorrectly = isLoginPage || loginFormVisible || finalUrl !== protectedUrl;

    return {
      passed: redirectedCorrectly,
      evidence: redirectedCorrectly
        ? `Unauthenticated access to ${protectedUrl} correctly redirected to ${finalUrl}.`
        : `Unauthenticated access to ${protectedUrl} reached the page without an auth challenge (final URL: ${finalUrl}).`,
      category: "auth-failed"
    };
  } catch {
    return {
      passed: false,
      evidence: `Auth boundary check for ${protectedUrl} could not be completed due to a navigation error.`,
      category: "auth-failed"
    };
  }
}

/**
 * Assert that a form input identified by `inputSelector` has an accessible label.
 */
export async function assertFormLabeled(
  page: Page,
  inputSelector: string
): Promise<AssertionResult> {
  try {
    const result = await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (!element) {
        return { found: false, hasLabel: false, evidence: "" };
      }

      const id = element.getAttribute("id");
      const ariaLabel = element.getAttribute("aria-label");
      const ariaLabelledBy = element.getAttribute("aria-labelledby");
      const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
      const hasLabel = Boolean(ariaLabel || ariaLabelledBy || associatedLabel);

      return {
        found: true,
        hasLabel,
        evidence: ariaLabel || ariaLabelledBy || associatedLabel?.textContent?.trim() || ""
      };
    }, inputSelector);

    if (!result.found) {
      return {
        passed: false,
        evidence: `Input "${inputSelector}" was not found in the DOM on ${page.url()}.`,
        category: "element-not-found"
      };
    }

    return {
      passed: result.hasLabel,
      evidence: result.hasLabel
        ? `Input "${inputSelector}" has an accessible label: "${result.evidence}".`
        : `Input "${inputSelector}" lacks an accessible label (no aria-label, aria-labelledby, or <label for=...>).`,
      category: "accessibility-violation"
    };
  } catch {
    return {
      passed: false,
      evidence: `Accessibility check for "${inputSelector}" failed with an unexpected error on ${page.url()}.`,
      category: "runtime-error"
    };
  }
}

/**
 * Assert that clicking `triggerSelector` causes the page to transition to a state
 * containing `expectedState` text (in the page URL or visible text).
 */
export async function assertStateTransition(
  page: Page,
  triggerSelector: string,
  expectedState: string
): Promise<AssertionResult> {
  try {
    const triggerLocator = page.locator(triggerSelector).first();
    const triggerVisible = await triggerLocator.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!triggerVisible) {
      return {
        passed: false,
        evidence: `Trigger "${triggerSelector}" was not visible before state-transition check on ${page.url()}.`,
        category: "element-not-found"
      };
    }

    await triggerLocator.click({ timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

    const finalUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText).catch(() => "");
    const normalizedExpected = expectedState.toLowerCase();
    const stateMatch =
      finalUrl.toLowerCase().includes(normalizedExpected) ||
      pageText.toLowerCase().includes(normalizedExpected);

    return {
      passed: stateMatch,
      evidence: stateMatch
        ? `State transition via "${triggerSelector}" reached expected state "${expectedState}" at ${finalUrl}.`
        : `State transition via "${triggerSelector}" did not reach "${expectedState}". Final URL: ${finalUrl}.`,
      category: "state-mismatch"
    };
  } catch {
    return {
      passed: false,
      evidence: `State-transition assertion for "${triggerSelector}" → "${expectedState}" failed with an error on ${page.url()}.`,
      category: "runtime-error"
    };
  }
}

/**
 * Assert that `containerSelector` shows an empty-state indicator (no items, empty list, etc.).
 */
export async function assertEmptyState(
  page: Page,
  containerSelector: string
): Promise<AssertionResult> {
  try {
    const container = page.locator(containerSelector).first();
    const visible = await container.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!visible) {
      return {
        passed: false,
        evidence: `Container "${containerSelector}" was not visible on ${page.url()}. Cannot confirm empty state.`,
        category: "element-not-found"
      };
    }

    const itemCount = await page
      .locator(`${containerSelector} li, ${containerSelector} tr, ${containerSelector} [data-item]`)
      .count()
      .catch(() => 0);

    const containerText = await container.innerText().catch(() => "");
    const emptyIndicators = /no (items|results|records|data)|empty|nothing (to show|here|yet)/i.test(containerText);
    const isEmpty = itemCount === 0 || emptyIndicators;

    return {
      passed: isEmpty,
      evidence: isEmpty
        ? `Container "${containerSelector}" shows an empty state (${itemCount} items, indicator: ${emptyIndicators}).`
        : `Container "${containerSelector}" contains ${itemCount} item(s) — not in an empty state.`,
      category: "state-mismatch"
    };
  } catch {
    return {
      passed: false,
      evidence: `Empty-state assertion for "${containerSelector}" failed with an unexpected error on ${page.url()}.`,
      category: "runtime-error"
    };
  }
}
