# AI Agents Engineering Research Plan

## Document Status

- Date: 2026-03-22
- Audience: engineering, platform, product, architecture, and AI implementation teams
- Purpose: provide an extensive research-backed reference on what AI agents are, the main types of agents, the technologies used to build them, and the best practices for building them correctly
- Scope: agent concepts, architecture patterns, implementation approaches, safety, evaluation, observability, deployment, and decision guidance

---

## Goal

Create a practical, engineering-oriented reference that separates durable concepts from ecosystem hype and helps teams answer four questions:

1. What is an AI agent, and when is one justified?
2. What kinds of agents exist, and how do they differ?
3. How should agents be built so they are reliable, secure, observable, and maintainable?
4. Which technologies and frameworks are useful, and where are the tradeoffs?

---

## Executive Summary

AI agents are best understood as software systems that use a model, usually an LLM, plus tools, memory, and runtime logic to pursue a goal across multiple steps. The most important distinction is not between one vendor and another, but between:

- simple model calls
- deterministic workflows
- model-directed agents

The most consistent guidance across Anthropic, Microsoft, OpenAI, LangChain, Google Cloud, and current research is this:

1. Start with the simplest system that can solve the problem.
2. Prefer deterministic workflows when the path is known.
3. Use true agents only when the sequence of steps is open-ended or difficult to hardcode.
4. Ground the system with tools, retrieval, and environmental feedback rather than relying on pure self-reflection.
5. Treat observability, evaluation, permissions, and safety boundaries as first-class architecture, not polish.

Current evidence suggests that strong agent systems are usually not magical. They are composed of a few disciplined ingredients:

- a capable model
- narrow instructions
- well-designed tools
- explicit state and memory
- external grounding via retrieval or execution
- stopping conditions
- human approval where risk is meaningful
- tracing, evals, and production monitoring

The strongest recurring anti-pattern is overbuilding: many teams jump to fully autonomous, multi-agent architectures where a structured workflow, RAG pipeline, or tool-augmented assistant would be more reliable, cheaper, easier to debug, and safer.

---

## Working Definitions

### What is an AI agent?

Across sources, an AI agent is an application that uses a model to reason about a request and then take actions across multiple steps using tools, external data, memory, and feedback from the environment.

Three core components recur across vendor documentation:

1. Model
2. Instructions or policy
3. Tools

Most serious implementations also require:

4. State
5. Memory
6. Retrieval
7. Evaluation
8. Guardrails
9. Observability

### Agentic workflow vs true agent

This is the most important conceptual distinction.

#### Deterministic workflow

A workflow is a system where the developer defines the path in code. The model may perform useful reasoning inside each step, but the orchestration is predefined.

Examples:

- classify request, then route to a known handler
- retrieve documents, then summarize them
- draft output, then run a quality check, then publish if score is above threshold

#### True agent

A true agent is a system where the model dynamically decides which tools to use, in what order, how many times, and when to stop or escalate.

Examples:

- coding agent modifying many files based on tool feedback
- research agent performing iterative search and source refinement
- operations agent diagnosing a failure by selecting from logs, metrics, and incident tools

### Practical interpretation

Use workflows when the path is mostly known. Use agents when the path is not known in advance and must be inferred from the environment.

---

## Why Teams Build Agents

Agents become attractive when work has these properties:

- multi-step tasks
- branching decisions
- dependency on external data or systems
- need for iterative refinement
- clear success criteria or feedback loops
- value from partial autonomy

Common use cases with legitimate agent potential:

- software engineering and code maintenance
- customer support with tool-backed actions
- research and due diligence
- sales research and account preparation
- internal operations and workflow automation
- enterprise knowledge work grounded in private data

Common cases where agents are often unnecessary:

- one-shot Q and A
- single API lookup tasks
- fixed document transformations
- report generation with a stable template
- narrow triage tasks with a known routing table

---

## Taxonomy of AI Agent Types

This taxonomy combines classical AI distinctions with modern LLM-agent practice.

### 1. Reactive or reflex agents

These respond to the current input with minimal planning and little or no long-term state.

Characteristics:

- fast
- cheap
- low memory requirements
- limited adaptation

Good for:

- classification
- simple tool invocation
- small support actions

Weakness:

- poor long-horizon behavior

