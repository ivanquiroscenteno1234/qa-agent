# QA Agent Benchmark Wave 001 Baseline Report

## Purpose

Record the first live benchmark wave executed against the current QA Agent product using the ready-now Tier A targets defined in the benchmark target roster.

This report is intentionally conservative. It is a baseline truth-finding wave, not a product-marketing document.

---

## Wave Metadata

| Field | Value |
| --- | --- |
| Benchmark Wave ID | `wave-001-baseline` |
| Date | 2026-03-31 |
| Product Under Test | QA Agent app in this repository |
| Local App URL | `http://127.0.0.1:3022` |
| Store Backend | `SQLITE` |
| Goal | establish a first evidence-backed compatibility baseline across the ready-now Tier A archetypes |

---

## Executed Scope

This wave covers the Tier A archetypes that could be exercised immediately with existing targets:

- A1 Standard admin dashboard
- A2 Conventional CRUD form workflow
- A3 Protected-route application with simple username and password login
- A4 Mixed navigation and editable settings workflow
- A5 Bilingual or mixed-language UI with visible labels

Tier B and Tier C cases were not executed in this wave because the planned local benchmark fixtures do not exist yet.

---

## Case Rollup

| Case ID | Archetype | Target | Evidence Runs | Final Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| A1-001 | Standard admin dashboard | QA Agent App local root | `run_z7074043`, `run_5p8p8bel` | Supported | Two exploratory passes completed without operator rescue. |
| A2-001 | Conventional CRUD form workflow | QA Agent App local root | `run_bqg60ib6` | Supported | Step-based validation confirmed visible and editable form surface. |
| A3-001 | Protected-route login workflow | Restaurant Partner Staging | `run_v78jso5t`, `run_75u7k2er` | Supported | Two authenticated exploratory passes completed successfully against the controlled external target. |
| A4-001 | Mixed navigation and editable settings workflow | QA Agent App settings route | `run_6qvr7hul` | Partial | Navigation and visible-field editability worked, but the current local target is still a weak proxy for a true editable settings domain. |
| A5-001 | Bilingual or mixed-language UI with visible labels | Restaurant Partner Staging | `run_v78jso5t`, `run_75u7k2er` | Supported | Both authenticated exploratory passes surfaced mixed-language labeling evidence while completing successfully. |

---

## Case Details

### A1-001 Standard Admin Dashboard

**Target:** QA Agent App local root at `http://127.0.0.1:3022/`

**Evidence runs:**

- `run_z7074043`
- `run_5p8p8bel`

**Observed outcome:**

- Both runs completed with `pass`
- Each run retained `7` artifacts
- Each run retained `3` defect candidates and `2` heuristic insights

**Why the verdict is Supported:**

- the agent completed the exploratory flow twice without operator rescue
- the target exposed the expected admin-dashboard navigation shell and form surface
- the product produced retained artifacts and meaningful insights instead of a shallow false pass

**Recorded limitations surfaced by the product:**

- placeholder-only input labeling on the global search field
- some navigation targets did not expose clearly distinct content

**Blocker classification:**

- product limitation, not target instability and not operator error

### A2-001 Conventional CRUD Form Workflow

**Target:** QA Agent App local root and draft-form surface

**Evidence run:**

- `run_bqg60ib6`

**Observed outcome:**

- Run completed with `pass`
- Run retained `8` artifacts and `0` defect candidates
- Step results confirmed:
  - navigation to the target
  - visibility of the `Environment` field
  - editability of the `Target URL` field

**Why the verdict is Supported:**

- the product successfully exercised a form-driven flow using first-class supported actions
- the result was explainable from retained artifacts and step results

**Caveat:**

- this case currently has only one fresh benchmark execution in this wave, so it is sufficient for a baseline verdict but not yet strong enough on its own to broaden product claims

**Blocker classification:**

- no blocker observed in this executed case

### A3-001 Protected-Route Login Workflow

**Target:** Restaurant Partner Staging at `https://restaurant-partner-p-dev.onrender.com`

**Evidence runs:**

- `run_v78jso5t`
- `run_75u7k2er`

