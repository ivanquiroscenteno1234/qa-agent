import type {
  CredentialLibraryRecord,
  EnvironmentLibraryRecord,
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
  invalidFields: {
    targetUrl: boolean;
    stepsText: boolean;
    scenarioLibraryId: boolean;
    inlineCredentials: boolean;
  };
  parseDisabledReason: string | null;
  parseValidationMessages: string[];
  createRunDisabledReason: string | null;
  createRunValidationMessages: string[];
  generateScenariosDisabledReason: string | null;
  generateScenarioValidationMessages: string[];
  environmentLibraries: EnvironmentLibraryRecord[];
  credentialLibraries: CredentialLibraryRecord[];
  scenarioLibraries: ScenarioLibrary[];
  selectedEnvironmentLibrary: EnvironmentLibraryRecord | null;
  selectedCredentialLibrary: CredentialLibraryRecord | null;
  selectedScenarioLibrary: ScenarioLibrary | null;
  environmentLibraryName: string;
  credentialLibraryName: string;
  scenarioLibraryName: string;
  scenarioLibraryAuthor: string;
  planWarnings: string[];
  feedback: string;
  isPending: boolean;
  modeLabels: Record<QaMode, string>;
  riskOptions: RiskLevel[];
  onPlanChange: <Key extends keyof RunPlan>(key: Key, value: RunPlan[Key]) => void;
  onEnvironmentLibraryNameChange: (value: string) => void;
  onCredentialLibraryNameChange: (value: string) => void;
  onScenarioLibraryNameChange: (value: string) => void;
  onScenarioLibraryAuthorChange: (value: string) => void;
  onSelectEnvironmentLibrary: (environmentLibraryId: string) => void;
  onSelectCredentialLibrary: (credentialLibraryId: string) => void;
  onSelectScenarioLibrary: (scenarioLibraryId: string) => void;
  onParse: () => void;
  onGenerateScenarios: () => void;
  onCreateRun: () => void;
  onSaveEnvironmentLibrary: () => void;
  onUpdateEnvironmentLibrary: () => void;
  onSaveCredentialLibrary: () => void;
  onUpdateCredentialLibrary: () => void;
  onSaveAsLibrary: () => void;
  onUpdateLibrary: () => void;
}