### 2. Goal-based agents

These optimize toward an explicit user goal and may choose among multiple possible actions.

Characteristics:

- explicit objective
- step selection based on goal progress
- usually needs tool feedback

Good for:

- task completion
- search and synthesis
- stepwise automation

### 3. Utility-based agents

These attempt to optimize a utility function or tradeoff, such as quality versus latency, or cost versus confidence.

Characteristics:

- ranking or scoring over possible plans
- useful in routing, planner selection, and model selection

Good for:

- cost-aware orchestration
- confidence-based escalation
- policy-driven decisions

### 4. Planning agents

These explicitly break a problem into subproblems and track progress across them.

Characteristics:

- plan generation
- step decomposition
- checkpointing
- replanning after failures

Good for:

- coding
- research
- long-form analysis
- multi-system tasks

### 5. Tool-using agents

These derive most of their real power from the ability to call tools or APIs.

Tool categories:

- search
- retrieval
- code execution
- file manipulation
- browser interaction
- databases
- enterprise systems
- external APIs

This is the dominant modern category.

### 6. Retrieval-augmented agents

These rely on authoritative external knowledge to ground reasoning.

Characteristics:

- retrieval is part of the action loop
- may reformulate queries
- may evaluate retrieved evidence before acting

Good for:

- enterprise knowledge assistants
- policy and documentation agents
- support and compliance systems

### 7. Memory-augmented agents

These maintain state across turns or across sessions.

Memory layers usually include:

- working memory for the current task
- episodic memory of prior interactions or events
- semantic memory of durable facts or preferences
- procedural memory such as reusable skills, plans, or code snippets

### 8. Multi-agent systems

These use multiple specialized agents with coordination logic.

Patterns:

- supervisor-worker
- planner-executor
- group chat
- role-based collaboration
- router with specialist agents

Best used when specialization adds measurable value. Not best used by default.

### 9. Human-in-the-loop agents

These operate autonomously within a bounded domain but must pause for approval or review at specific checkpoints.

Good for:

- sensitive actions
- financial operations
- customer-impacting changes
- production engineering changes
- regulated environments

### 10. Autonomous long-running agents

These operate for extended periods, often with durable state and scheduled or event-driven execution.

Requirements:

- reliable persistence
- monitoring
- quotas and budgets
- failure recovery
- strict permissions

These are the highest-risk category and should be adopted cautiously.

---

## Core Building Blocks of an Agent System

### 1. Model

The model performs reasoning, interpretation, tool selection, summarization, and planning. Important considerations:

- tool-calling reliability
- latency
- cost
- context window
- structured output quality
- long-horizon performance

### 2. Instructions and policy

Instructions define:

- objective
- domain boundaries
- tool-use constraints
- escalation rules
- formatting rules
- refusal behavior

Strong agent systems keep instructions narrow and explicit.

### 3. Tools

Tools turn text prediction into real action.

A good tool interface should have:

- clear name
- narrow purpose
- obvious parameters
- strong schema
- examples and edge cases
- explicit failure modes
- minimal ambiguity with neighboring tools

### 4. State

State is the runtime representation of what the agent currently knows about the task.

Typical state fields:

- user goal
- plan
- completed steps
- outstanding questions
- retrieved evidence
- tool results
- confidence or risk markers
- stop conditions

### 5. Memory

Memory should be used sparingly and intentionally.

Practical rule:

- if the information is only needed for the current run, keep it in state
- if it must persist across runs, store it in a reviewable memory layer

### 6. Retrieval

Retrieval is the main grounding mechanism for knowledge-intensive agents.

Useful capabilities:

- semantic search
- keyword search
- hybrid search
- reranking
- metadata filters
- source attribution
- permission-aware retrieval

### 7. Execution runtime

The runtime is responsible for:

- iteration loop
- concurrency
- retries
- persistence
- timeouts
- budgets
- interrupts
- trace collection

### 8. Safety and guardrails

Typical controls include:

- input screening
- output validation
- policy checks
- tool allowlists
- scoped credentials
- confirmation prompts
- sandboxed execution

### 9. Evaluation and observability

An agent without traces and evaluation is effectively opaque and ungovernable in production.

---

## Canonical Architecture Patterns

### 1. Augmented LLM

