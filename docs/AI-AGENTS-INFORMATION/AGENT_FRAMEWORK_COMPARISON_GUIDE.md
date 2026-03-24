# Agent Framework Comparison Guide

## Goal

Provide a practical comparison of major agent-building approaches and frameworks without assuming a single vendor stack.

---

## How To Use This Guide

Choose frameworks based on:

- architecture control needed
- hosting model
- observability needs
- multi-agent complexity
- language and ecosystem fit
- tolerance for vendor lock-in

Do not choose a framework just because it advertises “agents.” The right question is whether it helps you build the workflow you actually need.

---

## Comparison Dimensions

Use these dimensions for evaluation:

1. Abstraction level
2. State and memory model
3. Tool integration model
4. Multi-agent support
5. Human-in-the-loop support
6. Observability and evaluation support
7. Deployment model
8. Security and governance controls
9. Ecosystem maturity
10. Portability

---

## Major Categories

### 1. Low-level orchestration frameworks

Best when:

- you want explicit control over state and flow
- you need long-running or stateful execution

Representative example:

- LangGraph

Strengths:

- explicit orchestration
- strong support for durable execution and interrupts
- good for serious production systems

Tradeoffs:

- more engineering effort
- fewer shortcuts

### 2. High-level agent frameworks

Best when:

- you want to prototype quickly
- you value batteries-included abstractions

Representative examples:

- CrewAI
- OpenAI Agents SDK style abstractions

Strengths:

- faster setup
- easier first implementation
- guardrails and orchestration concepts are easier to access

Tradeoffs:

- hidden complexity under abstraction
- harder debugging if behavior becomes non-obvious

### 3. Multi-agent research and communication frameworks

Best when:

- agent-to-agent communication is central
- you are testing role-based or event-driven systems

Representative example:

- AutoGen

Strengths:

- message-based architecture
- good support for multi-agent experimentation

Tradeoffs:

- coordination complexity can outpace practical value

### 4. Managed cloud agent runtimes

Best when:

- you need hosted scaling, enterprise identity, and built-in governance

Representative examples:

- Microsoft Foundry Agent Service
- Google Vertex AI Agent Engine
- AWS Bedrock Agents

Strengths:

- managed infrastructure
- enterprise controls
- built-in operational tooling

Tradeoffs:

- vendor coupling
- differing feature maturity

---

## Framework Profiles

### LangGraph

Best for:

- graph-based workflows
- stateful agents
- durable execution
- human-in-the-loop systems

Good fit if:

- you need explicit control and traceability
- your team is comfortable engineering runtime behavior

Poor fit if:

- you only need simple agent loops and want the fastest path to a prototype

### AutoGen

Best for:

- conversational agent systems
- multi-agent collaboration
- event-driven architectures

Good fit if:

- multi-agent interaction is central to your design

Poor fit if:

- your task is straightforward and does not require multiple specialized agents

### CrewAI

Best for:

- role-based agent workflows
- teams wanting higher-level abstractions

Good fit if:

- speed of assembly matters more than low-level runtime control

Poor fit if:

- you need to inspect and control every orchestration detail

### OpenAI agent stack

Best for:

- teams building around OpenAI-hosted tools, evals, and workflow tooling

Good fit if:

- you want integrated tools, eval features, and product embedding patterns

Poor fit if:

- you need maximum provider portability

### Managed cloud runtimes

Best for:

- enterprise teams needing hosted operations and governance

Good fit if:

- identity, RBAC, managed hosting, and compliance controls are first-order concerns

Poor fit if:

- you want minimal coupling to any one cloud provider

---

## Decision Matrix

| Need | Recommended Direction |
| --- | --- |
| Explicit state machine and long-running orchestration | Low-level orchestration |
| Quick prototype with minimal plumbing | High-level framework |
| Rich multi-agent messaging and delegation | Multi-agent framework |
| Managed hosting and enterprise controls | Managed cloud runtime |
| Maximum portability | Lower-level, framework-agnostic architecture |

---

## Selection Questions

Ask these before adoption:

1. Do we need long-running stateful execution?
2. Do we need multi-agent communication or just better workflows?
3. How important is provider portability?
4. Do we already have observability and eval infrastructure?
5. Are we optimizing for prototype speed or production control?
6. Do we need managed identity, networking, and compliance controls?
7. What languages and runtime environments does the team already support?

---

## Anti-Patterns In Framework Selection

1. Selecting the framework with the most features instead of the least necessary complexity.
2. Letting framework marketing replace architecture thinking.
3. Choosing multi-agent tooling before proving a single-agent or workflow baseline.
4. Ignoring observability and evaluation support during selection.
5. Assuming a managed runtime automatically solves safety and governance.

---

## Recommendation Pattern

Use this order unless there is a strong reason not to:

1. Prove the task with the simplest direct implementation.
2. Add a lightweight framework if it meaningfully reduces plumbing.
3. Move to lower-level orchestration if production needs require explicit control.
4. Move to managed runtimes if enterprise operational concerns outweigh portability.

---

## Source References

1. LangGraph overview
	- https://docs.langchain.com/oss/python/langgraph/overview
	- Useful for low-level orchestration and stateful runtime tradeoffs.
2. AutoGen documentation
	- https://microsoft.github.io/autogen/stable/
	- Useful for event-driven and multi-agent communication models.
3. CrewAI documentation
	- https://docs.crewai.com/
	- Useful for higher-level, role-based multi-agent abstractions.
4. Microsoft Foundry Agent Service overview
	- https://learn.microsoft.com/en-us/azure/foundry/agents/overview
	- Useful for managed cloud runtime concepts and hosted agent types.
5. Vertex AI Agent Engine overview
	- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/overview
	- Useful for managed deployment, evaluation, memory, and observability concepts.
6. OpenAI Agents guide
	- https://developers.openai.com/api/docs/guides/agents
	- Useful for integrated workflow building, tools, deployment, and eval support.

## Further Reading

- Anthropic, Building effective agents
  - https://www.anthropic.com/engineering/building-effective-agents
- LangSmith platform overview
  - https://www.langchain.com/langsmith
- Model Context Protocol introduction
  - https://modelcontextprotocol.io/introduction

## Done When

- the team can explain why a chosen framework matches the problem shape
- framework choice is grounded in tradeoffs, not novelty
- portability, observability, and operational needs are part of the decision