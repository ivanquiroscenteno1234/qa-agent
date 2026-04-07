"use client";

import { useState } from "react";

type WorkflowStage = {
  id: string;
  label: string;
  detail: string;
};

type WorkflowState = {
  activeStage: number;
  statusLabel: string;
  owner: string;
  slaLabel: string;
  checkpoint: string;
};

type ActivityEntry = {
  id: string;
  title: string;
  detail: string;
};

const workflowStages: WorkflowStage[] = [
  {
    id: "draft",
    label: "Draft intake",
    detail: "Partner request is captured and waiting for operational triage."
  },
  {
    id: "review",
    label: "Ready for finance approval",
    detail: "The request passed intake and now requires formal approval."
  },
  {
    id: "approved",
    label: "Approved for scheduling",
    detail: "Budget and compliance checks are complete."
  },
  {
    id: "scheduled",
    label: "Deployment scheduled",
    detail: "Execution window is locked and customer communications are queued."
  },
  {
    id: "live",
    label: "Live and verified",
    detail: "The release is deployed and visible verification is complete."
  }
];

const initialWorkflowState: WorkflowState = {
  activeStage: 0,
  statusLabel: "Draft intake",
  owner: "Operations intake",
  slaLabel: "Needs first review in 45m",
  checkpoint: "Awaiting readiness review"
};

const initialActivityFeed: ActivityEntry[] = [
  {
    id: "state-seeded",
    title: "Benchmark case seeded",
    detail: "The workflow starts in Draft intake so state transitions remain deterministic across benchmark runs."
  },
  {
    id: "state-guidance",
    title: "Visible transition controls enabled",
    detail: "Use the action rail to move the release forward or reset it back to the seeded state."
  }
];

function buildWorkflowState(nextStage: number): WorkflowState {
  if (nextStage <= 0) {
    return initialWorkflowState;
  }

  if (nextStage === 1) {
    return {
      activeStage: 1,
      statusLabel: "Ready for finance approval",
      owner: "Finance desk",
      slaLabel: "Approval due in 20m",
      checkpoint: "Finance sign-off pending"
    };
  }

  if (nextStage === 2) {
    return {
      activeStage: 2,
      statusLabel: "Approved for scheduling",
      owner: "Release coordination",
      slaLabel: "Schedule in 1h 10m",
      checkpoint: "Approved and waiting for schedule window"
    };
  }

  if (nextStage === 3) {
    return {
      activeStage: 3,
      statusLabel: "Deployment scheduled",
      owner: "Release operations",
      slaLabel: "Launch window in 3h",
      checkpoint: "Execution window confirmed"
    };
  }

  return {
    activeStage: 4,
    statusLabel: "Live and verified",
    owner: "QA verification",
    slaLabel: "Completed",
    checkpoint: "Post-release validation complete"
  };
}

