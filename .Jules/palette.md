## 2026-04-08 - Added Global Focus Visible Outline
**Learning:** Interactive elements did not have basic focus styling, which makes keyboard navigation inaccessible. Modifying the global variables to include a generic ':focus-visible' is an easy win.
**Action:** Verify there is no conflict with other utilities and confirm it applies to interactive elements.

## 2026-04-10 - Added Context to Disabled Action Buttons
**Learning:** Operators were often confused when primary action buttons (like "Create Run" or "Save Environment") were disabled without explaining what prerequisite was missing. While the `aria-disabled` state was correctly implied by the native `disabled` attribute, the *reason* wasn't surfaced inline efficiently for quick interaction.
**Action:** Adding a contextual `title` attribute to disabled action buttons that outputs the specific validation or missing criteria message provides immediate inline feedback, reducing friction and guesswork in workflow forms.
