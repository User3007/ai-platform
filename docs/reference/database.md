# Database Reference

## Purpose
- Compact schema and migration reference for the PostgreSQL database.
- Summarizes stored entities, migration history, and RAG-related storage concerns.

## Canonical for
- Table inventory
- Migration chronology
- RAG storage model
- Seed assumptions

## Read after
- `docs/reference/backend.md`

## See also
- `docs/reference/config.md`
- `docs/operations/runbook.md`
- `docs/operations/testing.md`

## Last updated
- 2026-08-08

## Stored entities
- users
- refresh tokens
- models
- conversations
- messages
- app settings
- system prompt history
- RAG documents
- RAG chunks

## Migration chronology
- `20260722_000001_initial_schema.py` — initial schema.
- `20260805_000002_add_app_settings.py` — app settings support.
- `20260806_000003_add_system_prompt_history.py` — system prompt history tracking.
- `20260806_000004_add_rag_documents.py` — RAG documents and chunk storage.

## Operational notes
- RAG depends on pgvector availability.
- Model seeding is part of startup/bootstrap workflows.
- Schema changes should be paired with Alembic migration review.