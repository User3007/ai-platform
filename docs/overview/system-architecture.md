# System Architecture

## Purpose
- Canonical cross-system architecture reference for the AI platform.
- Describes boundaries, request flows, trust boundaries, and deployment topology without duplicating low-level implementation details from backend/frontend/database references.

## Canonical for
- System boundaries
- Auth flow
- Chat flow
- Search flow
- RAG flow
- Title summarization flow
- Deployment topology

## Read after
- `docs/overview/repository-overview.md`
- `docs/status/current-state.md`

## See also
- `docs/reference/backend.md`
- `docs/reference/frontend.md`
- `docs/reference/database.md`
- `docs/reference/api.md`
- `docs/operations/security.md`

## Last updated
- 2026-08-08

## Last verified
- 2026-08-08 against current backend/frontend code entry points and route structure

## Main boundaries

### Frontend boundary
- Root application: `frontend/app/`
- Responsibilities:
  - login and registration pages
  - chat pages and conversation detail pages
  - admin pages for users, models, usage logs, and documents
  - settings page with admin-only system prompt management UI
  - client-side auth state and API integration
  - parsing SSE-like backend responses into chat UI state

### Backend boundary
- Root application: `backend/app/main.py`
- Responsibilities:
  - authentication and refresh-token rotation
  - admin authorization and CRUD endpoints
  - conversation CRUD and title summarization
  - chat generation and persistence
  - provider, search, and RAG orchestration
  - usage-log reconstruction and system prompt history tracking

### Database boundary
- PostgreSQL stores:
  - users
  - refresh tokens
  - models
  - conversations
  - messages
  - app settings
  - system prompt history
  - RAG documents
  - RAG chunks

### External service boundary
- LLM provider via Azure OpenAI or compatible OpenAI-style API
- Brave Search for web search augmentation
- embedding provider for RAG query/document embeddings

### Infra boundary
- nginx templates route frontend and backend traffic in deployment scenarios
- systemd templates manage backend and frontend processes
- helper scripts support bootstrap, restart, and startup workflows