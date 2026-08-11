# Current State

## Purpose
- Snapshot of what is implemented, what important fixes already landed, and what has been explicitly verified recently.
- High-churn status document for agents that need current project state before editing.

## Canonical for
- Implemented capabilities
- Important completed fixes
- Current working status
- Dated verification milestones

## Read after
- `docs/ai-agent-handoff.md`
- `docs/overview/repository-overview.md`

## See also
- `docs/status/known-issues.md`
- `docs/planning/agent-change-log.md`
- `docs/operations/testing.md`

## Last updated
- 2026-08-11

## Current capabilities

### Authentication
- login flow
- registration flow when enabled
- JWT access token handling
- refresh-token rotation with `httpOnly` cookie
- frontend route gating with `user_role` cookie
- Axios refresh retry on `401`

### Chat
- provider-backed chat responses
- conversation creation and persistence
- continuation of existing conversations
- full stored history passed to the model
- admin-managed global system prompt prepended to normal chat requests
- true incremental SSE chat streaming with progressive frontend rendering
- normalized stream events for metadata, citations, message deltas, completion, and errors
- structured chat warning/error metadata for retry and degraded augmentation UX
- per-message web search toggle
- per-message knowledge-base toggle for shared RAG retrieval, defaulting to off
- search result persistence on user messages
- RAG result persistence in frontend state
- retry action for failed assistant responses without duplicating the original user turn
- inline non-blocking notices when search or RAG augmentation fails but base chat still succeeds
- explicit conversation-load error state in the chat view
- redirect transition state for first-message navigation from `/chat` to `/chat/[id]`

### Conversations
- conversation list sidebar
- visible `New chat` action
- authenticated conversation detail loading
- AI-generated title summarization endpoint and frontend trigger
- local sidebar state update after summarization

### Admin
- user management pages and backend CRUD
- model management pages and backend CRUD
- optional provider API key writeback to `backend/config/api_keys.yaml`
- global system prompt management
- usage log listing and raw payload reconstruction
- shared RAG document management

### Operations
- bootstrap and restart helpers
- startup helper that runs migrations and model seeding
- RAG upload directory and embedding config support
- systemd unit files for backend and frontend
- frontend dev warmup helper that follows the actual Next.js fallback port during local startup

## Important completed fixes

### Routing and auth
- `redirect_slashes=False` in FastAPI app
- admin endpoints support slash and non-slash forms
- authenticated Axios refresh flow is in place

### Provider and search
- stub chat replies replaced with real provider calls
- readable `502` provider error responses added
- Azure provider call validated
- Brave Search integration validated
- embedding provider config path added for RAG ingestion and retrieval

### Persistence and history
- `conversation.updated_at` null bug fixed
- full stored message history is sent to the model
- search results are injected into prompts as system context

### Conversation loading
- conversation detail page moved to authenticated client-side loading
- sending in existing conversations no longer creates unintended new conversations
- first message in a new conversation is deferred across route transition and auto-sent on the destination conversation page
- local conversation state is less likely to churn during initial chat route loading

## Current working status
- backend runs successfully with `backend/.venv`
- default model exists after seeding
- chat send path works with provider-backed responses
- old conversations retain prior context
- `New chat` flow works
- title summarization updates local state without requiring navigation away from the page
- admin model page is restricted to admin users and supports adding provider API keys from the UI

## Verification milestones

### Verified on 2026-08-06
- backend syntax check passed
- frontend lint passed
- active model seeding succeeded
- provider call succeeded
- Brave Search call succeeded
- frontend production build succeeded after clearing `frontend/.next`
- usage-log raw payload reconstruction preserved system prompt history correctly
- RAG tables existed, ingestion succeeded, chunks were stored, and retrieval returned citations/context for a smoke-test document

### Verified on 2026-08-08
- documentation set was reorganized for AI readability
- read order was aligned with repository instructions
- installed systemd units `ai-backend.service` and `ai-frontend.service` were confirmed enabled
- backend streaming path was updated to persist assistant messages after streamed completion
- frontend production build passed after incremental streaming changes
- backend syntax validation passed after incremental streaming changes

### Verified on 2026-08-10
- Phase 1 incremental streaming work was completed
- backend SSE endpoint was directly verified to emit metadata, citations, message deltas, and completion events
- new-conversation first-send flow was stabilized across `/chat` to `/chat/[id]` navigation
- knowledge-base toggle default was changed to off
- frontend still showed recurring `.next` chunk instability during some rebuilds, separate from the completed Phase 1 feature work

### Verified on 2026-08-11
- backend syntax validation passed after Phase 2 retry/error UX changes
- frontend production build passed after Phase 2 retry/error UX changes
- backend and frontend now support structured retry/error metadata and non-blocking degraded search/RAG handling in the implemented code paths
- `/chat` no longer flashes the default empty state during new-conversation redirect; it shows an explicit transition state instead
- frontend dev warmup was updated to follow the actual local Next.js URL when the default port is unavailable

## Interpretation notes
- This file is a documented snapshot, not a guarantee that every environment is healthy right now.
- For unresolved limitations, read `docs/status/known-issues.md`.
- For validation steps after changes, read `docs/operations/testing.md`.