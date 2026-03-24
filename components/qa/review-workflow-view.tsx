import type { RunRecord, RunStatus, RunSummary, ScenarioLibrary } from "@/lib/types";
import { ArtifactReview } from "@/components/qa/artifact-review";
import { ComparisonBento } from "@/components/qa/comparison-bento";
import { EvidenceTagList } from "@/components/qa/evidence-tag-list";
import { EvidenceTimeline } from "@/components/qa/evidence-timeline";
import { RunListPanel } from "@/components/qa/run-list-panel";
import { SectionFrame } from "@/components/ui/section-frame";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildReviewComparison } from "@/lib/qa/run-view-model";

interface ReviewWorkflowViewProps {
  isLoading: boolean;
  runs: RunSummary[];
  selectedRun: RunRecord | null;
  selectedScenarioLibrary: ScenarioLibrary | null;
  onSelectRun: (run: RunSummary) => void;
  onSaveRunAsLibrary: (run: RunRecord) => void;
  onUpdateRunLibrary: (run: RunRecord) => void;
  onReturnToMonitor: () => void;
  statusClassName: (status: RunStatus) => string;
  buildActivityDetail: (run: RunRecord) => string;
  isActiveRun: (status: RunStatus) => boolean;
  isTerminalRun: (status: RunStatus) => boolean;
}

