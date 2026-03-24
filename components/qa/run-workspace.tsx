import type { ReactNode } from "react";

import type { RunRecord, RunStatus } from "@/lib/types";

interface RunWorkspaceProps {
  eyebrow: string;
  title: string;
  runs: RunRecord[];
  selectedRun: RunRecord | null;
  emptyListMessage: string;
  onSelectRun: (run: RunRecord) => void;
  statusClassName: (status: RunStatus) => string;
  buildActivityDetail: (run: RunRecord) => string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function RunWorkspace({
  eyebrow,
  title,
  runs,
  selectedRun,
  emptyListMessage,
  onSelectRun,
  statusClassName,
  buildActivityDetail,
  actions,
  children
}: RunWorkspaceProps) {
  return (
    <section className="grid-layout">
      <div className="panel run-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          {selectedRun && <span className={`status-pill ${statusClassName(selectedRun.status)}`}>{selectedRun.status}</span>}
        </div>

        <div className="run-shell">
          <aside className="run-list">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                className={`run-row ${selectedRun?.id === run.id ? "run-row-active" : ""}`}
                onClick={() => onSelectRun(run)}
              >
                <strong>{run.plan.featureArea}</strong>
                <span className={`run-status ${statusClassName(run.status)}`}>{run.status}</span>
                <small>{run.plan.environment}</small>
              </button>
            ))}
            {!runs.length && <p className="muted">{emptyListMessage}</p>}
          </aside>

          <div className="run-details">
            {selectedRun ? (
              <>
                <div className="detail-header">
                  <div>
                    <h3>{selectedRun.plan.featureArea}</h3>
                    <p>
                      {selectedRun.plan.mode} · {selectedRun.plan.browser} · {selectedRun.plan.role}
                    </p>
                  </div>
                  <div className="run-actions">{actions}</div>
                </div>
                <div className="phase-banner">
                  <span>{selectedRun.currentPhase}</span>
                  <strong className={`status-pill ${statusClassName(selectedRun.status)}`}>{selectedRun.status}</strong>
                </div>

                <p className="muted">{selectedRun.summary}</p>

                <div className="activity-banner">
                  <strong>Current activity</strong>
                  <span>{selectedRun.currentActivity ?? "No current activity recorded."}</span>
                  <small>{buildActivityDetail(selectedRun)}</small>
                </div>

                {children}
              </>
            ) : (
              <p className="muted">No run selected.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}