# Runbook

## Purpose
- Runtime and maintenance guide for local development and systemd-managed operation.
- Focuses on how to run, restart, inspect, and recover the application.

## Canonical for
- Run workflows
- Restart workflows
- Log inspection
- Recovery steps

## Read after
- `docs/ai-agent-handoff.md`
- `docs/reference/config.md`

## See also
- `docs/operations/testing.md`
- `docs/operations/troubleshooting.md`
- `docs/operations/deployment.md`

## Last updated
- 2026-08-08

## Core operational rules
- Use `backend/.venv` for backend commands.
- Prefer the smallest validation that proves a change.
- Restart the affected service after backend or frontend changes when feasible.

## Common workflows
- Backend local run — use the backend virtual environment and app entrypoint.
- Frontend local run — use the frontend package scripts.
- Production-like frontend validation — build and start instead of dev mode.
- Service-managed operation — use systemd units `ai-backend.service` and `ai-frontend.service`.

## Recovery focus areas
- provider/config mismatch
- auth cookie or refresh flow issues
- stale frontend build artifacts
- RAG dependency or pgvector issues