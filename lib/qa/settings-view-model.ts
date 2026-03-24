import type { RunRecord, ScenarioLibrary } from "@/lib/types";

export interface CredentialVaultCardModel {
  id: string;
  label: string;
  status: "active" | "revoked";
  scope: string;
  detail: string;
  note: string;
  lastUsed: string;
}

export interface EnvironmentCardModel {
  id: string;
  name: string;
  health: "observed" | "caution";
  endpoint: string;
  probeStatus: string;
  observedUsage: string;
  note: string;
  lastSeen: string;
}

function formatObservedTimestamp(value?: string): string {
  if (!value) {
    return "No observations yet";
  }

  return new Date(value).toLocaleString();
}

function summarizeReferenceScope(reference: string): string {
  if (reference.startsWith("vault://")) {
    return "Vault reference string";
  }

  if (!reference.trim()) {
    return "No reference provided";
  }

  return "Operator-provided reference";
}

function countRunsUsingReference(runs: RunRecord[], reference: string): number {
  return runs.filter((run) => (run.plan.credentialReference ?? "") === reference).length;
}

function buildCredentialReferenceCards(runs: RunRecord[]): CredentialVaultCardModel[] {
  const references = [...new Set(runs.map((run) => run.plan.credentialReference?.trim() ?? "").filter(Boolean))];

  return references.map((reference) => {
    const matchingRuns = runs.filter((run) => run.plan.credentialReference?.trim() === reference);
    const lastRun = [...matchingRuns].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    const totalRuns = countRunsUsingReference(runs, reference);

    return {
      id: `credential-${reference}`,
      label: reference,
      status: "active",
      scope: summarizeReferenceScope(reference),
      detail: `${totalRuns} run${totalRuns === 1 ? "" : "s"} referenced this credential handle.`,
      note: "References are stored in local JSON state. No rotation, vault sync, or revocation endpoint exists yet.",
      lastUsed: formatObservedTimestamp(lastRun?.updatedAt)
    };
  });
}

function buildInlineEntryCard(runs: RunRecord[]): CredentialVaultCardModel | undefined {
  const inlineRuns = runs.filter((run) => Boolean(run.plan.loginEmail || run.plan.loginPassword));

  if (!inlineRuns.length) {
    return undefined;
  }

  const latest = [...inlineRuns].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  return {
    id: "credential-inline-entry",
    label: "Inline operator entry",
    status: "revoked",
    scope: "Local draft input",
    detail: `${inlineRuns.length} run${inlineRuns.length === 1 ? "" : "s"} captured direct email or password input in plan state.`,
    note: "This is intentionally treated as a risk posture indicator, not a functioning credential vault record.",
    lastUsed: formatObservedTimestamp(latest?.updatedAt)
  };
}

export function buildCredentialVaultCards(runs: RunRecord[]): CredentialVaultCardModel[] {
  const cards = buildCredentialReferenceCards(runs);
  const inlineEntryCard = buildInlineEntryCard(runs);

  return inlineEntryCard ? [...cards, inlineEntryCard] : cards;
}

interface EnvironmentObservation {
  environment: string;
  targetUrl: string;
  updatedAt?: string;
  safeMode?: boolean;
  source: "run" | "library";
}

export function buildEnvironmentCards(runs: RunRecord[], libraries: ScenarioLibrary[]): EnvironmentCardModel[] {
  const observations: EnvironmentObservation[] = [
    ...runs.map((run) => ({
      environment: run.plan.environment,
      targetUrl: run.plan.targetUrl,
      updatedAt: run.updatedAt,
      safeMode: run.plan.safeMode,
      source: "run" as const
    })),
    ...libraries.map((library) => ({
      environment: library.environment,
      targetUrl: library.targetUrl,
      updatedAt: library.updatedAt,
      source: "library" as const
    }))
  ].filter((observation) => observation.environment.trim() || observation.targetUrl.trim());

  const byEnvironment = new Map<string, EnvironmentObservation[]>();

  for (const observation of observations) {
    const key = `${observation.environment}::${observation.targetUrl}`;
    const current = byEnvironment.get(key) ?? [];
    current.push(observation);
    byEnvironment.set(key, current);
  }

  return [...byEnvironment.entries()]
    .map(([key, observationGroup]) => {
      const [name, endpoint] = key.split("::");
      const matchingRuns = runs.filter((run) => run.plan.environment === name && run.plan.targetUrl === endpoint);
      const matchingLibraries = libraries.filter((library) => library.environment === name && library.targetUrl === endpoint);
      const lastRun = [...matchingRuns].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      const lastLibrary = [...matchingLibraries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      const lastSeen = lastRun?.updatedAt ?? lastLibrary?.updatedAt;
      const safeModeRate = matchingRuns.length
        ? Math.round((matchingRuns.filter((run) => run.plan.safeMode).length / matchingRuns.length) * 100)
        : 100;
      const health: EnvironmentCardModel["health"] = matchingRuns.length ? "observed" : "caution";

      return {
        id: `environment-${name}-${endpoint}`,
        name: name || "Unlabeled environment",
        health,
        endpoint: endpoint || "No endpoint recorded",
        probeStatus: "No live probe configured",
        observedUsage: matchingRuns.length
          ? `${matchingRuns.length} recorded run${matchingRuns.length === 1 ? "" : "s"}; ${safeModeRate}% observe-only`
          : `${observationGroup.length} saved reference${observationGroup.length === 1 ? "" : "s"}; no run history`,
        note: matchingRuns.length
          ? `${matchingRuns.length} recorded run${matchingRuns.length === 1 ? "" : "s"}; health is inferred from saved activity, not from active monitoring.`
          : "Known only from saved library metadata. Add run telemetry before treating this as live health.",
        lastSeen: formatObservedTimestamp(lastSeen)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}