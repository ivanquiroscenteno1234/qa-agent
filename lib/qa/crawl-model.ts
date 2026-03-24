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