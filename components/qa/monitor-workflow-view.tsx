import type { ExecutionWarning, RunEvent, RunRecord, RunStatus, RunSummary } from "@/lib/types";
import { LiveConsolePanel } from "@/components/qa/live-console-panel";
import { RunListPanel } from "@/components/qa/run-list-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionFrame } from "@/components/ui/section-frame";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildMonitorSummary } from "@/lib/qa/run-view-model";

interface MonitorWorkflowViewProps {
  isLoading: boolean;
  runs: RunSummary[];
  selectedRun: RunRecord | null;
  runEvents: RunEvent[];
  runWarnings: ExecutionWarning[];
  onSelectRun: (run: RunSummary) => void;
  onStartRun: (runId: string) => void;
  onCancelRun: (runId: string) => void;
  formatElapsed: (startedAt?: string, completedAt?: string) => string;
  statusClassName: (status: RunStatus) => string;
  buildActivityDetail: (run: RunRecord) => string;
  isActiveRun: (status: RunStatus) => boolean;
}

export function MonitorWorkflowView({
  isLoading,
  runs,
  selectedRun,
  runEvents,
  runWarnings,
  onSelectRun,
  onStartRun,
  onCancelRun,
  formatElapsed,
  statusClassName,
  buildActivityDetail,
  isActiveRun
}: MonitorWorkflowViewProps) {
  const summary = buildMonitorSummary(runs);
  const summaryValue = (value: number) => (isLoading ? "..." : String(value));

  return (
    <section className="monitor-screen">
      <section className="metric-grid">
        <MetricCard label="Active Missions" value={summaryValue(summary.activeRuns)} detail={isLoading ? "Loading runs currently executing or queued" : "Runs currently executing or queued"} tone="running" />
        <MetricCard label="In Queue" value={summaryValue(summary.queuedRuns)} detail={isLoading ? "Loading queued runs" : "Awaiting worker dispatch"} tone="warning" />
        <MetricCard label="Drafting" value={summaryValue(summary.draftRuns)} detail={isLoading ? "Loading prepared runs" : "Prepared but not started"} />
        <MetricCard label="Completed" value={summaryValue(summary.completedRuns)} detail={isLoading ? "Loading terminal runs" : "Terminal runs available for review"} tone="success" />
      </section>

      <section className="monitor-layout">
        <RunListPanel
          runs={runs}
          selectedRunId={selectedRun?.id ?? null}
          emptyListMessage={isLoading ? "Loading runs..." : "Create a run to populate the execution monitor."}
          onSelectRun={onSelectRun}
          isActiveRun={isActiveRun}
        />

        <div className="monitor-detail-column">
          <SectionFrame eyebrow="Execution" title="Run Monitor" reference={selectedRun ? `RUN: ${selectedRun.id}` : isLoading ? "LOADING" : "SELECT A RUN"}>
            {isLoading && !selectedRun ? (
              <p className="muted">Loading run monitor...</p>
            ) : selectedRun ? (
              <>
                <div className="monitor-detail-header">
                  <div>
                    <h3>{selectedRun.plan.featureArea}</h3>
                    <p className="muted">
                      {selectedRun.plan.mode} · {selectedRun.plan.browser} · {selectedRun.plan.role}
                    </p>
                  </div>
                  <div className="run-actions">
                    {selectedRun.status === "draft" && (
                      <button type="button" className="primary-action" onClick={() => onStartRun(selectedRun.id)}>
                        Start Run
                      </button>
                    )}
                    {isActiveRun(selectedRun.status) && (
                      <button type="button" onClick={() => onCancelRun(selectedRun.id)}>
                        Cancel Run
                      </button>
                    )}
                  </div>
                </div>

                <div className="monitor-phase-strip">
                  <StatusBadge tone={selectedRun.status === "running" ? "running" : selectedRun.status === "queued" ? "warning" : selectedRun.status === "pass" ? "success" : selectedRun.status === "fail" ? "danger" : "default"}>
                    {selectedRun.status}
                  </StatusBadge>
                  <StatusBadge tone="default">{selectedRun.currentPhase}</StatusBadge>
                  <StatusBadge tone={isActiveRun(selectedRun.status) ? "running" : "muted"}>
                    {isActiveRun(selectedRun.status) ? "Live uplink active" : "Awaiting operator action"}
                  </StatusBadge>
                </div>

                <p className="muted">{selectedRun.summary}</p>

                <div className="activity-banner">
                  <strong>Current activity</strong>
                  <span>{selectedRun.currentActivity ?? "No current activity recorded."}</span>
                  <small>{buildActivityDetail(selectedRun)}</small>
                </div>

                <LiveConsolePanel
                  selectedRun={selectedRun}
                  runEvents={runEvents}
                  runWarnings={runWarnings}
                  formatElapsed={formatElapsed}
                />
              </>
            ) : (
              <p className="muted">No run selected.</p>
            )}
          </SectionFrame>
        </div>
      </section>
    </section>
  );
}