# AI Agents Copilot Instructions

Use this file for runtime AI agents, agentic workflows, tool-using systems, retrieval-heavy agents, and MCP-based runtime integrations.

This file is the specialized instruction set for product and application agent work. Keep it focused on architecture, tools, safety, runtime controls, evaluation, and observability.

## Terminology Clarification (Mandatory)

- In this repository, "AI agent" means a runtime or product-level AI system by default.
- A runtime or product-level AI system includes application agents, orchestration services, tool-using backends, retrieval pipelines, assistants embedded in the product, and any implementation that runs as part of the shipped software.
- Do not interpret "build an agent" as a request to create or modify Copilot custom agents, VS Code customization agents, `.agent`, `.agents`, `skills`, `workflows`, `AGENTS.md`, or `copilot-instructions.md` files unless the user explicitly asks for editor or Copilot customization.
- If the user asks to build an agent without further qualification, assume they want a runtime or product implementation.
- If the user explicitly mentions Copilot, VS Code customization, prompt files, `.agent`, `.agents`, skills, workflows, or instruction files, then treat the request as agent-customization work instead.

## Default Interpretation Rule (Mandatory)

When the user asks to build, design, plan, review, or improve an AI agent:

- default to runtime or product engineering work
- choose the best-fit stack based on the problem and repository context
- do not assume Python unless it is clearly the best fit
- do not assume LangChain, LangGraph, Google ADK, or any other framework by default
- do not create agent-customization artifacts unless explicitly requested

Valid implementation options may include Python, TypeScript, LangGraph, LangChain, Google ADK, direct model SDKs, workflow engines, managed runtimes, or other suitable technologies.

## Core Philosophy

- Do not default to agents when a simpler solution is sufficient.
- Prefer correctness, observability, and controllability before autonomy.
- Treat tools, retrieval, state, and runtime controls as first-class architecture.
- Treat security, evaluation, and human approval as core product requirements, not later hardening.
- Choose technology based on the product problem, deployment constraints, team fit, and operational requirements, not framework marketing or habit.

## Agent Decision Ladder (Mandatory)

Before implementing an AI agent, explicitly justify why the task is not better solved by:

1. A single model call.
2. Retrieval-augmented generation.
3. A deterministic workflow.
4. A bounded tool-using agent.
5. A multi-agent system.

Use the simplest level that satisfies the task.

- Prefer a single model call for one-shot reasoning or content generation.
- Prefer RAG when the main need is grounded knowledge.
- Prefer deterministic workflows when the path is known.
- Use bounded agents only when the path is open-ended and environmental feedback matters.
- Use multi-agent systems only when specialization has a clear, measurable benefit.

If a simpler approach is viable, do not implement a more autonomous one.

## Planning Requirements For Agent Work (Mandatory)

When the task involves building or changing an AI agent, the implementation plan must define:

1. The user job to be done.
2. Why an agent is needed instead of a simpler architecture.
3. The exact architecture pattern being used.
4. The tool catalog and why each tool exists.
5. The state model and memory model.
6. The stop conditions and runtime budgets.
7. The approval model for risky actions.
8. The evaluation plan.
9. The observability plan.
10. The fallback or degradation path.

If any of these are undefined, do not proceed to implementation until they are addressed.

## Required Architecture Patterns

Prefer these patterns when they fit the task:

- Augmented LLM for low-depth tool or retrieval use.
- Prompt chaining for fixed multi-step work.
- Routing for specialized downstream handling.
- ReAct for dynamic tool use with environmental feedback.
- Planner-executor for long-horizon tasks needing execution controls.
- Evaluator-optimizer only when quality criteria are explicit and measurable.
- Orchestrator-worker only when subtask discovery is dynamic.

Avoid multi-agent collaboration unless the team can explain why a single-agent or workflow design is insufficient.

## Tool Design Rules (Mandatory)

Design tools as if they are APIs for a junior engineer.

Each tool should have:

- one clear purpose
- a narrow scope
- strongly typed inputs
- strongly typed outputs
- explicit failure modes
- a clear description of when to use it
- no hidden side effects

Rules:

- Separate read-only tools from write or destructive tools.
- Avoid overlapping tools without explicit decision rules.
- Validate tool inputs server-side, not only in prompts.
- Treat tool outputs as untrusted until validated.
- Favor structured outputs over loose text whenever possible.

## State, Memory, And Retrieval Rules

### State

- Keep runtime state explicit and structured.
- Do not hide key task facts only inside prompt history.
- Track goals, subgoals, evidence, decisions, tool results, and stop conditions in structured state.

### Memory

- Do not add memory by default.
- Use memory only when persistence across runs has clear value.
- Separate short-term task state from long-term memory.
- Define what is remembered, for how long, who can inspect it, and how it can be removed.

### Retrieval

- Prefer authoritative retrieval over unsupported internal reasoning.
- Keep source provenance visible.
- Use hybrid retrieval and reranking when domain language or internal jargon demands it.
- If evidence is insufficient, the agent must say so or ask for clarification rather than inventing facts.

## Security Rules For AI Agents (Mandatory)

AI agents have a larger blast radius than standard chat features. Treat them accordingly.

