"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { DraftWorkflowView } from "@/components/qa/draft-workflow-view";
import { MonitorWorkflowView } from "@/components/qa/monitor-workflow-view";
import { ReviewWorkflowView } from "@/components/qa/review-workflow-view";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  buildRunPlanWarnings,
  getParseValidationErrors,
  getRunPlanValidationErrors,
  getScenarioGenerationValidationErrors
} from "@/lib/qa/plan-validation";

import type {
  CredentialLibraryRecord,
  EnvironmentLibraryRecord,
  ExecutionWarning,
  GenerateScenariosResponse,
  ParseStepsResponse,
  QaMode,
  RiskLevel,
  RunEvent,
  ScenarioLibrary,
  RunPlan,
  RunRecord,
  RunSummary,
  RunStatus
} from "@/lib/types";

function createEmptyPlan(): RunPlan {
  return {
    environment: "",
    targetUrl: "",
    featureArea: "",
    objective: "",
    mode: "exploratory-session",
    browser: "Chromium",
    device: "Desktop",
    headless: false,
    role: "",
      environmentLibraryId: "",
      credentialLibraryId: "",
    credentialReference: "",
    loginEmail: "",
    loginPassword: "",
    scenarioLibraryId: "",
    buildVersion: "",
    timeboxMinutes: 20,
    riskLevel: "moderate",
    safeMode: true,
    stepsText: "",
    expectedOutcomes: "",
    prerequisites: "",
    cleanupInstructions: "",
    acceptanceCriteria: "",
    riskFocus: []
  };
}

function buildScenarioLibraryNameFallback(plan: RunPlan): string {
  const featureArea = plan.featureArea.trim();
  const environment = plan.environment.trim();

  if (featureArea && environment) {
    return `${featureArea} (${environment})`;
  }

  if (featureArea) {
    return featureArea;
  }

  if (environment) {
    return `Scenario Library (${environment})`;
  }

  return "Scenario Library";
}

function buildEnvironmentLibraryNameFallback(plan: RunPlan): string {
  const environment = plan.environment.trim();

  if (environment && plan.targetUrl.trim()) {
    return `${environment} Profile`;
  }

  if (environment) {
    return environment;
  }

  return "Environment Profile";
}

function buildCredentialLibraryNameFallback(plan: RunPlan): string {
  if (plan.credentialReference.trim()) {
    return plan.credentialReference.trim();
  }

  if (plan.loginEmail.trim()) {
    return `${plan.loginEmail.trim()} Credential`;
  }

  return "Credential Profile";
}

const modeLabels: Record<QaMode, string> = {
  "execute-steps": "Execute Steps",
  "generate-scenarios": "Generate Scenarios",
  "execute-and-expand": "Execute And Expand",
  "exploratory-session": "Exploratory Session",
  "regression-run": "Regression Run"
};

const riskOptions: RiskLevel[] = ["low", "moderate", "high"];

const activeRunStatuses: RunStatus[] = ["queued", "running"];
const terminalRunStatuses: RunStatus[] = ["pass", "fail", "blocked", "cancelled", "inconclusive"];

type WorkflowView = "draft" | "monitor" | "review";

interface QaCommandCenterProps {
  initialWorkflowView?: WorkflowView;
  storeBackendLabel?: string;
}

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: string[];
  };
}

function formatElapsed(startedAt?: string, completedAt?: string): string {
  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
  const end = completedAt ? Date.parse(completedAt) : Date.now();

  if (Number.isNaN(start)) {
    return "Not started";
  }

  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function statusClassName(status: RunStatus): string {
  switch (status) {
    case "queued":
      return "status-queued";
    case "running":
      return "status-running";
    case "pass":
      return "status-pass";
    case "fail":
      return "status-fail";
    case "blocked":
      return "status-blocked";
    case "cancelled":
      return "status-cancelled";
    default:
      return "status-ready";
  }
}

function summarizeRun(run: RunRecord): RunSummary {
  return {
    id: run.id,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    cancelRequestedAt: run.cancelRequestedAt,
    currentActivity: run.currentActivity,
    currentStepNumber: run.currentStepNumber,
    currentScenarioIndex: run.currentScenarioIndex,
    currentScenarioTitle: run.currentScenarioTitle,
    plan: {
      environment: run.plan.environment,
      targetUrl: run.plan.targetUrl,
      featureArea: run.plan.featureArea,
      mode: run.plan.mode,
      browser: run.plan.browser,
      role: run.plan.role,
      scenarioLibraryId: run.plan.scenarioLibraryId
    },
    status: run.status,
    currentPhase: run.currentPhase,
    summary: run.summary,
    counts: {
      parsedSteps: run.parsedSteps.length,
      generatedScenarios: run.generatedScenarios.length,
      stepResults: run.stepResults.length,
      artifacts: run.artifacts.length,
      defects: run.defects.length
    }
  };
}

function upsertAndSortRuns(current: RunSummary[], incoming: RunSummary): RunSummary[] {
  const nextRuns = current.some((run) => run.id === incoming.id)
    ? current.map((run) => (run.id === incoming.id ? incoming : run))
    : [incoming, ...current];

  return [...nextRuns].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function buildActivityDetail(run: RunRecord): string {
  if (typeof run.currentScenarioIndex === "number" && run.currentScenarioTitle) {
    return `Scenario ${run.currentScenarioIndex}: ${run.currentScenarioTitle}`;
  }

  if (typeof run.currentStepNumber === "number") {
    return `Step ${run.currentStepNumber}`;
  }

  return "No active step or scenario recorded.";
}

function isActiveRun(status: RunStatus): boolean {
  return activeRunStatuses.includes(status);
}

function isTerminalRun(status: RunStatus): boolean {
  return terminalRunStatuses.includes(status);
}

function buildCompletionFeedback(run: RunRecord): string {
  switch (run.status) {
    case "pass":
      return `Run ${run.id} completed successfully. Review the evidence and artifacts.`;
    case "fail":
      return `Run ${run.id} failed. Review the timeline, warnings, and artifacts.`;
    case "blocked":
      return `Run ${run.id} completed with blockers. Review the unsupported or blocked checks.`;
    case "cancelled":
      return `Run ${run.id} was cancelled. Partial evidence remains available for review.`;
    default:
      return `Run ${run.id} reached a terminal state. Review the captured evidence.`;
  }
}

async function postJson<TResponse>(url: string, payload: unknown): Promise<TResponse> {
  return requestJson<TResponse>("POST", url, payload);
}

async function patchJson<TResponse>(url: string, payload: unknown): Promise<TResponse> {
  return requestJson<TResponse>("PATCH", url, payload);
}

async function requestJson<TResponse>(method: "POST" | "PATCH", url: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const message = body?.error?.message ?? `Request failed with status ${response.status}`;
    const detail = body?.error?.details?.length ? ` ${body.error.details.join(" ")}` : "";
    throw new Error(`${message}${detail}`.trim());
  }

  return response.json() as Promise<TResponse>;
}

async function deleteResource(url: string): Promise<void> {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const message = body?.error?.message ?? `Delete failed with status ${response.status}`;
    throw new Error(message);
  }
}

