# Repository Overview

## Purpose
- Concise orientation for agents and maintainers entering the repository.
- Explains what the platform is, how the repository is organized, and where the main trust boundaries are.

## Canonical for
- Product summary
- Repository areas
- Stack summary
- Trust boundaries
- Deployment modes
- Feature categories

## Read after
- `AGENTS.md`
- `docs/ai-agent-handoff.md`

## See also
- `docs/overview/system-architecture.md`
- `docs/status/current-state.md`
- `docs/reference/backend.md`
- `docs/reference/frontend.md`

## Last updated
- 2026-08-08

## Repository summary
This repository contains an AI platform with:
- authenticated chat with persisted conversation history
- admin-managed model configuration
- admin-managed global system prompt
- optional Brave web search augmentation
- optional shared RAG retrieval backed by pgvector
- admin tools for users, models, usage logs, and RAG documents

The project supports local development and Linux-oriented deployment with systemd and nginx.

## Repository areas
- `backend/` — FastAPI app, SQLAlchemy models, Alembic migrations, routers, services, schemas, config.
- `frontend/` — Next.js App Router app, hooks, stores, shared components, admin/chat/settings pages.
- `infra/` — nginx and systemd templates.
- `scripts/` — bootstrap, restart, and startup helpers.
- `docs/` — AI-readable documentation set.

## Stack summary

### Backend
- FastAPI
- async SQLAlchemy
- Alembic
- PostgreSQL
- OpenAI-compatible provider integration
- JWT auth with refresh-token rotation
- pgvector-backed RAG storage and retrieval

### Frontend
- Next.js 15 App Router
- React 18
- TypeScript
- Tailwind CSS
- Zustand
- Axios

### Infra
- nginx reverse proxy templates
- systemd service templates
- Linux-oriented operational model

## Feature categories

### Authentication
- login and registration flows
- `/auth/me`
- access token plus `httpOnly` refresh token cookie
- middleware-based route gating for protected areas

### Chat and conversations
- create, list, load, update, and delete conversations
- send messages in new or existing conversations
- persist ordered message history
- summarize conversation titles

### Search augmentation
- per-message web search toggle
- Brave Search integration
- search result persistence on user messages

### RAG augmentation
- admin document upload and deletion
- text extraction, chunking, embedding, and retrieval
- per-message knowledge-base toggle

### Admin features
- user management
- model management
- global system prompt management
- usage log inspection
- shared RAG document management

## Trust boundaries

### Browser boundary
- Access token is stored client-side.
- Refresh token is stored in an `httpOnly` cookie.
- `user_role` cookie is readable by frontend middleware for route gating.

### Backend boundary
- Backend owns auth validation, admin authorization, persistence, provider calls, and prompt construction.
- Secrets must not be hardcoded.

### External provider boundary
- LLM generation depends on valid provider configuration.
- Search depends on Brave credentials.
- Embeddings depend on embedding provider configuration.

### Infra boundary
- nginx and systemd define routing and process management.
- These are high-risk areas and should be changed conservatively.

## Deployment modes
- Local development — backend and frontend run separately.
- Local production-like validation — frontend build/start and backend non-reload execution.
- Systemd-managed deployment — `ai-backend.service` and `ai-frontend.service` with nginx in front.