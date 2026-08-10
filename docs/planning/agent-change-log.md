# Agent Change Log

## Purpose
- Short chronological log of architecture, workflow, and documentation changes that future agents should know about.
- Not a full git changelog.

## Canonical for
- Agent-relevant historical deltas
- Documentation and workflow shifts

## Last updated
- 2026-08-10

## 2026-08-10
- Marked Phase 1 true incremental chat streaming complete in planning and status docs.
- Documented stabilized new-conversation first-send flow across chat route transitions.
- Documented knowledge-base toggle default changing to off.
- Documented recurring Next.js `.next` chunk/cache instability as the main remaining frontend validation caveat.

## 2026-08-08
- Reorganized `docs/` into a single-canonical structure with short filenames.
- Added `docs/README.md` as the human-facing index.
- Kept `docs/ai-agent-handoff.md` as the root AI entrypoint.
- Replaced root-level duplicate docs with canonical docs in subfolders only.
- Tightened document ownership to reduce overlap and context-window waste.