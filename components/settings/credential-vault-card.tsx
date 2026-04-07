"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { CredentialVaultCardModel } from "@/lib/qa/settings-view-model";

interface CredentialVaultCardProps {
  credential: CredentialVaultCardModel;
}

export function CredentialVaultCard({ credential }: CredentialVaultCardProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isInlineEntry = credential.id === "credential-inline-entry";

  async function handleDelete() {
    if (!window.confirm(`Delete credential profile "${credential.label}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/credentials/${credential.id}`, { method: "DELETE" });

      if (response.status === 204) {
        router.refresh();
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setDeleteError(body?.error?.message ?? `Delete failed (${response.status})`);
    } catch {
      setDeleteError("An unexpected error occurred. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

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

      {deleteError && <p className="muted" style={{ color: "var(--color-danger, #c0392b)" }}>{deleteError}</p>}

      <div className="settings-card-actions">
        <button type="button" disabled title="Rotation is not implemented in the current local-file architecture.">
          Rotate
        </button>
        <button
          type="button"
          disabled={isInlineEntry || isDeleting}
          title={isInlineEntry ? "Inline entry rows cannot be deleted — they are generated from run history." : undefined}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}
