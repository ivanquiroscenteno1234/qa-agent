## 2024-03-05 - Initial Observations
## 2026-04-07 - Added missing ARIA attributes for tablist
**Learning:** When using `role="tablist"` on a container, the child elements functioning as tabs need `role="tab"` and `aria-selected` attributes to communicate their state clearly to screen readers, improving keyboard and screen-reader accessibility.
**Action:** Always ensure that structural ARIA roles like tablist have their correct complementary child roles (tab) and state attributes (aria-selected) when building custom tab navigation.
