# Known Issues

## Purpose
- Canonical list of unresolved limitations and active defects that future agents should treat as current constraints or likely follow-up work.
- This file intentionally excludes detailed troubleshooting procedures, which belong in `docs/operations/troubleshooting.md`.

## Canonical for
- Unresolved limitations
- Active UX and operational gaps
- Workarounds and severity notes

## Read after
- `docs/status/current-state.md`
- `docs/operations/troubleshooting.md` when debugging a symptom

## See also
- `docs/planning/roadmap.md`
- `docs/operations/testing.md`
- `docs/operations/troubleshooting.md`
- `docs/operations/deployment.md`
- `docs/operations/security.md`

## Last updated
- 2026-08-08

## Last verified
- 2026-08-08 for issue categorization and current code/doc alignment
- individual runtime workarounds may have older verification dates where noted

## Active issues

### 1. Chat streaming is not truly incremental
- Area: backend/frontend integration
- Severity: medium
- Status: unresolved
- Description:
  - Backend emits SSE-like events over `text/event-stream`, but the current frontend requests the response as text and parses the full payload after completion.
  - Users do not currently receive true token-by-token live rendering.
- Workaround:
  - none beyond accepting current batch-style completion behavior

### 2. Search and citation UX remains basic
- Area: frontend chat UX
- Severity: low to medium
- Status: unresolved
- Description:
  - Search sources and citations are functional but still minimal in presentation and interaction depth.
- Workaround:
  - none required for correctness; this is primarily a UX limitation

### 3. Retry and error UX can be improved
- Area: frontend chat UX
- Severity: medium
- Status: unresolved
- Description:
  - Error states are surfaced, but broader retry affordances and richer feedback are still limited.
- Workaround:
  - resend the message manually after correcting the underlying issue

### 4. RAG ingestion is synchronous in the request path
- Area: backend/RAG
- Severity: medium
- Status: unresolved
- Description:
  - Large uploads can feel slow because parsing, chunking, and embedding happen during the upload request.
- Workaround:
  - prefer smaller documents during current operation

### 5. Admin UX still needs polish
- Area: frontend admin UX
- Severity: low to medium
- Status: unresolved
- Description:
  - CRUD exists, but edit flows and broader validation feedback still need refinement.
- Workaround:
  - rely on surfaced backend validation details where available

### 6. Some responsive and empty-state UX still needs review
- Area: frontend layout/UX
- Severity: low
- Status: unresolved
- Description:
  - Prior overflow and sidebar fixes exist, but responsive behavior and empty/loading states still need broader review.
- Workaround:
  - validate UI changes carefully across screen sizes

### 7. Assistant-side RAG citation UX is limited
- Area: frontend chat UX
- Severity: low
- Status: unresolved
- Description:
  - RAG source cards currently render on the user message; assistant-side structured citation rendering can be expanded later.
- Workaround:
  - inspect user-side source cards for current RAG evidence

### 8. systemd deployment still needs broader production validation
- Area: infra/operations
- Severity: medium
- Status: partially validated
- Description:
  - systemd units exist and are enabled, but broader production validation remains incomplete.
  - nginx routing, restart behavior across reboots, and full post-deploy smoke coverage are not yet documented as fully revalidated in a production environment.
- Workaround:
  - use `systemctl status` and `journalctl` checks during deployment validation

### 9. Frontend dev/prod process management is not fully standardized
- Area: operations
- Severity: low to medium
- Status: unresolved
- Description:
  - Multiple startup paths exist, and helper behavior is only partially standardized.
- Workaround:
  - use the documented commands in `docs/operations/operations-runbook.md`

### 10. HTTPS and domain hardening are not finalized
- Area: infra/security
- Severity: medium
- Status: unresolved
- Description:
  - Deployment templates exist, but final hardening is not documented as complete.
  - TLS termination, certificate renewal workflow, and final domain-level security posture should be treated as environment-specific until explicitly verified.
- Workaround:
  - treat deployment as not fully hardened until explicitly validated

### 11. Restart helper `all` mode is incomplete
- Area: scripts/operations
- Severity: low
- Status: unresolved
- Description:
  - The helper does not reliably launch both services automatically.
- Workaround:
  - run backend and frontend restart commands separately

### 12. Transient Next.js `.next` cache inconsistencies can break rebuilds
- Area: frontend build
- Severity: medium
- Status: known recurring issue
- Description:
  - Missing chunk/module errors can appear after local rebuilds due to stale `.next` state.
- Workaround:
  - clear `frontend/.next` and rebuild

### 13. Structured logging is not implemented
- Area: backend/operations
- Severity: low to medium
- Status: unresolved
- Description:
  - Debugging still relies heavily on plain logs and manual inspection.
- Workaround:
  - use targeted backend/frontend logs and admin usage-log views

### 14. Automated tests are still missing for major flows
- Area: quality/testing
- Severity: medium
- Status: unresolved
- Description:
  - Major flows still rely on manual validation and smoke tests.
  - This increases regression risk for auth, chat, admin, and RAG changes.
- Workaround:
  - follow `docs/operations/testing-guide.md` and `docs/operations/operations-runbook.md` smoke-test procedures