function routeForWorkflowView(view: WorkflowView): Route {
  switch (view) {
    case "monitor":
      return "/monitor";
    case "review":
      return "/review";
    default:
      return "/draft";
  }
}

export function QaCommandCenter({ initialWorkflowView = "draft", storeBackendLabel = "json" }: QaCommandCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<RunPlan>(() => createEmptyPlan());
  const [environmentLibraryName, setEnvironmentLibraryName] = useState<string>(() => buildEnvironmentLibraryNameFallback(createEmptyPlan()));
  const [credentialLibraryName, setCredentialLibraryName] = useState<string>(() => buildCredentialLibraryNameFallback(createEmptyPlan()));
  const [scenarioLibraryName, setScenarioLibraryName] = useState<string>(() => buildScenarioLibraryNameFallback(createEmptyPlan()));
  const [scenarioLibraryAuthor, setScenarioLibraryAuthor] = useState<string>("");
  const [parsePreview, setParsePreview] = useState<ParseStepsResponse | null>(null);
  const [scenarioPreview, setScenarioPreview] = useState<GenerateScenariosResponse | null>(null);
  const [environmentLibraries, setEnvironmentLibraries] = useState<EnvironmentLibraryRecord[]>([]);
  const [credentialLibraries, setCredentialLibraries] = useState<CredentialLibraryRecord[]>([]);
  const [scenarioLibraries, setScenarioLibraries] = useState<ScenarioLibrary[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [runEvents, setRunEvents] = useState<RunEvent[]>([]);
  const [runWarnings, setRunWarnings] = useState<ExecutionWarning[]>([]);
  const [feedback, setFeedback] = useState<string>("Ready to parse steps, generate scenarios, or start a QA run.");
  const [workflowView, setWorkflowView] = useState<WorkflowView>(initialWorkflowView);
  const [isPending, startTransition] = useTransition();
  const previousSelectedRunStatusRef = useRef<RunStatus | null>(null);
  const disposedRef = useRef(false);
  const handledDraftHandoffRef = useRef<string | null>(null);
  const selectedRunSummary = selectedRunId ? runs.find((run) => run.id === selectedRunId) ?? null : null;
  const activeSelectedRun = selectedRun?.id === selectedRunId ? selectedRun : null;
  const draftHandoffScenarioLibraryId = searchParams.get("scenarioLibraryId")?.trim() ?? "";

  const activeRunCount = runs.filter((run) => isActiveRun(run.status)).length;
  const completedRunCount = runs.filter((run) => isTerminalRun(run.status)).length;
  const draftRunCount = runs.filter((run) => run.status === "draft").length;
  const planWarnings = buildRunPlanWarnings(plan);
  const parseValidationErrors = getParseValidationErrors(plan);
  const parseValidationMessages = parseValidationErrors.map((error) =>
    error.details?.length ? `${error.message} ${error.details.join(" ")}` : error.message
  );
  const parseDisabledReason = parseValidationErrors[0]?.message ?? null;
  const createRunValidationErrors = getRunPlanValidationErrors(plan);
  const createRunValidationMessages = createRunValidationErrors.map((error) =>
    error.details?.length ? `${error.message} ${error.details.join(" ")}` : error.message
  );
  const createRunDisabledReason = createRunValidationErrors[0]?.message ?? null;
  const generateScenarioValidationErrors = getScenarioGenerationValidationErrors(plan);
  const generateScenarioValidationMessages = generateScenarioValidationErrors.map((error) =>
    error.details?.length ? `${error.message} ${error.details.join(" ")}` : error.message
  );
  const generateScenariosDisabledReason = generateScenarioValidationErrors[0]?.message ?? null;
  const invalidFieldCodes = new Set(
    [...parseValidationErrors, ...generateScenarioValidationErrors, ...createRunValidationErrors].map((error) => error.code)
  );
  const invalidFields = {
    targetUrl: invalidFieldCodes.has("TARGET_URL_REQUIRED") || invalidFieldCodes.has("TARGET_URL_INVALID"),
    stepsText:
      invalidFieldCodes.has("PARSE_STEPS_REQUIRED") ||
      invalidFieldCodes.has("STEPS_REQUIRED") ||
      invalidFieldCodes.has("SEED_STEPS_REQUIRED"),
    scenarioLibraryId: invalidFieldCodes.has("SCENARIO_LIBRARY_REQUIRED"),
    inlineCredentials: invalidFieldCodes.has("INLINE_CREDENTIALS_INCOMPLETE")
  };
  const selectedEnvironmentLibrary = environmentLibraries.find((library) => library.id === (plan.environmentLibraryId ?? "")) ?? null;
  const selectedCredentialLibrary = credentialLibraries.find((library) => library.id === (plan.credentialLibraryId ?? "")) ?? null;
  const selectedScenarioLibrary = scenarioLibraries.find((library) => library.id === (plan.scenarioLibraryId ?? "")) ?? null;
  const environmentLibraryNameSource = selectedEnvironmentLibrary?.name ?? buildEnvironmentLibraryNameFallback(plan);
  const credentialLibraryNameSource = selectedCredentialLibrary?.label ?? buildCredentialLibraryNameFallback(plan);
  const scenarioLibraryNameSource = selectedScenarioLibrary?.name ?? buildScenarioLibraryNameFallback(plan);
  const selectedRunScenarioLibraryId = activeSelectedRun?.plan.scenarioLibraryId ?? selectedRunSummary?.plan.scenarioLibraryId;
  const selectedRunScenarioLibrary = selectedRunScenarioLibraryId
    ? scenarioLibraries.find((library) => library.id === selectedRunScenarioLibraryId) ?? null
    : null;

  function navigateToWorkflowView(nextView: WorkflowView) {
    setWorkflowView(nextView);

    const targetRoute = routeForWorkflowView(nextView);
    if (pathname !== targetRoute) {
      router.push(targetRoute);
    }
  }

  useEffect(() => {
    setWorkflowView(initialWorkflowView);
  }, [initialWorkflowView]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const [runsResponse, scenarioLibrariesResponse, environmentLibrariesResponse, credentialLibrariesResponse] = await Promise.all([
          fetch("/api/runs/summary", { cache: "no-store" }),
          fetch("/api/scenario-libraries", { cache: "no-store" }),
          fetch("/api/environments", { cache: "no-store" }),
          fetch("/api/credentials", { cache: "no-store" })
        ]);

        if (!runsResponse.ok) {
          setFeedback("Unable to load saved runs.");
          return;
        }

        const data = (await runsResponse.json()) as { runs: RunSummary[] };
        setRuns(data.runs);
        if (data.runs.length > 0) {
          const initialRun = data.runs.find((run) => isActiveRun(run.status)) ?? data.runs[0];
          setSelectedRunId(initialRun.id);
        }

        if (scenarioLibrariesResponse.ok) {
          const scenarioLibraryData = (await scenarioLibrariesResponse.json()) as { scenarioLibraries: ScenarioLibrary[] };
          setScenarioLibraries(scenarioLibraryData.scenarioLibraries);
        }

        if (environmentLibrariesResponse.ok) {
          const environmentLibraryData = (await environmentLibrariesResponse.json()) as { environmentLibraries: EnvironmentLibraryRecord[] };
          setEnvironmentLibraries(environmentLibraryData.environmentLibraries);
        }

        if (credentialLibrariesResponse.ok) {
          const credentialLibraryData = (await credentialLibrariesResponse.json()) as { credentialLibraries: CredentialLibraryRecord[] };
          setCredentialLibraries(credentialLibraryData.credentialLibraries);
        }
      } finally {
        setHasLoadedInitialData(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      setRunEvents([]);
      setRunWarnings([]);
      return;
    }

    disposedRef.current = false;
    const controller = new AbortController();
    let requestInFlight = false;
    const shouldFetchEvents = Boolean(selectedRunSummary && isActiveRun(selectedRunSummary.status));

    const loadRunState = async () => {
      if (disposedRef.current || requestInFlight) {
        return;
      }

      requestInFlight = true;

      try {
        const runResponse = await fetch(`/api/runs/${selectedRunId}`, { cache: "no-store", signal: controller.signal });

        if (disposedRef.current) {
          return;
        }

        if (runResponse.status === 404) {
          setRuns((current) => {
            const remainingRuns = current.filter((run) => run.id !== selectedRunId);
            const fallbackRun = remainingRuns.find((run) => isActiveRun(run.status)) ?? remainingRuns[0] ?? null;

            setSelectedRunId(fallbackRun?.id ?? null);
            return remainingRuns;
          });
          setSelectedRun(null);
          setRunEvents([]);
          setRunWarnings([]);
          setFeedback("The selected run no longer exists. Showing the next available run.");
          return;
        }

        if (runResponse.ok) {
          const runData = (await runResponse.json()) as { run: RunRecord };
          setSelectedRun(runData.run);
          setRuns((current) => upsertAndSortRuns(current, summarizeRun(runData.run)));

          if (!shouldFetchEvents) {
            setRunEvents([]);
            setRunWarnings([]);
          }
        }

        if (!shouldFetchEvents || disposedRef.current) {
          return;
        }

        const eventsResponse = await fetch(`/api/runs/${selectedRunId}/events`, { cache: "no-store", signal: controller.signal });
        if (disposedRef.current) {
          return;
        }

        if (eventsResponse.ok) {
          const eventData = (await eventsResponse.json()) as { events: RunEvent[]; warnings: ExecutionWarning[] };
          setRunEvents(eventData.events);
          setRunWarnings(eventData.warnings);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (!disposedRef.current) {
          setFeedback((current) => current.startsWith("Unable to refresh") ? current : "Unable to refresh live run status. Retrying automatically.");
        }
      } finally {
        requestInFlight = false;
      }
    };

    void loadRunState();

    if (!selectedRunSummary || !isActiveRun(selectedRunSummary.status)) {
      return () => {
        disposedRef.current = true;
        controller.abort();
      };
    }

    const intervalId = window.setInterval(async () => {
      await loadRunState();
    }, 1500);

    return () => {
      disposedRef.current = true;
      window.clearInterval(intervalId);
      requestInFlight = false;
      controller.abort();
    };
  }, [selectedRunId, selectedRunSummary]);

  useEffect(() => {
    if (selectedRunSummary && !isActiveRun(selectedRunSummary.status)) {
      void (async () => {
        const response = await fetch("/api/scenario-libraries", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { scenarioLibraries: ScenarioLibrary[] };
        setScenarioLibraries(data.scenarioLibraries);
      })();
    }
  }, [selectedRunSummary]);

  useEffect(() => {
    setEnvironmentLibraryName(environmentLibraryNameSource);
  }, [environmentLibraryNameSource]);

  useEffect(() => {
    setCredentialLibraryName(credentialLibraryNameSource);
  }, [credentialLibraryNameSource]);

  useEffect(() => {
    setScenarioLibraryName(scenarioLibraryNameSource);
  }, [scenarioLibraryNameSource]);

  useEffect(() => {
    if (!draftHandoffScenarioLibraryId) {
      handledDraftHandoffRef.current = null;
      return;
    }

    if (!scenarioLibraries.length || handledDraftHandoffRef.current === draftHandoffScenarioLibraryId) {
      return;
    }

    handledDraftHandoffRef.current = draftHandoffScenarioLibraryId;

    const requestedLibrary = scenarioLibraries.find((library) => library.id === draftHandoffScenarioLibraryId);

    if (!requestedLibrary) {
      setFeedback(`Saved scenario library ${draftHandoffScenarioLibraryId} was not found.`);
      router.replace("/draft");
      return;
    }

    updatePlan("scenarioLibraryId", requestedLibrary.id);
    setScenarioPreview({
      scenarios: requestedLibrary.scenarios,
      coverageGaps: requestedLibrary.coverageGaps,
      riskSummary: requestedLibrary.riskSummary
    });
    updatePlan("featureArea", requestedLibrary.featureArea);
    updatePlan("environment", requestedLibrary.environment);
    updatePlan("targetUrl", requestedLibrary.targetUrl);
    updatePlan("role", requestedLibrary.role);
    setScenarioLibraryName(requestedLibrary.name);
    setFeedback(`Loaded saved scenario library ${requestedLibrary.name} from Scenario Library. Review mission parameters and create a run.`);
    router.replace("/draft");
  }, [draftHandoffScenarioLibraryId, scenarioLibraries, router]);

  useEffect(() => {
    if (!activeSelectedRun) {
      previousSelectedRunStatusRef.current = null;
      return;
    }

    const previousStatus = previousSelectedRunStatusRef.current;
    const currentStatus = activeSelectedRun.status;

    if (previousStatus && isActiveRun(previousStatus) && isTerminalRun(currentStatus)) {
      setWorkflowView("review");
      if (pathname !== "/review") {
        router.push("/review");
      }
      setFeedback(buildCompletionFeedback(activeSelectedRun));
    }

    previousSelectedRunStatusRef.current = currentStatus;
  }, [activeSelectedRun, pathname, router]);

  function updatePlan<Key extends keyof RunPlan>(key: Key, value: RunPlan[Key]) {
    setPlan((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleRunSelection(run: RunSummary) {
    setSelectedRunId(run.id);
    navigateToWorkflowView(isTerminalRun(run.status) ? "review" : isActiveRun(run.status) ? "monitor" : "draft");
  }

  function handleWorkspaceRunSelection(run: RunSummary) {
    setSelectedRunId(run.id);
  }

  async function refreshScenarioLibraries() {
    const response = await fetch("/api/scenario-libraries", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { scenarioLibraries: ScenarioLibrary[] };
    setScenarioLibraries(data.scenarioLibraries);
  }

  async function refreshEnvironmentLibraries() {
    const response = await fetch("/api/environments", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { environmentLibraries: EnvironmentLibraryRecord[] };
    setEnvironmentLibraries(data.environmentLibraries);
  }

  async function refreshCredentialLibraries() {
    const response = await fetch("/api/credentials", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { credentialLibraries: CredentialLibraryRecord[] };
    setCredentialLibraries(data.credentialLibraries);
  }

  function applyCredentialLibrarySelection(selectedLibrary: CredentialLibraryRecord, feedbackMessage?: string) {
    updatePlan("credentialLibraryId", selectedLibrary.id);
    updatePlan("credentialReference", selectedLibrary.reference ?? selectedLibrary.label);
    updatePlan("loginEmail", "");
    updatePlan("loginPassword", "");
    setCredentialLibraryName(selectedLibrary.label);
    setFeedback(feedbackMessage ?? `Loaded saved credential profile ${selectedLibrary.label}.`);
  }

  function applyEnvironmentLibrarySelection(selectedLibrary: EnvironmentLibraryRecord, feedbackMessage?: string) {
    updatePlan("environmentLibraryId", selectedLibrary.id);
    updatePlan("environment", selectedLibrary.environment);
    updatePlan("targetUrl", selectedLibrary.targetUrl);
    updatePlan("role", selectedLibrary.role);
    updatePlan("browser", selectedLibrary.browser);
    updatePlan("device", selectedLibrary.device);
    updatePlan("safeMode", selectedLibrary.safeMode);
    updatePlan("riskLevel", selectedLibrary.riskLevel);
    setEnvironmentLibraryName(selectedLibrary.name);

    if (selectedLibrary.defaultCredentialId) {
      const defaultCredential = credentialLibraries.find((library) => library.id === selectedLibrary.defaultCredentialId);
      if (defaultCredential) {
        applyCredentialLibrarySelection(defaultCredential);
      } else {
        updatePlan("credentialLibraryId", selectedLibrary.defaultCredentialId);
      }
    }

    setFeedback(feedbackMessage ?? `Loaded saved environment profile ${selectedLibrary.name}.`);
  }

  function applyScenarioLibrarySelection(selectedLibrary: ScenarioLibrary, feedbackMessage?: string) {
    updatePlan("scenarioLibraryId", selectedLibrary.id);
    setScenarioPreview({
      scenarios: selectedLibrary.scenarios,
      coverageGaps: selectedLibrary.coverageGaps,
      riskSummary: selectedLibrary.riskSummary
    });
    updatePlan("featureArea", selectedLibrary.featureArea);
    updatePlan("environment", selectedLibrary.environment);
    updatePlan("targetUrl", selectedLibrary.targetUrl);
    updatePlan("role", selectedLibrary.role);
    setScenarioLibraryName(selectedLibrary.name);
    setScenarioLibraryAuthor(selectedLibrary.author ?? "");
    setFeedback(feedbackMessage ?? `Loaded saved scenario library ${selectedLibrary.name}.`);
  }

  function handleScenarioLibrarySelection(scenarioLibraryId: string) {
    updatePlan("scenarioLibraryId", scenarioLibraryId);

    const selectedLibrary = scenarioLibraries.find((library) => library.id === scenarioLibraryId);
    if (!selectedLibrary) {
      setScenarioLibraryName(buildScenarioLibraryNameFallback(plan));
      return;
    }

    applyScenarioLibrarySelection(selectedLibrary);
  }

  function handleEnvironmentLibrarySelection(environmentLibraryId: string) {
    updatePlan("environmentLibraryId", environmentLibraryId);

    if (!environmentLibraryId) {
      setEnvironmentLibraryName(buildEnvironmentLibraryNameFallback(plan));
      return;
    }

    const selectedLibrary = environmentLibraries.find((library) => library.id === environmentLibraryId);
    if (!selectedLibrary) {
      setEnvironmentLibraryName(buildEnvironmentLibraryNameFallback(plan));
      return;
    }

    applyEnvironmentLibrarySelection(selectedLibrary);
  }

  function handleCredentialLibrarySelection(credentialLibraryId: string) {
    updatePlan("credentialLibraryId", credentialLibraryId);

    if (!credentialLibraryId) {
      updatePlan("credentialReference", "");
      setCredentialLibraryName(buildCredentialLibraryNameFallback(plan));
      return;
    }

    const selectedLibrary = credentialLibraries.find((library) => library.id === credentialLibraryId);
    if (!selectedLibrary) {
      setCredentialLibraryName(buildCredentialLibraryNameFallback(plan));
      return;
    }

    applyCredentialLibrarySelection(selectedLibrary);
  }

  async function mutateEnvironmentLibrary(action: "create" | "update") {
    const payload = {
      name: environmentLibraryName.trim(),
      targetUrl: plan.targetUrl,
      environment: plan.environment,
      role: plan.role,
      browser: plan.browser,
      device: plan.device,
      safeMode: plan.safeMode,
      riskLevel: plan.riskLevel,
      defaultCredentialId: (plan.credentialLibraryId ?? "").trim() || undefined,
      notes: `Saved from Draft for ${plan.featureArea || plan.environment || plan.targetUrl || "current mission"}.`
    };

    const data = action === "create"
      ? await postJson<{ environmentLibrary: EnvironmentLibraryRecord }>("/api/environments", payload)
      : await patchJson<{ environmentLibrary: EnvironmentLibraryRecord }>(`/api/environments/${selectedEnvironmentLibrary?.id}`, payload);

    await refreshEnvironmentLibraries();
    updatePlan("environmentLibraryId", data.environmentLibrary.id);
    setEnvironmentLibraryName(data.environmentLibrary.name);
    return data.environmentLibrary;
  }

  async function mutateCredentialLibrary(action: "create" | "update") {
    const username = plan.loginEmail.trim() || selectedCredentialLibrary?.username || "";
    const password = plan.loginPassword.trim() || undefined;
    const reference = plan.credentialReference.trim() || selectedCredentialLibrary?.reference;
    const secretMode = password ? "stored-secret" : selectedCredentialLibrary?.secretMode ?? "reference-only";
    const payload = {
      label: credentialLibraryName.trim(),
      username,
      password,
      secretMode,
      reference,
      status: selectedCredentialLibrary?.status ?? "active",
      notes: `Saved from Draft for ${plan.featureArea || plan.environment || username}.`
    };

    const data = action === "create"
      ? await postJson<{ credentialLibrary: CredentialLibraryRecord }>("/api/credentials", payload)
      : await patchJson<{ credentialLibrary: CredentialLibraryRecord }>(`/api/credentials/${selectedCredentialLibrary?.id}`, payload);

    await refreshCredentialLibraries();
    applyCredentialLibrarySelection(data.credentialLibrary);
    return data.credentialLibrary;
  }

  function buildActiveScenarioPayload() {
    const activeScenarioSet = scenarioPreview ?? (selectedScenarioLibrary
      ? {
          scenarios: selectedScenarioLibrary.scenarios,
          coverageGaps: selectedScenarioLibrary.coverageGaps,
          riskSummary: selectedScenarioLibrary.riskSummary
        }
      : null);

    return activeScenarioSet;
  }

  async function mutateScenarioLibrary(action: "create" | "update", options?: { sourceRunId?: string; scenarioLibraryId?: string }) {
    const generated = buildActiveScenarioPayload();

    if (!generated?.scenarios.length) {
      throw new Error("Generate scenarios or select a saved scenario library before saving one.");
    }

    const data = await postJson<{ scenarioLibrary: ScenarioLibrary }>("/api/scenario-libraries", {
      action,
      plan,
      generated,
      sourceRunId: options?.sourceRunId,
      scenarioLibraryId: options?.scenarioLibraryId,
      name: scenarioLibraryName.trim(),
      author: scenarioLibraryAuthor.trim() || undefined
    });

    await refreshScenarioLibraries();
    updatePlan("scenarioLibraryId", data.scenarioLibrary.id);
    setScenarioLibraryName(data.scenarioLibrary.name);
    setScenarioPreview({
      scenarios: data.scenarioLibrary.scenarios,
      coverageGaps: data.scenarioLibrary.coverageGaps,
      riskSummary: data.scenarioLibrary.riskSummary
    });

    return data.scenarioLibrary;
  }

  async function handleSaveAsLibrary() {
    startTransition(async () => {
      try {
        const scenarioLibrary = await mutateScenarioLibrary("create");
        setFeedback(`Saved scenario library ${scenarioLibrary.name}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to save scenario library.");
      }
    });
  }

  async function handleSaveEnvironmentLibrary() {
    startTransition(async () => {
      try {
        const environmentLibrary = await mutateEnvironmentLibrary("create");
        setFeedback(`Saved environment profile ${environmentLibrary.name}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to save environment profile.");
      }
    });
  }

  async function handleUpdateEnvironmentLibrary() {
    startTransition(async () => {
      try {
        if (!selectedEnvironmentLibrary) {
          throw new Error("Select an existing environment profile before updating it.");
        }

        const environmentLibrary = await mutateEnvironmentLibrary("update");
        setFeedback(`Updated environment profile ${environmentLibrary.name}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to update environment profile.");
      }
    });
  }

  async function handleSaveCredentialLibrary() {
    startTransition(async () => {
      try {
        const credentialLibrary = await mutateCredentialLibrary("create");
        setFeedback(`Saved credential profile ${credentialLibrary.label}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to save credential profile.");
      }
    });
  }

  async function handleUpdateCredentialLibrary() {
    startTransition(async () => {
      try {
        if (!selectedCredentialLibrary) {
          throw new Error("Select an existing credential profile before updating it.");
        }

        const credentialLibrary = await mutateCredentialLibrary("update");
        setFeedback(`Updated credential profile ${credentialLibrary.label}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to update credential profile.");
      }
    });
  }

  async function handleUpdateLibrary() {
    startTransition(async () => {
      try {
        if (!selectedScenarioLibrary) {
          throw new Error("Select a saved scenario library before updating it.");
        }

        const scenarioLibrary = await mutateScenarioLibrary("update", { scenarioLibraryId: selectedScenarioLibrary.id });
        setFeedback(`Updated scenario library ${scenarioLibrary.name} to v${scenarioLibrary.version}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to update scenario library.");
      }
    });
  }

  async function handleSaveRunAsLibrary(run: RunRecord) {
    startTransition(async () => {
      try {
        const data = await postJson<{ scenarioLibrary: ScenarioLibrary }>("/api/scenario-libraries", {
          action: "create",
          plan: run.plan,
          generated: {
            scenarios: run.generatedScenarios,
            coverageGaps: run.coverageGaps,
            riskSummary: run.riskSummary
          },
          sourceRunId: run.id,
          name: `${run.plan.featureArea} (${run.plan.environment})`,
          sourceRunInsights: run.analysisInsights.length ? run.analysisInsights : undefined
        });

        await refreshScenarioLibraries();
        setFeedback(`Saved review run as scenario library ${data.scenarioLibrary.name}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to save review run as a scenario library.");
      }
    });
  }

  async function handleUpdateRunLibrary(run: RunRecord) {
    startTransition(async () => {
      try {
        if (!run.plan.scenarioLibraryId) {
          throw new Error("This run is not linked to a saved scenario library.");
        }

        const data = await postJson<{ scenarioLibrary: ScenarioLibrary }>("/api/scenario-libraries", {
          action: "update",
          plan: run.plan,
          generated: {
            scenarios: run.generatedScenarios,
            coverageGaps: run.coverageGaps,
            riskSummary: run.riskSummary
          },
          sourceRunId: run.id,
          scenarioLibraryId: run.plan.scenarioLibraryId,
          name: selectedRunScenarioLibrary?.name ?? `${run.plan.featureArea} (${run.plan.environment})`,
          sourceRunInsights: run.analysisInsights.length ? run.analysisInsights : undefined
        });

        await refreshScenarioLibraries();
        setFeedback(`Updated linked scenario library ${data.scenarioLibrary.name} from review.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to update linked scenario library.");
      }
    });
  }

  async function handleParse() {
    if (parseValidationErrors.length) {
      const firstError = parseValidationErrors[0];
      setFeedback(firstError.details?.length ? `${firstError.message} ${firstError.details.join(" ")}` : firstError.message);
      return;
    }

    startTransition(async () => {
      try {
        const data = await postJson<ParseStepsResponse>("/api/steps/parse", {
          stepsText: plan.stepsText
        });

        setParsePreview(data);
        setFeedback(`Parsed ${data.parsedSteps.length} step(s) with ${data.ambiguities.length} ambiguity warning(s).`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to parse steps.");
      }
    });
  }

  async function handleGenerateScenarios() {
    if (generateScenarioValidationErrors.length) {
      const firstError = generateScenarioValidationErrors[0];
      setFeedback(firstError.details?.length ? `${firstError.message} ${firstError.details.join(" ")}` : firstError.message);
      return;
    }

    startTransition(async () => {
      try {
        const data = await postJson<GenerateScenariosResponse>("/api/scenarios/generate", plan);
        setScenarioPreview(data);
        setFeedback(`Generated ${data.scenarios.length} QA scenarios.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to generate scenarios.");
      }
    });
  }

  async function handleCreateRun() {
    if (createRunValidationErrors.length) {
      const firstError = createRunValidationErrors[0];
      setFeedback(firstError.details?.length ? `${firstError.message} ${firstError.details.join(" ")}` : firstError.message);
      return;
    }

    startTransition(async () => {
      try {
        const data = await postJson<{ run: RunRecord }>("/api/runs", plan);
        setRuns((current) => upsertAndSortRuns(current, summarizeRun(data.run)));
        setSelectedRun(data.run);
        setSelectedRunId(data.run.id);
        setParsePreview({
          parsedSteps: data.run.parsedSteps,
          assumptions: [],
          ambiguities: []
        });
        setScenarioPreview({
          scenarios: data.run.generatedScenarios,
          coverageGaps: data.run.coverageGaps,
          riskSummary: data.run.riskSummary
        });
        navigateToWorkflowView("draft");
        await refreshScenarioLibraries();
        setFeedback(`Created run ${data.run.id}. Review the plan or start execution.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to create run.");
      }
    });
  }

  async function handleStartRun(runId: string) {
    startTransition(async () => {
      try {
        const data = await postJson<{ run: RunRecord }>(`/api/runs/${runId}/start`, {});
        setRuns((current) => upsertAndSortRuns(current, summarizeRun(data.run)));
        setSelectedRun(data.run);
        setSelectedRunId(data.run.id);
        navigateToWorkflowView("monitor");
        setFeedback(`Run ${runId} queued with status ${data.run.status}. Live progress will update automatically.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to start the run.");
      }
    });
  }

  async function handleCancelRun(runId: string) {
    startTransition(async () => {
      try {
        const data = await postJson<{ run: RunRecord }>(`/api/runs/${runId}/cancel`, {});
        if (!data.run) {
          throw new Error("The run could not be cancelled.");
        }

        setRuns((current) => upsertAndSortRuns(current, summarizeRun(data.run)));
        setSelectedRun(data.run);
        setSelectedRunId(data.run.id);
  navigateToWorkflowView("monitor");
        setFeedback(`Cancellation requested for run ${runId}.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to cancel the run.");
      }
    });
  }

  return (
    <AppShell
      navItems={[
        {
          id: "draft",
          label: "Draft",
          eyebrow: hasLoadedInitialData ? `${draftRunCount} draft${draftRunCount === 1 ? "" : "s"}` : "Loading",
          active: workflowView === "draft",
          href: "/draft"
        },
        {
          id: "monitor",
          label: "Monitor",
          eyebrow: hasLoadedInitialData ? `${activeRunCount} active` : "Loading",
          active: workflowView === "monitor",
          href: "/monitor"
        },
        {
          id: "review",
          label: "Review",
          eyebrow: hasLoadedInitialData ? `${completedRunCount} completed` : "Loading",
          active: workflowView === "review",
          href: "/review"
        }
      ]}
      utilityNavItems={[
        { id: "library", label: "Library", eyebrow: "Browse", href: "/library" },
        { id: "settings", label: "Settings", eyebrow: "Config", href: "/settings" },
        { id: "archives", label: "Archives", eyebrow: "Later", disabled: true }
      ]}
      primaryAction={{
        label: "New Mission",
        href: "/draft"
      }}
      profile={
        <>
          <strong>Local Operator</strong>
          <span className="muted">{hasLoadedInitialData ? `${runs.length} recorded run${runs.length === 1 ? "" : "s"}` : "Loading runs"}</span>
        </>
      }
      topBarTitle="Mission Control"
      topBarBadge={
        hasLoadedInitialData
          ? activeRunCount
            ? `${activeRunCount} live run${activeRunCount === 1 ? "" : "s"}`
            : "Local runtime"
          : "Loading runtime"
      }
      searchPlaceholder="Search runs, evidence, or libraries"
      topBarUtilities={
        <>
          <span className="app-utility-chip">Playwright Runtime</span>
          <span className="app-utility-chip">Store: {storeBackendLabel.toUpperCase()}</span>
        </>
      }
    >
      <PageHeader
        eyebrow="Bounded QA Agent MVP"
        title="QA Command Center"
        description="A product-first implementation of the QA agent plan: plain-text step ingestion, scenario generation, risk-aware execution planning, and evidence review in one operator workspace."
        actions={<StatusBadge tone={isPending ? "running" : "default"}>{isPending ? "Working" : "Ready"}</StatusBadge>}
      />

      <section className="metric-grid">
        <MetricCard label="Modes" value={String(Object.keys(modeLabels).length)} detail="Step execution, exploration, generation, regression" />
        <MetricCard label="Run Engine" value="Playwright" detail="Visible and headless browser support" tone="running" />
        <MetricCard label="Safety" value={plan.safeMode ? "Observe Only" : "Interactive"} detail="Current mission posture" tone={plan.safeMode ? "success" : "warning"} />
        <MetricCard
          label="Browser Mode"
          value={plan.headless ? "Headless" : "Visible"}
          detail={hasLoadedInitialData ? `${activeRunCount} active · ${completedRunCount} completed` : "Loading run counts"}
        />
      </section>

      {workflowView === "draft" ? (
        <DraftWorkflowView
          plan={plan}
          parsePreview={parsePreview}
          scenarioPreview={scenarioPreview}
          invalidFields={invalidFields}
          parseDisabledReason={parseDisabledReason}
          parseValidationMessages={parseValidationMessages}
          createRunDisabledReason={createRunDisabledReason}
          createRunValidationMessages={createRunValidationMessages}
          generateScenariosDisabledReason={generateScenariosDisabledReason}
          generateScenarioValidationMessages={generateScenarioValidationMessages}
          environmentLibraries={environmentLibraries}
          credentialLibraries={credentialLibraries}
          scenarioLibraries={scenarioLibraries}
          selectedEnvironmentLibrary={selectedEnvironmentLibrary}
          selectedCredentialLibrary={selectedCredentialLibrary}
          selectedScenarioLibrary={selectedScenarioLibrary}
          environmentLibraryName={environmentLibraryName}
          credentialLibraryName={credentialLibraryName}
          scenarioLibraryName={scenarioLibraryName}
          scenarioLibraryAuthor={scenarioLibraryAuthor}
          planWarnings={planWarnings}
          feedback={feedback}
          isPending={isPending}
          modeLabels={modeLabels}
          riskOptions={riskOptions}
          onPlanChange={updatePlan}
          onEnvironmentLibraryNameChange={setEnvironmentLibraryName}
          onCredentialLibraryNameChange={setCredentialLibraryName}
          onScenarioLibraryNameChange={setScenarioLibraryName}
          onScenarioLibraryAuthorChange={setScenarioLibraryAuthor}
          onSelectEnvironmentLibrary={handleEnvironmentLibrarySelection}
          onSelectCredentialLibrary={handleCredentialLibrarySelection}
          onSelectScenarioLibrary={handleScenarioLibrarySelection}
          onParse={handleParse}
          onGenerateScenarios={handleGenerateScenarios}
          onCreateRun={handleCreateRun}
          onSaveEnvironmentLibrary={handleSaveEnvironmentLibrary}
          onUpdateEnvironmentLibrary={handleUpdateEnvironmentLibrary}
          onSaveCredentialLibrary={handleSaveCredentialLibrary}
          onUpdateCredentialLibrary={handleUpdateCredentialLibrary}
          onSaveAsLibrary={handleSaveAsLibrary}
          onUpdateLibrary={handleUpdateLibrary}
        />
      ) : workflowView === "monitor" ? (
        <MonitorWorkflowView
          isLoading={!hasLoadedInitialData}
          runs={runs}
          selectedRun={activeSelectedRun}
          runEvents={runEvents}
          runWarnings={runWarnings}
          onSelectRun={handleWorkspaceRunSelection}
          onStartRun={handleStartRun}
          onCancelRun={handleCancelRun}
          formatElapsed={formatElapsed}
          statusClassName={statusClassName}
          buildActivityDetail={buildActivityDetail}
          isActiveRun={isActiveRun}
        />
      ) : (
        <ReviewWorkflowView
          isLoading={!hasLoadedInitialData}
          runs={runs}
          selectedRun={activeSelectedRun}
          selectedScenarioLibrary={selectedRunScenarioLibrary}
          feedback={feedback}
          onSelectRun={handleWorkspaceRunSelection}
          onSaveRunAsLibrary={handleSaveRunAsLibrary}
          onUpdateRunLibrary={handleUpdateRunLibrary}
          onReturnToMonitor={() => navigateToWorkflowView("monitor")}
          statusClassName={statusClassName}
          buildActivityDetail={buildActivityDetail}
          isActiveRun={isActiveRun}
          isTerminalRun={isTerminalRun}
        />
      )}
    </AppShell>
  );
}