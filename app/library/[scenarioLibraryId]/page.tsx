import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getScenarioLibrary } from "@/lib/qa/store";

interface PageProps {
  params: Promise<{ scenarioLibraryId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { scenarioLibraryId } = await params;
  const library = await getScenarioLibrary(scenarioLibraryId);
  return {
    title: library ? `${library.name} History | QA Command Center` : "Library History | QA Command Center",
    description: "Inspect the version history of a saved scenario library."
  };
}

export default async function ScenarioLibraryHistoryPage({ params }: PageProps) {
  const { scenarioLibraryId } = await params;
  const library = await getScenarioLibrary(scenarioLibraryId);

  if (!library) {
    notFound();
  }

  const sortedVersions = [...library.versions].sort((a, b) => b.version - a.version);

  return (
    <main className="library-history-page">
      <div className="library-history-header">
        <Link href="/library" className="library-history-back">
          ← Back to Library
        </Link>
        <h1 className="library-history-title">{library.name}</h1>
        <p className="library-history-meta muted">
          {library.featureArea} · {library.environment} · {library.role} · v{library.version} ·{" "}
          <span className={`scenario-library-risk scenario-library-risk-${library.status === "archived" ? "archived" : "low-risk"}`}>
            {library.status}
          </span>
        </p>
      </div>

      <section className="library-history-versions">
        <h2>Version History</h2>
        {sortedVersions.length === 0 ? (
          <p className="muted">No version history recorded for this library.</p>
        ) : (
          <ol className="library-history-list">
            {sortedVersions.map((v) => (
              <li key={v.version} className="library-history-entry">
                <div className="library-history-entry-header">
                  <strong>v{v.version}</strong>
                  <span className="muted">{new Date(v.createdAt).toLocaleString()}</span>
                  <span className="muted">{v.scenarioCount} scenario{v.scenarioCount === 1 ? "" : "s"}</span>
                  {v.sourceRunId && <span className="muted">from run {v.sourceRunId}</span>}
                </div>
                <p>{v.summary}</p>
                {(v.changeSummary.added > 0 || v.changeSummary.removed > 0 || v.changeSummary.changed > 0) && (
                  <ul className="library-history-change-list">
                    {v.changeSummary.added > 0 && <li>+{v.changeSummary.added} added: {v.changeSummary.addedTitles.join(", ")}</li>}
                    {v.changeSummary.removed > 0 && <li>−{v.changeSummary.removed} removed: {v.changeSummary.removedTitles.join(", ")}</li>}
                    {v.changeSummary.changed > 0 && <li>~{v.changeSummary.changed} changed: {v.changeSummary.changedTitles.join(", ")}</li>}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
