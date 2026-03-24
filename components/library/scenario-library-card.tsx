import type { ScenarioLibrary } from "@/lib/types";

interface ScenarioLibraryCardProps {
  library: ScenarioLibrary;
  onRun?: (library: ScenarioLibrary) => void;
}

function deriveRiskBand(library: ScenarioLibrary): "High Risk" | "Med Risk" | "Low Risk" {
  const text = `${library.riskSummary.join(" ")} ${library.coverageGaps.join(" ")}`.toLowerCase();

  if (text.includes("auth") || text.includes("permission") || text.includes("security")) {
    return "High Risk";
  }

  if (text.includes("validation") || text.includes("state") || text.includes("navigation")) {
    return "Med Risk";
  }

  return "Low Risk";
}

function buildTags(library: ScenarioLibrary): string[] {
  const tags = [library.featureArea, library.environment, library.role]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);

  return tags;
}

export function ScenarioLibraryCard({ library, onRun }: ScenarioLibraryCardProps) {
  const riskBand = deriveRiskBand(library);
  const tags = buildTags(library);
  const latestVersion = library.versions[library.versions.length - 1];

  return (
    <article className="scenario-library-card">
      <div className="scenario-library-card-header">
        <div>
          <h3>{library.name}</h3>
          <div className="scenario-library-card-meta">
            <span className={`scenario-library-risk scenario-library-risk-${riskBand.toLowerCase().replace(/\s+/g, "-")}`}>{riskBand}</span>
            <span>{library.scenarios.length} scenarios</span>
            <span>v{library.version}</span>
          </div>
        </div>
        <div className="scenario-library-card-actions">
          <button type="button" onClick={() => onRun?.(library)} disabled={!onRun} title="Load this library into Draft and prepare a new run.">
            Run
          </button>
          <button type="button" disabled title="Version history detail route is planned next.">
            History
          </button>
          <button type="button" disabled title="Rename requires an API route that does not exist yet.">
            Rename
          </button>
          <button type="button" disabled title="Archive requires backend support that is not implemented yet.">
            Archive
          </button>
          <button type="button" disabled title="Duplicate requires backend support that is not implemented yet.">
            Duplicate
          </button>
        </div>
      </div>

      <div className="scenario-library-divider" />

      <div className="scenario-library-card-body">
        <div className="scenario-library-card-summary">
          <p className="scenario-library-summary-label">Version Summary</p>
          <p className="muted">{latestVersion?.summary ?? "Initial library snapshot."}</p>
        </div>
        <div className="scenario-library-card-summary">
          <p className="scenario-library-summary-label">Coverage Gaps</p>
          <p className="muted">{library.coverageGaps[0] ?? "No explicit coverage gaps recorded."}</p>
        </div>
      </div>

      <div className="scenario-library-card-footer">
        <div className="scenario-library-card-stats">
          <span>Updated {new Date(library.updatedAt).toLocaleString()}</span>
          <span>Source run: {library.sourceRunId ?? "Not linked"}</span>
        </div>
        <div className="scenario-library-tag-list">
          {tags.map((tag) => (
            <span key={`${library.id}-${tag}`}>#{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}