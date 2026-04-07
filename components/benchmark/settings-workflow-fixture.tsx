"use client";

import { useState } from "react";

type SettingsSectionId = "evidence" | "notifications" | "access";

type SettingsSection = {
  id: SettingsSectionId;
  navLabel: string;
  eyebrow: string;
  panelTitle: string;
  description: string;
  statusLabel: string;
  fieldLabel: string;
  helperText: string;
  baselineValue: string;
  appliedValue: string;
  visibleLabel: string;
};

type ActivityEntry = {
  id: string;
  title: string;
  detail: string;
};

type StatusBanner = {
  title: string;
  detail: string;
  owner: string;
};

const settingsSections: SettingsSection[] = [
  {
    id: "evidence",
    navLabel: "Evidence retention",
    eyebrow: "Governance",
    panelTitle: "Evidence retention profile",
    description:
      "Review the default evidence window, visible operator guidance, and staged retention policy used by the benchmark workspace.",
    statusLabel: "Retention baseline: 21 days",
    fieldLabel: "Retention window",
    helperText: "Visible text input used to confirm editability for the retention policy.",
    baselineValue: "21 days",
    appliedValue: "30 days",
    visibleLabel: "Evidence retention profile"
  },
  {
    id: "notifications",
    navLabel: "Notification routing",
    eyebrow: "Operations",
    panelTitle: "Notification routing profile",
    description:
      "Review the escalation alias and visible routing notes for the operational settings section.",
    statusLabel: "Escalation alias: qa-triage@example.test",
    fieldLabel: "Escalation alias",
    helperText: "Visible email-style field used to confirm editability for alert routing.",
    baselineValue: "qa-triage@example.test",
    appliedValue: "release-desk@example.test",
    visibleLabel: "Notification routing profile"
  },
  {
    id: "access",
    navLabel: "Environment access",
    eyebrow: "Platform",
    panelTitle: "Environment access profile",
    description:
      "Review the default environment group and visible access note for the execution-access settings section.",
    statusLabel: "Default scope: staging and sandbox",
    fieldLabel: "Default environment group",
    helperText: "Visible text field used to confirm editability for environment-scoping defaults.",
    baselineValue: "Staging and sandbox",
    appliedValue: "Staging, sandbox, and UAT",
    visibleLabel: "Environment access profile"
  }
];

const initialValues = settingsSections.reduce<Record<SettingsSectionId, string>>((accumulator, section) => {
  accumulator[section.id] = section.baselineValue;
  return accumulator;
}, {} as Record<SettingsSectionId, string>);

const initialStatusBanner: StatusBanner = {
  title: "Baseline settings workspace loaded",
  detail: "Use the left-side navigation to move between editable settings sections and confirm visible fields without leaving the workspace.",
  owner: "Benchmark operator"
};

const initialActivityFeed: ActivityEntry[] = [
  {
    id: "settings-seeded",
    title: "Settings workspace seeded",
    detail: "The fixture starts on Evidence retention so the benchmark has a deterministic entry point."
  },
  {
    id: "settings-guidance",
    title: "Navigation rail available",
    detail: "Switch sections from the left rail, use Edit section to expose a visible field, and reset the workspace before reruns."
  }
];

function buildActivityEntry(title: string, detail: string): ActivityEntry {
  return {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : `${title}-${detail}`,
    title,
    detail
  };
}

