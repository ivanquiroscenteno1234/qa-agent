# AI Agents Architecture Decision Guide

## Goal

Help teams decide whether they need an AI agent at all, and if so, which architecture pattern is most appropriate for the problem.

---

## Core Principle

The architecture decision should optimize for correctness, observability, and controllability before flexibility. In practice, that usually means:

1. Start with a single model call.
2. Move to retrieval or a deterministic workflow if needed.
3. Introduce a bounded agent only when the task path is genuinely open-ended.
4. Introduce multi-agent coordination only when specialization produces measurable gains.

---

## Decision Ladder

### Level 0: Single model call

Use when:

- the task is one-shot
- there is no external action required
- the answer can be produced from prompt context alone

Examples:

- summarization
- drafting
- rewriting
- classification with no side effects

Do not escalate if:

- quality is already acceptable
- the task has a known structure

### Level 1: Retrieval-augmented generation

Use when:

- answers must be grounded in documents or proprietary data
- freshness matters
- citation or provenance matters

Examples:

- internal knowledge assistants
- policy assistants
- support information retrieval

Tradeoff:

- more infrastructure than a single call
- still simpler than an agent

### Level 2: Deterministic workflow

Use when:

- the task has multiple steps but the path is known
- you want strong predictability
- you can encode orchestration logic in code

Examples:

- classify then route
- retrieve then summarize then validate
- draft then evaluate then publish

Benefits:

- easier to test
- easier to debug
- lower blast radius

### Level 3: Tool-using bounded agent

Use when:

- the sequence of steps is not known in advance
- the task depends on environmental feedback
- a workflow becomes brittle or too large

Examples:

- research agents
- coding agents
- operations diagnosis agents

Minimum controls required:

- explicit stop conditions
- tool allowlist
- trace capture
- evals
- risk-based approval checkpoints

### Level 4: Multi-agent architecture

Use when:

- specialization adds measurable value
- work can be split into genuinely distinct roles
- coordination overhead is justified by outcome quality or speed

Examples:

- planner plus executor
- supervisor plus specialists
- parallel research plus synthesis

Avoid by default because:

- coordination overhead grows quickly
- observability becomes harder
- testing becomes much more complex

---

## Decision Questions

Answer these before selecting an architecture:

1. Is the task path known or unknown?
2. Does the system need to take actions or only provide answers?
3. Is external grounding required for correctness?
4. What is the acceptable error rate?
5. What is the cost and latency budget?
6. What permissions are required?
7. Which steps are high risk or irreversible?
8. How will the system be evaluated before release?
9. How will failures be observed in production?
10. What is the rollback path if behavior degrades?

---

## Architecture Selection Matrix

| Situation | Recommended Pattern | Why |
| --- | --- | --- |
| One-shot text task | Single model call | Lowest complexity |
| Knowledge-intensive Q and A | RAG | Grounded answers with citations |
| Fixed multi-step flow | Deterministic workflow | Predictable orchestration |
| Open-ended tool use | ReAct or planner-executor | Dynamic adaptation to feedback |
| Complex delegation | Orchestrator-worker | Dynamic task decomposition |
| Quality improves with review loop | Evaluator-optimizer | Explicit refinement path |
| Parallel independent subproblems | Parallelization | Speed and redundancy |
| Distinct specialized roles | Multi-agent | Specialization only when justified |

---

## Canonical Patterns

### Augmented LLM

An LLM with retrieval, tools, and optional memory.

Best for:

- low-depth tasks
- minimal action use

### ReAct

Interleaves reasoning and tool use in a loop.

Best for:

- tool-rich tasks
- dynamic environments
- investigation workflows

Key requirement:

- reliable environmental feedback after each action

### Planner-executor

Separates planning from execution.

Best for:

- long-horizon tasks
- cases where execution needs strong controls

### Orchestrator-worker

One component decomposes work, workers perform specialized subtasks, and results are combined.

Best for:

- variable task decomposition
- mixed expertise workloads

### Evaluator-optimizer

Generate, critique, refine.

Best for:

- writing, search, or synthesis tasks with clear quality criteria

Warning:

- do not rely on self-correction without external checks

### Event-driven agent

Triggered by events, schedules, or system signals.

Best for:

- operations
- notifications
- asynchronous automation

---

## Reference Architecture Components

Every serious agent system should define:

1. Model selection policy
2. Instruction policy
3. Tool catalog and schemas
4. State model
5. Memory policy
6. Retrieval design
7. Safety and approval controls
8. Trace and eval pipeline
9. Runtime budgets and stop conditions

---

## Recommended Design Rules

### Keep the action space small

Each additional tool or branch increases ambiguity. Prefer fewer, narrower tools.

### Make state explicit

Represent goals, subgoals, evidence, and completion status in structured state rather than hiding them only in prompts.

### Separate read from write paths

Read-only tools and destructive tools should not share the same trust assumptions or approval policy.

### Add stop conditions early

Bound:

- iterations
- tool calls
- time
- token spend
- retries

### Design for interruption

Agents should be able to pause for:

- missing data
- low confidence
- high-risk actions
- policy review

---

## Architecture Anti-Patterns

1. Using an agent because it feels modern, not because the task demands it.
2. Building multi-agent systems before proving single-agent insufficiency.
3. Letting the model both decide and execute high-risk write actions with no human gate.
4. Storing large amounts of state implicitly inside prompts.
5. Using retrieval with poor provenance and calling it grounding.
6. Shipping dynamic tool loops without trace visibility.

---

## Decision Template

Use this template before implementation.

### Problem

- What exact task are we solving?

### Success Criteria

- How will we know it works?

### Constraints

- Cost budget
- Latency budget
- Risk level
- Required permissions

### Candidate Architecture

- Single call
- RAG
- Workflow
- Bounded agent
- Multi-agent

### Why this choice

- What made simpler options insufficient?

### Safety Controls

- Approvals
- Tool restrictions
- Runtime budgets

### Evaluation Plan

- Offline datasets
- Adversarial cases
- Production monitoring

---

## Source References

1. Anthropic, Building effective agents
	- https://www.anthropic.com/engineering/building-effective-agents
	- Practical guidance on workflows versus agents and core orchestration patterns.
2. ReAct: Synergizing Reasoning and Acting in Language Models
	- https://arxiv.org/abs/2210.03629
	- Foundational reasoning-plus-action pattern for tool-using agents.
3. LangGraph overview
	- https://docs.langchain.com/oss/python/langgraph/overview
	- Useful for stateful orchestration, durable execution, and interrupts.
4. Microsoft Foundry Agent Service overview
	- https://learn.microsoft.com/en-us/azure/foundry/agents/overview
	- Useful for agent types, lifecycle, tools, and hosted orchestration models.

## Further Reading

- Generative Agents: Interactive Simulacra of Human Behavior
  - https://arxiv.org/abs/2304.03442
- AgentBench: Evaluating LLMs as Agents
  - https://arxiv.org/abs/2308.03688
- LangChain agents overview
  - https://docs.langchain.com/oss/python/langchain/agents

## Done When

- the team can justify why an agent is or is not needed
- the chosen pattern matches task structure and risk level
- controls and evals are part of the architecture decision, not an afterthought