The base pattern is an LLM with retrieval, tools, and optionally memory. This is often enough.

Use when:

- tasks are mostly one-turn or low-depth
- retrieval plus one or two actions solve the need

### 2. Prompt chaining

One model call feeds another in a fixed sequence.

Use when:

- subtasks are known
- each step benefits from narrowed scope

Strengths:

- predictable
- easy to test
- easy to debug

Weaknesses:

- brittle if the problem varies a lot

### 3. Routing

Classify the request, then send it to a specialized prompt, model, toolset, or downstream workflow.

Use when:

- requests cluster into clear categories
- specialist paths outperform a single general path

### 4. Parallelization

Run independent subtasks or multiple candidate solutions in parallel.

Two variants:

- sectioning: split different facets of work
- voting: run several attempts and aggregate

Use when:

- subtasks are independent
- speed matters
- you want confidence through redundancy

### 5. Orchestrator-worker

A central coordinator decides which workers to invoke and combines their outputs.

Use when:

- the needed subtasks are not known ahead of time
- specialized workers improve performance
- input complexity varies significantly

### 6. Evaluator-optimizer

One component produces output, another critiques it, and the loop repeats until a stop condition is reached.

Use when:

- quality criteria are clear
- iterative improvement is measurable

Important warning:

- self-correction without external feedback is unreliable
- use objective checks, tool feedback, tests, or human review

### 7. ReAct

Reasoning and acting are interleaved: think, act, observe, repeat.

Why it matters:

- grounds reasoning in external feedback
- reduces some hallucination failure modes
- produces interpretable trajectories

### 8. Planner-executor

One component creates a plan; another executes steps against tools and environment.

Use when:

- planning benefits from separation from execution
- execution requires strict controls and checkpoints

### 9. Multi-agent collaboration

Multiple agents communicate or coordinate through messages, tasks, or shared artifacts.

Potential value:

- specialization
- modularity
- parallel work

Potential cost:

- coordination overhead
- more failure modes
- harder trace interpretation
- more prompt and tool surface area

### 10. Event-driven agents

Agents react to triggers from systems, messages, or schedules rather than only direct chat sessions.

Use when:

- operations are asynchronous
- agent actions depend on business events

---

## What Research and Practice Agree On

### Strong points of agreement

1. Simplicity beats unnecessary autonomy.
2. External feedback matters more than pure introspection.
3. Tool quality matters as much as prompt quality.
4. Memory must be disciplined, not unlimited.
5. Evaluation must be task-specific and ongoing.
6. Human oversight is still necessary for meaningful-risk actions.

### Important open questions

1. How often do multi-agent designs outperform good single-agent systems after total system cost is considered?
2. How much planning should be explicit versus latent inside the model?
3. What is the best balance between persistent memory and privacy minimization?
4. Which agent benchmarks best correlate with real production success?

---

## Best Practices for Building AI Agents Correctly

### 1. Start from the job, not from the framework

Define:

- exact task to complete
- success criteria
- failure tolerance
- cost and latency budgets
- required permissions
- required human review points

If the path is known, build a workflow first.

### 2. Minimize the action space

Every extra tool and every extra instruction branch increases confusion and error probability.

Prefer:

- fewer tools
- narrower tools
- explicit tool descriptions
- clear examples

### 3. Design tools as if they were APIs for junior engineers

Good tool design guidance:

- use precise names
- use typed schemas
- keep one responsibility per tool
- document required inputs and edge cases
- return structured outputs with explicit error fields
- avoid overloaded tools that do too many things

### 4. Use grounded execution loops

Avoid loops where the model only talks to itself. Prefer loops where each iteration can observe:

- search results
- database query results
- test output
- compiler errors
- browser state
- user confirmation

### 5. Prefer explicit state over hidden context

Represent key runtime facts in a state object rather than only in long prompts.

Benefits:

- easier debugging
- easier replay
- easier checkpointing
- cleaner human review

### 6. Treat memory as a product decision, not a default feature

Ask:

- what should be remembered?
- for how long?
- who can inspect or delete it?
- can it bias future actions incorrectly?
- does it create privacy or compliance risk?

### 7. Add stopping conditions and budgets

Every agent loop should have limits such as:

- max iterations
- max tool calls
- max wall-clock duration
- max token spend
- max retry count
- escalation thresholds

