# Frontend Reference

## Purpose
- Frontend implementation map for the Next.js application.
- Helps agents find the correct route, hook, store, or component before editing UI behavior.

## Canonical for
- Frontend route map
- Auth and route protection model
- Hook and store ownership
- Chat/admin UI entry points

## Read after
- `docs/overview/system-architecture.md`
- `docs/status/current-state.md`

## See also
- `docs/reference/api.md`
- `docs/reference/file-map.md`
- `docs/operations/security.md`

## Last updated
- 2026-08-08

## Main frontend areas
- `frontend/app/` — App Router pages, layouts, route groups.
- `frontend/components/` — shared UI, chat UI, admin UI, layout, theme.
- `frontend/hooks/` — auth, chat, and conversation hooks.
- `frontend/store/` — Zustand stores for auth, chat, preferences.
- `frontend/lib/` — API client, auth helpers, stream parsing.
- `frontend/types/` — shared TypeScript types.
- `frontend/middleware.ts` — route gating for protected areas.

## Route ownership
- `(auth)/` — login and auth-related pages.
- `chat/` — chat landing and conversation detail pages.
- `admin/` — admin pages for models, users, usage logs, documents.
- `settings/` — user settings and admin-only system prompt management.

## State ownership
- `useAuth.ts` and `authStore.ts` — auth state, login/logout, current-user flow.
- `useChat.ts` and `chatStore.ts` — message send flow, chat state, search/RAG result handling.
- `useConversations.ts` — conversation list/detail loading and title summarization.
- `preferencesStore.ts` — user preferences and UI settings.

## High-risk frontend areas
- middleware, cookies, and refresh flow coupling.
- chat request/response parsing and optimistic UI behavior.
- sidebar and responsive layout behavior.
- admin forms that surface backend validation details.

## Fast entry points by task
- Auth: `frontend/hooks/useAuth.ts`, `frontend/store/authStore.ts`, `frontend/middleware.ts`
- Chat: `frontend/hooks/useChat.ts`, `frontend/components/chat/ChatInput.tsx`, `frontend/components/chat/MessageList.tsx`
- Conversations: `frontend/hooks/useConversations.ts`, `frontend/app/chat/[id]/page.tsx`
- Admin: `frontend/app/admin/`, `frontend/components/admin/`