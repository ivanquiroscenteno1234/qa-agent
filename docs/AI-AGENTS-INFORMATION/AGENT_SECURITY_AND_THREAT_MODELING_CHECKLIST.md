# Agent Security And Threat Modeling Checklist

## Goal

Provide a practical security checklist and threat-modeling guide for AI agents, especially those using tools, retrieval, external content, memory, or autonomous execution.

---

## Security Principle

AI agents are not just chat systems. They can read, decide, and act. That means the security model must cover:

- inputs
- model behavior
- tool interfaces
- data flow
- runtime permissions
- output handling
- downstream effects

---

## Threat Modeling Scope

Include all of the following when threat-modeling an agent:

1. User prompts
2. Retrieved content
3. Web content
4. Tool definitions and schemas
5. MCP or API integrations
6. Memory stores
7. Model outputs
8. Write actions
9. Logs, traces, and telemetry
10. Human approval interfaces

---

## High-Priority Risk Categories

Aligned with current OWASP GenAI security guidance, the most relevant categories for agents are:

1. Prompt injection
2. Sensitive information disclosure
3. Supply chain risk
4. Data and model poisoning
5. Improper output handling
6. Excessive agency
7. System prompt leakage
8. Vector and embedding weaknesses
9. Misinformation
10. Unbounded consumption

---

## Threat Checklist

### 1. Prompt injection

Questions:

- Can the agent read untrusted web pages, files, emails, tickets, or user-generated content?
- Can that content influence tool use or actions?
- Can content from one tool influence actions in another system?

Controls:

- treat all external content as untrusted
- isolate instructions from retrieved content
- validate action intent before execution
- require confirmation for sensitive actions
- minimize tool access in high-risk contexts

### 2. Sensitive information disclosure

Questions:

- Could prompts, traces, or tool arguments expose secrets or personal data?
- Are secrets ever included in prompts?
- Are tool outputs logged without redaction?

Controls:

- never place secrets in prompts
- redact logs and traces
- minimize data passed to tools
- restrict access to observability systems

### 3. Supply chain risk

Questions:

- Are you relying on third-party tools, MCP servers, plugins, or hosted integrations?
- Are those providers trusted and reviewed?
- Is there a process for version pinning and revocation?

Controls:

- use trusted and official providers where possible
- pin dependencies and tool versions
- review data handling terms
- maintain revocation and incident response procedures

### 4. Data and retrieval poisoning

Questions:

- Can the retrieval corpus be poisoned with malicious or misleading content?
- Are embeddings or indexes updated from untrusted sources?
- Can one tenant contaminate another tenant’s knowledge space?

Controls:

- curate authoritative sources
- isolate tenants
- validate ingestion pipelines
- track document provenance
- support removal and reindexing

### 5. Improper output handling

Questions:

- Is model output treated as executable or authoritative without verification?
- Can downstream systems act on output directly?

Controls:

- validate output before execution
- require structured outputs where possible
- add policy and schema checks
- separate suggestion from execution

### 6. Excessive agency

Questions:

- Does the agent have more permissions than it needs?
- Can it write, transact, or communicate externally without review?

Controls:

- least privilege
- read/write separation
- approval for high-risk actions
- scoped credentials
- environment segmentation

### 7. System prompt leakage

Questions:

- Would leakage of system instructions create business or security harm?
- Are sensitive values or policies stored in prompts?

Controls:

- do not put secrets in prompts
- keep prompts operational, not confidential
- assume prompts may be partially exposed

### 8. Unbounded consumption

Questions:

- Can the agent loop indefinitely?
- Can an attacker trigger expensive tool usage repeatedly?

Controls:

- token budgets
- rate limits
- iteration limits
- timeouts
- tool quotas

---

## Tool Security Checklist

For every tool, verify:

- the purpose is narrow and explicit
- inputs are typed and validated
- outputs are typed and validated
- authentication is server-side, not prompt-side
- there is no credential leakage in tool definitions
- read actions and write actions are clearly distinguished
- the tool returns clear error states
- destructive actions require extra review or approval

---

## MCP Security Checklist

If the agent uses MCP, verify:

- the server is trusted and ideally official
- the tool set is minimal
- requested parameters are proportionate to the task
- authentication is implemented using strong patterns such as OAuth where appropriate
- the server does not over-collect or over-log sensitive data
- read-only and write-capable tools are clearly separated
- untrusted content accessible through the MCP cannot silently drive dangerous actions

Special concern:

- trust in the MCP server developer is not sufficient if the MCP can access untrusted content that might contain prompt injections

---

## Runtime Security Controls

Implement:

- scoped identities
- least privilege credentials
- environment isolation
- sandboxing for code and browser execution
- audit logging
- approval checkpoints
- anomaly detection
- revocation procedures

---

## Human Approval Policy

Require manual approval for:

- monetary transactions
- destructive data changes
- external communication
- account or permission changes
- production infrastructure changes
- actions involving regulated or highly sensitive data

---

## Logging And Trace Safety

Traces are necessary, but they also create a data exposure surface.

Verify:

- secrets are redacted
- PII handling is explicit
- trace retention is defined
- access controls exist for observability platforms
- production traces can be sampled or minimized when necessary

---

## Incident Response Questions

Prepare answers for:

1. How do we disable a compromised tool quickly?
2. How do we revoke agent credentials?
3. How do we stop a runaway agent loop?
4. How do we identify affected runs and users?
5. How do we remove poisoned data from retrieval and memory stores?
6. How do we communicate an agent security incident internally and externally?

---

## Minimum Security Gate Before Release

Do not release an agent until:

- threat modeling is documented
- read and write actions are classified
- secrets never appear in prompts
- untrusted content handling rules are implemented
- approvals exist for high-risk actions
- budgets and rate limits are enforced
- logs and traces are redacted appropriately
- third-party tools and MCP servers are reviewed
- failure and revocation procedures are tested

---

## Source References

1. OWASP Top 10 for GenAI and LLM Applications
	- https://genai.owasp.org/llm-top-10/
	- Current risk categories and mitigations for generative AI systems.
2. NIST AI Risk Management Framework
	- https://www.nist.gov/itl/ai-risk-management-framework
	- Useful for lifecycle governance and risk management structure.
3. Microsoft Foundry tool best practices
	- https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-best-practice
	- Practical guidance for tool reliability, validation, and secure tool usage.
4. OpenAI MCP guide
	- https://developers.openai.com/api/docs/mcp/
	- Useful for MCP-specific risk patterns, especially prompt injection and write-action review.

## Further Reading

- Anthropic, Building effective agents
  - https://www.anthropic.com/engineering/building-effective-agents
- OpenAI production best practices
  - https://developers.openai.com/api/docs/guides/production-best-practices
- Model Context Protocol introduction
  - https://modelcontextprotocol.io/introduction

## Done When

- the team can map agent behavior to concrete threat categories
- the tool and integration surface has explicit trust boundaries
- risky actions are gated and observable
- the system can fail safely and be shut down quickly if needed