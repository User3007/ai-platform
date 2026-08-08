# Config Reference

## Purpose
- Compact reference for runtime config sources and sensitive edit boundaries.
- Identifies where provider, auth, database, and deployment-related settings live.

## Canonical for
- Config source inventory
- Sensitive boundaries
- Safe-edit rules

## Read after
- `docs/ai-agent-handoff.md`
- `docs/reference/backend.md`

## See also
- `docs/operations/security.md`
- `docs/operations/deployment.md`

## Last updated
- 2026-08-08

## Main config sources
- `backend/app/config.py` — backend settings loading.
- `backend/config/api_keys.yaml` — provider and model credential references.
- `backend/alembic.ini` — Alembic configuration.
- `frontend/next.config.ts` — Next.js configuration.
- `infra/nginx/` — nginx templates.
- `infra/systemd/` — systemd templates.

## Sensitive boundaries
- Do not change secrets or real credentials unless explicitly requested.
- Check `backend/config/api_keys.yaml` before provider or model behavior changes.
- Do not change ports, service names, or nginx routes unless explicitly requested.

## Safe-edit rules
- Documentation and non-secret config explanations are safe.
- Runtime behavior changes tied to provider config, auth, or deployment should be treated as high risk.