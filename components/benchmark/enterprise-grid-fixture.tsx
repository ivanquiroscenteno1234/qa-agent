"use client";

import { useState } from "react";

type GridStatus = "Open" | "Needs review" | "Escalated" | "Resolved";

type WorkQueueRow = {
  id: string;
  account: string;
  queue: string;
  owner: string;
  region: string;
  monthlySpend: number;
  status: GridStatus;
  slaLabel: string;
  slaBreached: boolean;
  lastUpdated: string;
};

type ActivityEntry = {
  id: string;
  title: string;
  detail: string;
};

const seedRows: WorkQueueRow[] = [
  {
    id: "OPS-1042",
    account: "Northwind Hospitality",
    queue: "Billing review",
    owner: "Maya Chen",
    region: "US East",
    monthlySpend: 18250,
    status: "Open",
    slaLabel: "2h 14m",
    slaBreached: false,
    lastUpdated: "7 minutes ago"
  },
  {
    id: "OPS-1075",
    account: "Cedar Table Group",
    queue: "Contract approvals",
    owner: "Luis Ortega",
    region: "LATAM",
    monthlySpend: 24100,
    status: "Needs review",
    slaLabel: "45m",
    slaBreached: false,
    lastUpdated: "12 minutes ago"
  },
  {
    id: "OPS-1091",
    account: "Aster Retail Labs",
    queue: "Revenue risk",
    owner: "Priya Nair",
    region: "EMEA",
    monthlySpend: 31780,
    status: "Escalated",
    slaLabel: "SLA breached",
    slaBreached: true,
    lastUpdated: "31 minutes ago"
  },
  {
    id: "OPS-1118",
    account: "Bluebird Events",
    queue: "Billing review",
    owner: "Andre Silva",
    region: "US West",
    monthlySpend: 12940,
    status: "Open",
    slaLabel: "1h 02m",
    slaBreached: false,
    lastUpdated: "4 minutes ago"
  },
  {
    id: "OPS-1160",
    account: "Maison Locale",
    queue: "Risk hold",
    owner: "Nina Petrov",
    region: "EMEA",
    monthlySpend: 22610,
    status: "Needs review",
    slaLabel: "18m",
    slaBreached: false,
    lastUpdated: "2 minutes ago"
  },
  {
    id: "OPS-1186",
    account: "Sunset Foods Co.",
    queue: "Expansion desk",
    owner: "Diego Ramos",
    region: "APAC",
    monthlySpend: 28740,
    status: "Resolved",
    slaLabel: "Closed",
    slaBreached: false,
    lastUpdated: "Today, 08:40"
  },
  {
    id: "OPS-1204",
    account: "Harbor Stay Systems",
    queue: "Revenue risk",
    owner: "Morgan Ellis",
    region: "US Central",
    monthlySpend: 19880,
    status: "Open",
    slaLabel: "3h 08m",
    slaBreached: false,
    lastUpdated: "19 minutes ago"
  },
  {
    id: "OPS-1217",
    account: "Verde Market Partners",
    queue: "Contract approvals",
    owner: "Yara Haddad",
    region: "LATAM",
    monthlySpend: 16450,
    status: "Needs review",
    slaLabel: "SLA breached",
    slaBreached: true,
    lastUpdated: "52 minutes ago"
  }
];

