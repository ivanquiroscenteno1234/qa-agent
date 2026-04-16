"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ScenarioLibraryCard } from "@/components/library/scenario-library-card";
import { ScenarioLibraryFilterBar } from "@/components/library/scenario-library-filter-bar";
import { ActionBar } from "@/components/ui/action-bar";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionFrame } from "@/components/ui/section-frame";
import { buildScenarioLibraryCards, collectScenarioLibraryFeatureAreas, collectScenarioLibraryAuthors } from "@/lib/qa/scenario-library-view-model";
import type { ScenarioLibrary } from "@/lib/types";

interface LibraryManagementScreenProps {
  storeBackendLabel?: string;
}

export function LibraryManagementScreen({ storeBackendLabel = "json" }: LibraryManagementScreenProps) {
  const router = useRouter();
  const [libraries, setLibraries] = useState<ScenarioLibrary[]>([]);
  const [archivedLibraries, setArchivedLibraries] = useState<ScenarioLibrary[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [hasLoadedLibraries, setHasLoadedLibraries] = useState(false);
  const [hasLoadedArchives, setHasLoadedArchives] = useState(false);
  const [featureArea, setFeatureArea] = useState<string>("all");
  const [riskProfile, setRiskProfile] = useState<string>("all");
  const [author, setAuthor] = useState<string>("all");
  const [feedback, setFeedback] = useState<string>("Loading scenario libraries...");

  useEffect(() => {
    let disposed = false;

    async function loadLibraries() {
      try {
        const response = await fetch("/api/scenario-libraries", { cache: "no-store" });

        if (!response.ok) {
          if (!disposed) {
            setFeedback("Unable to load saved scenario libraries.");
          }
          return;
        }

        const data = (await response.json()) as { scenarioLibraries: ScenarioLibrary[] };

        if (!disposed) {
          setLibraries(data.scenarioLibraries);
          setFeedback(data.scenarioLibraries.length ? `Loaded ${data.scenarioLibraries.length} scenario libraries.` : "No saved scenario libraries found yet.");
        }
      } finally {
        if (!disposed) {
          setHasLoadedLibraries(true);
        }
      }
    }

    void loadLibraries();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "archived" || hasLoadedArchives) {
      return;
    }

    let disposed = false;

    async function loadArchives() {
      try {
        const response = await fetch("/api/scenario-libraries?includeArchived=true", { cache: "no-store" });

        if (!response.ok) {
          if (!disposed) {
            setFeedback("Unable to load archived scenario libraries.");
          }
          return;
        }

        const data = (await response.json()) as { scenarioLibraries: ScenarioLibrary[] };

        if (!disposed) {
          setArchivedLibraries(data.scenarioLibraries.filter((l) => l.status === "archived"));
          setFeedback(data.scenarioLibraries.filter((l) => l.status === "archived").length ? "" : "No archived scenario libraries found.");
        }
      } finally {
        if (!disposed) {
          setHasLoadedArchives(true);
        }
      }
    }

    void loadArchives();

    return () => {
      disposed = true;
    };
  }, [activeTab, hasLoadedArchives]);

  const filteredLibraries = useMemo(
    () => buildScenarioLibraryCards(libraries, { featureArea, riskProfile, author }),
    [libraries, featureArea, riskProfile, author]
  );
  const totalScenarioCount = libraries.reduce((count, library) => count + library.scenarios.length, 0);
  const totalVersionCount = libraries.reduce((count, library) => count + Math.max(library.versions.length, 1), 0);
  const featureAreaOptions = useMemo(() => collectScenarioLibraryFeatureAreas(libraries), [libraries]);
  const authorOptions = useMemo(() => collectScenarioLibraryAuthors(libraries), [libraries]);

  function handleRunLibrary(library: ScenarioLibrary) {
    const params = new URLSearchParams({ scenarioLibraryId: library.id, source: "library" });
    router.push((`/draft?${params.toString()}` as Route));
  }

  async function handleRenameLibrary(library: ScenarioLibrary) {
    const newName = window.prompt(`Rename "${library.name}" to:`, library.name);
    if (!newName || newName.trim() === library.name) {
      return;
    }

    try {
      const response = await fetch(`/api/scenario-libraries/${library.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", name: newName.trim() })
      });

      if (response.ok) {
        const body = (await response.json()) as { scenarioLibrary: ScenarioLibrary };
        setLibraries((current) => current.map((item) => item.id === library.id ? body.scenarioLibrary : item));
        setFeedback(`Scenario library renamed to "${body.scenarioLibrary.name}".`);
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setFeedback(body?.error?.message ?? `Rename failed (${response.status})`);
    } catch {
      setFeedback("An unexpected error occurred while renaming the library.");
    }
  }

  async function handleDuplicateLibrary(library: ScenarioLibrary) {
    const newName = window.prompt(`Duplicate "${library.name}" as:`, `${library.name} (copy)`);
    if (!newName || !newName.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/scenario-libraries/${library.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate", name: newName.trim() })
      });

      if (response.ok) {
        const body = (await response.json()) as { scenarioLibrary: ScenarioLibrary };
        setLibraries((current) => [body.scenarioLibrary, ...current]);
        setFeedback(`Scenario library duplicated as "${body.scenarioLibrary.name}".`);
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setFeedback(body?.error?.message ?? `Duplicate failed (${response.status})`);
    } catch {
      setFeedback("An unexpected error occurred while duplicating the library.");
    }
  }

  async function handleArchiveLibrary(library: ScenarioLibrary) {
    if (!window.confirm(`Archive scenario library "${library.name}"? It will no longer appear in the active list.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/scenario-libraries/${library.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" })
      });

      if (response.ok) {
        setLibraries((current) => current.filter((item) => item.id !== library.id));
        setHasLoadedArchives(false);
        setFeedback(`Scenario library "${library.name}" archived.`);
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setFeedback(body?.error?.message ?? `Archive failed (${response.status})`);
    } catch {
      setFeedback("An unexpected error occurred while archiving the library.");
    }
  }

  async function handleDeleteLibrary(library: ScenarioLibrary) {
    if (!window.confirm(`Delete scenario library "${library.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/scenario-libraries/${library.id}`, { method: "DELETE" });

      if (response.status === 204) {
        setLibraries((current) => current.filter((item) => item.id !== library.id));
        setFeedback(`Scenario library "${library.name}" deleted.`);
        return;
      }

      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      setFeedback(body?.error?.message ?? `Delete failed (${response.status})`);
    } catch {
      setFeedback("An unexpected error occurred while deleting the library.");
    }
  }

  return (
    <AppShell
      navItems={[
        { id: "draft", label: "Draft", eyebrow: "Command Center", href: "/draft" },
        { id: "monitor", label: "Monitor", eyebrow: "Command Center", href: "/monitor" },
        { id: "review", label: "Review", eyebrow: "Command Center", href: "/review" }
      ]}
      utilityNavItems={[
        { id: "library", label: "Library", eyebrow: hasLoadedLibraries ? `${libraries.length} saved` : "Loading", active: activeTab === "active", href: "/library", onClick: () => setActiveTab("active") },
        { id: "settings", label: "Settings", eyebrow: "Config", href: "/settings" },
        { id: "archives", label: "Archives", eyebrow: hasLoadedArchives ? `${archivedLibraries.length} archived` : "View archived", active: activeTab === "archived", onClick: () => setActiveTab("archived") }
      ]}
      primaryAction={{
        label: "Create New Scenario",
        onClick: () => setFeedback("Scenario creation UI is planned after the browse-first library workspace.")
      }}
      profile={
        <>
          <strong>Scenario Librarian</strong>
          <span className="muted">Browse-first phase</span>
        </>
      }
      topBarTitle="Scenario Library"
      topBarBadge="Browse First"
      searchPlaceholder="Search libraries, tags, or source runs"
      topBarUtilities={
        <>
          <span className="app-utility-chip">Store: {storeBackendLabel.toUpperCase()}</span>
          <span className="app-utility-chip">{activeTab === "archived" ? "Archived view" : "Active libraries"}</span>
        </>
      }
    >
      <PageHeader
        eyebrow="Scenario Library Management"
        title="Scenario Library"
        description="Curated repository of reusable mission templates and verified execution logic. This first pass focuses on browse, filter, and readiness signals before in-place mutation workflows are added."
        actions={
          <ActionBar>
            <button type="button" disabled title="Importing a scenario library from JSON is not yet implemented.">
              Import JSON
            </button>
            <button type="button" disabled title="Bulk archiving scenario libraries is not yet implemented.">
              Bulk Archive
            </button>
          </ActionBar>
        }
      />

      <section className="metric-grid">
        <MetricCard label="Saved Libraries" value={hasLoadedLibraries ? String(libraries.length) : "..."} detail={hasLoadedLibraries ? "Active reusable scenario sets" : "Loading saved scenario sets"} tone="running" />
        <MetricCard label="Scenarios" value={hasLoadedLibraries ? String(totalScenarioCount) : "..."} detail={hasLoadedLibraries ? "Total saved coverage across libraries" : "Loading saved coverage"} />
        <MetricCard label="Snapshots" value={hasLoadedLibraries ? String(totalVersionCount) : "..."} detail={hasLoadedLibraries ? "Version history entries retained locally" : "Loading version history"} tone="warning" />
        <MetricCard label="Feature Areas" value={hasLoadedLibraries ? String(featureAreaOptions.length) : "..."} detail={hasLoadedLibraries ? "Distinct mapped product surfaces" : "Loading mapped surfaces"} tone="success" />
      </section>

      <ScenarioLibraryFilterBar
        featureArea={featureArea}
        riskProfile={riskProfile}
        author={author}
        featureAreaOptions={featureAreaOptions}
        riskOptions={["high", "medium", "low"]}
        authorOptions={authorOptions}
        onFeatureAreaChange={setFeatureArea}
        onRiskProfileChange={setRiskProfile}
        onAuthorChange={setAuthor}
      />

      <SectionFrame eyebrow="Library Grid" title={activeTab === "archived" ? "Archived Libraries" : "Reusable Mission Templates"} reference={activeTab === "archived" ? (hasLoadedArchives ? `${archivedLibraries.length} archived` : "Loading...") : (hasLoadedLibraries ? `${filteredLibraries.length} visible` : "Loading...")}>
        <div className="scenario-library-grid">
          {activeTab === "archived" ? (
            <>
              {!hasLoadedArchives && <p className="muted">Loading archived scenario libraries...</p>}
              {hasLoadedArchives && !archivedLibraries.length && <p className="muted">No archived scenario libraries found.</p>}
              {archivedLibraries.map((library) => (
                <ScenarioLibraryCard key={library.id} library={library} onDelete={handleDeleteLibrary} />
              ))}
            </>
          ) : (
            <>
              {filteredLibraries.map((library) => (
                <ScenarioLibraryCard key={library.id} library={library} onRun={handleRunLibrary} onRename={handleRenameLibrary} onArchive={handleArchiveLibrary} onDuplicate={handleDuplicateLibrary} onDelete={handleDeleteLibrary} />
              ))}
              {!hasLoadedLibraries && <p className="muted">Loading saved scenario libraries...</p>}
              {hasLoadedLibraries && !filteredLibraries.length && <p className="muted">No libraries match the current filters.</p>}
            </>
          )}
        </div>
      </SectionFrame>

      <SectionFrame eyebrow="Implementation Notes" title="Current Constraints">
        <ul>
          {feedback && <li>{feedback}</li>}
          <li>Run now hands off to Draft with the selected library preloaded so operators can review mission parameters before creating a run.</li>
          <li>Library card actions are wired; remaining work is browser validation and any follow-up UX polish.</li>
          <li>The first pass still keeps rerun flow reviewable in Draft instead of launching execution immediately from Library.</li>
        </ul>
      </SectionFrame>
    </AppShell>
  );
}