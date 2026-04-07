# QA Agent Target App Compatibility Matrix

## Purpose

This matrix describes how the current QA Agent MVP maps to common web-application patterns.

It is intentionally conservative. A capability is only marked as supported when the current runtime has an explicit implementation path for it.

## Status Legend

- `Supported`: usable today without special operator workarounds for the normal case
- `Partial`: usable in limited cases, or only when the target app follows a narrow pattern
- `Unsupported`: not implemented as a reliable runtime feature today

## Target Application Patterns

| Target Pattern | Status | Current Fit | Operator Guidance |
| --- | --- | --- | --- |
| Conventional admin dashboard with visible menus and standard forms | Supported | Strongest current fit | Start with exploratory or step execution |
| Back-office CRUD workflow with normal edit screens | Supported | Good fit for visibility and editability checks | Keep Safe Mode on first |
| Settings or configuration workspace with visible section navigation and edit affordances | Supported | Benchmark-backed fit for mixed navigation and editability confirmation | Prefer step execution in Safe Mode first |
| Content or marketing site with basic navigation | Partial | Navigation and visibility checks may work | Use exploratory mode first |
| Enterprise app with dense tables and complex filters | Partial | Some navigation may work, but interaction depth is limited | Expect manual follow-up |
| Consumer app with multi-step checkout or rich interaction flows | Partial | Basic navigation may work, but not full workflow coverage | Do not rely on full end-to-end automation |
| Iframe-heavy application | Unsupported | No explicit iframe targeting strategy exists | Treat as manual or future work |
| Canvas-heavy, WebGL, or highly custom widget UI | Unsupported | Current runtime is locator-oriented, not canvas-oriented | Not a current product fit |
| Mobile-specific responsive workflow | Partial | Browser selection exists, but device field is not true device emulation | Use manual mobile testing separately |

## Authentication And Session Handling

| Capability | Status | Current Behavior | Operator Guidance |
| --- | --- | --- | --- |
| Standard username and password login form | Supported | Runtime can detect a conventional login form and submit credentials | Best current auth path |
| Saved stored-secret credential profile | Supported | Stored credentials can be resolved and used during execution | Preferred operator pattern |
| Inline email and password fields | Supported | Works for quick local checks | Prefer saved profiles for repeat use |
| Reference-only credentials | Partial | Record can exist, but auto-login is not supported from a reference alone | Use for documentation, not automatic login |
| Authenticated state reuse across runs | Unsupported | No storage-state workflow exists today | Expect fresh-login behavior |
| API-based login bootstrap | Unsupported | No API auth helper path exists | Manual or future work |
| SSO or OAuth flows | Unsupported | No dedicated support for SSO providers | Treat as unsupported |
| MFA, CAPTCHA, or device verification | Unsupported | No safe deterministic support exists | Treat as unsupported |
| Multiple roles in one run | Unsupported | No multi-context role orchestration exists | Use separate runs |
| Session-storage-specific auth recovery | Unsupported | No dedicated session-storage strategy exists | Treat as unsupported |

## Interaction Surface

| Capability | Status | Current Behavior | Operator Guidance |
| --- | --- | --- | --- |
| Navigate to URL | Supported | Explicit runtime support exists | Safe starting point |
| Open visible navigation item | Supported | Supported when target is resolvable by visible patterns | Good current fit |
| Open visible section | Supported | Supported for common section labels | Good current fit |
| Assert visible text or section | Supported | Explicit supported action path exists | Good current fit |
| Assert editability | Supported | Runtime can open an edit control and confirm an editable field exists | Best used with Safe Mode on |
| Generic click on arbitrary control | Partial | Some click behavior happens through section and navigation handlers, but not as a first-class operator action | Avoid relying on this broadly |
| Generic text entry into arbitrary fields | Unsupported | No first-class fill action exists today | Manual or future work |
| Select dropdown option | Unsupported | No select-option handler exists | Unsupported |
| Check checkbox or radio | Unsupported | No dedicated handler exists | Unsupported |
| Keyboard shortcuts | Unsupported | Escape is used internally, but no general operator shortcut action exists | Unsupported |
| File upload | Unsupported | No input-file workflow exists today | Unsupported |
| Target-app download verification | Unsupported | Agent artifacts can be downloaded, but target-app downloads are not handled as a testing feature | Unsupported |
| Drag and drop | Unsupported | No runtime drag-and-drop action exists | Unsupported |
| iframe targeting | Unsupported | No frame-selection strategy exists | Unsupported |
| Shadow DOM-heavy interaction | Partial | Underlying Playwright can handle many open shadow roots, but the current runtime has no explicit operator-facing strategy | Use cautiously and validate manually |

