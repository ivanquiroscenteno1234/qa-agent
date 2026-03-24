import type { Page } from "playwright";

export async function discoverNavigationCandidates(
  page: Page,
  deps: { cleanLabel: (value: string) => string; selectDiscoveryLabels: (values: string[], limit: number) => string[] }
): Promise<string[]> {
  const navigationLocator = page.locator('nav button, nav a, aside button, aside a, [role="navigation"] button, [role="navigation"] a');
  const fallbackLocator = page.locator('button, a, [role="button"], [role="link"]');
  const source = (await navigationLocator.count()) > 0 ? navigationLocator : fallbackLocator;
  const count = await source.count();
  const labels: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const candidate = source.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    const text = deps.cleanLabel((await candidate.textContent()) ?? "");
    if (!text || text.length < 3) {
      continue;
    }

    labels.push(text);
  }

  return deps.selectDiscoveryLabels(labels, 6);
}