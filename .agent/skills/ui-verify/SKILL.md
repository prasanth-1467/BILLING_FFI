---
name: ui-verify
description: Use after any UI change. Run the app, open it in the browser, inspect the real screen at desktop and mobile widths, iterate.
---
1. Start the dev server (command in AGENTS.md).
2. Open the page, screenshot desktop and mobile widths.
3. Check against docs/ai/optional/DESIGN_SYSTEM.md: layout, spacing, colours, states (loading, empty, error), console errors, and animation behaviour when scrolling up and down and when navigating away and back.
4. Fix and re-check. Report what you SAW, not what the code says.
