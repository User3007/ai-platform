# API Reference

## Purpose
- Compact route inventory for the backend API under `/api`.
- Summarizes route groups, auth expectations, and important side effects.

## Canonical for
- Route inventory
- Auth requirements by route group
- Important side effects

## Read after
- `docs/reference/backend.md`

## See also
- `docs/reference/config.md`
- `docs/operations/security.md`
- `docs/operations/troubleshooting.md`

## Last updated
- 2026-08-08

## Route groups
- Auth routes — login, registration, refresh, current-user lookup.
- Conversation routes — create, list, load, update, delete, summarize title.
- Chat routes — send message, optional search, optional RAG, persistence side effects.
- Admin routes — users, models, settings, usage logs.
- Admin RAG routes — upload, list, delete shared documents.

## Auth model
- Public auth endpoints exist for login and registration when enabled.
- Protected user routes require authenticated access.
- Admin routes require admin authorization.

## Important side effects
- Chat requests can persist user and assistant messages.
- Chat requests can store search results on user messages.
- Title summarization updates conversation title state.
- Admin model changes can write provider credentials into `backend/config/api_keys.yaml`.