### 8. Require approvals for sensitive actions

Common approval checkpoints:

- money movement
- production deployments
- customer account changes
- destructive database operations
- external communication on behalf of a user or company

### 9. Keep prompts and tool definitions versioned

You need to know which combination produced a behavior regression. Version:

- system instructions
- tool specs
- model choice
- routing rules
- retrieval config
- evaluation set

### 10. Make the system observable from day one

At minimum capture:

- user input class
- tool sequence
- intermediate decisions
- latency per step
- cost per step
- failure reason
- final outcome
- human override events

### 11. Build evals before broad rollout

Use a representative dataset of real tasks. Include:

- happy paths
- edge cases
- adversarial prompts
- incomplete data
- permission failures
- ambiguous user requests

### 12. Separate authority from generation

Generated text should not become authority by itself. Authority should come from:

- tools
- databases
- verified retrieval sources
- tests
- policies
- human sign-off

---

## Retrieval, Memory, and Grounding

### Why grounding matters

Model-only systems suffer from:

- knowledge cutoffs
- weak domain specificity
- lack of access to proprietary data
- probabilistic hallucination
- weak source attribution

### RAG for agents

RAG is no longer only a one-shot retrieval step. In agent systems, retrieval may be iterative and tool-directed.

Agentic RAG capabilities include:

- query rewriting
- source selection
- hybrid retrieval
- reranking
- evidence validation
- deciding whether the retrieved evidence is sufficient

### Recommended RAG practices

1. Use authoritative sources only.
2. Attach source metadata and permissions.
3. Prefer hybrid retrieval for internal jargon-heavy domains.
4. Use reranking for final context selection.
5. Keep citations and provenance visible to downstream steps.
6. Include an explicit fallback when evidence is insufficient.

### Memory design guidance

Use short-term memory for:

- current task state
- working notes
- open subgoals

Use long-term memory for:

- durable user preferences
- approved workflows
- reusable plans
- repeated domain facts that are safe to persist

Do not store automatically unless the utility is clear and the retention policy is acceptable.

---

## Security, Safety, and Governance

### Threat categories relevant to agents

The OWASP GenAI Security Project is a strong general reference point. For agent systems, several risks become sharper because the model can act, not just answer.

High-priority threat classes:

1. Prompt injection
2. Cross-prompt injection
3. Tool abuse
4. Data exfiltration
5. Excessive permissions
6. Hallucinated actions
7. Unsafe autonomous execution
8. Memory poisoning
9. Retrieval poisoning
10. Multi-step error amplification

### Prompt injection

Prompt injection is especially dangerous when the agent reads web pages, files, emails, tickets, or user content and then uses that content to drive tools.

Mitigations:

- treat external content as untrusted
- isolate instructions from retrieved content
- validate tool intents before execution
- require confirmation for sensitive actions
- use content and policy filters where available
- constrain the toolset by context

### Tool abuse and least privilege

Best practice:

- scope each tool to the minimum permissions required
- prefer short-lived credentials
- separate read and write tools
- separate simulation tools from execution tools
- enforce server-side authorization independent of the model

### Sandboxing

For code execution, browser automation, and computer-use patterns:

- isolate execution environments
- restrict network access where possible
- reset environments between runs
- record artifacts for forensic review

### Human oversight

Human review is not a sign the system is weak. It is a governance control.

Use it for:

- ambiguous intent
- policy-sensitive outputs
- irreversible actions
- low-confidence states

### Risk management frameworks

NIST AI RMF and the Generative AI profile provide a useful governance structure. The practical takeaway is to manage agent systems across the full lifecycle:

- map risks
- measure them
- manage mitigations
- govern ownership and accountability

---

## Evaluation and Benchmarking

### Why agent evaluation is harder than model evaluation

Agent quality depends on more than final answer quality. It also depends on:

- decision quality
- tool use quality
- trajectory efficiency
- stopping behavior
- robustness to bad inputs
- policy compliance

### Important evaluation dimensions

1. Task success rate
2. Tool-call accuracy
3. Hallucinated action rate
4. Latency and step count
5. Cost per successful task
6. Recovery from tool or environment failure
7. Human override rate
8. Policy and safety violation rate

### Benchmark guidance

AgentBench is useful for understanding broad capabilities and common failure modes, especially:

