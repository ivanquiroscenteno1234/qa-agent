import type {
  GenerateScenariosResponse,
  ParseStepsResponse,
  QaMode,
  RiskLevel,
  RunPlan,
  ScenarioLibrary
} from "@/lib/types";
import { ActionBar } from "@/components/ui/action-bar";
import { SectionFrame } from "@/components/ui/section-frame";
import { StatusBadge } from "@/components/ui/status-badge";

interface DraftWorkflowViewProps {
  plan: RunPlan;
  parsePreview: ParseStepsResponse | null;
  scenarioPreview: GenerateScenariosResponse | null;
  scenarioLibraries: ScenarioLibrary[];
  selectedScenarioLibrary: ScenarioLibrary | null;
  scenarioLibraryName: string;
  planWarnings: string[];
  feedback: string;
  isPending: boolean;
  modeLabels: Record<QaMode, string>;
  riskOptions: RiskLevel[];
  onPlanChange: <Key extends keyof RunPlan>(key: Key, value: RunPlan[Key]) => void;
  onScenarioLibraryNameChange: (value: string) => void;
  onSelectScenarioLibrary: (scenarioLibraryId: string) => void;
  onParse: () => void;
  onGenerateScenarios: () => void;
  onCreateRun: () => void;
  onSaveAsLibrary: () => void;
  onUpdateLibrary: () => void;
}

