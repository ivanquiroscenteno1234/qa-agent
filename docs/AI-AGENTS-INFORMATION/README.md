# AI Agents Information Index

## Purpose

This folder contains general-purpose documentation about AI agents, their architectures, security concerns, evaluation strategies, framework tradeoffs, and MCP integration patterns.

Use this folder as a reference library rather than a single linear document.

---

## Documents

### 1. Research foundation

- [AI Agents Engineering Research Plan](./AI_AGENTS_ENGINEERING_RESEARCH_PLAN_2026-03-22.md)
  - Broad research-backed overview of AI agents, agent types, architectures, best practices, risks, and technology landscape.

### 2. Architecture and design

- [AI Agents Architecture Decision Guide](./AI_AGENTS_ARCHITECTURE_DECISION_GUIDE.md)
  - Helps decide whether to use a single call, RAG, workflow, bounded agent, or multi-agent design.

### 3. Security and governance

- [Agent Security And Threat Modeling Checklist](./AGENT_SECURITY_AND_THREAT_MODELING_CHECKLIST.md)
  - Covers threat categories, tool and MCP trust boundaries, approvals, logging safety, and release gates.

### 4. Evaluation and observability

- [Agent Evaluation And Observability Playbook](./AGENT_EVALUATION_AND_OBSERVABILITY_PLAYBOOK.md)
  - Covers offline and online evaluation, trace design, metrics, dashboards, alerts, and regression strategy.

### 5. Framework selection

- [Agent Framework Comparison Guide](./AGENT_FRAMEWORK_COMPARISON_GUIDE.md)
  - Compares low-level orchestration, high-level agent frameworks, multi-agent frameworks, and managed runtimes.

### 6. Integration standards

- [MCP And Agent Integration Blueprint](./MCP_AND_AGENT_INTEGRATION_BLUEPRINT.md)
  - Explains how Model Context Protocol fits into agent architectures and how to adopt it safely.

### 7. Applied implementation plans

- [QA Web Testing Agent Implementation Plan](./QA_WEB_TESTING_AGENT_IMPLEMENTATION_PLAN.md)
  - Detailed product and implementation plan for a QA agent that executes plain-text browser steps, generates test scenarios, captures evidence, and supports QA-style exploratory testing.

---

## Suggested Reading Order

If you are new to AI agents:

1. Start with the research plan.
2. Read the architecture decision guide.
3. Read the security checklist.
4. Read the evaluation playbook.
5. Use the framework comparison guide when selecting tooling.
6. Read the MCP blueprint if you need reusable external integrations.
7. Read the QA web testing plan when designing a browser-based QA agent product.

If you already know the basics:

1. Use the architecture decision guide for pattern selection.
2. Use the security checklist before implementation.
3. Use the evaluation playbook before release.
4. Use the framework comparison guide and MCP blueprint during platform design.

---

## Folder Outcome

This folder is complete when it allows a team to:

- decide whether they need an agent at all
- choose a fitting architecture
- understand the major security risks
- evaluate and observe agent behavior properly
- compare frameworks by tradeoff
- integrate tools and data sources through MCP safely
- use a concrete QA agent plan as a reference for browser-driven testing products