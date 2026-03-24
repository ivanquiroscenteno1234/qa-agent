import type { ExecutionWarning, RunEvent, RunRecord } from "@/lib/types";

interface LiveConsolePanelProps {
  selectedRun: RunRecord | null;
  runEvents: RunEvent[];
  runWarnings: ExecutionWarning[];
  formatElapsed: (startedAt?: string, completedAt?: string) => string;
}

export function LiveConsolePanel({ selectedRun, runEvents, runWarnings, formatElapsed }: LiveConsolePanelProps) {
  return (
    <div className="callout-grid monitor-console-grid">
      <div className="callout-box console-box monitor-console-box">
        <div className="monitor-console-header">
          <div>
            <h3>Live Run Console</h3>
            <p className="muted console-meta">
              Elapsed: {formatElapsed(selectedRun?.startedAt, selectedRun?.completedAt)}
              {selectedRun?.cancelRequestedAt ? ` · Cancel requested at ${new Date(selectedRun.cancelRequestedAt).toLocaleTimeString()}` : ""}
            </p>
          </div>
        </div>
        <ul className="console-list monitor-console-list">
          {runEvents.map((event) => (
            <li key={event.id} className={`monitor-console-event monitor-console-event-${event.level}`}>
              <div className="monitor-console-event-meta">
                <strong>{event.phase}</strong>
                <span className="console-timestamp">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              <p>{event.message}</p>
              {(typeof event.stepNumber === "number" || event.scenarioTitle) && (
                <span className="console-context">
                  {typeof event.stepNumber === "number" ? `Step ${event.stepNumber}` : ""}
                  {typeof event.stepNumber === "number" && event.scenarioTitle ? " · " : ""}
                  {event.scenarioTitle ? event.scenarioTitle : ""}
                </span>
              )}
            </li>
          ))}
          {!runEvents.length && <li>No live events captured for this run yet.</li>}
        </ul>
      </div>
      <div className="callout-box warning-box">
        <h3>Execution Warnings</h3>
        <ul>
          {runWarnings.map((warning) => (
            <li key={warning.id}>{warning.message}</li>
          ))}
          {!runWarnings.length && <li>No execution warnings recorded.</li>}
        </ul>
      </div>
    </div>
  );
}