export function ReviewWorkflowView({
  isLoading,
  runs,
  selectedRun,
  selectedScenarioLibrary,
  onSelectRun,
  onSaveRunAsLibrary,
  onUpdateRunLibrary,
  onReturnToMonitor,
  statusClassName,
  buildActivityDetail,
  isActiveRun,
  isTerminalRun
}: ReviewWorkflowViewProps) {
  const selectedLibraryVersion = selectedScenarioLibrary?.version ?? selectedScenarioLibrary?.versions?.length ?? 1;
  const selectedLibraryHistoryDepth = selectedScenarioLibrary?.versions?.length ?? 1;
  const comparison = buildReviewComparison(selectedRun, runs);
  const baselineRun = comparison.previousComparableRun;
  const selectedRunDuration = selectedRun ? buildDuration(selectedRun.startedAt, selectedRun.completedAt) : "Not started";

  return (
    <section className="review-screen">
      <div className="review-layout">
        <RunListPanel
          runs={runs}
          selectedRunId={selectedRun?.id ?? null}
          emptyListMessage={isLoading ? "Loading runs..." : "Create a run to populate the review workspace."}
          onSelectRun={onSelectRun}
          isActiveRun={isActiveRun}
        />

        <div className="review-detail-column">
          <SectionFrame eyebrow="Evidence Review" title="Run Review" reference={selectedRun ? `RUN: ${selectedRun.id}` : isLoading ? "LOADING" : "SELECT A RUN"}>
            {isLoading && !selectedRun ? (
              <p className="muted">Loading review workspace...</p>
            ) : selectedRun ? (
              <>
                <div className="review-summary-header">
                  <div>
                    <h3>{selectedRun.plan.featureArea}</h3>
                    <p className="muted">
                      {selectedRun.plan.mode} · {selectedRun.plan.browser} · {selectedRun.plan.role} · {selectedRun.plan.environment}
                    </p>
                  </div>
                  <div className="review-summary-actions">
                    <div className="review-status-stack">
                      <StatusBadge tone={selectedRun.status === "pass" ? "success" : selectedRun.status === "fail" ? "danger" : selectedRun.status === "blocked" ? "warning" : isActiveRun(selectedRun.status) ? "running" : "default"}>
                        {selectedRun.status}
                      </StatusBadge>
                      <StatusBadge tone="default">Duration: {selectedRunDuration}</StatusBadge>
                    </div>
                    <div className="run-actions">
                      {selectedRun && isActiveRun(selectedRun.status) ? (
                        <button type="button" onClick={onReturnToMonitor}>
                          Return To Live Monitor
                        </button>
                      ) : null}
                      {selectedRun.generatedScenarios.length > 0 && !selectedRun.plan.scenarioLibraryId ? (
                        <button type="button" className="primary-action" onClick={() => onSaveRunAsLibrary(selectedRun)}>
                          Save Run As Library
                        </button>
                      ) : null}
                      {selectedRun.plan.scenarioLibraryId ? (
                        <button type="button" className="primary-action" onClick={() => onUpdateRunLibrary(selectedRun)}>
                          Update Linked Library
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="review-banner">
                  <strong>Review focus</strong>
                  <span>
                    {isTerminalRun(selectedRun.status)
                      ? "Evidence, artifacts, and suggested follow-up from the selected completed run."
                      : "This run is still active. Switch back to Monitor for live progress."}
                  </span>
                </div>

                <p className="muted">{selectedRun.summary}</p>

                <ComparisonBento
                  scenarioValue={comparison.scenarioValue}
                  scenarioDetail={comparison.scenarioDetail}
                  defectValue={comparison.defectValue}
                  defectDetail={comparison.defectDetail}
                  artifactValue={comparison.artifactValue}
                  artifactDetail={comparison.artifactDetail}
                  timelineValue={comparison.timelineValue}
                  timelineDetail={comparison.timelineDetail}
                />

                <div className="review-main-grid">
                  <div className="review-primary-stack">
                    <SectionFrame eyebrow="Timeline" title="Step Timeline">
                      <EvidenceTimeline
                        runId={selectedRun.id}
                        stepResults={selectedRun.stepResults}
                        parsedSteps={selectedRun.parsedSteps}
                        artifacts={selectedRun.artifacts}
                      />
                    </SectionFrame>

                    <SectionFrame eyebrow="Artifacts" title="Evidence Package" reference={`${selectedRun.artifacts.length} artifact(s)`}>
                      <ArtifactReview runId={selectedRun.id} artifacts={selectedRun.artifacts} />
                    </SectionFrame>

                    <SectionFrame eyebrow="Analysis" title="QA Analysis">
                      <ul>
                        {(selectedRun.analysisInsights ?? []).map((insight) => (
                          <li key={insight.id}>
                            <strong>{insight.title}</strong>: {insight.recommendation}
                            <EvidenceTagList evidence={insight.evidence} />
                          </li>
                        ))}
                        {!selectedRun.analysisInsights.length && <li>No QA analysis insights were generated for this run.</li>}
                      </ul>
                    </SectionFrame>
                  </div>

                  <div className="review-secondary-stack">
                    <SectionFrame eyebrow="Manual Tests" title="Suggested Manual Tests">
                      <ul>
                        {selectedRun.generatedScenarios.map((scenario) => (
                          <li key={scenario.id}>
                            {scenario.title}: {scenario.expectedResult}
                          </li>
                        ))}
                        {!selectedRun.generatedScenarios.length && <li>No manual test suggestions yet.</li>}
                      </ul>
                    </SectionFrame>

                    <SectionFrame eyebrow="Defect Candidates" title="Potential Regressions">
                      <ul>
                        {(selectedRun.defects ?? []).map((defect) => (
                          <li key={defect.id}>
                            {defect.title} ({Math.round(defect.confidence * 100)}% confidence)
                          </li>
                        ))}
                        {!(selectedRun.defects ?? []).length && <li>No defect candidates produced yet.</li>}
                      </ul>
                    </SectionFrame>

                    <SectionFrame eyebrow="Risk Summary" title="Observed Risk Surface">
                      <ul>
                        {selectedRun.riskSummary.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </SectionFrame>

                    <SectionFrame eyebrow="Scenario Library Alignment" title="Library Baseline">
                      {selectedRun.scenarioLibraryComparison ? (
                        <>
                          <p className="comparison-summary">
                            {selectedRun.scenarioLibraryComparison.libraryName} compared against baseline v
                            {selectedRun.scenarioLibraryComparison.comparedVersion}.
                          </p>
                          <ul>
                            <li>{selectedRun.scenarioLibraryComparison.summary}</li>
                            <li>Reused: {selectedRun.scenarioLibraryComparison.changeSummary.reused}</li>
                            <li>Added: {selectedRun.scenarioLibraryComparison.changeSummary.added}</li>
                            <li>Changed: {selectedRun.scenarioLibraryComparison.changeSummary.changed}</li>
                            <li>Removed: {selectedRun.scenarioLibraryComparison.changeSummary.removed}</li>
                            <li>
                              Current library state: {selectedScenarioLibrary ? `v${selectedLibraryVersion} with ${selectedLibraryHistoryDepth} snapshots` : "No linked library loaded."}
                            </li>
                          </ul>
                          <div className="comparison-tags">
                            {selectedRun.scenarioLibraryComparison.changeSummary.addedTitles.map((title) => (
                              <span key={`added-${title}`}>Added: {title}</span>
                            ))}
                            {selectedRun.scenarioLibraryComparison.changeSummary.changedTitles.map((title) => (
                              <span key={`changed-${title}`}>Changed: {title}</span>
                            ))}
                            {selectedRun.scenarioLibraryComparison.changeSummary.removedTitles.map((title) => (
                              <span key={`removed-${title}`}>Removed: {title}</span>
                            ))}
                          </div>
                          <div className="comparison-actions">
                            <button type="button" onClick={() => onUpdateRunLibrary(selectedRun)}>
                              Update Linked Library
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <ul>
                            <li>No linked scenario library comparison was recorded for this run.</li>
                          </ul>
                          {selectedRun.generatedScenarios.length > 0 && (
                            <div className="comparison-actions">
                              <button type="button" onClick={() => onSaveRunAsLibrary(selectedRun)}>
                                Save Run As Library
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </SectionFrame>

                    <SectionFrame eyebrow="Baseline Comparison" title="Run-to-Run Context">
                      {selectedRun && baselineRun && comparison.comparisonDelta ? (
                        <>
                          <p className="comparison-summary">
                            Compared with {baselineRun.plan.featureArea} from {new Date(baselineRun.createdAt).toLocaleString()}.
                          </p>
                          <ul>
                            <li>Current status: {selectedRun.status} | Previous status: {baselineRun.status}</li>
                            <li>Scenario delta: {comparison.comparisonDelta.scenarioDelta > 0 ? `+${comparison.comparisonDelta.scenarioDelta}` : `${comparison.comparisonDelta.scenarioDelta}`}</li>
                            <li>Defect delta: {comparison.comparisonDelta.defectDelta > 0 ? `+${comparison.comparisonDelta.defectDelta}` : `${comparison.comparisonDelta.defectDelta}`}</li>
                            <li>Artifact delta: {comparison.comparisonDelta.artifactDelta > 0 ? `+${comparison.comparisonDelta.artifactDelta}` : `${comparison.comparisonDelta.artifactDelta}`}</li>
                            <li>Timeline delta: {comparison.comparisonDelta.stepDelta > 0 ? `+${comparison.comparisonDelta.stepDelta}` : `${comparison.comparisonDelta.stepDelta}`}</li>
                          </ul>
                          <div className="comparison-tags">
                            <span>Current: {selectedRun.id}</span>
                            <span>Baseline: {baselineRun.id}</span>
                          </div>
                          <div className="comparison-actions">
                            <button type="button" onClick={() => onSelectRun(baselineRun)}>
                              Open baseline run
                            </button>
                          </div>
                        </>
                      ) : (
                        <ul>
                          <li>No earlier comparable completed run was found for this feature and mode.</li>
                        </ul>
                      )}
                    </SectionFrame>
                  </div>
                </div>
              </>
            ) : (
              <p className="muted">No run selected.</p>
            )}
          </SectionFrame>
        </div>
      </div>
    </section>
  );
}

function buildDuration(startedAt?: string, completedAt?: string): string {
  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
  const end = completedAt ? Date.parse(completedAt) : Date.now();

  if (Number.isNaN(start)) {
    return "Not started";
  }

  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}