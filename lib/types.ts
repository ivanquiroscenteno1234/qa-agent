export type QaMode =
  | "execute-steps"
  | "generate-scenarios"
  | "execute-and-expand"
  | "exploratory-session"
  | "regression-run";

export type ScenarioType =
  | "happy-path"
  | "negative"
  | "boundary"
  | "permissions"
  | "state-transition"
  | "regression"
  | "exploratory";

export type RunStatus = "draft" | "queued" | "running" | "pass" | "fail" | "blocked" | "cancelled" | "inconclusive";

export type RunPhase = "intake" | "queued" | "preparing" | "executing" | "reporting" | "cancelled";

export type StepStatus = "pending" | "running" | "pass" | "fail" | "blocked";

export type FailureCategory =
  | "element-not-found"
  | "timeout"
  | "auth-failed"
  | "navigation-mismatch"
  | "navigation-failed"
  | "navigation-timeout"
  | "accessibility-violation"
  | "state-mismatch"
  | "runtime-error"
  | "assertion-failed"
  | "unsupported-scenario"
  | "unexpected-dialog"
  | "cancelled"
  | "system";

export type RiskLevel = "low" | "moderate" | "high";

export type CredentialSecretMode = "stored-secret" | "reference-only";

export type CredentialStatus = "active" | "revoked";

export type ActionType =
  | "navigate"
  | "login"
  | "open-navigation"
  | "open-section"
  | "assert-editable"
  | "fill"
  | "click"
  | "assert-visible"
  | "assert-url"
  | "observe";

export interface ParsedStep {
  id: string;
  rawText: string;
  actionType: ActionType;
  targetDescription: string;
  inputData?: string;
  expectedResult?: string;
  fallbackInterpretation: string;
  riskClassification: RiskLevel;
  /** Whether Gemini LLM or the heuristic parser produced the final action classification */
  parsingSource?: "llm" | "heuristic";
}

export interface Scenario {
  id: string;
  title: string;
  priority: "P0" | "P1" | "P2";
  type: ScenarioType;
  prerequisites: string[];
  steps: string[];
  expectedResult: string;
  riskRationale: string;
  approvedForAutomation: boolean;
  surfaceTargetSelector?: string;
  /** Whether Gemini LLM or the deterministic generator produced this scenario */
  generationSource?: "llm" | "deterministic";
}

export interface StepResult {
  stepId: string;
  stepNumber: number;
  userStepText: string;
  normalizedAction: ActionType;
  observedTarget: string;
  actionResult: string;
  assertionResult: StepStatus;
  notes: string;
  screenshotLabel: string;
  screenshotArtifactId?: string;
  policyHandler?: string;
}

export interface Artifact {
  id: string;
  type: "screenshot" | "trace" | "report" | "crawl";
  label: string;
  content: string;
}

export interface RunSummaryCounts {
  parsedSteps: number;
  generatedScenarios: number;
  stepResults: number;
  artifacts: number;
  defects: number;
}

export interface RunSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelRequestedAt?: string;
  currentActivity?: string;
  currentStepNumber?: number;
  currentScenarioIndex?: number;
  currentScenarioTitle?: string;
  plan: Pick<RunPlan, "environment" | "targetUrl" | "featureArea" | "mode" | "browser" | "role" | "scenarioLibraryId">;
  status: RunStatus;
  currentPhase: RunPhase;
  summary: string;
  counts: RunSummaryCounts;
}

export interface DefectCandidate {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  priority: "P0" | "P1" | "P2";
  expectedResult: string;
  actualResult: string;
  stepsToReproduce: string[];
  confidence: number;
}

export interface AnalysisInsight {
  id: string;
  /** Legacy values (usability, accessibility, information-architecture, qa-recommendation) are kept for backward
   *  compatibility. New insight generators should use the refined set instead:
   *  usability-risk, missing-label, inconsistent-language, defect-candidate, manual-follow-up */
  category:
    | "intended-flow"
    | "usability-risk"
    | "missing-label"
    | "inconsistent-language"
    | "defect-candidate"
    | "manual-follow-up"
    // legacy – preserved for backward compatibility
    | "usability"
    | "accessibility"
    | "information-architecture"
    | "qa-recommendation";
  /** Distinguishes raw evidence captured during execution from analysis conclusions drawn by the engine */
  evidenceKind: "observed" | "interpreted";
  title: string;
  summary: string;
  recommendation: string;
  confidence: number;
  evidence: AnalysisEvidenceReference[];
  /** Whether Gemini LLM or the heuristic analysis engine produced this insight */
  analysisSource?: "llm" | "heuristic";
}

export interface AnalysisEvidenceReference {
  type: "view" | "surface" | "input" | "defect" | "artifact";
  label: string;
}