Always:

- treat external content as untrusted
- defend against prompt injection
- use least privilege for tools and credentials
- separate read from write capabilities
- redact secrets and sensitive data from prompts, traces, and logs
- validate outputs before execution
- sandbox code execution, browser automation, and shell access when applicable

Never:

- place secrets in prompts or tool definitions
- allow broad write access without explicit review or justification
- assume trusted tool providers eliminate prompt injection risk
- allow generated text to become executable authority without verification

## MCP Rules

When using Model Context Protocol:

- prefer trusted, official, or internally owned MCP servers
- start with read-only MCP tools first
- keep MCP tool boundaries narrow and typed
- minimize the context and parameters passed to MCP tools
- require stronger review for write-capable MCP tools
- explicitly consider prompt injection through MCP-accessible content

If an MCP server can access untrusted content, do not assume it is safe just because the server operator is trusted.

## Runtime Control Rules (Mandatory)

Every agent loop must define:

- maximum iterations
- maximum tool calls
- maximum wall-clock duration
- maximum token or cost budget
- retry policy
- timeout behavior
- escalation or stop conditions

Agents must degrade safely when:

- tools fail
- retrieval is insufficient
- permissions are missing
- confidence is low
- policy blocks an action

## Human Approval Rules

Require approval for:

- money movement
- production infrastructure changes
- destructive data changes
- account or permission changes
- external communication on behalf of a user or organization
- any action affecting regulated or highly sensitive data

If risk is ambiguous, bias toward approval rather than autonomy.

## Evaluation Rules (Mandatory)

Do not ship an AI agent without evaluation.

Every agent change should include:

- offline evaluation on curated tasks
- at least one meaningful failure or edge-case evaluation
- adversarial or prompt-injection-oriented evaluation when tools or retrieval are involved
- regression testing after changes to prompts, tools, models, routing, retrieval, or memory

Evaluate both final outcomes and trajectories.

Required dimensions where applicable:

- task success
- factual grounding
- tool-call correctness
- safety and policy compliance
- latency
- cost
- recovery behavior

Benchmark results are not enough. Domain-specific evaluation is mandatory.

## Observability Rules (Mandatory)

Every production-capable agent must emit enough telemetry to explain its behavior.

Capture at minimum:

- input type or task class
- model and prompt version
- route or plan chosen
- tool sequence
- tool inputs and outputs when safe to log
- intermediate decisions or checkpoints
- latency and cost per run
- error reasons
- approval and override events
- final outcome

If the team cannot reconstruct why an agent behaved the way it did, observability is insufficient.

## Framework Selection Guidance

Choose frameworks based on the problem, not hype.

- Use low-level orchestration frameworks when explicit state and long-running control matter.
- Use higher-level frameworks when prototype speed matters and abstraction cost is acceptable.
- Use managed runtimes when hosting, identity, and enterprise controls outweigh portability concerns.
- Use multi-agent frameworks only if multi-agent coordination is central to the problem.
- Prefer direct SDKs or simple workflows when they satisfy the job with less complexity than an agent framework.
- Consider deployment target, existing codebase language, latency, cost, model-provider fit, observability needs, team familiarity, and operational burden when choosing the stack.

Do not let framework marketing replace architecture reasoning.

## Anti-Patterns To Avoid

Do not:

- build an agent where a deterministic workflow would do
- add multi-agent coordination without proving single-agent insufficiency
- expose too many tools at once
- let the model rely only on self-critique instead of external feedback
- store too much memory without retention and privacy rules
- ship without traces, evals, budgets, and approval gates
- optimize for autonomy while neglecting reliability and governance
- create Copilot customization artifacts when the user asked for runtime or product AI work

## Required Deliverables For Agent Tasks

For AI-agent-related implementation work, responses should include when relevant:

1. Why the chosen architecture level is justified.
2. Files created or modified.
3. Tool contract definitions or summaries.
4. State and memory design notes.
5. Security and approval considerations.
6. Evaluation strategy and tests added or run.
7. Observability or runtime-control notes.
8. Fallback behavior or known limitations.
9. Why the chosen framework or language is the best fit for this specific task.

## Definition Of Done For AI-Agent Work

The work is not done until:

- the architecture choice is justified against simpler alternatives
- tool boundaries are explicit and safe
- runtime limits and stop conditions are defined
- risky actions have approval rules
- evaluation coverage exists
- observability is sufficient for debugging and governance
- failure handling and fallback behavior are explicit
- security risks have been considered for tools, retrieval, memory, and integrations
- the implementation stack is justified against reasonable alternatives when the choice is material

## Practical Instruction To Coding Agents

When asked to build an AI agent, act like a systems engineer rather than a prompt tinkerer.

- Clarify the task boundary.
- Default to runtime or product implementation unless Copilot customization is explicitly requested.
- Minimize complexity.
- Ground behavior in tools and evidence.
- Design for safe failure.
- Measure behavior before claiming success.
- Recommend the best-fit technology instead of defaulting to a single language or framework.
- Do not create `.agent`, `.agents`, skills, workflows, or instruction files unless the user explicitly asks for Copilot or IDE customization work.