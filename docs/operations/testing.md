# Testing Guide

## Purpose
- Validation guide for backend, frontend, auth, chat, admin, search, and RAG changes.
- Focuses on practical checks in a repository with limited automated coverage.

## Canonical for
- Minimal validation by change type
- Smoke-test expectations
- Manual verification guidance

## Read after
- `docs/status/current-state.md`
- `docs/operations/runbook.md`

## See also
- `docs/status/known-issues.md`
- `docs/operations/troubleshooting.md`

## Last updated
- 2026-08-08

## Validation principles
- Prefer the smallest useful check first.
- Expand validation only when the change touches risky paths.
- Record what was and was not verified when full validation is not feasible.

## Change-type checks
- Backend changes — syntax, targeted route/service checks, and affected flow smoke tests.
- Frontend changes — lint/type/build checks as feasible and affected UI smoke tests.
- Auth changes — login, refresh, protected route access, and admin gating.
- Chat changes — send flow, persistence, title summarization, search/RAG toggles if affected.
- RAG changes — upload, chunk storage, retrieval, and citation/context rendering if affected.
- Deployment-adjacent changes — service status, logs, and post-change smoke checks.