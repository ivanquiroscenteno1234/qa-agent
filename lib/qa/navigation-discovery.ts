import type { Page } from "playwright";

export async function discoverNavigationCandidates(
  page: Page,
  deps: { cleanLabel: (value: string) => string; selectDiscoveryLabels: (values: string[], limit: number) => string[] }
): Promise<string[]> {
  const navigationLocator = page.locator('nav button, nav a, [role="navigation"] button, [role="navigation"] a');
  const fallbackLocator = page.locator('button, a, [role="button"], [role="link"]');
  // ⚡ Bolt: Leverage Playwright's optimized internal engine with `.filter({ visible: true })`
  // instead of sequential loops with `isVisible()` to significantly reduce network latency over CDP
  const baseSource = (await navigationLocator.count()) > 0 ? navigationLocator : fallbackLocator;
  const source = baseSource.filter({ visible: true });
  const count = await source.count();
  const labels: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const candidate = source.nth(index);

    const text = deps.cleanLabel((await candidate.textContent()) ?? "");
    const role = await candidate.getAttribute("role").catch(() => null);
    const hasPopup = await candidate.getAttribute("aria-haspopup").catch(() => null);
    const expanded = await candidate.getAttribute("aria-expanded").catch(() => null);

    if (!text || text.length < 3) {
      continue;
    }

    if (role === "combobox" || hasPopup === "listbox" || expanded === "true") {
      continue;
    }

    labels.push(text);
  }

  return deps.selectDiscoveryLabels(labels, 6);
}