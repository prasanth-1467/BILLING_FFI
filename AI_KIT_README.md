# AI Project Kit v2 (reusable)

Unzip into the ROOT of any project (new or existing). Then, in Antigravity, run the prompts in order.

## First-time setup
1. `prompts/00-setup-environment.md`: audits your tools, proposes the wiring, WAITS for approval, then configures. No app source code is touched.
2. Existing project? Also run `prompts/01-document-existing-project.md` (reverse-engineers the docs from the code).
3. New project? Fill `docs/ai/PROJECT_CONTEXT.md` first (what and why), then let GSD plan.

## Daily loop
| Step | Who | Where |
|---|---|---|
| Decide what to build, plan phases | GSD | `.planning/` |
| Copy the current phase's small tasks into the queue | You / Antigravity | `PRD.md` |
| Execute one task at a time, test, log | Ralph | `PRD.md`, `progress.txt` |
| Implement / debug / run commands | Antigravity | source code |
| Review the pull request | CodeRabbit | the PR |
| Hard architecture or debugging questions | Claude (chat) | paste `docs/ai/HANDOFF.md` |
| Update docs that changed | Antigravity | `docs/ai/` |

## Asking Claude in the chat app
Claude in the chat cannot see your repo. Run `prompts/02-handoff-for-claude.md`, then paste the generated `docs/ai/HANDOFF.md` (plus the exact error or question) into the chat.

## Layout
- `AGENTS.md`: the one entry point every agent reads (short, with a "which doc to read" table)
- `docs/ai/`: project knowledge. `optional/` holds docs that only some projects need (delete what you don't use)
- `docs/ai/tools/`: one short page per tool (responsibility, files, boundaries)
- `.agent/`: Antigravity rules and skills (thin; they point to AGENTS.md)
- `PRD.md` + `progress.txt`: Ralph's task queue and log
- `.coderabbit.yaml`: CodeRabbit review config
- `prompts/`: copy-paste prompts
