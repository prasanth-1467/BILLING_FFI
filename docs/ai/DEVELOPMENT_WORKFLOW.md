# Development workflow: how the tools cooperate

## Single sources of truth (never duplicate across these)
| Information | File | Owner |
|---|---|---|
| What and why (stable) | docs/ai/PROJECT_CONTEXT.md | Human + Antigravity |
| Requirements, roadmap, phases, plans | .planning/ | GSD |
| Current task queue | PRD.md | Ralph reads; filled from the current GSD phase |
| Execution history | progress.txt | Ralph |
| Architecture / stack / standards | docs/ai/*.md | Antigravity, human-approved |
| Decisions | docs/ai/optional/DECISIONS.md | Human |
| Review findings | the pull request | CodeRabbit |

## Loop
1. GSD: plan the phase. 2. Move small tasks (with acceptance + verify) into PRD.md.
3. Ralph: one task at a time, max iterations as configured, runs the verify step, logs to progress.txt.
4. Antigravity: implements anything Ralph can't, debugs, runs commands.
5. Open a PR; CodeRabbit reviews; fix; merge.
6. Update docs that changed; update the phase status in GSD.

## Boundaries
- Ralph does not redesign architecture or change plans; it stops and reports when blocked.
- GSD does not log execution progress; Ralph does not edit .planning/.
- CodeRabbit comments; it does not rewrite large areas.
- Claude (chat) advises; nothing it says is applied without a human decision and a GSD/Antigravity task.
- Ralph tasks must be small and verifiable. If a task can't be verified by a command or a browser check, split it or do it in Antigravity.
