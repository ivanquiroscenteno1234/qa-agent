import type { CredentialVaultCardModel } from "@/lib/qa/settings-view-model";

interface CredentialVaultCardProps {
  credential: CredentialVaultCardModel;
}

export function CredentialVaultCard({ credential }: CredentialVaultCardProps) {
  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="settings-card-eyebrow">Credential Posture</p>
          <h3>{credential.label}</h3>
        </div>
        <span className={`settings-pill settings-pill-${credential.status}`}>{credential.status}</span>
      </div>

      <div className="settings-card-grid">
        <div>
          <p className="settings-card-label">Scope</p>
          <p>{credential.scope}</p>
        </div>
        <div>
          <p className="settings-card-label">Last Used</p>
          <p>{credential.lastUsed}</p>
        </div>
      </div>

      <p className="muted">{credential.detail}</p>
      <p className="muted">{credential.note}</p>

      <div className="settings-card-actions">
        <button type="button" disabled title="Rotation is not implemented in the current local-file architecture.">
          Rotate
        </button>
        <button type="button" disabled title="Revocation is not implemented in the current local-file architecture.">
          Revoke
        </button>
      </div>
    </article>
  );
}