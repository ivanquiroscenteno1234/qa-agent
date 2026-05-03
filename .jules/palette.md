## 2024-05-24 - Disabled Buttons Lack Context & Uniformity
**Learning:** Inaccessible disabled buttons cause friction in the workflow builder (e.g. users didn't know why 'Parse Steps' or 'Save Environment' were disabled). Additionally, hardcoded global specific classes vs HTML `button:disabled` pseudo-class led to inconsistent visual states.
**Action:** Relied on a single native `:disabled` pseudo-class across `app/globals.css` with native attributes like `cursor: not-allowed;` and enforced `title` props on explicitly disabled action buttons in Draft workflow, reusing `disabledReason` strings.

## 2024-05-25 - Context Beyond Disabled Action Buttons
**Learning:** Disabled tabs/navigation items (like the "Archives" link) can be just as frustrating as disabled action buttons when users don't understand *why* they can't access a section. Additionally, inline icon-only clear buttons ("✕") in workflows benefit from explicit tooltips even if they have `aria-label`s, to aid sighted users who hover.
**Action:** Extend the `disabledReason` pattern from buttons to structural navigation components (e.g. `SideNavItem`) to ensure uniform context delivery across the application interface.
