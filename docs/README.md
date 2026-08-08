# Documentation Index

## Purpose
- Human-facing index for the project documentation set.
- Points readers to the smallest useful set of docs before they branch into task-specific material.

## Start here
1. `AGENTS.md` — repository working rules.
2. `docs/ai-agent-handoff.md` — AI-first handoff, read order, and task routing.
3. `docs/overview/repository-overview.md` — what the repository is.
4. `docs/status/current-state.md` — what is implemented and recently verified.

## Documentation layout

### Root
- `docs/README.md` — human-facing index.
- `docs/ai-agent-handoff.md` — AI-facing handoff and routing document.

### `docs/overview/`
- `repository-overview.md` — product summary, stack, repo areas, trust boundaries, deployment modes.
- `system-architecture.md` — cross-system flows and subsystem boundaries.

### `docs/status/`
- `current-state.md` — implemented capabilities, completed fixes, current working status, dated verification notes.
- `known-issues.md` — unresolved issues, impact, and workarounds.

### `docs/reference/`
- `backend.md` — backend structure and behavior.
- `frontend.md` — frontend structure and behavior.
- `database.md` — schema, migrations, and storage model.
- `api.md` — route inventory and endpoint behavior.
- `config.md` — config sources, sensitive boundaries, safe-edit rules.
- `file-map.md` — compact feature-to-file lookup.

### `docs/operations/`
- `runbook.md` — run, restart, inspect, recover.
- `testing.md` — validation matrix and smoke tests.
- `troubleshooting.md` — symptom-first debugging paths.
- `deployment.md` — deployment readiness and post-deploy checks.
- `security.md` — auth, cookies, tokens, and secret-handling constraints.

### `docs/planning/`
- `roadmap.md` — future work and deferred improvements.
- `agent-change-log.md` — short chronological log of agent-relevant changes.

## Reading strategy
- Default cap before branching: 4 docs.
- Read stable overview/reference docs first.
- Read high-churn status/planning docs only when current state or recent changes matter.
- Prefer canonical docs in subfolders; do not recreate root-level aliases.