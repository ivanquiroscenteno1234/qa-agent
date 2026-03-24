import type { EnvironmentCardModel } from "@/lib/qa/settings-view-model";

interface EnvironmentCardProps {
  environment: EnvironmentCardModel;
}

export function EnvironmentCard({ environment }: EnvironmentCardProps) {
  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="settings-card-eyebrow">Execution Environment</p>
          <h3>{environment.name}</h3>
        </div>
        <span className={`settings-pill settings-pill-${environment.health}`}>{environment.health}</span>
      </div>

      <div className="settings-card-grid settings-card-grid-environment">
        <div>
          <p className="settings-card-label">Endpoint</p>
          <p>{environment.endpoint}</p>
        </div>
        <div>
          <p className="settings-card-label">Probe Status</p>
          <p>{environment.probeStatus}</p>
        </div>
        <div>
          <p className="settings-card-label">Observed Usage</p>
          <p>{environment.observedUsage}</p>
        </div>
        <div>
          <p className="settings-card-label">Last Seen</p>
          <p>{environment.lastSeen}</p>
        </div>
      </div>

      <p className="muted">{environment.note}</p>

      <div className="settings-card-actions">
        <button type="button" disabled title="Active health probes are not implemented yet.">
          Probe
        </button>
        <button type="button" disabled title="Environment editing is not implemented yet.">
          Edit
        </button>
      </div>
    </article>
  );
}