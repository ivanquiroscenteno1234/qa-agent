import Link from "next/link";
import type { Route } from "next";
import type { ScenarioLibrary } from "@/lib/types";

interface ScenarioLibraryCardProps {
  library: ScenarioLibrary;
  onRun?: (library: ScenarioLibrary) => void;
  onRename?: (library: ScenarioLibrary) => void;
  onArchive?: (library: ScenarioLibrary) => void;
  onDuplicate?: (library: ScenarioLibrary) => void;
  onDelete?: (library: ScenarioLibrary) => void;
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

export function ScenarioLibraryCard({ library, onRun, onRename, onArchive, onDuplicate, onDelete }: ScenarioLibraryCardProps) {
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
          <Link href={`/library/${library.id}` as Route} className="scenario-library-history-link" title="View full version history for this scenario library.">
            History
          </Link>
          <button type="button" disabled={!onRename} onClick={() => onRename?.(library)} title="Rename this scenario library.">
            Rename
          </button>
          <button type="button" disabled={!onArchive} onClick={() => onArchive?.(library)} title="Archive this scenario library.">
            Archive
          </button>
          <button type="button" disabled={!onDuplicate} onClick={() => onDuplicate?.(library)} title="Duplicate this scenario library.">
            Duplicate
          </button>
          <button type="button" disabled={!onDelete} onClick={() => onDelete?.(library)} title="Permanently delete this scenario library.">
            Delete
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