- long-term reasoning failures
- weak instruction following
- flawed decision-making

But benchmark success does not replace domain-specific evals.

### Production eval strategy

Build three layers:

1. Offline evals using curated datasets
2. Pre-release scenario testing including adversarial and failure cases
3. Online monitoring with sampled human review and regression alerts

### A practical eval harness should include

- fixed datasets
- expected outcomes or grading rubrics
- trace capture
- route and tool metrics
- regression thresholds
- version linkage to prompts, tools, and models

---

## Observability and Production Operations

### Minimum observability requirements

You should be able to answer:

- what the agent tried to do
- why it chose that path
- which tools it called
- which tool calls failed
- where time and cost were spent
- whether the result helped or harmed the user outcome

### Operational telemetry to capture

- input classification
- plan or route chosen
- per-step latency
- model and tool call counts
- token and cost metrics
- tool failure reasons
- retry counts
- escalation and approval events
- user feedback and outcome labels

### Recommended runtime controls

- retries with bounded backoff
- idempotency for write actions
- timeouts per tool and per run
- dead-letter or failure queues for async tasks
- resumable state for long-running flows
- dashboards and alerts for latency, error rates, and abnormal trajectories

### Failure handling strategy

Design for:

- partial completion
- safe rollback where possible
- explicit error summaries
- graceful degradation to smaller workflows or human support

---

## Technology Landscape

This section focuses on what each category is for rather than ranking every product.

### Model and platform providers

Representative providers referenced in this research:

- OpenAI
- Anthropic
- Microsoft Foundry
- Google Vertex AI
- AWS Bedrock

Capabilities commonly offered:

- tool calling
- built-in search or retrieval tools
- tracing and evaluation support
- model hosting
- enterprise security controls

### Agent orchestration frameworks

#### LangGraph

Best for:

- low-level orchestration of long-running, stateful agents
- durable execution
- human-in-the-loop interrupts
- explicit graph-based control

Strengths:

- strong state model
- production-oriented runtime concepts
- integrates well with LangSmith for tracing and evals

Tradeoff:

- lower-level than prebuilt agent frameworks

#### AutoGen

Best for:

- conversational single-agent and multi-agent applications
- event-driven multi-agent systems
- research and experimentation with agent communication patterns

Strengths:

- layered architecture
- message-based design
- MCP and execution extensions

Tradeoff:

- multi-agent flexibility can increase complexity quickly

#### CrewAI

Best for:

- role-based, multi-agent workflows
- teams wanting batteries-included memory, guardrails, and observability concepts

Strengths:

- high-level abstractions
- fast startup for role-oriented designs

Tradeoff:

- abstraction convenience can hide operational details

#### OpenAI Agents SDK

Best for:

- single-agent and multi-agent orchestration using OpenAI primitives
- built-in tool integration and tracing

Strengths:

- handoffs
- guardrails
- observability
- good fit when already on the OpenAI platform

#### Managed agent runtimes

Representative platforms:

- Microsoft Foundry Agent Service
- Google Vertex AI Agent Engine
- AWS Bedrock Agents

Best for:

- hosted deployment
- enterprise identity and security
- managed scaling
- built-in observability and governance

Tradeoff:

- platform coupling and varying feature maturity

### Retrieval and vector infrastructure

Capabilities to look for:

- dense and hybrid search
- metadata filtering
- reranking
- source attribution
- tenant isolation
- latency and cost characteristics

### Evaluation and observability tooling

Representative tools:

- LangSmith
- provider-native tracing and eval features
- OpenTelemetry-compatible pipelines
- cloud logging and metrics platforms

### Tool protocols and integration standards

Model Context Protocol is important because it standardizes tool connectivity and makes agent environments more composable across platforms and clients.

---

## Recommended Build Process

### Phase 1: Problem framing

Define:

- user job to be done
- acceptable autonomy level
- risk class
- target metrics
- success and failure definitions

Deliverable:

- one-page task contract

### Phase 2: Baseline without an agent

Attempt the simplest viable system first:

- single prompt
- RAG only
- deterministic workflow

Deliverable:

- baseline metrics for quality, latency, and cost

### Phase 3: Add tool use

Create a minimal toolset with strict schemas and clear outputs.

Deliverable:

