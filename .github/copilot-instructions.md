# Copilot Repository Instructions

Always read `AGENTS.md` before making non-trivial changes in this repository.

Required read order for non-trivial work:
1. `AGENTS.md`
2. `docs/ai-agent-handoff.md`
3. `docs/overview/repository-overview.md`
4. `docs/status/current-state.md`

Additional rules:
- Follow `AGENTS.md` as the primary workspace instruction file.
- Use targeted file reads and avoid broad workspace sweeps unless necessary.
- Reuse already gathered context instead of rereading the same files.
- Keep changes minimal and validate with the smallest useful check first.
- Treat `docs/ai-agent-handoff.md` as the documentation index for agent-facing docs.
- After project changes that affect architecture, runtime behavior, workflows, fixes, or known issues, update `docs/ai-agent-handoff.md` if the document map or read order changes.
- Also update the relevant focused docs such as `docs/overview/system-architecture.md`, `docs/reference/backend.md`, `docs/reference/frontend.md`, `docs/reference/database.md`, `docs/operations/runbook.md`, `docs/status/known-issues.md`, `docs/status/current-state.md`, or `docs/planning/roadmap.md`.
- After frontend or backend code changes, restart the affected service when feasible so runtime behavior matches the latest code.
- Use `backend/.venv` for backend commands.
- Check `backend/config/api_keys.yaml` before changing provider or model behavior.
- Do not change secrets, production config, or deployment behavior unless explicitly requested.
