# Deployment Checklist

## Purpose
- Deployment readiness and post-deployment validation checklist for the current Linux-oriented setup.

## Canonical for
- Deployment readiness
- Post-deploy validation
- Service and config verification

## Read after
- `docs/operations/runbook.md`
- `docs/reference/config.md`

## See also
- `docs/operations/security.md`
- `docs/operations/testing.md`

## Last updated
- 2026-08-08

## Pre-deploy checks
- Confirm provider and model configuration is correct.
- Confirm migrations are up to date.
- Confirm frontend build path is healthy.
- Confirm service names and nginx templates match the target environment.

## Post-deploy checks
- Confirm `ai-backend.service` and `ai-frontend.service` status.
- Confirm API and frontend routes respond as expected.
- Confirm auth, chat, and admin smoke paths.
- Confirm logs do not show immediate provider, auth, or database failures.