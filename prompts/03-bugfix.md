Bug: [describe exactly what you see, when it happens, when it doesn't]. Follow AGENTS.md. Don't change design or unrelated code.
STEP 1 (no code changes): reproduce in the browser/test (dev and production build), record evidence (screenshots, computed styles, console, DOM/state). Read the relevant code and test each plausible cause; report the root cause with file/line evidence, separating proven facts from theory. STOP for approval.
STEP 2: smallest fix of the root cause. No workarounds (forced visibility, delays, reloads, !important).
STEP 3: re-run every reproduction case plus edge cases (rapid repetition, back/forward, refresh, mobile width); lint and build; add a regression item to docs/ai/TESTING_STRATEGY.md; commit on fix/<name>. Report results in a table.