const initialActivityFeed: ActivityEntry[] = [
  {
    id: "activity-seeded",
    title: "Seed dataset restored",
    detail: "Eight operational accounts were loaded across five queues for repeatable benchmark runs."
  },
  {
    id: "activity-guidance",
    title: "Row actions enabled",
    detail: "Use Reassign, Escalate, and Resolve to exercise visible state changes without leaving the fixture."
  }
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function getStatusClassName(status: GridStatus) {
  switch (status) {
    case "Escalated":
      return "benchmark-status-pill benchmark-status-escalated";
    case "Resolved":
      return "benchmark-status-pill benchmark-status-resolved";
    case "Needs review":
      return "benchmark-status-pill benchmark-status-review";
    default:
      return "benchmark-status-pill benchmark-status-open";
  }
}

export function EnterpriseGridFixture() {
  const [rows, setRows] = useState(seedRows);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | GridStatus>("all");
  const [queueFilter, setQueueFilter] = useState<string>("all");
  const [activityFeed, setActivityFeed] = useState(initialActivityFeed);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const queueOptions = Array.from(new Set(seedRows.map((row) => row.queue))).sort();

  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      row.account.toLowerCase().includes(normalizedSearch) ||
      row.owner.toLowerCase().includes(normalizedSearch) ||
      row.id.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const matchesQueue = queueFilter === "all" || row.queue === queueFilter;

    return matchesSearch && matchesStatus && matchesQueue;
  });

  const openCount = rows.filter((row) => row.status === "Open").length;
  const escalatedCount = rows.filter((row) => row.status === "Escalated").length;
  const withinSlaCount = rows.filter((row) => !row.slaBreached).length;
  const visibleSpend = filteredRows.reduce((total, row) => total + row.monthlySpend, 0);

  const appendActivity = (title: string, detail: string) => {
    const nextEntry: ActivityEntry = {
      id: typeof crypto !== "undefined" ? crypto.randomUUID() : `${title}-${detail}`,
      title,
      detail
    };

    setActivityFeed((currentEntries) => [nextEntry, ...currentEntries].slice(0, 6));
  };

  const updateRow = (rowId: string, transform: (row: WorkQueueRow) => WorkQueueRow, title: string) => {
    const currentRow = rows.find((row) => row.id === rowId);

    if (!currentRow) {
      return;
    }

    const updatedRow = transform(currentRow);

    setRows(rows.map((row) => (row.id === rowId ? updatedRow : row)));
    appendActivity(title, `${updatedRow.account} is now ${updatedRow.status} in ${updatedRow.queue}.`);
  };

  const handleResetDataset = () => {
    setRows(seedRows);
    setSearchTerm("");
    setStatusFilter("all");
    setQueueFilter("all");
    setActivityFeed(initialActivityFeed);
  };

  return (
    <main className="benchmark-fixture-page">
      <div className="benchmark-fixture-shell">
        <header className="benchmark-fixture-header">
          <div>
            <p className="benchmark-fixture-eyebrow">Tier B benchmark fixture</p>
            <h1>Enterprise grid operations board</h1>
            <p className="benchmark-fixture-copy">
              This local fixture is designed for repeatable QA-agent benchmark runs against a dense business UI with filters,
              row actions, visible state changes, and a deterministic reset path.
            </p>
          </div>

          <div className="benchmark-fixture-actions">
            <span className="benchmark-fixture-chip">Route: /benchmark/enterprise-grid</span>
            <button className="benchmark-fixture-primary" type="button" onClick={handleResetDataset}>
              Reset dataset
            </button>
          </div>
        </header>

        <section className="benchmark-metric-grid" aria-label="Fixture summary metrics">
          <article className="benchmark-metric-card">
            <p>Open cases</p>
            <strong>{openCount}</strong>
            <span>Items still waiting for first-touch action.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Escalated</p>
            <strong>{escalatedCount}</strong>
            <span>Cases routed to leadership review or revenue risk.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Within SLA</p>
            <strong>{withinSlaCount}/8</strong>
            <span>Visible service posture for time-sensitive workloads.</span>
          </article>
          <article className="benchmark-metric-card">
            <p>Visible spend</p>
            <strong>{currencyFormatter.format(visibleSpend)}</strong>
            <span>Total monthly spend for the filtered dataset.</span>
          </article>
        </section>

        <section className="benchmark-filter-bar" aria-label="Grid filters">
          <label className="benchmark-filter-field">
            <span>Search accounts, owners, or IDs</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search the work queue"
            />
          </label>

          <label className="benchmark-filter-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | GridStatus)}>
              <option value="all">All statuses</option>
              <option value="Open">Open</option>
              <option value="Needs review">Needs review</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>

          <label className="benchmark-filter-field">
            <span>Queue</span>
            <select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value)}>
              <option value="all">All queues</option>
              {queueOptions.map((queue) => (
                <option key={queue} value={queue}>
                  {queue}
                </option>
              ))}
            </select>
          </label>
        </section>

        <div className="benchmark-grid-layout">
          <section className="benchmark-table-card" aria-labelledby="benchmark-grid-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">Queue inventory</p>
                <h2 id="benchmark-grid-heading">Operator work queue</h2>
              </div>
              <span className="benchmark-fixture-chip">{filteredRows.length} visible rows</span>
            </div>

            <div className="benchmark-table-wrap">
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Queue</th>
                    <th scope="col">Owner</th>
                    <th scope="col">Region</th>
                    <th scope="col">Spend</th>
                    <th scope="col">SLA</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.account}</strong>
                        <span>{row.id}</span>
                      </td>
                      <td>{row.queue}</td>
                      <td>{row.owner}</td>
                      <td>{row.region}</td>
                      <td>{currencyFormatter.format(row.monthlySpend)}</td>
                      <td>
                        <span className={row.slaBreached ? "benchmark-sla benchmark-sla-breached" : "benchmark-sla"}>{row.slaLabel}</span>
                        <small>{row.lastUpdated}</small>
                      </td>
                      <td>
                        <span className={getStatusClassName(row.status)}>{row.status}</span>
                      </td>
                      <td>
                        <div className="benchmark-row-actions">
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(
                                row.id,
                                (currentRow) => ({
                                  ...currentRow,
                                  owner: "Queue rotation",
                                  queue: "Rapid response",
                                  status: currentRow.status === "Resolved" ? "Needs review" : currentRow.status,
                                  slaLabel: "22m",
                                  slaBreached: false,
                                  lastUpdated: "Reassigned just now"
                                }),
                                "Queue reassignment completed"
                              )
                            }
                          >
                            Reassign
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(
                                row.id,
                                (currentRow) => ({
                                  ...currentRow,
                                  queue: "Leadership review",
                                  status: "Escalated",
                                  slaLabel: "Escalated",
                                  slaBreached: false,
                                  lastUpdated: "Escalated just now"
                                }),
                                "Case escalated"
                              )
                            }
                          >
                            Escalate
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(
                                row.id,
                                (currentRow) => ({
                                  ...currentRow,
                                  status: "Resolved",
                                  slaLabel: "Closed",
                                  slaBreached: false,
                                  lastUpdated: "Resolved just now"
                                }),
                                "Case resolved"
                              )
                            }
                          >
                            Resolve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="benchmark-activity-card" aria-labelledby="benchmark-activity-heading">
            <div className="benchmark-card-header">
              <div>
                <p className="benchmark-card-eyebrow">Visible feedback</p>
                <h2 id="benchmark-activity-heading">Activity stream</h2>
              </div>
              <span className="benchmark-fixture-chip">Reset safe</span>
            </div>

            <div className="benchmark-callout">
              <strong>Benchmark intent</strong>
              <p>
                This fixture stresses list comprehension, filter targeting, row-level actions, and visible confirmation without
                introducing auth or cross-page instability.
              </p>
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