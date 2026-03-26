import Image from "next/image";

import type { Artifact, ParsedStep, StepResult } from "@/lib/types";

interface TimelineItem {
  id: string;
  title: string;
  detail: string;
  screenshotArtifact: Artifact | null;
}

interface EvidenceTimelineProps {
  runId: string;
  stepResults: StepResult[];
  parsedSteps: ParsedStep[];
  artifacts: Artifact[];
}

export function EvidenceTimeline({ runId, stepResults, parsedSteps, artifacts }: EvidenceTimelineProps) {
  const screenshotArtifacts = new Map(
    artifacts.filter((artifact) => artifact.type === "screenshot").map((artifact) => [artifact.id, artifact] as const)
  );

  const timelineItems: TimelineItem[] = (stepResults.length ? stepResults : parsedSteps).map((item, index) => {
    if (!("userStepText" in item)) {
      return {
        id: item.id,
        title: `${index + 1}. ${item.rawText}`,
        detail: item.targetDescription,
        screenshotArtifact: null
      };
    }

    const fallbackArtifact = artifacts.find(
      (artifact) => artifact.type === "screenshot" && artifact.label === item.screenshotLabel
    ) ?? null;
    const screenshotArtifact = (item.screenshotArtifactId ? screenshotArtifacts.get(item.screenshotArtifactId) ?? null : null) ?? fallbackArtifact;

    return {
      id: item.stepId,
      title: `${index + 1}. ${item.userStepText}`,
      detail: `${item.assertionResult.toUpperCase()} • ${item.observedTarget}`,
      screenshotArtifact
    };
  });

  if (!timelineItems.length) {
    return <p className="muted">No timeline evidence was recorded for this run.</p>;
  }

  return (
    <div className="evidence-timeline-list">
      {timelineItems.map((item, index) => (
        <article key={item.id} className="evidence-timeline-item">
          <div className="evidence-timeline-rail">
            <div className="evidence-timeline-index">{String(index + 1).padStart(2, "0")}</div>
            {index < timelineItems.length - 1 ? <div className="evidence-timeline-line" /> : null}
          </div>
          <div className="evidence-timeline-card">
            <div>
              <strong>{item.title}</strong>
              <p className="muted timeline-evidence-detail">{item.detail}</p>
              {item.screenshotArtifact ? (
                <a href={`/api/runs/${runId}/artifacts/${item.screenshotArtifact.id}?download=1`} target="_blank" rel="noreferrer">
                  Open linked screenshot
                </a>
              ) : null}
            </div>
            {item.screenshotArtifact ? (
              <Image
                className="timeline-evidence-image"
                src={`/api/runs/${runId}/artifacts/${item.screenshotArtifact.id}`}
                alt={item.screenshotArtifact.label}
                width={1200}
                height={675}
                sizes="(max-width: 1100px) 100vw, 220px"
              />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}