## Assertions, Evidence, And Diagnostics

| Capability | Status | Current Behavior | Operator Guidance |
| --- | --- | --- | --- |
| Screenshot evidence | Supported | Captured during execution and available in Review | Strong current capability |
| Playwright trace artifact | Supported | Trace archive is produced and downloadable | Use for offline debugging |
| Page crawl summary | Supported | Crawl artifact includes visible headings, links, buttons, and inputs | Useful for exploratory review |
| Run summary report | Supported | Report artifact is produced | Good for quick review |
| Manual test plan export | Supported | Manual-plan artifact is available | Useful for follow-up manual coverage |
| Generated scenario suggestions | Supported | Scenario generation is available from Draft | Good current capability |
| Browser console logs from target app | Unsupported | "Live Run Console" shows run events, not raw browser console output | Do not assume browser-console capture exists |
| Network request summaries | Unsupported | No request and response inspection layer exists in the operator runtime | Unsupported |
| Download event capture | Unsupported | No download-event handling exists for target applications | Unsupported |
| Failure categorization for operator triage | Partial | Failure categories exist in the data model, but operator guidance is still maturing | Use Review evidence, not status alone |

## Browser And Environment Coverage

| Capability | Status | Current Behavior | Operator Guidance |
| --- | --- | --- | --- |
| Chromium execution | Supported | Explicit browser resolution exists | Good current fit |
| Firefox execution | Supported | Browser selector can resolve to Firefox | Validate target-specific quirks manually |
| WebKit execution | Supported | Browser selector can resolve to WebKit | Validate target-specific quirks manually |
| Headless mode | Supported | First-class runtime option | Good for routine runs |
| Visible mode | Supported | First-class runtime option | Useful for learning new targets |
| Desktop viewport | Supported | Runtime uses a fixed desktop viewport | Good default |
| True device emulation | Unsupported | `device` is currently descriptive metadata, not device emulation | Do not rely on it as mobile coverage |
| Proxy, HTTP auth, or service-worker-specific handling | Unsupported | No explicit operator-facing support exists | Unsupported |

## Scenario Library And Regression Coverage

| Capability | Status | Current Behavior | Operator Guidance |
| --- | --- | --- | --- |
| Save generated scenarios for later use | Supported | Scenario library flow exists | Good current fit |
| Rerun saved scenario libraries | Supported | Regression mode exists | Good for lightweight comparisons |
| Full interaction replay from saved scenarios | Partial | Current regression execution is still mainly navigation, auth-boundary, and state checks | Do not treat as a full test runner yet |
| Baseline comparison | Partial | Useful comparison views exist, but coverage depends on the underlying runtime surface | Review manually |

## Recommendation Summary

Use the current MVP when the target app is:

- a conventional web application
- accessible through a normal login form
- navigable through visible menus and sections
- suitable for common form-driven workflows and settings-style surfaces
- suitable for visibility and editability checks

Do not position the current product as "works on any web application" yet.

Until the roadmap items are complete, describe it more accurately as:

- a local QA-agent MVP useful across most conventional web applications with standard login, visible navigation, and common form-driven workflows
- strongest on discovery, evidence capture, and lightweight deterministic navigation, visibility, and editability checks
- still expanding toward stronger role-boundary, weak-accessibility, and Tier C target-app compatibility

## Related Docs

- [QA_AGENT_OPERATOR_GUIDE.md](QA_AGENT_OPERATOR_GUIDE.md)
- [QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md](plans/QA_AGENT_ARBITRARY_WEB_APP_READINESS_ROADMAP.md)
- [QA_WEB_TESTING_AGENT_IMPLEMENTATION_PLAN.md](plans/QA_WEB_TESTING_AGENT_IMPLEMENTATION_PLAN.md)