import { buildRunListItems } from "@/lib/qa/run-view-model";
import type { RunStatus, RunSummary } from "@/lib/types";

interface RunListPanelProps {
  runs: RunSummary[];
  selectedRunId: string | null;
  emptyListMessage: string;
  onSelectRun: (run: RunSummary) => void;
  isActiveRun: (status: RunStatus) => boolean;
}

export function RunListPanel({ runs, selectedRunId, emptyListMessage, onSelectRun, isActiveRun }: RunListPanelProps) {
  const items = buildRunListItems(runs);

  return (
    <aside className="monitor-run-list-panel">
      <div className="monitor-run-list-header">
        <div>
          <p className="section-frame-eyebrow">Operational Stream</p>
          <h3 className="section-frame-title">Mission Queue</h3>
        </div>
      </div>

      <div className="monitor-run-list">
        {items.map((item) => {
          const run = runs.find((candidate) => candidate.id === item.id);

          if (!run) {
            return null;
          }

          return (
            <button
              key={item.id}
              type="button"
              className={`monitor-run-card ${selectedRunId === item.id ? "monitor-run-card-active" : ""}`}
              onClick={() => onSelectRun(run)}
            >
              <div className="monitor-run-card-topline">
                <div>
                  <strong>{item.featureArea}</strong>
                  <p>{item.subtitle}</p>
                </div>
                <span className={`run-status ${item.status === "running" ? "status-running" : item.status === "queued" ? "status-queued" : item.status === "pass" ? "status-pass" : item.status === "fail" ? "status-fail" : item.status === "blocked" ? "status-blocked" : item.status === "cancelled" ? "status-cancelled" : "status-ready"}`}>
                  {item.status}
                </span>
              </div>

              {typeof item.progress === "number" ? (
                <div className="monitor-run-progress-block">
                  <div className="monitor-run-progress-track">
                    <div className="monitor-run-progress-fill" style={{ width: `${item.progress}%` }} />
                  </div>
                  <span>{item.progress}%</span>
                </div>
              ) : (
                <div className="monitor-run-progress-meta">
                  <span>Ready to start</span>
                </div>
              )}

              <div className="monitor-run-card-meta">
                <span>{item.role}</span>
                <span>{item.createdAtLabel}</span>
              </div>
            </button>
          );
        })}
        {!runs.length && <p className="muted">{emptyListMessage}</p>}
      </div>
    </aside>
  );
}