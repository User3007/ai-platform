# Project Guidelines

## Scope
- This file is the concise repository guide for `/home/thien/ai-platform`.
- `.github/copilot-instructions.md` handles read order and enforcement.
- Use `docs/ai-agent-handoff.md` for deeper runtime history and known issues.

## Architecture
- `backend/`: FastAPI, async SQLAlchemy, Alembic, PostgreSQL.
- `frontend/`: Next.js 15 App Router, React, TypeScript, Tailwind, Zustand.
- `infra/`: nginx and systemd deployment templates.
- `scripts/`: bootstrap and restart helpers.

## Working Rules
- Determine whether a task is backend, frontend, infra, or full-stack before editing.
- Prefer targeted reads over broad file sweeps; inspect only the files needed for the current task.
- Reuse already gathered context instead of rereading the same files unless the file changed.
- Keep changes minimal, targeted, and easy to review.
- Preserve existing naming, structure, and repository conventions.
- Do not add dependencies unless necessary; if added, update the correct dependency file.
- Do not overwrite user changes without understanding intent.
- Do not change secrets, production config, or real data unless explicitly requested.
- For multi-step work, make a short plan first and complete one scoped change at a time.

## Backend Conventions
- Use `backend/.venv` for backend commands.
- Prefer reading the specific router/service/model involved before expanding to adjacent files.
- If changing database schema or ORM models, inspect Alembic migrations and add or update a migration when needed.
- If changing provider or model logic, inspect `backend/config/api_keys.yaml` first.
- Never hardcode secrets or API keys.

## Frontend Conventions
- Keep compatibility with the Next.js App Router.
- Prefer reusing code from `frontend/lib/`, `frontend/hooks/`, `frontend/store/`, and `frontend/components/`.
- Read the route, hook, and shared component directly involved before scanning unrelated UI files.
- For UI changes, avoid responsive regressions, overflow issues, and broken loading/empty/error states.
- Do not break the existing auth flow involving middleware, cookies, and the Axios refresh interceptor.

## Infra Conventions
- Be conservative when editing files in `infra/` and `scripts/` because they affect runtime and deployment.
- Do not change ports, service names, nginx routes, or process commands unless explicitly requested.

## Validation
- After backend changes, run feasible syntax, lint, or type checks.
- After frontend changes, run feasible type or build checks.
- After frontend or backend changes, restart the affected app process when feasible.
- Prefer the smallest validation that proves the change first, then expand only if needed.
- If full validation is not possible, clearly state what was and was not verified.

## Documentation
- If architecture, run commands, provider configuration, or major behavior changes, consider updating `docs/ai-agent-handoff.md` and `docs/status/current-state.md`.
- For roadmap-related work, update `docs/planning/implementation-priority-plan.md` to reflect progress, completed phases or tasks, and any priority changes discovered during execution.
- When roadmap work resolves or materially changes an active issue, also update `docs/status/known-issues.md` and related planning/status docs so progress stays synchronized.

## Important Reminders
- Chat/provider behavior depends on compatible Azure/OpenAI configuration.
- Auth uses a client-side access token and an `httpOnly` refresh token cookie.
- If the UI shows no models, verify model seeding before assuming a frontend issue.
- Avoid reintroducing known issues around redirect slash behavior, SSE parsing, clipboard fallback, and sidebar overflow.