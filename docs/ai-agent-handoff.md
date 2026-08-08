# AI Agent Handoff

## Purpose
- Primary AI-facing handoff and routing document for `/home/thien/ai-platform`.
- Keeps the default read path small, identifies high-risk areas, and points agents to the right canonical docs.

## Canonical for
- Required read order after `AGENTS.md`
- Task-based doc routing
- High-risk areas and safe-edit boundaries
- Canonical doc map

## Read order
1. `AGENTS.md`
2. `docs/ai-agent-handoff.md`
3. `docs/overview/repository-overview.md`
4. `docs/status/current-state.md`
5. Branch only if the task needs more detail

## Last updated
- 2026-08-08

## Current snapshot
- Backend entry: `backend/app/main.py`
- Frontend entry: `frontend/app/`
- Backend API prefix: `/api`
- Protected frontend areas: `/chat/*` and `/admin/*`
- Systemd services: `ai-backend.service`, `ai-frontend.service`

## High-risk areas

### Provider and model configuration
- Canonical config file: `backend/config/api_keys.yaml`
- Affects chat, title summarization, embeddings, and search.
- Do not change secrets or provider behavior unless explicitly requested.

### Auth flow
- Access token is stored client-side.
- Refresh token is stored in an `httpOnly` cookie.
- `user_role` cookie is used by frontend middleware.

### Chat persistence and streaming behavior
- Backend emits SSE-like responses.
- Frontend currently parses the full response after completion.
- Search and RAG context are injected before provider calls.

### RAG ingestion and retrieval
- Depends on parser libraries, embedding config, pgvector, and database state.
- Upload processing is synchronous in the request path.

### Infra and scripts
- `infra/` and `scripts/` affect runtime behavior directly.
- Do not change ports, service names, nginx routes, or process commands unless explicitly requested.

## Safe-edit boundaries
- Safe: documentation updates, targeted code inspection, low-risk code changes within the requested scope.
- Unsafe without explicit request:
  - secrets and API keys
  - production config values
  - service names, ports, nginx routes, deployment commands
  - provider behavior changes

## Task-based read paths

### Backend or provider task
1. `docs/reference/backend.md`
2. `docs/reference/config.md`
3. `docs/reference/api.md`
4. `docs/status/known-issues.md`

### Frontend or chat task
1. `docs/reference/frontend.md`
2. `docs/overview/system-architecture.md`
3. `docs/reference/api.md`
4. `docs/status/known-issues.md`

### Auth task
1. `docs/operations/security.md`
2. `docs/reference/backend.md`
3. `docs/reference/frontend.md`
4. `docs/operations/troubleshooting.md`

### RAG task
1. `docs/overview/system-architecture.md`
2. `docs/reference/backend.md`
3. `docs/reference/database.md`
4. `docs/operations/runbook.md`

### Schema or migration task
1. `docs/reference/database.md`
2. `docs/reference/backend.md`
3. `docs/operations/runbook.md`
4. `docs/operations/testing.md`

### Deployment or service-management task
1. `docs/operations/runbook.md`
2. `docs/operations/deployment.md`
3. `docs/reference/config.md`
4. `docs/operations/troubleshooting.md`

## Canonical doc map

### Overview
- `docs/overview/repository-overview.md`
- `docs/overview/system-architecture.md`

### Status
- `docs/status/current-state.md`
- `docs/status/known-issues.md`

### Reference
- `docs/reference/backend.md`
- `docs/reference/frontend.md`
- `docs/reference/database.md`
- `docs/reference/api.md`
- `docs/reference/config.md`
- `docs/reference/file-map.md`

### Operations
- `docs/operations/runbook.md`
- `docs/operations/testing.md`
- `docs/operations/troubleshooting.md`
- `docs/operations/deployment.md`
- `docs/operations/security.md`

### Planning
- `docs/planning/roadmap.md`
- `docs/planning/agent-change-log.md`

## Fast entry points by feature area
- Auth: `backend/app/routers/auth.py`, `backend/app/services/auth_service.py`, `backend/app/services/token_service.py`, `frontend/hooks/useAuth.ts`, `frontend/middleware.ts`
- Chat: `backend/app/routers/chat.py`, `backend/app/services/chat_service.py`, `frontend/hooks/useChat.ts`
- Conversations: `backend/app/routers/conversations.py`, `frontend/hooks/useConversations.ts`, `frontend/app/chat/[id]/page.tsx`
- Admin: `backend/app/routers/admin.py`, `frontend/app/admin/`, `frontend/components/admin/`
- RAG: `backend/app/routers/admin_rag.py`, `backend/app/services/rag_service.py`, `backend/app/services/embedding_service.py`, `frontend/app/admin/documents/page.tsx`

## Critical commands to remember
- Backend dev run: `cd backend && .venv/bin/python run.py`
- Backend migrations: `cd backend && .venv/bin/alembic upgrade head`
- Backend seed: `cd backend && .venv/bin/python scripts/seed_default_models.py`
- Frontend dev run: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`
- Backend service status: `systemctl status ai-backend.service`
- Frontend service status: `systemctl status ai-frontend.service`

## Current documentation rewrite notes
- This handoff now acts as both the required early-read document and the documentation index.
- The focused-doc approach is preserved; this file should not absorb all technical detail.
- When architecture, runtime behavior, workflows, or known issues change, update this file if the read paths, document map, or risk summary change.

## See also
- `docs/README.md`
- `docs/overview/system-architecture.md`
- `docs/operations/runbook.md`
- `docs/status/current-state.md`