# PRD.md: Ralph's task queue (current phase ONLY)

Current phase: Phase 3 — Quotation Follow-up Workflow & Conversion Pipeline

## Tasks
- [ ] T1: Additive Quotation Follow-up Schema & Backend API
  - Acceptance: Schema extended with optional fields (`followUpDate`, `followUpNotes`, `followUpStatus`); `PATCH /api/quotations/:id/follow-up` endpoint implemented.
  - Verify: Route updates follow-up fields without errors; `node -c` passes.
- [ ] T2: Build Quotation Follow-up UI, Schedule Modal & WhatsApp Follow-up Action
  - Acceptance: `Quotations.jsx` renders follow-up status badges, filter tab, schedule modal, and WhatsApp action trigger.
  - Verify: Scheduling a follow-up updates the row in real time; WhatsApp link opens pre-filled greeting.
- [ ] T3: Responsive verification, conversion flow sanity check & production build validation
  - Acceptance: Clean `npm run build` in `billing-frontend`; quotation conversion and PDF downloads remain 100% operational.
  - Verify: `npm --prefix billing-frontend run build` exits with code 0.

## Out of scope for this phase
- General customer interaction logs and autonomous agent notification orchestration (postponed per user request).
- Customer 360 detailed ledger drawer (moved to Phase 4).
