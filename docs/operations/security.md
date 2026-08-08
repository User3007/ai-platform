# Security Notes

## Purpose
- Security-oriented maintenance reference for auth, cookies, tokens, secrets, and high-risk boundaries.
- Intended for safe maintenance, not as a formal audit.

## Canonical for
- Auth security model
- Cookie and token handling
- Secret-handling rules
- High-risk change boundaries

## Read after
- `docs/ai-agent-handoff.md`
- `docs/reference/config.md`

## See also
- `docs/overview/system-architecture.md`
- `docs/reference/api.md`

## Last updated
- 2026-08-08

## Security model summary
- Access token is stored client-side.
- Refresh token is stored in an `httpOnly` cookie.
- `user_role` cookie is used by frontend middleware for route gating.
- Backend is the authority for auth validation and admin authorization.

## Secret-handling rules
- Never hardcode secrets or API keys.
- Do not change real credentials unless explicitly requested.
- Treat provider config and deployment config as high risk.