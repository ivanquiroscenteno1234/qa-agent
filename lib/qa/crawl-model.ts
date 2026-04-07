export interface CrawlSnapshot {
  title?: string;
  url?: string;
  headings?: string[];
  buttons?: string[];
  links?: string[];
  navigationCandidates?: string[];
  visitedViews?: CrawlView[];
  inputs?: Array<{
    tag?: string;
    name?: string;
    type?: string;
    placeholder?: string;
    ariaLabel?: string;
  }>;
}

export interface CrawlView {
  label: string;
  depth: number;
  parentLabel?: string;
  title: string;
  url: string;
  headings: string[];
  buttons: string[];
  links: string[];
  inputs: Array<{
    tag: string;
    name: string;
    type: string;
    placeholder: string;
    ariaLabel: string;
  }>;
}

export interface DiscoveredView {
  label: string;
  url: string;
  title: string;
  depth: number;
  parentLabel?: string;
}

export interface DiscoveredInput {
  selector: string;
  label: string;
  type: string;
  required: boolean;
  nearestHeading: string;
}

export interface NavTarget {
  selector: string;
  label: string;
  resolvedUrl: string;
  confidence: number;
}

export interface PageSurface {
  views: DiscoveredView[];
  inputs: DiscoveredInput[];
  navTargets: NavTarget[];
  confidence: import("@/lib/types").ConfidenceScore;
}

export function buildPageSurface(crawlResult: CrawlSnapshot): PageSurface {
  const views: DiscoveredView[] = (crawlResult.visitedViews ?? []).map((view) => ({
    label: view.label,
    url: view.url,
    title: view.title,
    depth: view.depth,
    parentLabel: view.parentLabel
  }));

  const inputMap = new Map<string, DiscoveredInput>();
  for (const view of crawlResult.visitedViews ?? []) {
    const nearestHeading = view.headings[0] ?? view.title ?? "";
    for (const input of view.inputs) {
      const label = input.ariaLabel || input.placeholder || input.name || input.tag || "unknown";
      const key = `${view.url}::${label}`;
      if (!inputMap.has(key)) {
        inputMap.set(key, {
          selector: `${input.tag}[name="${input.name}"]`,
          label,
          type: input.type || "text",
          required: false,
          nearestHeading
        });
      }
    }
  }

  const navTargets: NavTarget[] = (crawlResult.visitedViews ?? []).flatMap((view) =>
    view.links.slice(0, 10).map((link) => ({
      selector: `a`,
      label: link,
      resolvedUrl: view.url,
      confidence: 0.5
    }))
  );

  const viewCount = views.length;
  const score = viewCount === 0 ? 0 : Math.min(1, viewCount / 10);

  return {
    views,
    inputs: [...inputMap.values()],
    navTargets,
    confidence: {
      score,
      rationale: viewCount === 0 ? "No views discovered." : `${viewCount} view${viewCount === 1 ? "" : "s"} discovered during crawl.`
    }
  };
}