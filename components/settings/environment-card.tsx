"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import type { EnvironmentCardModel } from "@/lib/qa/settings-view-model";

interface EnvironmentCardProps {
  environment: EnvironmentCardModel;
}

export function EnvironmentCard({ environment }: EnvironmentCardProps) {
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete environment profile "${environment.name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/environments/${environment.id}`, { method: "DELETE" });

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

      {deleteError && <p className="muted" style={{ color: "var(--color-danger, #c0392b)" }}>{deleteError}</p>}

      <div className="settings-card-actions">
        <button aria-label="Probe environment health" type="button" disabled title="Active health probes are not implemented yet.">
          Probe
        </button>
        <button aria-label="Edit environment profile" type="button" disabled title="Environment editing is not implemented yet.">
          Edit
        </button>
        <button
          aria-label="Delete environment profile"
          type="button"
          disabled={isDeleting}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}
