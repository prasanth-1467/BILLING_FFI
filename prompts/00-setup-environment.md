Act as a careful AI-environment engineer. Goal: wire this project's AI tools so they cooperate with minimal token use. Tools: Antigravity agent (implements), GSD Core (plans, owns .planning/), Ralph Loop (executes small tasks from PRD.md, logs to progress.txt), CodeRabbit (reviews PRs, .coderabbit.yaml). Claude is used only in a separate chat app and cannot see this repo, so do NOT create CLAUDE.md; use docs/ai/HANDOFF.md instead (prompts/02).

HARD RULES
- Never modify application source code. Don't install extensions or models. Don't change global/user-level Antigravity settings. Don't overwrite existing files without showing me a diff and getting approval. Don't read or print .env contents. Ask before any destructive action.
- Don't invent architecture. Anything unknown is "UNKNOWN - ask owner".
- Work in stages and STOP for my approval after Stage 1 and after Stage 2.

STAGE 1: AUDIT (read-only)
Inspect: project tree; existing docs and AI instruction files (AGENTS.md, GEMINI.md, .agent/, rules); the kit files already present (AGENTS.md, PRD.md, progress.txt, docs/ai/, prompts/, .coderabbit.yaml); GSD configuration and what it creates in .planning/; Ralph's real config (mode, model, max iterations, task file, progress file, git integration, branch naming, and the exact PRD.md format it expects); CodeRabbit integration and any existing config; git config (branches, hooks, remotes).
Report: how Antigravity actually loads project instructions (does it read AGENTS.md, .agent/rules, or both?); conflicts or duplicates between tools; whether the kit's PRD.md template matches Ralph's expected format. STOP.

STAGE 2: DESIGN (no file changes)
Propose the final structure and, per file: owner tool, which tools read it, auto-loaded or manually referenced. Propose a branch-naming scheme that works with Ralph's branch-per-session and GSD phases. List what you'll change in existing files. STOP.

STAGE 3: IMPLEMENT (after approval)
- Fill AGENTS.md (keep it under about 60 lines; reference docs instead of copying them) and the docs/ai/*.md files from the real project. Mark each fact [from code] or [assumption]. Delete optional docs that don't apply and say which.
- Adapt PRD.md to Ralph's real format. Fill tool pages in docs/ai/tools/ with the real configuration values (each under about 20 lines).
- Make Antigravity's rules point to AGENTS.md rather than repeating it.
- Validate .coderabbit.yaml against CodeRabbit's current schema.
- No duplicated information across files.

STAGE 4: VALIDATE (checkable items only)
- AGENTS.md opens and its doc references all exist; no two files state the same instruction.
- .planning/ is untouched and readable by GSD; Ralph can find PRD.md and progress.txt (dry-run if supported, otherwise say so).
- .coderabbit.yaml parses; note that real confirmation needs a first PR.
- Count lines of AGENTS.md and the always-loaded files and report the total.
- Run install/lint/build only if commands exist, and report without fixing.

STAGE 5: REPORT
Final tree, files created, files modified, per-tool responsibilities, token-saving choices, remaining manual steps, anything unverified. Commit on branch docs/ai-environment with message "docs: configure unified AI environment".
