interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "running" | "warning" | "success" | "danger";
}

export function MetricCard({ label, value, detail, tone = "default" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card-${tone}`}>
      <span className="metric-card-label">{label}</span>
      <strong className="metric-card-value">{value}</strong>
      {detail ? <p className="metric-card-detail">{detail}</p> : null}
    </article>
  );
}