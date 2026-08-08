# Troubleshooting

## Purpose
- Symptom-first debugging guide for the platform.
- Helps agents move from observed failure to likely inspection points quickly.

## Canonical for
- Symptom-based triage
- Likely root-cause areas
- First files to inspect

## Read after
- `docs/status/known-issues.md`
- `docs/operations/runbook.md`

## See also
- `docs/reference/config.md`
- `docs/operations/security.md`

## Last updated
- 2026-08-08

## Common symptom buckets
- Login or refresh failures — inspect auth routes, token services, cookies, middleware, and Axios refresh logic.
- Chat request failures — inspect provider config, chat router/service, and usage logs.
- Missing models — inspect model seeding and admin model configuration.
- RAG upload or retrieval failures — inspect parser dependencies, embedding config, pgvector state, and RAG services.
- Frontend build failures — inspect `.next` state and recent UI changes.
- Deployment/service failures — inspect systemd status, logs, and nginx templates.