export function SettingsWorkflowFixture() {
  const [activeSectionId, setActiveSectionId] = useState<SettingsSectionId>("evidence");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftValues, setDraftValues] = useState(initialValues);
  const [appliedValues, setAppliedValues] = useState(initialValues);
  const [statusBanner, setStatusBanner] = useState(initialStatusBanner);
  const [activityFeed, setActivityFeed] = useState(initialActivityFeed);

  const activeSection = settingsSections.find((section) => section.id === activeSectionId) ?? settingsSections[0];

  const appendActivity = (title: string, detail: string) => {
    setActivityFeed((currentEntries) => [buildActivityEntry(title, detail), ...currentEntries].slice(0, 6));
  };

  const focusSection = (sectionId: SettingsSectionId) => {
    const nextSection = settingsSections.find((section) => section.id === sectionId);

    if (!nextSection) {
      return;
    }

    setActiveSectionId(sectionId);
    setEditorOpen(false);
    setStatusBanner({
      title: `${nextSection.navLabel} ready for review`,
      detail: `The ${nextSection.visibleLabel.toLowerCase()} is now active and its settings summary is visible.`,
      owner: "Settings operator"
    });
    appendActivity("Section focused", `${nextSection.navLabel} is active for navigation and editability checks.`);
  };

  const openEditor = () => {
    setEditorOpen(true);
    setStatusBanner({
      title: `${activeSection.navLabel} editor opened`,
      detail: `Visible field controls are open for the ${activeSection.visibleLabel.toLowerCase()}.`,
      owner: "Settings operator"
    });
    appendActivity("Editor opened", `${activeSection.fieldLabel} is now available for editability verification.`);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setStatusBanner({
      title: `${activeSection.navLabel} editor closed`,
      detail: `The ${activeSection.visibleLabel.toLowerCase()} remains active and ready for another editability pass.`,
      owner: "Settings operator"
    });
    appendActivity("Editor closed", `${activeSection.navLabel} returned to summary mode without leaving the workspace.`);
  };

  const applyStagedDefaults = () => {
    setAppliedValues((currentValues) => ({
      ...currentValues,
      [activeSection.id]: activeSection.appliedValue
    }));
    setDraftValues((currentValues) => ({
      ...currentValues,
      [activeSection.id]: activeSection.appliedValue
    }));
    setEditorOpen(false);
    setStatusBanner({
      title: `${activeSection.navLabel} updated`,
      detail: `${activeSection.visibleLabel} now reflects ${activeSection.appliedValue}.`,
      owner: "Applied configuration"
    });
    appendActivity("Settings applied", `${activeSection.navLabel} now shows ${activeSection.appliedValue} as the visible benchmark state.`);
  };

  const resetWorkspace = () => {
    setActiveSectionId("evidence");
    setEditorOpen(false);
    setDraftValues(initialValues);
    setAppliedValues(initialValues);
    setStatusBanner(initialStatusBanner);
    setActivityFeed(initialActivityFeed);
  };

  return (
    <main className="benchmark-fixture-page">
      <div className="benchmark-fixture-shell">
        <header className="benchmark-fixture-header">
          <div>
            <p className="benchmark-fixture-eyebrow">Tier A benchmark fixture</p>
            <h1>Settings workflow control center</h1>
            <p className="benchmark-fixture-copy">
              This local fixture is designed for repeatable mixed-navigation settings benchmarking with a visible section rail,
              section-specific summaries, one active edit surface at a time, and a deterministic reset path.
            </p>
          </div>

          <div className="benchmark-fixture-actions">
            <span className="benchmark-fixture-chip">Route: /benchmark/settings-workflow</span>
            <button className="benchmark-fixture-primary" type="button" onClick={resetWorkspace}>
              Reset settings workspace
            </button>
          </div>
        </header>

        <section className="benchmark-metric-grid" aria-label="Settings workflow summary metrics">
          <article className="benchmark-metric-card">
            <p>Active section</p>
            <strong>{activeSection.navLabel}</strong>
            <span>Visible navigation state for the currently selected settings surface.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Editor state</p>
            <strong>{editorOpen ? "Open" : "Closed"}</strong>
            <span>Only one edit surface is visible at a time to keep the benchmark deterministic.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Visible field</p>
            <strong>{activeSection.fieldLabel}</strong>
            <span>Current field used by editability assertions for the active section.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Reset path</p>
            <strong>Deterministic</strong>
            <span>The Reset settings workspace control restores the baseline view and values.</span>
          </article>
        </section>

        <div className="benchmark-grid-layout">
          <section className="benchmark-table-card" aria-labelledby="benchmark-settings-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">Mixed navigation</p>
                <h2 id="benchmark-settings-heading">Settings navigation rail</h2>
              </div>
              <span className="benchmark-fixture-chip">Three editable sections</span>
            </div>

            <div className="benchmark-callout">
              <strong>Why this fixture exists</strong>
              <p>
                The production Settings route is informative but too shallow to represent a stronger settings-management archetype.
                This fixture keeps the benchmark local while adding section switching, visible configuration summaries, edit controls,
                and a stable reset path.
              </p>
            </div>

            <div className="benchmark-settings-layout">
              <nav aria-label="Settings sections">
                <ul className="benchmark-settings-nav">
                  {settingsSections.map((section) => {
                    const isActive = section.id === activeSectionId;

                    return (
                      <li key={section.id}>
                        <button
                          className={isActive ? "benchmark-settings-nav-button benchmark-settings-nav-active" : "benchmark-settings-nav-button"}
                          type="button"
                          onClick={() => focusSection(section.id)}
                        >
                          <span>{section.eyebrow}</span>
                          <strong>{section.navLabel}</strong>
                          <small>{section.statusLabel}</small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="benchmark-settings-panel">
                <div className="benchmark-status-banner">
                  <strong>{statusBanner.title}</strong>
                  <p>{statusBanner.detail}</p>
                  <span>{statusBanner.owner}</span>
                </div>

                <section className="benchmark-settings-section" aria-labelledby="benchmark-settings-panel-title">
                  <div className="benchmark-card-header">
                    <div>
                      <p className="benchmark-card-eyebrow">{activeSection.eyebrow}</p>
                      <h2 id="benchmark-settings-panel-title">{activeSection.visibleLabel}</h2>
                    </div>
                    <span className="benchmark-fixture-chip">Active section</span>
                  </div>

                  <p className="benchmark-fixture-copy benchmark-settings-copy">{activeSection.description}</p>

                  <div className="benchmark-settings-summary-grid">
                    <article className="benchmark-settings-summary-card">
                      <span>Visible profile label</span>
                      <strong>{activeSection.visibleLabel}</strong>
                      <small>Used by visibility checks after each section switch.</small>
                    </article>
                    <article className="benchmark-settings-summary-card">
                      <span>{activeSection.fieldLabel}</span>
                      <strong>{appliedValues[activeSection.id]}</strong>
                      <small>Current visible value for the active settings section.</small>
                    </article>
                    <article className="benchmark-settings-summary-card">
                      <span>Operator note</span>
                      <strong>{activeSection.statusLabel}</strong>
                      <small>Active summary text retained for independent review evidence.</small>
                    </article>
                  </div>

                  <div className="benchmark-transition-actions">
                    <button type="button" onClick={openEditor}>
                      Edit section
                    </button>
                    <button type="button" onClick={applyStagedDefaults}>
                      Apply staged defaults
                    </button>
                  </div>

                  {editorOpen ? (
                    <section className="benchmark-settings-editor" aria-labelledby="benchmark-settings-editor-title">
                      <div className="benchmark-card-header">
                        <div>
                          <p className="benchmark-card-eyebrow">Editable field surface</p>
                          <h2 id="benchmark-settings-editor-title">Edit {activeSection.navLabel}</h2>
                        </div>
                        <span className="benchmark-fixture-chip">Field visible</span>
                      </div>

                      <label>
                        <span>{activeSection.fieldLabel}</span>
                        <input
                          aria-label={activeSection.fieldLabel}
                          type="text"
                          value={draftValues[activeSection.id]}
                          onChange={(event) =>
                            setDraftValues((currentValues) => ({
                              ...currentValues,
                              [activeSection.id]: event.target.value
                            }))
                          }
                        />
                      </label>
                      <p className="benchmark-settings-helper">{activeSection.helperText}</p>

                      <div className="benchmark-modal-actions benchmark-settings-editor-actions">
                        <button type="button" onClick={closeEditor}>
                          Close editor
                        </button>
                        <button className="benchmark-fixture-primary" type="button" onClick={applyStagedDefaults}>
                          Apply staged defaults
                        </button>
                      </div>
                    </section>
                  ) : null}
                </section>
              </div>
            </div>
          </section>

          <aside className="benchmark-activity-card" aria-labelledby="benchmark-settings-activity-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">Visible feedback</p>
                <h2 id="benchmark-settings-activity-heading">Activity stream</h2>
              </div>
              <span className="benchmark-fixture-chip">Reset safe</span>
            </div>

            <ul className="benchmark-activity-list">
              {activityFeed.map((entry) => (
                <li key={entry.id} className="benchmark-activity-item">
                  <strong>{entry.title}</strong>
                  <p>{entry.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}