export function DraftWorkflowView({
  plan,
  parsePreview,
  scenarioPreview,
  scenarioLibraries,
  selectedScenarioLibrary,
  scenarioLibraryName,
  planWarnings,
  feedback,
  isPending,
  modeLabels,
  riskOptions,
  onPlanChange,
  onScenarioLibraryNameChange,
  onSelectScenarioLibrary,
  onParse,
  onGenerateScenarios,
  onCreateRun,
  onSaveAsLibrary,
  onUpdateLibrary
}: DraftWorkflowViewProps) {
  const missionReference = buildMissionReference(plan);
  const selectedLibraryVersions = selectedScenarioLibrary?.versions ?? [];
  const selectedLibraryVersion = selectedScenarioLibrary?.version ?? (selectedLibraryVersions.length || 1);
  const latestLibraryVersion = selectedLibraryVersions[selectedLibraryVersions.length - 1];
  const selectedLibraryState = selectedScenarioLibrary
    ? selectedLibraryVersion > 1
      ? "Updated library"
      : "Active library"
    : "Draft";
  const hasScenarioSource = Boolean((scenarioPreview?.scenarios ?? selectedScenarioLibrary?.scenarios ?? []).length);
  const parseStepCount = parsePreview?.parsedSteps.length ?? 0;
  const scenarioCount = scenarioPreview?.scenarios.length ?? selectedScenarioLibrary?.scenarios.length ?? 0;
  const saveAsDisabledReason = !hasScenarioSource
    ? "Generate scenarios or load a library first."
    : !scenarioLibraryName.trim()
      ? "Provide a library name first."
      : null;
  const updateDisabledReason = !selectedScenarioLibrary
    ? "Select an existing library to update it."
    : !hasScenarioSource
      ? "There are no scenarios available to write back yet."
      : null;

  return (
    <section className="draft-screen">
      <div className="draft-primary-column">
        <SectionFrame eyebrow="01 // Environment & Target" title="Mission Parameters" reference={missionReference}>
          <div className="field-grid two-up">
            <label>
              Environment
              <input value={plan.environment} onChange={(event) => onPlanChange("environment", event.target.value)} />
            </label>
            <label>
              Target URL
              <input value={plan.targetUrl} onChange={(event) => onPlanChange("targetUrl", event.target.value)} />
            </label>
            <label>
              Feature Area
              <input value={plan.featureArea} onChange={(event) => onPlanChange("featureArea", event.target.value)} />
            </label>
            <label>
              Build Version
              <input value={plan.buildVersion} onChange={(event) => onPlanChange("buildVersion", event.target.value)} />
            </label>
            <label>
              Browser
              <input value={plan.browser} onChange={(event) => onPlanChange("browser", event.target.value)} />
            </label>
            <label>
              Device
              <input value={plan.device} onChange={(event) => onPlanChange("device", event.target.value)} />
            </label>
            <label>
              Role
              <input value={plan.role} onChange={(event) => onPlanChange("role", event.target.value)} />
            </label>
            <label>
              Credential Reference
              <input value={plan.credentialReference} onChange={(event) => onPlanChange("credentialReference", event.target.value)} />
            </label>
          </div>
        </SectionFrame>

        <SectionFrame eyebrow="02 // Execution Parameters" title="Runtime Controls">
          <div className="field-grid two-up draft-parameter-grid">
            <label className="toggle-field">
              Browser Visibility
              <button
                type="button"
                className={`toggle ${plan.headless ? "" : "toggle-active"}`}
                onClick={() => onPlanChange("headless", !plan.headless)}
              >
                {plan.headless ? "Headless" : "Visible Browser"}
              </button>
            </label>
            <label>
              Mode
              <select value={plan.mode} onChange={(event) => onPlanChange("mode", event.target.value as QaMode)}>
                {Object.entries(modeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Risk Level
              <select value={plan.riskLevel} onChange={(event) => onPlanChange("riskLevel", event.target.value as RiskLevel)}>
                {riskOptions.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Timebox Minutes
              <input
                type="number"
                min={5}
                max={60}
                value={plan.timeboxMinutes}
                onChange={(event) => onPlanChange("timeboxMinutes", Number(event.target.value) || 20)}
              />
            </label>
            <label className="toggle-field">
              Safe Mode
              <button
                type="button"
                className={`toggle ${plan.safeMode ? "toggle-active" : ""}`}
                onClick={() => onPlanChange("safeMode", !plan.safeMode)}
              >
                {plan.safeMode ? "Observe-only" : "Interactive"}
              </button>
            </label>
            <div className="draft-state-strip">
              <StatusBadge tone={isPending ? "running" : "default"}>{isPending ? "Working" : "Ready"}</StatusBadge>
              <StatusBadge tone={plan.safeMode ? "success" : "warning"}>{plan.safeMode ? "Safe posture" : "Interactive posture"}</StatusBadge>
            </div>
            <label>
              Login Email
              <input value={plan.loginEmail} onChange={(event) => onPlanChange("loginEmail", event.target.value)} />
            </label>
            <label>
              Login Password
              <input type="password" value={plan.loginPassword} onChange={(event) => onPlanChange("loginPassword", event.target.value)} />
              <small className="field-hint">Credentials in this MVP are stored locally. Use test-only accounts.</small>
            </label>
          </div>
        </SectionFrame>

        <SectionFrame eyebrow="03 // Mission Brief" title="Step Definition">
          <div className="field-grid">
            <label>
              Testing Objective
              <textarea value={plan.objective} onChange={(event) => onPlanChange("objective", event.target.value)} rows={3} />
            </label>
            <label>
              Plain-Text Steps
              <textarea value={plan.stepsText} onChange={(event) => onPlanChange("stepsText", event.target.value)} rows={8} />
            </label>
            <div className="field-grid two-up">
              <label>
                Expected Outcomes
                <textarea value={plan.expectedOutcomes} onChange={(event) => onPlanChange("expectedOutcomes", event.target.value)} rows={3} />
              </label>
              <label>
                Acceptance Criteria
                <textarea value={plan.acceptanceCriteria} onChange={(event) => onPlanChange("acceptanceCriteria", event.target.value)} rows={3} />
              </label>
              <label>
                Preconditions
                <textarea value={plan.prerequisites} onChange={(event) => onPlanChange("prerequisites", event.target.value)} rows={2} />
              </label>
              <label>
                Cleanup Instructions
                <textarea value={plan.cleanupInstructions} onChange={(event) => onPlanChange("cleanupInstructions", event.target.value)} rows={2} />
              </label>
            </div>
            <label>
              Risk Focus
              <input
                value={plan.riskFocus.join(", ")}
                onChange={(event) =>
                  onPlanChange(
                    "riskFocus",
                    event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  )
                }
              />
            </label>
          </div>

          <ActionBar>
            <button type="button" onClick={onParse}>
              Parse Steps
            </button>
            <button type="button" onClick={onGenerateScenarios}>
              Generate Scenarios
            </button>
            <button type="button" className="primary-action" onClick={onCreateRun}>
              Create Run
            </button>
          </ActionBar>

          <p className="feedback-banner">{feedback}</p>
        </SectionFrame>
      </div>

      <div className="draft-secondary-column">
        <SectionFrame eyebrow="04 // Scenario Source" title="Library Control" reference={`SCENARIOS: ${scenarioCount}`}>
          <div className="field-grid">
            <label>
              Saved Scenario Library
              <select value={plan.scenarioLibraryId ?? ""} onChange={(event) => onSelectScenarioLibrary(event.target.value)}>
                <option value="">None selected</option>
                {scenarioLibraries.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.name} · {library.scenarios.length} scenarios
                  </option>
                ))}
              </select>
            </label>
            <label>
              Library Name
              <input value={scenarioLibraryName} onChange={(event) => onScenarioLibraryNameChange(event.target.value)} />
            </label>
          </div>

          <ActionBar>
            <button type="button" onClick={onSaveAsLibrary} disabled={!hasScenarioSource || !scenarioLibraryName.trim()}>
              Save As Library
            </button>
            <button type="button" onClick={onUpdateLibrary} disabled={!selectedScenarioLibrary || !hasScenarioSource}>
              Update Library
            </button>
          </ActionBar>

          <div className="draft-inline-notes">
            {saveAsDisabledReason ? <p className="muted">Save As Library: {saveAsDisabledReason}</p> : null}
            {updateDisabledReason ? <p className="muted">Update Library: {updateDisabledReason}</p> : null}
          </div>

          {selectedScenarioLibrary ? (
            <div className="callout-grid draft-single-callout">
              <div className="callout-box">
                <h3>Selected Scenario Library</h3>
                <ul>
                  <li>{selectedScenarioLibrary.name}</li>
                  <li>State: {selectedLibraryState}</li>
                  <li>Version: v{selectedLibraryVersion}</li>
                  <li>{selectedScenarioLibrary.scenarios.length} saved scenarios</li>
                  <li>History: {selectedLibraryVersions.length || 1} version entries</li>
                  <li>Updated: {new Date(selectedScenarioLibrary.updatedAt).toLocaleString()}</li>
                  <li>Source Run: {selectedScenarioLibrary.sourceRunId ?? "Not linked"}</li>
                  <li>Latest baseline delta: {latestLibraryVersion?.summary ?? "No version summary yet."}</li>
                </ul>
              </div>
            </div>
          ) : null}

          {!!planWarnings.length && (
            <div className="callout-grid draft-single-callout">
              <div className="callout-box warning-box security-warning-box">
                <h3>Configuration Warnings</h3>
                <ul>
                  {planWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </SectionFrame>

        <SectionFrame eyebrow="05 // Parse Preview" title="Interpretation" reference={`PARSED: ${parseStepCount}`}>
          <div className="list-block">
          {(parsePreview?.parsedSteps ?? []).map((step) => (
            <article key={step.id} className="list-card">
              <header>
                <strong>{step.actionType}</strong>
                <span>{step.riskClassification}</span>
              </header>
              <p>{step.rawText}</p>
              <small>Target: {step.targetDescription}</small>
            </article>
          ))}
          {parsePreview && !parsePreview.parsedSteps.length && (
            <p className="muted">No explicit steps were provided. This is valid for discovery-first exploratory runs.</p>
          )}
          {!parsePreview && <p className="muted">Parse the natural-language steps to review the structured action plan.</p>}
          </div>

          {parsePreview && (
          <div className="callout-grid">
            <div className="callout-box">
              <h3>Assumptions</h3>
              <ul>
                {parsePreview.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {!parsePreview.assumptions.length && <li>No assumptions added.</li>}
              </ul>
            </div>
            <div className="callout-box warning-box">
              <h3>Ambiguities</h3>
              <ul>
                {parsePreview.ambiguities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                {!parsePreview.ambiguities.length && <li>No ambiguities detected.</li>}
              </ul>
            </div>
          </div>
          )}
        </SectionFrame>

        <SectionFrame eyebrow="06 // Scenario Studio" title="QA Coverage Matrix" reference={`SCENARIOS: ${scenarioCount}`}>
          <div className="list-block scenario-list">
          {(scenarioPreview?.scenarios ?? []).map((scenario) => (
            <article key={scenario.id} className="list-card">
              <header>
                <strong>{scenario.title}</strong>
                <span>
                  {scenario.priority} · {scenario.type}
                </span>
              </header>
              <p>{scenario.expectedResult}</p>
              <small>{scenario.riskRationale}</small>
            </article>
          ))}
          {!scenarioPreview && <p className="muted">Generate QA scenarios to see coverage beyond the happy path.</p>}
          </div>

          {scenarioPreview && (
          <div className="callout-grid">
            <div className="callout-box">
              <h3>Risk Summary</h3>
              <ul>
                {scenarioPreview.riskSummary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="callout-box warning-box">
              <h3>Coverage Gaps</h3>
              <ul>
                {scenarioPreview.coverageGaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          )}
        </SectionFrame>
      </div>
    </section>
  );
}

function buildMissionReference(plan: RunPlan): string {
  if (plan.targetUrl.trim()) {
    try {
      const target = new URL(plan.targetUrl);
      return `TARGET: ${target.host}`;
    } catch {
      return `TARGET: ${plan.targetUrl.trim()}`;
    }
  }

  if (plan.environment.trim()) {
    return `ENV: ${plan.environment.trim()}`;
  }

  return "Awaiting target";
}