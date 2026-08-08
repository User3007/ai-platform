# File Map

## Purpose
- Compact feature-to-file lookup for fast navigation.
- Keeps file discovery separate from behavior explanations.

## Canonical for
- Feature-to-file mapping
- Fast navigation by subsystem

## Read after
- `docs/ai-agent-handoff.md`

## Last updated
- 2026-08-08

## Feature map
- Auth
  - Backend: `backend/app/routers/auth.py`, `backend/app/services/auth_service.py`, `backend/app/services/token_service.py`
  - Frontend: `frontend/hooks/useAuth.ts`, `frontend/store/authStore.ts`, `frontend/middleware.ts`
- Chat
  - Backend: `backend/app/routers/chat.py`, `backend/app/services/chat_service.py`
  - Frontend: `frontend/hooks/useChat.ts`, `frontend/components/chat/ChatInput.tsx`, `frontend/components/chat/MessageList.tsx`
- Conversations
  - Backend: `backend/app/routers/conversations.py`
  - Frontend: `frontend/hooks/useConversations.ts`, `frontend/app/chat/[id]/page.tsx`
- Admin
  - Backend: `backend/app/routers/admin.py`
  - Frontend: `frontend/app/admin/`, `frontend/components/admin/`
- RAG
  - Backend: `backend/app/routers/admin_rag.py`, `backend/app/services/rag_service.py`, `backend/app/services/embedding_service.py`
  - Frontend: `frontend/app/admin/documents/page.tsx`, `frontend/components/admin/DocumentManager.tsx`# File Map

## Purpose
- Canonical feature-to-file lookup for fast navigation.
- Helps future agents jump directly to the most relevant files for a task.

## Canonical for
- Feature-to-file mapping
- Fast navigation by subsystem

## Read after
- `docs/ai-agent-handoff.md`

## Last updated
- 2026-08-08