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
import { buildScenarioLibraryCards, collectScenarioLibraryFeatureAreas } from "@/lib/qa/scenario-library-view-model";
import type { ScenarioLibrary } from "@/lib/types";

interface LibraryManagementScreenProps {
  storeBackendLabel?: string;
}

export function LibraryManagementScreen({ storeBackendLabel = "json" }: LibraryManagementScreenProps) {
  const router = useRouter();
  const [libraries, setLibraries] = useState<ScenarioLibrary[]>([]);
  const [hasLoadedLibraries, setHasLoadedLibraries] = useState(false);
  const [featureArea, setFeatureArea] = useState<string>("all");
  const [riskProfile, setRiskProfile] = useState<string>("all");
  const [author, setAuthor] = useState<string>("future");
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

  const filteredLibraries = useMemo(
    () => buildScenarioLibraryCards(libraries, { featureArea, riskProfile }),
    [libraries, featureArea, riskProfile]
  );
  const totalScenarioCount = libraries.reduce((count, library) => count + library.scenarios.length, 0);
  const totalVersionCount = libraries.reduce((count, library) => count + Math.max(library.versions.length, 1), 0);
  const featureAreaOptions = useMemo(() => collectScenarioLibraryFeatureAreas(libraries), [libraries]);

  function handleRunLibrary(library: ScenarioLibrary) {
    const params = new URLSearchParams({ scenarioLibraryId: library.id, source: "library" });
    router.push((`/draft?${params.toString()}` as Route));
  }

  return (
    <AppShell
      navItems={[
        { id: "draft", label: "Draft", eyebrow: "Command Center", href: "/draft" },
        { id: "monitor", label: "Monitor", eyebrow: "Command Center", href: "/monitor" },
        { id: "review", label: "Review", eyebrow: "Command Center", href: "/review" }
      ]}
      utilityNavItems={[
        { id: "library", label: "Library", eyebrow: hasLoadedLibraries ? `${libraries.length} saved` : "Loading", active: true, href: "/library" },
        { id: "settings", label: "Settings", eyebrow: "Config", href: "/settings" },
        { id: "archives", label: "Archives", eyebrow: "Later", disabled: true }
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
          <span className="app-utility-chip">Mutation APIs pending</span>
        </>
      }
    >
      <PageHeader
        eyebrow="Scenario Library Management"
        title="Scenario Library"
        description="Curated repository of reusable mission templates and verified execution logic. This first pass focuses on browse, filter, and readiness signals before in-place mutation workflows are added."
        actions={
          <ActionBar>
            <button type="button" disabled>
              Import JSON
            </button>
            <button type="button" disabled>
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
        onFeatureAreaChange={setFeatureArea}
        onRiskProfileChange={setRiskProfile}
        onAuthorChange={setAuthor}
      />

      <SectionFrame eyebrow="Library Grid" title="Reusable Mission Templates" reference={hasLoadedLibraries ? `${filteredLibraries.length} visible` : "Loading..."}>
        <div className="scenario-library-grid">
          {filteredLibraries.map((library) => (
            <ScenarioLibraryCard key={library.id} library={library} onRun={handleRunLibrary} />
          ))}
          {!hasLoadedLibraries && <p className="muted">Loading saved scenario libraries...</p>}
          {hasLoadedLibraries && !filteredLibraries.length && <p className="muted">No libraries match the current filters.</p>}
        </div>
      </SectionFrame>

      <SectionFrame eyebrow="Implementation Notes" title="Current Constraints">
        <ul>
          <li>{feedback}</li>
          <li>Run now hands off to Draft with the selected library preloaded so operators can review mission parameters before creating a run.</li>
          <li>History, rename, archive, and duplicate actions remain disabled until the corresponding route or API work exists.</li>
          <li>Author filtering is intentionally disabled because scenario library metadata does not yet store authors.</li>
          <li>The first pass still keeps rerun flow reviewable in Draft instead of launching execution immediately from Library.</li>
        </ul>
      </SectionFrame>
    </AppShell>
  );
}