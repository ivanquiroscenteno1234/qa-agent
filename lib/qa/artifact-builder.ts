import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { BrowserContext, Page } from "playwright";

import type { AnalysisInsight, Artifact, RunPlan, RunRecord } from "@/lib/types";
import type { CrawlSnapshot } from "@/lib/qa/crawl-model";
import { createId } from "@/lib/qa/utils";

const artifactDirectory = path.join(process.cwd(), ".data", "artifacts");

async function ensureArtifactDirectory(runId: string): Promise<string> {
  const dirPath = path.join(artifactDirectory, runId);
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

async function crawlPage(page: Page): Promise<string> {
  return page.evaluate(() => {
    const textList = (selector: string, limit: number) =>
      Array.from(document.querySelectorAll(selector))
        .map((node) => node.textContent?.trim() ?? "")
        .filter(Boolean)
        .slice(0, limit);

    const payload = {
      title: document.title,
      url: location.href,
      headings: textList("h1, h2, h3, h4", 20),
      buttons: textList("button", 30),
      links: textList("a", 20),
      inputs: Array.from(document.querySelectorAll("input, textarea, select"))
        .map((element) => {
          const input = element as HTMLInputElement;
          return {
            tag: element.tagName.toLowerCase(),
            name: input.name || "",
            type: input.type || "",
            placeholder: input.placeholder || "",
            ariaLabel: input.getAttribute("aria-label") || ""
          };
        })
        .slice(0, 20)
    };

    return JSON.stringify(payload, null, 2);
  });
}

export async function captureScreenshot(page: Page, runId: string, stepNumber: number, label: string): Promise<Artifact> {
  const dirPath = await ensureArtifactDirectory(runId);
  const filename = `step-${stepNumber}.png`;
  const absolutePath = path.join(dirPath, filename);
  await page.screenshot({ path: absolutePath, fullPage: true });

  return {
    id: createId("artifact"),
    type: "screenshot",
    label,
    content: absolutePath
  };
}

export function buildAnalysisReport(insights: AnalysisInsight[]): string {
  return [
    "# QA Analysis Insights",
    "",
    ...insights.flatMap((insight, index) => [
      `${index + 1}. ${insight.title}`,
      `Category: ${insight.category}`,
      `Summary: ${insight.summary}`,
      `Recommendation: ${insight.recommendation}`,
      `Confidence: ${Math.round(insight.confidence * 100)}%`,
      `Evidence: ${insight.evidence.length ? insight.evidence.map((item) => `${item.type}: ${item.label}`).join(" | ") : "None linked"}`,
      ""
    ])
  ].join("\n");
}

export async function buildRunArtifacts(
  runId: string,
  plan: RunPlan,
  context: BrowserContext,
  page: Page,
  options?: { crawlContent?: string; reportContent?: string; manualTestPlanContent?: string; analysisReportContent?: string }
): Promise<Artifact[]> {
  const dirPath = await ensureArtifactDirectory(runId);
  const tracePath = path.join(dirPath, "trace.zip");
  await context.tracing.stop({ path: tracePath });
  const crawl = options?.crawlContent ?? (await crawlPage(page));

  return [
    {
      id: createId("artifact"),
      type: "trace",
      label: "Execution Trace",
      content: tracePath
    },
    {
      id: createId("artifact"),
      type: "crawl",
      label: "Page Crawl",
      content: crawl
    },
    {
      id: createId("artifact"),
      type: "report",
      label: "Run Summary",
      content:
        options?.reportContent ??
        `Environment: ${plan.environment}\nFeature: ${plan.featureArea}\nRisk: ${plan.riskLevel}\nURL: ${page.url()}`
    },
    {
      id: createId("artifact"),
      type: "report",
      label: "Manual Test Plan",
      content: options?.manualTestPlanContent ?? "No manual test plan was generated."
    },
    {
      id: createId("artifact"),
      type: "report",
      label: "QA Analysis",
      content: options?.analysisReportContent ?? "No QA analysis insights were generated."
    }
  ];
}

export function buildManualTestPlan(
  plan: RunPlan,
  crawlSnapshot: CrawlSnapshot | null,
  discoverySurface: string[],
  scenarios: RunRecord["generatedScenarios"]
): string {
  const visitedViews = (crawlSnapshot?.visitedViews ?? []).map((view) => `${view.label}: ${view.url}`);

  return [
    "# Manual Test Plan",
    "",
    `- Target URL: ${plan.targetUrl}`,
    `- Environment: ${plan.environment}`,
    `- Mode: ${plan.mode}`,
    `- Risk Level: ${plan.riskLevel}`,
    `- Safe Mode: ${plan.safeMode ? "observe-only" : "interactive"}`,
    "",
    "## Discovered Surface",
    ...discoverySurface.map((item) => `- ${item}`),
    ...(visitedViews.length ? ["", "## Visited Views", ...visitedViews.map((item) => `- ${item}`)] : []),
    "",
    "## Suggested Manual Tests",
    ...scenarios.flatMap((scenario, index) => [
      `${index + 1}. ${scenario.title}`,
      `Priority: ${scenario.priority} | Type: ${scenario.type}`,
      `Expected: ${scenario.expectedResult}`,
      `Steps: ${scenario.steps.join(" -> ")}`,
      ""
    ])
  ].join("\n");
}