export function DraftWorkflowView({
  plan,
  parsePreview,
  scenarioPreview,
  invalidFields,
  parseDisabledReason,
  parseValidationMessages,
  createRunDisabledReason,
  createRunValidationMessages,
  generateScenariosDisabledReason,
  generateScenarioValidationMessages,
  environmentLibraries,
  credentialLibraries,
  scenarioLibraries,
  selectedEnvironmentLibrary,
  selectedCredentialLibrary,
  selectedScenarioLibrary,
  environmentLibraryName,
  credentialLibraryName,
  scenarioLibraryName,
  scenarioLibraryAuthor,
  planWarnings,
  feedback,
  isPending,
  modeLabels,
  riskOptions,
  onPlanChange,
  onEnvironmentLibraryNameChange,
  onCredentialLibraryNameChange,
  onScenarioLibraryNameChange,
  onScenarioLibraryAuthorChange,
  onSelectEnvironmentLibrary,
  onSelectCredentialLibrary,
  onSelectScenarioLibrary,
  onParse,
  onGenerateScenarios,
  onCreateRun,
  onSaveEnvironmentLibrary,
  onUpdateEnvironmentLibrary,
  onSaveCredentialLibrary,
  onUpdateCredentialLibrary,
  onSaveAsLibrary,
  onUpdateLibrary
}: DraftWorkflowViewProps) {
  const targetUrlRequired = true;
  const stepsRequired = plan.mode === "execute-steps" || plan.mode === "execute-and-expand";
  const scenarioLibraryRequired = plan.mode === "regression-run";
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
  const saveEnvironmentDisabledReason = !environmentLibraryName.trim()
    ? "Provide an environment profile name first."
    : !plan.targetUrl.trim()
      ? "Provide a target URL before saving an environment profile."
      : invalidFields.targetUrl
        ? "Provide a valid http:// or https:// target URL before saving an environment profile."
      : null;
  const updateEnvironmentDisabledReason = !selectedEnvironmentLibrary
    ? "Select an existing environment profile to update it."
    : invalidFields.targetUrl
      ? "Provide a valid http:// or https:// target URL before updating the environment profile."
    : null;
  const saveCredentialDisabledReason = !credentialLibraryName.trim()
    ? "Provide a credential profile label first."
    : !(plan.loginEmail.trim() || selectedCredentialLibrary?.username)
      ? "Provide a login email or username before saving a credential profile."
      : !(plan.loginPassword.trim() || plan.credentialReference.trim() || selectedCredentialLibrary?.hasStoredSecret || selectedCredentialLibrary?.reference)
        ? "Provide either a password or a credential reference handle."
        : null;
  const updateCredentialDisabledReason = !selectedCredentialLibrary
    ? "Select an existing credential profile to update it."
    : null;
  const updateDisabledReason = !selectedScenarioLibrary
    ? "Select an existing library to update it."
    : !hasScenarioSource
      ? "There are no scenarios available to write back yet."
      : null;

  function renderLabel(text: string, required = false) {
    return (
      <span className="field-label-row">
        <span>{text}</span>
        {required ? <span className="field-required-badge">Required</span> : null}
      </span>
    );
  }

  function getControlProps(isInvalid: boolean) {
    return {
      className: isInvalid ? "field-control-invalid" : undefined,
      "aria-invalid": isInvalid ? "true" : "false"
    } as const;
  }

  return (
    <section className="draft-screen">
      <div className="draft-primary-column">
        <SectionFrame eyebrow="01 // Environment & Target" title="Mission Parameters" reference={missionReference}>
          {selectedEnvironmentLibrary ? (
            <div className="draft-profile-banner">
              <span className="muted">Loaded from profile: <strong>{selectedEnvironmentLibrary.name}</strong></span>
              <button type="button" className="draft-profile-clear" onClick={() => onSelectEnvironmentLibrary("")}>
                Clear Profile
              </button>
            </div>
          ) : null}
          <div className="field-grid two-up">
            <label>
              {renderLabel("Environment")}
              <input value={plan.environment} onChange={(event) => onPlanChange("environment", event.target.value)} />
            </label>
            <label>
              {renderLabel("Target URL", targetUrlRequired)}
              <input {...getControlProps(invalidFields.targetUrl)} value={plan.targetUrl} onChange={(event) => onPlanChange("targetUrl", event.target.value)} />
            </label>
            <label>
              {renderLabel("Feature Area")}
              <input value={plan.featureArea} onChange={(event) => onPlanChange("featureArea", event.target.value)} />
            </label>
            <label>
              {renderLabel("Build Version")}
              <input value={plan.buildVersion} onChange={(event) => onPlanChange("buildVersion", event.target.value)} />
            </label>
            <label>
              {renderLabel("Browser")}
              <input value={plan.browser} onChange={(event) => onPlanChange("browser", event.target.value)} />
            </label>
            <label>
              {renderLabel("Device")}
              <input value={plan.device} onChange={(event) => onPlanChange("device", event.target.value)} />
            </label>
            <label>
              {renderLabel("Role")}
              <input value={plan.role} onChange={(event) => onPlanChange("role", event.target.value)} />
            </label>
            <label>
              {renderLabel("Credential Reference")}
              <input value={plan.credentialReference} onChange={(event) => onPlanChange("credentialReference", event.target.value)} />
            </label>
          </div>
        </SectionFrame>

        <SectionFrame eyebrow="02 // Execution Parameters" title="Runtime Controls">
          <div className="field-grid two-up draft-parameter-grid">
            <label className="toggle-field">
              {renderLabel("Browser Visibility")}
              <button
                type="button"
                className={`toggle ${plan.headless ? "" : "toggle-active"}`}
                onClick={() => onPlanChange("headless", !plan.headless)}
              >
                {plan.headless ? "Headless" : "Visible Browser"}
              </button>
            </label>
            <label>
              {renderLabel("Mode")}
              <select value={plan.mode} onChange={(event) => onPlanChange("mode", event.target.value as QaMode)}>
                {Object.entries(modeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {renderLabel("Risk Level")}
              <select value={plan.riskLevel} onChange={(event) => onPlanChange("riskLevel", event.target.value as RiskLevel)}>
                {riskOptions.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {renderLabel("Timebox Minutes")}
              <input
                type="number"
                min={5}
                max={60}
                value={plan.timeboxMinutes}
                onChange={(event) => onPlanChange("timeboxMinutes", Number(event.target.value) || 20)}
              />
            </label>
            <label className="toggle-field">
              {renderLabel("Safe Mode")}
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
              {renderLabel("Login Email")}
              <input {...getControlProps(invalidFields.inlineCredentials)} value={plan.loginEmail} onChange={(event) => onPlanChange("loginEmail", event.target.value)} />
            </label>
            <label>
              {renderLabel("Login Password")}
              <input {...getControlProps(invalidFields.inlineCredentials)} type="password" value={plan.loginPassword} onChange={(event) => onPlanChange("loginPassword", event.target.value)} />
              <small className="field-hint">Saved credential profiles avoid storing passwords on new runs. Inline values override saved credentials.</small>
            </label>
          </div>
        </SectionFrame>

        <SectionFrame eyebrow="03 // Mission Brief" title="Step Definition">
          <div className="field-grid">
            <label>
              {renderLabel("Testing Objective")}
              <textarea value={plan.objective} onChange={(event) => onPlanChange("objective", event.target.value)} rows={3} />
            </label>
            <label>
              {renderLabel("Plain-Text Steps", stepsRequired)}
              <textarea {...getControlProps(invalidFields.stepsText)} value={plan.stepsText} onChange={(event) => onPlanChange("stepsText", event.target.value)} rows={8} />
            </label>
            <div className="field-grid two-up">
              <label>
                {renderLabel("Expected Outcomes")}
                <textarea value={plan.expectedOutcomes} onChange={(event) => onPlanChange("expectedOutcomes", event.target.value)} rows={3} />
              </label>
              <label>
                {renderLabel("Acceptance Criteria")}
                <textarea value={plan.acceptanceCriteria} onChange={(event) => onPlanChange("acceptanceCriteria", event.target.value)} rows={3} />
              </label>
              <label>
                {renderLabel("Preconditions")}
                <textarea value={plan.prerequisites} onChange={(event) => onPlanChange("prerequisites", event.target.value)} rows={2} />
              </label>
              <label>
                {renderLabel("Cleanup Instructions")}
                <textarea value={plan.cleanupInstructions} onChange={(event) => onPlanChange("cleanupInstructions", event.target.value)} rows={2} />
              </label>
            </div>
            <label>
              {renderLabel("Risk Focus")}
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
            <button type="button" onClick={onParse} disabled={Boolean(parseDisabledReason)} title={parseDisabledReason || undefined}>
              Parse Steps
            </button>
            <button type="button" onClick={onGenerateScenarios} disabled={Boolean(generateScenariosDisabledReason)} title={generateScenariosDisabledReason || undefined}>
              Generate Scenarios
            </button>
            <button type="button" className="primary-action" onClick={onCreateRun} disabled={Boolean(createRunDisabledReason)} title={createRunDisabledReason || undefined}>
              Create Run
            </button>
          </ActionBar>

          <div className="draft-inline-notes">
            <p className="muted">Minimum to create a run: Target URL. Some modes also require plain-text steps or a saved scenario library.</p>
            {parseDisabledReason ? <p className="muted">Parse Steps: {parseDisabledReason}</p> : null}
            {generateScenariosDisabledReason ? <p className="muted">Generate Scenarios: {generateScenariosDisabledReason}</p> : null}
            {createRunDisabledReason ? <p className="muted">Create Run: {createRunDisabledReason}</p> : null}
          </div>

          <p className="feedback-banner">{feedback}</p>

          {!!parseValidationMessages.length && (
            <div className="callout-grid draft-single-callout">
              <div className="callout-box warning-box">
                <h3>Required Before Step Parsing</h3>
                <ul>
                  {parseValidationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!!createRunValidationMessages.length && (
            <div className="callout-grid draft-single-callout">
              <div className="callout-box warning-box">
                <h3>Required Before Run Creation</h3>
                <ul>
                  {createRunValidationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!!generateScenarioValidationMessages.length && (
            <div className="callout-grid draft-single-callout">
              <div className="callout-box warning-box">
                <h3>Required Before Scenario Generation</h3>
                <ul>
                  {generateScenarioValidationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </SectionFrame>
      </div>

      <div className="draft-secondary-column">
        <SectionFrame eyebrow="04 // Saved Profiles" title="Environment & Credential Profiles" reference={`${environmentLibraries.length} env · ${credentialLibraries.length} cred`}>
          <div className="field-grid">
            <label>
              Saved Environment Profile
              <select value={plan.environmentLibraryId ?? ""} onChange={(event) => onSelectEnvironmentLibrary(event.target.value)}>
                <option value="">None selected</option>
                {environmentLibraries.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.name} · {library.targetUrl}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Environment Profile Name
              <input value={environmentLibraryName} onChange={(event) => onEnvironmentLibraryNameChange(event.target.value)} />
            </label>
            <label>
              Saved Credential Profile
              <select value={plan.credentialLibraryId ?? ""} onChange={(event) => onSelectCredentialLibrary(event.target.value)}>
                <option value="">None selected</option>
                {credentialLibraries.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.label} · {library.username}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Credential Profile Label
              <input value={credentialLibraryName} onChange={(event) => onCredentialLibraryNameChange(event.target.value)} />
            </label>
          </div>

          <ActionBar>
            <button type="button" onClick={onSaveEnvironmentLibrary} disabled={Boolean(saveEnvironmentDisabledReason)} title={saveEnvironmentDisabledReason || undefined}>
              Save Environment
            </button>
            <button type="button" onClick={onUpdateEnvironmentLibrary} disabled={Boolean(updateEnvironmentDisabledReason)} title={updateEnvironmentDisabledReason || undefined}>
              Update Environment
            </button>
            <button type="button" onClick={onSaveCredentialLibrary} disabled={Boolean(saveCredentialDisabledReason)} title={saveCredentialDisabledReason || undefined}>
              Save Credential
            </button>
            <button type="button" onClick={onUpdateCredentialLibrary} disabled={Boolean(updateCredentialDisabledReason)} title={updateCredentialDisabledReason || undefined}>
              Update Credential
            </button>
          </ActionBar>

          <div className="draft-inline-notes">
            {saveEnvironmentDisabledReason ? <p className="muted">Save Environment: {saveEnvironmentDisabledReason}</p> : null}
            {updateEnvironmentDisabledReason ? <p className="muted">Update Environment: {updateEnvironmentDisabledReason}</p> : null}
            {saveCredentialDisabledReason ? <p className="muted">Save Credential: {saveCredentialDisabledReason}</p> : null}
            {updateCredentialDisabledReason ? <p className="muted">Update Credential: {updateCredentialDisabledReason}</p> : null}
            <p className="muted">Inline email and password values override the selected saved credential during execution.</p>
          </div>

          {selectedEnvironmentLibrary ? (
            <div className="callout-grid draft-single-callout">
              <div className="callout-box">
                <h3>Selected Environment Profile</h3>
                <ul>
                  <li>{selectedEnvironmentLibrary.name}</li>
                  <li>Target: {selectedEnvironmentLibrary.targetUrl}</li>
                  <li>Role: {selectedEnvironmentLibrary.role || "Not set"}</li>
                  <li>Browser: {selectedEnvironmentLibrary.browser}</li>
                  <li>Device: {selectedEnvironmentLibrary.device}</li>
                  <li>Risk: {selectedEnvironmentLibrary.riskLevel}</li>
                  <li>Default credential: {selectedEnvironmentLibrary.defaultCredentialId ? "Linked" : "None"}</li>
                </ul>
              </div>
            </div>
          ) : null}

          {selectedCredentialLibrary ? (
            <div className="callout-grid draft-single-callout">
              <div className="callout-box">
                <h3>Selected Credential Profile</h3>
                <ul>
                  <li>{selectedCredentialLibrary.label}</li>
                  <li>User: {selectedCredentialLibrary.username}</li>
                  <li>Mode: {selectedCredentialLibrary.secretMode}</li>
                  <li>Status: {selectedCredentialLibrary.status}</li>
                  <li>Stored secret: {selectedCredentialLibrary.hasStoredSecret ? "Yes" : "No"}</li>
                  <li>Reference: {selectedCredentialLibrary.reference ?? "Not set"}</li>
                </ul>
              </div>
            </div>
          ) : null}
        </SectionFrame>

        <SectionFrame eyebrow="05 // Scenario Source" title="Library Control" reference={`SCENARIOS: ${scenarioCount}`}>
          <div className="field-grid">
            <label>
              {renderLabel("Saved Scenario Library", scenarioLibraryRequired)}
              <select {...getControlProps(invalidFields.scenarioLibraryId)} value={plan.scenarioLibraryId ?? ""} onChange={(event) => onSelectScenarioLibrary(event.target.value)}>
                <option value="">None selected</option>
                {scenarioLibraries.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.name} · {library.scenarios.length} scenarios
                  </option>
                ))}
              </select>
            </label>
            <label>
              {renderLabel("Library Name")}
              <input value={scenarioLibraryName} onChange={(event) => onScenarioLibraryNameChange(event.target.value)} />
            </label>
            <label>
              {renderLabel("Author")}
              <input
                value={scenarioLibraryAuthor}
                onChange={(event) => onScenarioLibraryAuthorChange(event.target.value)}
                placeholder="Optional author name"
              />
            </label>
          </div>

          <ActionBar>
            <button type="button" onClick={onSaveAsLibrary} disabled={!hasScenarioSource || !scenarioLibraryName.trim()} title={saveAsDisabledReason || undefined}>
              Save As Library
            </button>
            <button type="button" onClick={onUpdateLibrary} disabled={!selectedScenarioLibrary || !hasScenarioSource} title={updateDisabledReason || undefined}>
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

        <SectionFrame eyebrow="06 // Parse Preview" title="Interpretation" reference={`PARSED: ${parseStepCount}`}>
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

        <SectionFrame eyebrow="07 // Scenario Studio" title="QA Coverage Matrix" reference={`SCENARIOS: ${scenarioCount}`}>
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