# Agent Evaluation And Observability Playbook

## Goal

Provide a practical playbook for evaluating, tracing, monitoring, and improving AI agents before and after deployment.

---

## Core Principle

You cannot operate an agent responsibly if you cannot answer:

- what it tried to do
- why it chose that path
- what tools it used
- where it failed
- whether the outcome was actually good

Evaluation and observability are not separate concerns. Observability tells you what happened. Evaluation tells you whether that behavior was acceptable.

---

## What To Measure

### Outcome metrics

- task success rate
- factual correctness
- policy compliance
- user satisfaction
- human override rate

### Trajectory metrics

- number of tool calls
- number of iterations
- route chosen
- completion vs abandonment
- replan frequency

### Runtime metrics

- latency per step
- total latency
- token usage
- cost per run
- error rates
- timeout rates

### Safety metrics

- policy violation rate
- approval bypass attempts
- hallucinated action rate
- untrusted content interaction rate

---

## Offline Evaluation

Use offline evaluation before shipping.

### Build a dataset from:

- curated representative tasks
- historical issues or support requests
- prior traces
- edge cases
- adversarial prompts
- incomplete or noisy inputs

### Include these case types

1. Happy path
2. Ambiguous request
3. Missing required data
4. Tool failure
5. Permission denial
6. Prompt injection attempt
7. Low-confidence case
8. High-risk action request

### Scoring methods

- human review
- code-based checks
- LLM-as-judge for bounded criteria
- pairwise comparison between versions

### Offline evaluation workflow

1. Define datasets
2. Define evaluators
3. Run experiments against candidate versions
4. Compare results
5. Investigate regressions through traces

---

## Online Evaluation

Use online evaluation after release.

Monitor live interactions for:

- regressions
- drift in task mix
- emerging failure clusters
- cost spikes
- unusual tool trajectories

Recommended methods:

- sampled human review
- automatic grading on safe criteria
- alerting on abnormal patterns
- cohort comparison between versions

---

## Trace Design

Every run should capture enough information to reconstruct what happened.

### Minimum trace fields

- request ID
- model and version
- prompt or instruction version
- tool definitions version
- route or plan chosen
- tool inputs and outputs
- intermediate decisions
- runtime budgets and whether they were hit
- final output
- human approval or override events

### Trace design rules

- keep sensitive data redacted where possible
- preserve enough detail for debugging
- link traces to eval results and release versions
- make tool-call ordering easy to inspect

---

## Production Monitoring

Dashboards should include:

- success rate by task category
- cost by task category
- latency percentiles
- tool failure rates
- approval rate and override rate
- top failure clusters
- most expensive trajectories
- most common degraded or fallback paths

Alerts should exist for:

- sudden cost spikes
- unexpected growth in tool calls per run
- latency regressions
- increased error rates
- increased unsafe or blocked outputs
- degradation in evaluation scores

---

## Evaluation Rubric Template

### Correctness

- Was the answer or action correct?

### Grounding

- Was the result supported by reliable evidence or tool feedback?

### Efficiency

- Did the agent use a reasonable number of steps and tools?

### Safety

- Did it respect permissions, policy, and escalation rules?

### Helpfulness

- Did it actually move the user toward task completion?

### Recoverability

- When something failed, did it degrade gracefully?

---

## Regression Strategy

Every change to the following should trigger evaluation:

- model selection
- system instructions
- tool definitions
- routing logic
- retrieval settings
- memory policy
- approval rules

Before rollout, compare:

- previous stable version
- current candidate version
- candidate plus fallback behavior

---

## Common Evaluation Mistakes

1. Measuring only final answer quality while ignoring trajectory quality.
2. Ignoring cost and latency.
3. Testing only happy paths.
4. Not linking evals to exact prompt and tool versions.
5. Treating benchmarks as a substitute for domain-specific evaluation.
6. Lacking a human review loop for ambiguous or high-risk cases.

---

## Observability Maturity Model

### Level 1: Basic logging

- final outputs and errors only

### Level 2: Trace capture

- tool calls and intermediate steps visible

### Level 3: Structured monitoring

- dashboards and alerts on quality, latency, and cost

### Level 4: Linked evaluation system

- offline and online evals connected to traces and versions

### Level 5: Continuous optimization

- regression gates, automated analysis, and prioritized failure triage

---

## Release Checklist

Before release, confirm:

- representative offline datasets exist
- adversarial and failure cases are covered
- traces capture the full trajectory
- dashboards are live
- alerts are configured
- release criteria are documented
- rollback criteria are documented

---

## Source References

1. LangSmith Evaluation
	- https://docs.langchain.com/langsmith/evaluation
	- Strong reference for offline and online evaluation workflow design.
2. LangSmith Observability
	- https://docs.langchain.com/langsmith/observability
	- Useful for tracing, monitoring, and framework-agnostic observability patterns.
3. AgentBench: Evaluating LLMs as Agents
	- https://arxiv.org/abs/2308.03688
	- Important benchmark framing and common agent failure modes.
4. OpenAI Agents guide
	- https://developers.openai.com/api/docs/guides/agents
	- Useful for agent optimization, eval workflows, and deployment thinking.

## Further Reading

- Anthropic, Building effective agents
  - https://www.anthropic.com/engineering/building-effective-agents
- Microsoft Foundry Agent Service overview
  - https://learn.microsoft.com/en-us/azure/foundry/agents/overview
- OpenTelemetry
  - https://opentelemetry.io/

## Done When

- the team can measure agent quality beyond final text output
- production traces are sufficient to debug failures
- regressions are detected before or quickly after release
- cost, latency, and safety are monitored alongside correctness