export interface ScenarioLibraryChangeSummary {
  reused: number;
  added: number;
  removed: number;
  changed: number;
  addedTitles: string[];
  removedTitles: string[];
  changedTitles: string[];
}

export interface ScenarioLibraryVersion {
  version: number;
  createdAt: string;
  sourceRunId?: string;
  scenarioCount: number;
  summary: string;
  changeSummary: ScenarioLibraryChangeSummary;
  /** Insights from the run that created or updated this library version — used as baseline for regression comparison */
  baselineInsights?: AnalysisInsight[];
}

export interface ScenarioLibraryComparison {
  libraryId: string;
  libraryName: string;
  comparedVersion: number;
  summary: string;
  changeSummary: ScenarioLibraryChangeSummary;
}

export interface ConfidenceScore {
  score: number;
  rationale: string;
}

export interface RunEvent {
  id: string;
  timestamp: string;
  phase: RunPhase;
  level: "info" | "warning" | "error";
  message: string;
  category?: FailureCategory;
  stepNumber?: number;
  scenarioTitle?: string;
}

export interface ExecutionWarning {
  id: string;
  timestamp: string;
  phase: RunPhase;
  message: string;
  category: FailureCategory;
  stepNumber?: number;
  scenarioTitle?: string;
  recoverable: boolean;
}

export interface RunPlan {
  environment: string;
  targetUrl: string;
  featureArea: string;
  objective: string;
  mode: QaMode;
  browser: string;
  device: string;
  headless: boolean;
  role: string;
  environmentLibraryId?: string;
  credentialLibraryId?: string;
  credentialReference: string;
  loginEmail: string;
  loginPassword: string;
  scenarioLibraryId?: string;
  buildVersion: string;
  timeboxMinutes: number;
  riskLevel: RiskLevel;
  safeMode: boolean;
  stepsText: string;
  expectedOutcomes: string;
  prerequisites: string;
  cleanupInstructions: string;
  acceptanceCriteria: string;
  riskFocus: string[];
}

export interface EnvironmentLibraryInput {
  name: string;
  targetUrl: string;
  environment: string;
  role: string;
  browser: string;
  device: string;
  safeMode: boolean;
  riskLevel: RiskLevel;
  defaultCredentialId?: string;
  notes: string;
}

export interface EnvironmentLibraryRecord extends EnvironmentLibraryInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialLibraryInput {
  label: string;
  username: string;
  password?: string;
  secretMode: CredentialSecretMode;
  reference?: string;
  status: CredentialStatus;
  notes: string;
}

export interface CredentialLibraryRecord {
  id: string;
  label: string;
  username: string;
  secretMode: CredentialSecretMode;
  reference?: string;
  hasStoredSecret: boolean;
  status: CredentialStatus;
  notes: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCredentialLibraryRecord extends Omit<CredentialLibraryRecord, "hasStoredSecret"> {
  password?: string;
}

export interface RunRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelRequestedAt?: string;
  currentActivity?: string;
  currentStepNumber?: number;
  currentScenarioIndex?: number;
  currentScenarioTitle?: string;
  plan: RunPlan;
  parsedSteps: ParsedStep[];
  generatedScenarios: Scenario[];
  status: RunStatus;
  currentPhase: RunPhase;
  summary: string;
  riskSummary: string[];
  coverageGaps: string[];
  stepResults: StepResult[];
  artifacts: Artifact[];
  defects: DefectCandidate[];
  analysisInsights: AnalysisInsight[];
  insightComparison?: { persisting: string[]; resolved: string[]; new: string[] };
  llmMetadata?: {
    stepParsing: "llm" | "heuristic";
    scenarioGeneration: "llm" | "deterministic";
    reviewAnalysis: "llm" | "heuristic";
    promptVersions?: {
      stepNormalization: string;
      scenarioGeneration: string;
      reviewAnalysis: string;
    };
  };
  scenarioLibraryComparison?: ScenarioLibraryComparison;
  pageSurfaceSnapshot?: import("@/lib/qa/crawl-model").PageSurface;
  events: RunEvent[];
  warnings: ExecutionWarning[];
}

export interface ScenarioLibrary {
  id: string;
  name: string;
  author?: string;
  status: "active" | "archived";
  sourceRunId?: string;
  featureArea: string;
  environment: string;
  targetUrl: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  versions: ScenarioLibraryVersion[];
  scenarios: Scenario[];
  riskSummary: string[];
  coverageGaps: string[];
}

export interface ParseStepsResponse {
  parsedSteps: ParsedStep[];
  assumptions: string[];
  ambiguities: string[];
}

export interface GenerateScenariosResponse {
  scenarios: Scenario[];
  coverageGaps: string[];
  riskSummary: string[];
}