- tool contract set and sandbox test cases

### Phase 4: Add stateful orchestration

Introduce planner, loop, or graph-based orchestration only if the baseline is insufficient.

Deliverable:

- state machine or graph definition

### Phase 5: Add retrieval and memory selectively

Add grounding and persistence only where they improve measurable outcomes.

Deliverable:

- retrieval design and memory retention policy

### Phase 6: Add safety controls

Implement:

- permissions
- confirmation prompts
- sandboxing
- content and policy checks
- audit logging

Deliverable:

- safety and threat model

### Phase 7: Build evals and tracing

No production rollout before traces and evaluations are in place.

Deliverable:

- eval dataset, trace dashboards, release criteria

### Phase 8: Productionize

Add:

- rate limits
- budgets
- alerting
- rollback strategy
- incident process

Deliverable:

- runbook and readiness checklist

---

## Production Readiness Checklist

An agent is closer to production-ready when all of the following are true:

- task scope is narrow and measurable
- the toolset is minimal and typed
- data access follows least privilege
- external content is treated as untrusted
- risky actions require approval or policy checks
- traces capture full trajectories
- evals exist for real task distributions
- failures degrade safely
- budgets and stop conditions are enforced
- versioning exists for prompts, tools, retrieval config, and models
- memory policy is explicit and reviewable
- rollback and incident response paths are defined

---

## Common Failure Modes and Anti-Patterns

### 1. Building an agent where a workflow would do

Symptom:

- expensive, inconsistent behavior on tasks with known paths

### 2. Giving the agent too many tools

Symptom:

- wrong tool selection
- redundant calls
- longer trajectories

### 3. Poorly designed tool schemas

Symptom:

- malformed calls
- repeated clarification loops
- action ambiguity

### 4. No environmental grounding

Symptom:

- confident but unverified reasoning
- failure to recover from mistakes

### 5. Unlimited memory accumulation

Symptom:

- privacy risk
- bias from stale facts
- degraded relevance over time

### 6. No explicit stop conditions

Symptom:

- loops
- runaway cost
- poor latency

### 7. Shipping without evals and tracing

Symptom:

- impossible root-cause analysis
- regressions discovered by end users first

### 8. Using multi-agent systems as architecture theater

Symptom:

- more prompts, more state, more cost, little measurable gain

### 9. Trusting self-critique too much

Symptom:

- repeated but unproductive refinement

### 10. Granting broad write permissions early

Symptom:

- higher blast radius than justified

---

## When Not to Use an Agent

Do not default to an agent if:

- the task is deterministic
- you can express it as a small workflow
- correctness matters more than flexibility and the path is known
- the required actions are too risky for the current control plane
- you do not yet have observability and evaluation infrastructure

Often the correct progression is:

1. one-shot model call
2. retrieval-augmented answerer
3. deterministic workflow
4. tool-using workflow with checks
5. bounded agent
6. multi-agent only if evidence justifies it

---

## Recommended Reference Architectures by Use Case

### Research agent

Recommended pattern:

- routing plus search loop plus evaluator

Requirements:

- web search
- source scoring
- citation tracking
- stop conditions
- confidence reporting

### Coding agent

Recommended pattern:

- planner-executor or ReAct with strong environmental feedback

Requirements:

- file tools
- search tools
- test execution
- linting
- patch application
- approval for risky changes

### Support agent

Recommended pattern:

- workflow first, agent second

Requirements:

- retrieval over policy and account data
- strict action permissions
- confirmation before refunds, account changes, or escalations

### Enterprise knowledge agent

Recommended pattern:

- RAG-centric with optional bounded tool use

Requirements:

- permissions-aware retrieval
- source citation
- freshness strategy
- audit trails

### Operations or SRE agent

Recommended pattern:

- event-driven orchestrator with human-in-the-loop

Requirements:

- logs, metrics, traces, runbooks
- simulation or dry-run tools
- strong approval gates for write actions

---

## Recommended Source Map

### Primary vendor and framework references

1. Anthropic, Building effective agents
   - https://www.anthropic.com/engineering/building-effective-agents
   - Strongest practical guidance on workflows versus agents, common patterns, and tool-interface design.

2. Microsoft Foundry Agent Service overview
   - https://learn.microsoft.com/en-us/azure/foundry/agents/overview
   - Useful for agent types, lifecycle, observability, identity, and enterprise controls.

