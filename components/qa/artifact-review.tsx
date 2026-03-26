import Image from "next/image";

import type { Artifact } from "@/lib/types";

interface ArtifactReviewProps {
  runId: string;
  artifacts: Artifact[];
}

interface ArtifactGroup {
  key: Artifact["type"];
  title: string;
  description: string;
  artifacts: Artifact[];
}

interface CrawlInputSummary {
  tag: string;
  type: string;
  placeholder: string;
  ariaLabel: string;
}

interface CrawlVisitedView {
  label: string;
  url: string;
  depth?: number;
  parentLabel?: string;
  headings?: string[];
  buttons?: string[];
  inputs?: CrawlInputSummary[];
}

interface CrawlArtifactPayload {
  title?: string;
  url?: string;
  navigationCandidates?: string[];
  visitedViews?: CrawlVisitedView[];
  headings?: string[];
  buttons?: string[];
  inputs?: CrawlInputSummary[];
}

function parseCrawlArtifact(content: string): CrawlArtifactPayload | null {
  try {
    return JSON.parse(content) as CrawlArtifactPayload;
  } catch {
    return null;
  }
}

function summarizeArtifact(artifact: Artifact): string {
  if (artifact.type === "crawl") {
    return "Structured page inventory captured.";
  }

  if (artifact.type === "trace") {
    return "Execution trace archive available for offline debugging.";
  }

  if (artifact.type === "screenshot") {
    return artifact.label;
  }

  return artifact.content.split("\n").slice(0, 2).join(" ");
}

function buildArtifactGroups(artifacts: Artifact[]): ArtifactGroup[] {
  const definitions: Array<Omit<ArtifactGroup, "artifacts">> = [
    {
      key: "screenshot",
      title: "Evidence Captures",
      description: "Screenshots linked to observed steps and states."
    },
    {
      key: "crawl",
      title: "Discovery Data",
      description: "Structured crawl inventories and reachable surface snapshots."
    },
    {
      key: "report",
      title: "Reports",
      description: "Summaries, QA analysis, and generated manual test plans."
    },
    {
      key: "trace",
      title: "Debug Archives",
      description: "Trace output kept for offline debugging and reproduction."
    }
  ];

  return definitions
    .map((definition) => ({
      ...definition,
      artifacts: artifacts.filter((artifact) => artifact.type === definition.key)
    }))
    .filter((group) => group.artifacts.length > 0);
}

function renderReportPreview(artifact: Artifact) {
  return <pre className="artifact-text-preview">{artifact.content}</pre>;
}

function renderCrawlPreview(artifact: Artifact) {
  const payload = parseCrawlArtifact(artifact.content);

  if (!payload) {
    return <pre className="artifact-text-preview">{artifact.content}</pre>;
  }

  return (
    <div className="artifact-crawl-preview">
      <div className="artifact-summary-grid">
        <div>
          <strong>Page</strong>
          <span>{payload.title ?? "Unknown page"}</span>
        </div>
        <div>
          <strong>Views</strong>
          <span>{payload.visitedViews?.length ?? 0}</span>
        </div>
        <div>
          <strong>Navigation Targets</strong>
          <span>{payload.navigationCandidates?.length ?? 0}</span>
        </div>
        <div>
          <strong>Inputs</strong>
          <span>{payload.inputs?.length ?? 0}</span>
        </div>
      </div>

      {!!payload.navigationCandidates?.length && (
        <div className="artifact-section">
          <h4>Navigation Candidates</h4>
          <div className="comparison-tags">
            {payload.navigationCandidates.map((candidate) => (
              <span key={candidate}>{candidate}</span>
            ))}
          </div>
        </div>
      )}

      {!!payload.visitedViews?.length && (
        <div className="artifact-section">
          <h4>Visited Views</h4>
          <ul className="artifact-visit-list">
            {payload.visitedViews.map((view, index) => (
              <li key={`${view.label}-${index}`}>
                <strong>{view.label}</strong>
                <span>{view.url}</span>
                <small>
                  Depth {view.depth ?? 0}
                  {view.parentLabel ? ` • From ${view.parentLabel}` : ""}
                  {view.headings?.length ? ` • Headings: ${view.headings.slice(0, 3).join(", ")}` : ""}
                  {view.inputs?.length
                    ? ` • Inputs: ${view.inputs
                        .map((input) => input.placeholder || input.ariaLabel || input.type || input.tag)
                        .slice(0, 3)
                        .join(", ")}`
                    : ""}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderPreview(runId: string, artifact: Artifact) {
  if (artifact.type === "screenshot") {
    return (
      <Image
        className="artifact-image-preview"
        src={`/api/runs/${runId}/artifacts/${artifact.id}`}
        alt={artifact.label}
        width={1600}
        height={900}
        sizes="(max-width: 1100px) 100vw, 50vw"
      />
    );
  }

  if (artifact.type === "crawl") {
    return renderCrawlPreview(artifact);
  }

  if (artifact.type === "report") {
    return renderReportPreview(artifact);
  }

  return <p className="muted">Inline preview is not available for this artifact type.</p>;
}

export function ArtifactReview({ runId, artifacts }: ArtifactReviewProps) {
  const artifactGroups = buildArtifactGroups(artifacts);

  return (
    <div className="artifact-review-grid">
      {!!artifactGroups.length && (
        <div className="artifact-group-summary">
          {artifactGroups.map((group) => (
            <span key={group.key} className="artifact-group-pill">
              {group.title}: {group.artifacts.length}
            </span>
          ))}
        </div>
      )}
      {artifactGroups.map((group) => (
        <section key={group.key} className="artifact-group-section">
          <div className="artifact-group-header">
            <div>
              <h3>{group.title}</h3>
              <p className="muted">{group.description}</p>
            </div>
            <span className="artifact-group-count">{group.artifacts.length} item(s)</span>
          </div>
          <div className="artifact-review-grid">
            {group.artifacts.map((artifact) => (
              <article key={artifact.id} className="artifact-card">
                <div className="artifact-card-header">
                  <div>
                    <h3>{artifact.label}</h3>
                    <p className="muted">{summarizeArtifact(artifact)}</p>
                  </div>
                  <a href={`/api/runs/${runId}/artifacts/${artifact.id}?download=1`} target="_blank" rel="noreferrer">
                    Download
                  </a>
                </div>
                {renderPreview(runId, artifact)}
              </article>
            ))}
          </div>
        </section>
      ))}
      {!artifactGroups.length && (
        <article className="artifact-card">
          <h3>Artifacts</h3>
          <p className="muted">No artifacts were captured for this run.</p>
        </article>
      )}
    </div>
  );
}