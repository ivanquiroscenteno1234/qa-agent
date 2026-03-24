interface WorkflowBarProps {
  workflowView: "draft" | "monitor" | "review";
  draftRunCount: number;
  activeRunCount: number;
  completedRunCount: number;
  onChangeView: (view: "draft" | "monitor" | "review") => void;
}

export function WorkflowBar({
  workflowView,
  draftRunCount,
  activeRunCount,
  completedRunCount,
  onChangeView
}: WorkflowBarProps) {
  return (
    <section className="workflow-bar">
      <div className="workflow-tabs" role="tablist" aria-label="Operator workflow">
        <button
          type="button"
          className={`workflow-tab ${workflowView === "draft" ? "workflow-tab-active" : ""}`}
          onClick={() => onChangeView("draft")}
        >
          Draft
        </button>
        <button
          type="button"
          className={`workflow-tab ${workflowView === "monitor" ? "workflow-tab-active" : ""}`}
          onClick={() => onChangeView("monitor")}
        >
          Monitor
        </button>
        <button
          type="button"
          className={`workflow-tab ${workflowView === "review" ? "workflow-tab-active" : ""}`}
          onClick={() => onChangeView("review")}
        >
          Review
        </button>
      </div>
      <div className="workflow-stats">
        <span>{draftRunCount} drafts</span>
        <span>{activeRunCount} active</span>
        <span>{completedRunCount} completed</span>
      </div>
    </section>
  );
}