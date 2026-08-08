# Backend Reference

## Purpose
- Backend implementation map for the FastAPI application.
- Helps agents find the correct router, service, model, schema, or config file before editing.

## Canonical for
- Backend structure
- Router ownership
- Service ownership
- Provider/search/RAG orchestration points
- Backend-specific edit entry points

## Read after
- `docs/overview/system-architecture.md`
- `docs/status/current-state.md`

## See also
- `docs/reference/api.md`
- `docs/reference/database.md`
- `docs/reference/config.md`
- `docs/reference/file-map.md`

## Last updated
- 2026-08-08

## Main backend areas
- `backend/app/main.py` — FastAPI app setup, middleware, router registration.
- `backend/app/config.py` — runtime settings loading.
- `backend/app/database.py` — database engine and session setup.
- `backend/app/dependencies.py` — shared dependency helpers.
- `backend/app/core/` — exceptions and security helpers.
- `backend/app/models/` — ORM models.
- `backend/app/schemas/` — request/response schemas.
- `backend/app/routers/` — API route handlers.
- `backend/app/services/` — business logic, provider calls, auth, RAG, search.

## Router ownership
- Auth routes — login, registration, refresh, current-user lookup.
- Chat routes — message send flow, provider orchestration, search/RAG toggles.
- Conversation routes — CRUD and title summarization.
- Admin routes — users, models, settings, usage logs.
- Admin RAG routes — document upload, listing, deletion.

## Service ownership
- Auth services — credential validation, token issuance, refresh-token rotation.
- Chat services — prompt assembly, history loading, provider calls, persistence.
- Search services — Brave search integration and result shaping.
- RAG services — ingestion, chunking, embedding, retrieval.
- Embedding services — embedding provider calls for documents and queries.

## High-risk backend areas
- `backend/config/api_keys.yaml` dependencies for provider behavior.
- auth and token flow coupling across routers and services.
- chat persistence and prompt-history tracking.
- synchronous RAG ingestion path.

## Fast entry points by task
- Auth: `backend/app/routers/auth.py`, `backend/app/services/auth_service.py`, `backend/app/services/token_service.py`
- Chat: `backend/app/routers/chat.py`, `backend/app/services/chat_service.py`
- Conversations: `backend/app/routers/conversations.py`
- Admin: `backend/app/routers/admin.py`
- RAG: `backend/app/routers/admin_rag.py`, `backend/app/services/rag_service.py`, `backend/app/services/embedding_service.py`