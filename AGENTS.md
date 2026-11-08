# AGENTS.md

## Project
- Name: Fine Flow Irrigation (FFI) Billing & CRM | Purpose: GST billing, quotations, POs, and CRM | Status: see `docs/ai/PROJECT_CONTEXT.md`
- Stack: Vite + React 18 + Tailwind | Node/Express + Mongoose + MongoDB | PDFKit + node-cron
- Commands: Frontend dev `cd billing-frontend && npm run dev` | Backend dev `cd billing-system && npm start` | Frontend build `cd billing-frontend && npm run build`
- Key folders: `billing-frontend/src/`, `billing-system/routes/`, `billing-system/models/`, `billing-system/agents/`, `docs/ai/`

## Read only what the task needs
| Task | Read |
|---|---|
| Any feature | `docs/ai/PROJECT_CONTEXT.md`, then the current phase in `.planning/` |
| Structure, data flow, new modules | `docs/ai/ARCHITECTURE.md` |
| Adding libraries, versions | `docs/ai/TECH_STACK.md` |
| Writing code | `docs/ai/CODING_STANDARDS.md` |
| Tests, definition of done | `docs/ai/TESTING_STRATEGY.md` |
| UI work | `docs/ai/optional/DESIGN_SYSTEM.md` |
| Database / API / auth | `docs/ai/optional/DATABASE.md`, `API.md`, `SECURITY.md` |
| How the tools cooperate | `docs/ai/DEVELOPMENT_WORKFLOW.md` |

## Who does what
GSD plans (`.planning/`) | Ralph executes small tasks (`PRD.md`, `progress.txt`) | Antigravity implements | CodeRabbit reviews PRs | Claude (chat) advises via `docs/ai/HANDOFF.md`.

## Rules
1. Plan before non-trivial changes; ask when requirements or docs are unclear. Never invent requirements, fields or endpoints.
2. Smallest correct change. Reuse existing patterns. No new dependency without asking.
3. Bugs: reproduce and prove the root cause with evidence BEFORE changing code.
4. UI changes: check the running app in the browser, not just the code.
5. Never commit secrets; never print .env contents.
6. Don't re-read unchanged files or the whole docs folder. Keep reports short for small tasks.
7. Branches: `feat/`, `fix/`, `docs/` (Ralph's auto branches are fine). Merge through a PR only.

## Done means
Tests, lint, type check and build pass; UI checked in the browser; diff reviewed; affected docs updated.