**Observed outcome:**

- Both runs completed with `pass`
- Each run retained `8` artifacts, `3` defect candidates, and `6` insights
- Both runs authenticated successfully with the controlled benchmark credentials and completed exploratory discovery

**Why the verdict is Supported:**

- the product authenticated to a conventional protected target without operator rescue
- repeated runs completed successfully
- the output included retained evidence and product-meaningful findings rather than a shallow success status only

**Recorded limitations surfaced by the product:**

- heading clarity issues on some views
- placeholder-only input labeling
- some navigation targets were not visually distinct enough after navigation

**Blocker classification:**

- product limitation in the target application surface, not instability of the benchmark harness and not operator error

### A4-001 Mixed Navigation And Editable Settings Workflow

**Target:** QA Agent App settings route via the local app shell

**Evidence run:**

- `run_6qvr7hul`

**Observed outcome:**

- Run completed with `pass`
- Run retained `9` artifacts and `0` defect candidates
- Step results confirmed:
  - navigation to the target shell
  - navigation into `Settings`
  - visibility of the settings workspace
  - discovery of an editable visible field in that workspace

**Why the verdict is Partial:**

- the product handled navigation and editable-field confirmation successfully
- however, the current local benchmark target is still not a strong proxy for a true settings-management workflow with meaningful configuration edits
- marking this Supported would overstate the representativeness of the current target

**Blocker classification:**

- benchmark target limitation, not a demonstrated failure of the QA Agent runtime

### A5-001 Bilingual Or Mixed-Language UI With Visible Labels

**Target:** Restaurant Partner Staging at `https://restaurant-partner-p-dev.onrender.com`

**Evidence runs:**

- `run_v78jso5t`
- `run_75u7k2er`

**Observed outcome:**

- Both runs completed with `pass`
- Both runs produced the heuristic insight `Mixed-language labeling may confuse operators`
- The product remained usable against the mixed-language target and preserved meaningful evidence

**Why the verdict is Supported:**

- the product successfully explored the bilingual target twice
- the product not only completed the run but also surfaced the mixed-language risk explicitly

**Blocker classification:**

- no blocker prevented execution; the mixed-language issue is a target-surface finding, not a harness failure

---

## Artifact And Evidence Notes

For every executed case in this wave:

- the retained run artifacts included screenshot evidence as part of the product-generated artifact set
- the run summaries and retained artifact counts were recorded for the benchmark report
- operator notes and blocker classification were captured in the case-detail sections above

This satisfies the baseline benchmark requirement to retain evidence rather than relying on terminal run status alone.

---

## Compatibility Summary From This Wave

| Verdict | Count |
| --- | --- |
| Supported | 4 |
| Partial | 1 |
| Unsupported | 0 |
| Invalid | 0 |

### Interpretation

- The product performs strongly on the currently ready Tier A targets.
- The one Partial result is driven by benchmark target representativeness, not by an observed runtime failure.
- This wave increases confidence in the current product claim, but it does not yet justify expanding that claim.

---

## Gate Evaluation

### Gate 0

**Result:** satisfied

The current claim remains defensible:

- local QA-agent MVP for conventional web applications

### Gate 1

**Result:** not satisfied yet

Why not:

- Tier A coverage is strong, but one archetype remains only `Partial`
- no Tier B archetypes were executed in this wave
- this wave is not enough to support a broader compatibility claim

### Gate 2

**Result:** not satisfied

Why not:

- Tier B and Tier C benchmark fixtures are not yet implemented
- broader runtime gaps from the readiness roadmap remain unresolved

---

## Priority Gaps Revealed By This Wave

1. Build stronger benchmark fixtures for Tier B and Tier C so the benchmark suite is not overdependent on two existing targets.
2. Add a more representative editable-settings benchmark target before treating A4-like workflows as broadly supported.
3. Continue improving evidence and page-surface clarity because the current successful runs still surfaced placeholder-label and indistinct-navigation issues.

---

## Decision

Keep the current product claim unchanged.

This wave supports the repo's existing positioning but does not justify broadening it beyond the current documentation.