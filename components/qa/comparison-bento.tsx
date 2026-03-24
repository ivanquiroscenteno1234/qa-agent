import { MetricCard } from "@/components/ui/metric-card";

interface ComparisonBentoProps {
  scenarioValue: string;
  scenarioDetail: string;
  defectValue: string;
  defectDetail: string;
  artifactValue: string;
  artifactDetail: string;
  timelineValue: string;
  timelineDetail: string;
}

export function ComparisonBento({
  scenarioValue,
  scenarioDetail,
  defectValue,
  defectDetail,
  artifactValue,
  artifactDetail,
  timelineValue,
  timelineDetail
}: ComparisonBentoProps) {
  return (
    <section className="metric-grid review-comparison-grid">
      <MetricCard label="Scenarios" value={scenarioValue} detail={scenarioDetail} />
      <MetricCard label="Potential Defects" value={defectValue} detail={defectDetail} tone="danger" />
      <MetricCard label="Artifacts" value={artifactValue} detail={artifactDetail} tone="warning" />
      <MetricCard label="Timeline Size" value={timelineValue} detail={timelineDetail} tone="running" />
    </section>
  );
}