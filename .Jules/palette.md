## 2026-04-08 - Added Global Focus Visible Outline
**Learning:** Interactive elements did not have basic focus styling, which makes keyboard navigation inaccessible. Modifying the global variables to include a generic ':focus-visible' is an easy win.
**Action:** Verify there is no conflict with other utilities and confirm it applies to interactive elements.

## 2026-04-10 - Added Context to Disabled Action Buttons
**Learning:** Operators were often confused when primary action buttons (like "Create Run" or "Save Environment") were disabled without explaining what prerequisite was missing. While the `aria-disabled` state was correctly implied by the native `disabled` attribute, the *reason* wasn't surfaced inline efficiently for quick interaction.
**Action:** Adding a contextual `title` attribute to disabled action buttons that outputs the specific validation or missing criteria message provides immediate inline feedback, reducing friction and guesswork in workflow forms.
## 2026-04-08 - Added Global Focus Visible Outline\n**Learning:** Interactive elements did not have basic focus styling, which makes keyboard navigation inaccessible. Modifying the global variables to include a generic ':focus-visible' is an easy win.\n**Action:** Verify there is no conflict with other utilities and confirm it applies to interactive elements.

## 2024-04-15 - Added Tooltips to Disabled Buttons
**Learning:** Adding a `title` attribute to disabled buttons is an easy way to provide contextual inline feedback, explaining the missing criteria or the reason why the button is currently inactive, which significantly improves user experience.
**Action:** Always provide contextual feedback for disabled interactive elements.

## 2024-05-18 - Added ARIA Label and Role to Interactive Lists
**Learning:** List items that function as selectable options (like the list of runs in the workspace) often lack necessary context for screen reader users when built with generic buttons. Screen readers might announce them simply as buttons, leaving the user unaware that they represent items in a selectable list.
**Action:** Always add `role="listbox"`, `role="option"`, `aria-label`, and `aria-selected` to lists of interactive items to ensure users understand the structure and the current state of their selection.
