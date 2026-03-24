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
import { buildRunPlanWarnings } from "@/lib/qa/plan-validation";

import type {
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
  const response = await fetch(url, {
    method: "POST",
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
  const [scenarioLibraryName, setScenarioLibraryName] = useState<string>(() => buildScenarioLibraryNameFallback(createEmptyPlan()));
  const [parsePreview, setParsePreview] = useState<ParseStepsResponse | null>(null);
  const [scenarioPreview, setScenarioPreview] = useState<GenerateScenariosResponse | null>(null);
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
  const pollInFlightRef = useRef(false);
  const handledDraftHandoffRef = useRef<string | null>(null);
  const selectedRunSummary = selectedRunId ? runs.find((run) => run.id === selectedRunId) ?? null : null;
  const activeSelectedRun = selectedRun?.id === selectedRunId ? selectedRun : null;
  const draftHandoffScenarioLibraryId = searchParams.get("scenarioLibraryId")?.trim() ?? "";

  const activeRunCount = runs.filter((run) => isActiveRun(run.status)).length;
  const completedRunCount = runs.filter((run) => isTerminalRun(run.status)).length;
  const draftRunCount = runs.filter((run) => run.status === "draft").length;
  const planWarnings = buildRunPlanWarnings(plan);
  const selectedScenarioLibrary = scenarioLibraries.find((library) => library.id === (plan.scenarioLibraryId ?? "")) ?? null;
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
        const [runsResponse, scenarioLibrariesResponse] = await Promise.all([
          fetch("/api/runs/summary", { cache: "no-store" }),
          fetch("/api/scenario-libraries", { cache: "no-store" })
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

    let disposed = false;
    let activeController: AbortController | null = null;

    const loadRunState = async () => {
      if (disposed || pollInFlightRef.current) {
        return;
      }

      pollInFlightRef.current = true;
      activeController = new AbortController();

      try {
        const [runResponse, eventsResponse] = await Promise.all([
          fetch(`/api/runs/${selectedRunId}`, { cache: "no-store", signal: activeController.signal }),
          fetch(`/api/runs/${selectedRunId}/events`, { cache: "no-store", signal: activeController.signal })
        ]);

        if (disposed || activeController.signal.aborted) {
          return;
        }

        if (runResponse.ok) {
          const runData = (await runResponse.json()) as { run: RunRecord };
          setSelectedRun(runData.run);
          setRuns((current) => upsertAndSortRuns(current, summarizeRun(runData.run)));
        }

        if (eventsResponse.ok) {
          const eventData = (await eventsResponse.json()) as { events: RunEvent[]; warnings: ExecutionWarning[] };
          setRunEvents(eventData.events);
          setRunWarnings(eventData.warnings);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError") && !disposed) {
          setFeedback((current) => current.startsWith("Unable to refresh") ? current : "Unable to refresh live run status. Retrying automatically.");
        }
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void loadRunState();

    if (!selectedRunSummary || !isActiveRun(selectedRunSummary.status)) {
      return () => {
        disposed = true;
        activeController?.abort();
      };
    }

    const intervalId = window.setInterval(async () => {
      await loadRunState();
    }, 1500);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      activeController?.abort();
      pollInFlightRef.current = false;
    };
  }, [selectedRunId, selectedRunSummary?.status]);

  useEffect(() => {
    if (selectedRunSummary && !isActiveRun(selectedRunSummary.status)) {
      void refreshScenarioLibraries();
    }
  }, [selectedRunId, selectedRunSummary?.status]);

  useEffect(() => {
    if (selectedScenarioLibrary) {
      setScenarioLibraryName(selectedScenarioLibrary.name);
      return;
    }

    setScenarioLibraryName(buildScenarioLibraryNameFallback(plan));
  }, [selectedScenarioLibrary?.id, selectedScenarioLibrary?.name, plan.featureArea, plan.environment]);

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

    applyScenarioLibrarySelection(requestedLibrary, `Loaded saved scenario library ${requestedLibrary.name} from Scenario Library. Review mission parameters and create a run.`);
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
      navigateToWorkflowView("review");
      setFeedback(buildCompletionFeedback(activeSelectedRun));
    }

    previousSelectedRunStatusRef.current = currentStatus;
  }, [activeSelectedRun]);

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
      name: scenarioLibraryName.trim()
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
          name: `${run.plan.featureArea} (${run.plan.environment})`
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
          name: selectedRunScenarioLibrary?.name ?? `${run.plan.featureArea} (${run.plan.environment})`
        });

        await refreshScenarioLibraries();
        setFeedback(`Updated linked scenario library ${data.scenarioLibrary.name} from review.`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Failed to update linked scenario library.");
      }
    });
  }

  async function handleParse() {
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
          scenarioLibraries={scenarioLibraries}
          selectedScenarioLibrary={selectedScenarioLibrary}
          scenarioLibraryName={scenarioLibraryName}
          planWarnings={planWarnings}
          feedback={feedback}
          isPending={isPending}
          modeLabels={modeLabels}
          riskOptions={riskOptions}
          onPlanChange={updatePlan}
          onScenarioLibraryNameChange={setScenarioLibraryName}
          onSelectScenarioLibrary={handleScenarioLibrarySelection}
          onParse={handleParse}
          onGenerateScenarios={handleGenerateScenarios}
          onCreateRun={handleCreateRun}
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