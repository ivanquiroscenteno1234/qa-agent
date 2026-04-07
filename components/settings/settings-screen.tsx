import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { CredentialVaultCard } from "@/components/settings/credential-vault-card";
import { EnvironmentCard } from "@/components/settings/environment-card";
import { ActionBar } from "@/components/ui/action-bar";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionFrame } from "@/components/ui/section-frame";
import { getQaLlmConfig } from "@/lib/qa/llm/config";
import { buildCredentialVaultCards, buildEnvironmentCards } from "@/lib/qa/settings-view-model";
import { listCredentialLibraries, listEnvironmentLibraries, listRuns, listScenarioLibraries } from "@/lib/qa/store";

interface SettingsScreenProps {
  storeBackendLabel?: string;
}

export async function SettingsScreen({ storeBackendLabel = "json" }: SettingsScreenProps) {
  const [runs, libraries, environments, credentials] = await Promise.all([
    listRuns(),
    listScenarioLibraries(),
    listEnvironmentLibraries(),
    listCredentialLibraries()
  ]);
  const credentialCards = buildCredentialVaultCards(credentials, runs);
  const environmentCards = buildEnvironmentCards(environments, runs, libraries);
  const inlineCredentialRunCount = runs.filter((run) => Boolean(run.plan.loginEmail || run.plan.loginPassword)).length;
  const llmConfig = getQaLlmConfig();

  const completedRuns = runs.filter((r) => r.status === "pass" || r.status === "fail" || r.status === "blocked" || r.status === "inconclusive" || r.status === "cancelled");
  const llmUsage = {
    total: completedRuns.length,
    stepParsing: completedRuns.filter((r) => r.llmMetadata?.stepParsing === "llm").length,
    scenarioGeneration: completedRuns.filter((r) => r.llmMetadata?.scenarioGeneration === "llm").length,
    reviewAnalysis: completedRuns.filter((r) => r.llmMetadata?.reviewAnalysis === "llm").length
  };

  return (
    <AppShell
      navItems={[
        { id: "draft", label: "Draft", eyebrow: "Command Center", href: "/draft" },
        { id: "monitor", label: "Monitor", eyebrow: "Command Center", href: "/monitor" },
        { id: "review", label: "Review", eyebrow: "Command Center", href: "/review" }
      ]}
      utilityNavItems={[
        { id: "library", label: "Library", eyebrow: `${libraries.length} saved`, href: "/library" },
        { id: "settings", label: "Settings", eyebrow: "Local posture", active: true, href: "/settings" },
        { id: "archives", label: "Archives", eyebrow: "Later", disabled: true }
      ]}
      primaryAction={{
        label: "Open Draft",
        href: "/draft"
      }}
      profile={
        <>
          <strong>Operations Profile</strong>
          <span className="muted">Local-file mode</span>
        </>
      }
      topBarTitle="System Configuration"
      topBarBadge="Honest Mode"
      searchPlaceholder="Search environments, references, or posture notes"
      topBarUtilities={
        <>
          <span className="app-utility-chip">No vault backend</span>
          <span className="app-utility-chip">{llmConfig.statusLabel}</span>
          <span className="app-utility-chip">Store: {storeBackendLabel.toUpperCase()}</span>
        </>
      }
    >
      <PageHeader
        eyebrow="System Configuration & Settings"
        title="Settings"
        description="Operational posture for the current MVP: what the agent stores locally, which execution environments appear in saved activity, and where credential handling remains intentionally limited."
        actions={
          <ActionBar>
            <Link className="side-nav-primary-action" href="/library">
              Review Libraries
            </Link>
            <button type="button" disabled>
              Export Settings
            </button>
          </ActionBar>
        }
      />

      <section className="metric-grid">
        <MetricCard label="Run Records" value={String(runs.length)} detail={`Stored in ${storeBackendLabel.toUpperCase()} run store`} tone="running" />
        <MetricCard label="Scenario Libraries" value={String(libraries.length)} detail={`Stored in ${storeBackendLabel.toUpperCase()} library store`} />
        <MetricCard label="Environment Profiles" value={String(environments.length)} detail="Reusable target configurations" tone={environments.length ? "success" : "default"} />
        <MetricCard label="Credential Profiles" value={String(credentials.length)} detail="Saved credential entities resolved server-side" tone={credentials.length ? "success" : "warning"} />
        <MetricCard label="LLM Provider" value={llmConfig.provider.toUpperCase()} detail={llmConfig.detail} tone={llmConfig.configured ? "success" : "warning"} />
        <MetricCard label="Inline Secret Risk" value={String(inlineCredentialRunCount)} detail="Runs with direct email or password plan input" tone={inlineCredentialRunCount ? "warning" : "success"} />
      </section>

      <SectionFrame eyebrow="Model Provider" title="Gemini Configuration" reference={llmConfig.statusLabel}>
        <ul>
          <li>{llmConfig.detail}</li>
          <li>Provider: {llmConfig.provider === "disabled" ? "none" : llmConfig.provider}</li>
          <li>Model: {llmConfig.model}</li>
          <li>API key present: {llmConfig.apiKeyPresent ? "Yes" : "No"}</li>
          <li>Step parsing: {llmConfig.features.stepParsing ? "Enabled" : "Disabled"}</li>
          <li>Scenario generation: {llmConfig.features.scenarioGeneration ? "Enabled" : "Disabled"}</li>
          <li>Review analysis: {llmConfig.features.reviewAnalysis ? "Enabled" : "Disabled"}</li>
          {llmConfig.warning ? <li>{llmConfig.warning}</li> : null}
        </ul>
      </SectionFrame>

      <SectionFrame eyebrow="Model Usage History" title="LLM Assistance Statistics" reference={`${llmUsage.total} completed runs`}>
        {llmUsage.total === 0 ? (
          <p className="muted">No completed runs yet. Usage statistics will appear here after runs finish.</p>
        ) : (
          <ul>
            <li>Completed runs: {llmUsage.total}</li>
            <li>Step parsing via Gemini: {llmUsage.stepParsing} of {llmUsage.total}</li>
            <li>Scenario generation via Gemini: {llmUsage.scenarioGeneration} of {llmUsage.total}</li>
            <li>Review analysis via Gemini: {llmUsage.reviewAnalysis} of {llmUsage.total}</li>
          </ul>
        )}
      </SectionFrame>

      <SectionFrame eyebrow="Credential Handling" title="Credential Posture" reference={`${credentialCards.length} tracked profiles`}>
        <div className="settings-grid">
          {credentialCards.length ? (
            credentialCards.map((credential) => <CredentialVaultCard key={credential.id} credential={credential} />)
          ) : (
            <p className="muted">No credential references have been observed in saved runs yet.</p>
          )}
        </div>
      </SectionFrame>

      <SectionFrame eyebrow="Environment Inventory" title="Execution Environments" reference={`${environmentCards.length} saved environments`}>
        <div className="settings-grid">
          {environmentCards.map((environment) => (
            <EnvironmentCard key={environment.id} environment={environment} />
          ))}
        </div>
      </SectionFrame>

      <SectionFrame eyebrow="Behavior Constraints" title="What This Screen Does Not Claim">
        <ul>
          <li>Credential cards reflect observed plan usage in local files. They do not represent a real secret manager.</li>
          <li>Saved credential profiles are local-only and resolved server-side. Encryption and rotation are not implemented yet.</li>
          <li>Environment health is inferred from saved runs and libraries. There is no live uptime or latency telemetry yet.</li>
          <li>Rotate, revoke, probe, edit, and export actions remain disabled until corresponding backend capabilities exist.</li>
          <li>Draft remains the primary place where operators create, override, and launch execution inputs.</li>
        </ul>
      </SectionFrame>
    </AppShell>
  );
}