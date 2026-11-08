Context: this project already has code. The kit's docs are empty templates. Learn the codebase by READING it and fill docs/ai/ accurately. Follow AGENTS.md.

RULES: Phase 1 is read-only. Never change application source. Never open or print .env contents (list variable names only). Everything must come from the code; unknown = "UNKNOWN - ask owner". Label statements [from code] or [assumption].

PHASE 1 (report, then STOP for approval): file-structure map; exact stack and versions; real commands from package.json/config; routes/pages, components, state, data sources, backend/API/models/auth, env variable names; design tokens, fonts and animation approach (and which existing features must be preserved); conventions observed; problems noticed (don't fix); which optional docs apply.
PHASE 2 (after approval): fill PROJECT_CONTEXT, ARCHITECTURE, TECH_STACK, CODING_STANDARDS, TESTING_STRATEGY and the relevant optional docs; remove irrelevant optional docs; add open questions to PROJECT_CONTEXT.md; fill AGENTS.md commands and key folders.
PHASE 3: run install/lint/build/dev server, report without fixing; verify every path and command mentioned in the docs exists. Commit on docs/existing-project-context.
Final report: what remains UNKNOWN and the 5 most important issues found.