export function StateTransitionFixture() {
  const [workflowState, setWorkflowState] = useState(initialWorkflowState);
  const [activityFeed, setActivityFeed] = useState(initialActivityFeed);

  const appendActivity = (title: string, detail: string) => {
    const nextEntry: ActivityEntry = {
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : `${title}-${detail}`,
      title,
      detail
    };

    setActivityFeed((currentEntries) => [nextEntry, ...currentEntries].slice(0, 6));
  };

  const transitionTo = (nextStage: number, title: string, detail: string) => {
    const nextState = buildWorkflowState(nextStage);
    setWorkflowState(nextState);
    appendActivity(title, detail);
  };

  const resetWorkflow = () => {
    setWorkflowState(initialWorkflowState);
    setActivityFeed(initialActivityFeed);
  };

  return (
    <main className="benchmark-fixture-page">
      <div className="benchmark-fixture-shell">
        <header className="benchmark-fixture-header">
          <div>
            <p className="benchmark-fixture-eyebrow">Tier B benchmark fixture</p>
            <h1>Release workflow tracker</h1>
            <p className="benchmark-fixture-copy">
              This local fixture is designed for repeatable multi-step state-transition benchmarking with visible phase changes,
              explicit handoff ownership, and a deterministic reset path.
            </p>
          </div>

          <div className="benchmark-fixture-actions">
            <span className="benchmark-fixture-chip">Route: /benchmark/state-transition</span>
            <button className="benchmark-fixture-primary" type="button" onClick={resetWorkflow}>
              Reset workflow
            </button>
          </div>
        </header>

        <section className="benchmark-metric-grid" aria-label="Workflow summary metrics">
          <article className="benchmark-metric-card">
            <p>Current status</p>
            <strong>{workflowState.statusLabel}</strong>
            <span>Visible stage label used for benchmark assertions.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Current owner</p>
            <strong>{workflowState.owner}</strong>
            <span>Operational handoff owner for the active state.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>SLA posture</p>
            <strong>{workflowState.slaLabel}</strong>
            <span>Benchmark-visible urgency and completion posture.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Checkpoint</p>
            <strong>{workflowState.checkpoint}</strong>
            <span>Business outcome tied to the current step in the flow.</span>
          </article>
        </section>

        <div className="benchmark-grid-layout">
          <section className="benchmark-table-card" aria-labelledby="benchmark-state-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">State progression</p>
                <h2 id="benchmark-state-heading">Workflow tracker</h2>
              </div>
              <span className="benchmark-fixture-chip">Current phase: {workflowState.statusLabel}</span>
            </div>

            <ol className="benchmark-state-list">
              {workflowStages.map((stage, index) => {
                const stageReached = index <= workflowState.activeStage;
                const statusClassName =
                  index < workflowState.activeStage
                    ? "benchmark-state-item benchmark-state-complete"
                    : index === workflowState.activeStage
                      ? "benchmark-state-item benchmark-state-active"
                      : "benchmark-state-item";

                return (
                  <li key={stage.id} className={statusClassName}>
                    <div className="benchmark-state-index">{index + 1}</div>
                    <div>
                      <strong>{stageReached ? stage.label : `Locked stage ${index + 1}`}</strong>
                      <p>{stageReached ? stage.detail : "Advance the workflow to reveal this stage."}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="benchmark-transition-actions">
              <button
                type="button"
                onClick={() =>
                  transitionTo(
                    1,
                    "Intake advanced",
                    "The request moved from Draft intake to Ready for finance approval."
                  )
                }
              >
                Advance to review
              </button>
              <button
                type="button"
                onClick={() =>
                  transitionTo(
                    2,
                    "Finance handoff confirmed",
                    "The request is now Approved for scheduling and assigned to release coordination."
                  )
                }
              >
                Confirm handoff
              </button>
              <button
                type="button"
                onClick={() =>
                  transitionTo(
                    3,
                    "Deployment scheduled",
                    "The request entered Deployment scheduled and is waiting for the launch window."
                  )
                }
              >
                Schedule release
              </button>
              <button
                type="button"
                onClick={() =>
                  transitionTo(
                    4,
                    "Release verified",
                    "The workflow reached Live and verified with QA verification as the active owner."
                  )
                }
              >
                Mark live
              </button>
            </div>
          </section>

          <aside className="benchmark-activity-card" aria-labelledby="benchmark-state-activity-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">Visible feedback</p>
                <h2 id="benchmark-state-activity-heading">Activity stream</h2>
              </div>
              <span className="benchmark-fixture-chip">Reset safe</span>
            </div>

            <div className="benchmark-callout">
              <strong>Benchmark intent</strong>
              <p>
                This fixture stresses visible state progression, handoff ownership, and deterministic reset without relying on auth,
                hidden business rules, or external data dependencies.
              </p>
            </div>

            <ul className="benchmark-activity-list">
              {activityFeed.map((entry) => (
                <li key={entry.id} className="benchmark-activity-item">
                  <strong>{entry.title}</strong>
                  <p>{entry.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}