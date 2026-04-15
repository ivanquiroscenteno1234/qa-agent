## 2026-04-08 - Added Global Focus Visible Outline\n**Learning:** Interactive elements did not have basic focus styling, which makes keyboard navigation inaccessible. Modifying the global variables to include a generic ':focus-visible' is an easy win.\n**Action:** Verify there is no conflict with other utilities and confirm it applies to interactive elements.

## 2024-04-15 - Added Tooltips to Disabled Buttons
**Learning:** Adding a `title` attribute to disabled buttons is an easy way to provide contextual inline feedback, explaining the missing criteria or the reason why the button is currently inactive, which significantly improves user experience.
**Action:** Always provide contextual feedback for disabled interactive elements.