3. OpenAI, New tools for building agents
   - https://openai.com/index/new-tools-for-building-agents/
   - Useful for built-in tools, Responses API direction, agent SDK concepts, and observability emphasis.

4. LangGraph overview
   - https://docs.langchain.com/oss/python/langgraph/overview
   - Strong on stateful orchestration, durable execution, memory, and interrupts.

5. AutoGen documentation
   - https://microsoft.github.io/autogen/stable/
   - Useful for message-based multi-agent architecture and extension patterns.

6. CrewAI documentation
   - https://docs.crewai.com/
   - Useful for role-based crews, flows, guardrails, memory, and production framing.

7. Vertex AI Agent Engine overview
   - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview
   - Useful for managed runtime, sessions, memory bank, evaluation, tracing, and enterprise security.

8. LangSmith observability
   - https://www.langchain.com/langsmith
   - Useful for tracing, monitoring, online evals, and framework-agnostic observability guidance.

### Security and governance references

9. OWASP GenAI Security Project / Top 10 for LLM Applications
   - https://owasp.org/www-project-top-10-for-large-language-model-applications/
   - Useful for security risk framing across prompt injection, data exposure, and agentic attack surface.

10. NIST AI Risk Management Framework
    - https://www.nist.gov/itl/ai-risk-management-framework
    - Useful for lifecycle governance and risk management structure.

### Retrieval and grounding references

11. Pinecone, Retrieval-Augmented Generation
    - https://www.pinecone.io/learn/retrieval-augmented-generation/
    - Useful for practical RAG design, grounding, and agentic retrieval concepts.

### Research references

12. ReAct: Synergizing Reasoning and Acting in Language Models
    - https://arxiv.org/abs/2210.03629
    - Foundational reasoning-plus-action pattern.

13. Generative Agents: Interactive Simulacra of Human Behavior
    - https://arxiv.org/abs/2304.03442
    - Influential memory, planning, and reflection architecture.

14. AgentBench: Evaluating LLMs as Agents
    - https://arxiv.org/abs/2308.03688
    - Important benchmark and failure mode analysis.

15. Large Language Models Cannot Self-Correct Reasoning Yet
    - https://arxiv.org/abs/2310.01798
    - Important caution against relying on self-correction without external feedback.

---

## Synthesis: Durable Conclusions

If this document is reduced to a few engineering rules, the most defensible ones are:

1. Do not start with a fully autonomous agent if a workflow can solve the problem.
2. The real power of agents comes from tools, retrieval, and feedback, not from free-form prompting alone.
3. Good tools, explicit state, and narrow permissions matter more than elaborate prompt theatrics.
4. RAG and source grounding remain essential for trustworthy enterprise agents.
5. Memory is useful only when scoped, reviewable, and aligned with privacy and retention rules.
6. Multi-agent systems are a specialization strategy, not a default architecture.
7. Self-correction is not enough; external verification is required.
8. You cannot responsibly operate agents in production without tracing, evaluation, and governance controls.

---

## Proposed Follow-Up Work

This research plan can be converted into one or more implementation-focused documents:

1. AI Agents Architecture Decision Guide
2. Agent Security and Threat Modeling Checklist
3. Agent Evaluation and Observability Playbook
4. Agent Framework Comparison Guide
5. MCP and Agent Integration Blueprint

---

## Further Reading

For teams turning this research into implementation work, these references are the best next layer:

1. Anthropic, Building effective agents
   - https://www.anthropic.com/engineering/building-effective-agents
2. Model Context Protocol introduction
   - https://modelcontextprotocol.io/introduction
3. LangSmith Evaluation
   - https://docs.langchain.com/langsmith/evaluation
4. OWASP Top 10 for GenAI and LLM Applications
   - https://genai.owasp.org/llm-top-10/
5. OpenAI MCP guide
   - https://developers.openai.com/api/docs/mcp/
6. Vertex AI Agent Engine overview
   - https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview

---

## Done When

- the team can distinguish workflows from agents
- the team can choose an agent type based on task characteristics
- the team has a practical list of best practices and anti-patterns
- the team has a curated source map for deeper implementation work
- the team has a repeatable build sequence for safe agent adoption