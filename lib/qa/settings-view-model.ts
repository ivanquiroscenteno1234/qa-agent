import type { CredentialLibraryRecord, EnvironmentLibraryRecord, RunRecord, ScenarioLibrary } from "@/lib/types";

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

function summarizeCredentialScope(credential: CredentialLibraryRecord): string {
  if (credential.secretMode === "reference-only") {
    return credential.reference?.startsWith("vault://") ? "Vault reference string" : "Reference-only credential";
  }

  return credential.hasStoredSecret ? "Local stored secret" : "Credential profile";
}

function countRunsUsingCredential(runs: RunRecord[], credential: CredentialLibraryRecord): number {
  return runs.filter((run) => (run.plan.credentialLibraryId ?? "") === credential.id).length;
}

function buildCredentialReferenceCards(credentials: CredentialLibraryRecord[], runs: RunRecord[]): CredentialVaultCardModel[] {
  return credentials.map((credential) => {
    const matchingRuns = runs.filter((run) => (run.plan.credentialLibraryId ?? "") === credential.id);
    const lastRun = [...matchingRuns].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    const totalRuns = countRunsUsingCredential(runs, credential);

    return {
      id: credential.id,
      label: credential.label,
      status: credential.status,
      scope: summarizeCredentialScope(credential),
      detail: totalRuns
        ? `${totalRuns} run${totalRuns === 1 ? "" : "s"} used this saved credential profile.`
        : "Saved credential profile with no recorded runs yet.",
      note: credential.secretMode === "reference-only"
        ? `Reference handle: ${credential.reference ?? "not set"}`
        : "Credential value is stored locally and resolved server-side during execution.",
      lastUsed: formatObservedTimestamp(credential.lastUsedAt ?? lastRun?.updatedAt)
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

export function buildCredentialVaultCards(credentials: CredentialLibraryRecord[], runs: RunRecord[]): CredentialVaultCardModel[] {
  const cards = buildCredentialReferenceCards(credentials, runs);
  const inlineEntryCard = buildInlineEntryCard(runs);

  return inlineEntryCard ? [...cards, inlineEntryCard] : cards;
}

export function buildEnvironmentCards(
  environments: EnvironmentLibraryRecord[],
  runs: RunRecord[],
  libraries: ScenarioLibrary[]
): EnvironmentCardModel[] {
  return environments
    .map((environment) => {
      const matchingRuns = runs.filter(
        (run) =>
          (run.plan.environmentLibraryId ?? "") === environment.id ||
          (run.plan.environment === environment.environment && run.plan.targetUrl === environment.targetUrl)
      );
      const matchingLibraries = libraries.filter(
        (library) => library.environment === environment.environment && library.targetUrl === environment.targetUrl
      );
      const lastRun = [...matchingRuns].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      const lastLibrary = [...matchingLibraries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
      const lastSeen = lastRun?.updatedAt ?? lastLibrary?.updatedAt ?? environment.updatedAt;
      const safeModeRate = matchingRuns.length
        ? Math.round((matchingRuns.filter((run) => run.plan.safeMode).length / matchingRuns.length) * 100)
        : environment.safeMode
          ? 100
          : 0;
      const health: EnvironmentCardModel["health"] = matchingRuns.length ? "observed" : "caution";

      return {
        id: environment.id,
        name: environment.name || environment.environment || "Unlabeled environment",
        health,
        endpoint: environment.targetUrl || "No endpoint recorded",
        probeStatus: "No live probe configured",
        observedUsage: matchingRuns.length
          ? `${matchingRuns.length} recorded run${matchingRuns.length === 1 ? "" : "s"}; ${safeModeRate}% observe-only`
          : "Saved environment profile with no recorded runs yet.",
        note: matchingLibraries.length
          ? `${matchingLibraries.length} scenario librar${matchingLibraries.length === 1 ? "y" : "ies"} match this target.`
          : "No saved scenario libraries are currently linked to this environment target.",
        lastSeen: formatObservedTimestamp(lastSeen)
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}