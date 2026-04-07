"use client";

import { useState } from "react";

type ReviewState = {
  statusLabel: string;
  owner: string;
  decisionNote: string;
  priorityLabel: string;
};

type ActivityEntry = {
  id: string;
  title: string;
  detail: string;
};

const initialReviewState: ReviewState = {
  statusLabel: "Pending operator review",
  owner: "Release desk",
  decisionNote: "Awaiting modal confirmation",
  priorityLabel: "Verification priority: high"
};

const initialActivityFeed: ActivityEntry[] = [
  {
    id: "modal-seeded",
    title: "Modal workflow seeded",
    detail: "The release review starts in a pending state so modal-triggered status changes remain deterministic across runs."
  },
  {
    id: "modal-guidance",
    title: "Confirmation dialog available",
    detail: "Use the Launch review modal action to open the decision dialog, then queue the handoff or close the dialog without leaving the fixture."
  }
];

const confirmedReviewState: ReviewState = {
  statusLabel: "Queued for verification",
  owner: "QA handoff",
  decisionNote: "Decision confirmed in modal and routed to verification queue",
  priorityLabel: "Verification priority: immediate"
};

export function ModalWorkflowFixture() {
  const [reviewState, setReviewState] = useState(initialReviewState);
  const [activityFeed, setActivityFeed] = useState(initialActivityFeed);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isModalVisible = isModalOpen && reviewState.statusLabel === initialReviewState.statusLabel;

  const appendActivity = (title: string, detail: string) => {
    const nextEntry: ActivityEntry = {
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : `${title}-${detail}`,
      title,
      detail
    };

    setActivityFeed((currentEntries) => [nextEntry, ...currentEntries].slice(0, 6));
  };

  const launchModal = () => {
    setIsModalOpen(true);
    appendActivity("Review modal launched", "The confirmation modal is now open and waiting for an operator decision.");
  };

  const dismissModal = () => {
    setIsModalOpen(false);
    appendActivity("Dialog dismissed", "The review dialog was closed without changing the release status.");
  };

  const confirmReview = () => {
    setReviewState(confirmedReviewState);
    setIsModalOpen(false);
    appendActivity("Handoff queued", "The release moved to Queued for verification and ownership shifted to QA handoff.");
  };

  const resetWorkflow = () => {
    setReviewState(initialReviewState);
    setActivityFeed(initialActivityFeed);
    setIsModalOpen(false);
  };

  return (
    <main className="benchmark-fixture-page">
      <div className="benchmark-fixture-shell">
        <header className="benchmark-fixture-header">
          <div>
            <p className="benchmark-fixture-eyebrow">Tier B benchmark fixture</p>
            <h1>Release decision modal board</h1>
            <p className="benchmark-fixture-copy">
              This local fixture is designed for repeatable modal-heavy benchmarking with explicit confirm and dismiss actions,
              visible post-modal status changes, and a deterministic reset path.
            </p>
          </div>

          <div className="benchmark-fixture-actions">
            <span className="benchmark-fixture-chip">Route: /benchmark/modal-workflow</span>
            <button className="benchmark-fixture-primary" type="button" onClick={resetWorkflow}>
              Restore baseline
            </button>
          </div>
        </header>

        <section className="benchmark-metric-grid" aria-label="Modal workflow summary metrics">
          <article className="benchmark-metric-card">
            <p>Current status</p>
            <strong>{reviewState.statusLabel}</strong>
            <span>Visible release state used for modal benchmark assertions.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Current owner</p>
            <strong>{reviewState.owner}</strong>
            <span>Operational owner after modal decisions are applied.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Decision note</p>
            <strong>{reviewState.decisionNote}</strong>
            <span>Business summary tied to the most recent modal outcome.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Modal state</p>
            <strong>{isModalVisible ? "Open" : "Closed"}</strong>
            <span>Dialog visibility benchmarked as part of the interaction flow.</span>
          </article>
        </section>

        <div className="benchmark-grid-layout">
          <section className="benchmark-table-card" aria-labelledby="benchmark-modal-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">Decision workflow</p>
                <h2 id="benchmark-modal-heading">Release decision board</h2>
              </div>
              <span className="benchmark-fixture-chip">{reviewState.priorityLabel}</span>
            </div>

            <div className="benchmark-decision-grid">
              <div className="benchmark-callout">
                <strong>Current review packet</strong>
                <p>
                  This fixture simulates a common modal-heavy review step where the operator must open a dialog, inspect the request,
                  and confirm or dismiss without leaving the board.
                </p>
              </div>

              <div className="benchmark-status-banner">
                <strong>{reviewState.statusLabel}</strong>
                <p>{reviewState.decisionNote}</p>
                <span>{reviewState.owner}</span>
              </div>
            </div>

            <div className="benchmark-transition-actions">
              <button type="button" onClick={launchModal}>
                Launch review modal
              </button>
              <button type="button" onClick={resetWorkflow}>
                Reset decision board
              </button>
            </div>
          </section>

          <aside className="benchmark-activity-card" aria-labelledby="benchmark-modal-activity-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">Visible feedback</p>
                <h2 id="benchmark-modal-activity-heading">Activity stream</h2>
              </div>
              <span className="benchmark-fixture-chip">Reset safe</span>
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

        {isModalVisible ? (
          <div className="benchmark-modal-backdrop">
            <section
              className="benchmark-modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="benchmark-modal-dialog-title"
            >
              <p className="benchmark-card-eyebrow">Modal confirmation</p>
              <h2 id="benchmark-modal-dialog-title">Review confirmation modal</h2>
              <p className="benchmark-modal-copy">
                Confirming this review will move the release to the verification queue and hand ownership to QA handoff.
              </p>
              <div className="benchmark-decision-row">
                <strong>Current packet</strong>
                <span>Release branch ready for verification</span>
              </div>
              <div className="benchmark-decision-row">
                <strong>Requested action</strong>
                <span>Confirm readiness and queue verification</span>
              </div>
              <div className="benchmark-modal-actions">
                <button type="button" onClick={dismissModal}>
                  Close dialog
                </button>
                <button className="benchmark-fixture-primary" type="button" onClick={confirmReview}>
                  Queue handoff
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}