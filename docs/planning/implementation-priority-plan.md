# Implementation Priority Plan

## Purpose
- Detailed execution plan for the next major phases of work on the AI platform.
- Converts the current roadmap and known issues into a practical, ordered checklist.
- Intended to be followed incrementally and updated as work is completed.

## Last updated
- 2026-08-11

## Current execution status
- Phase 1 completed on 2026-08-10.
- Phase 2 implementation started on 2026-08-11.
- Current Phase 2 changes in progress:
  - added structured backend chat/search/RAG error metadata for safer frontend handling
  - added frontend retry support that reuses the original user turn instead of duplicating it
  - added inline non-blocking degradation notices when search or RAG augmentation fails but base chat can continue
  - added explicit conversation-load error state and retry affordance for failed assistant responses
- Backend and frontend streaming paths now use a normalized incremental SSE contract.
- Additional follow-up fixes completed during Phase 1:
  - stabilized first-message send flow for new conversations
  - reduced conversation sidebar churn during route transitions
  - changed knowledge-base toggle default to off
  - removed a direct `axios` import from the conversation hook path while investigating frontend chunk issues
- Validation completed so far:
  - backend syntax validation via `python -m compileall app`
  - frontend production build via `npm run build`
  - direct backend SSE verification for metadata, citations, message deltas, and completion events
- Remaining recommended follow-up after Phase 1:
  - broader manual smoke coverage after frontend chunk/cache instability is resolved
  - targeted work on Phase 2 retry and error UX

## Planning assumptions
- Priorities are based on current product impact, unresolved issues, and regression risk.
- Core chat experience improvements come before lower-impact polish work.
- Quality and validation work should be added alongside feature work, not only at the end.
- Infrastructure hardening remains important, but it is not the first priority unless deployment needs become urgent.

## Priority order
1. True incremental chat streaming
2. Retry and error UX improvements
3. Automated tests for major flows
4. Asynchronous RAG ingestion pipeline
5. Admin UX polish and responsive/empty-state review
6. Citation and source presentation improvements
7. Process management and operational consistency
8. Structured logging
9. Deployment hardening and production validation

---

## Phase 1 — True incremental chat streaming

### Why this is first
- It is the highest-impact improvement to the core product experience.
- It is already identified as the top near-term priority.
- The backend appears to emit stream-style responses, but the frontend does not yet render them progressively.

### Goals
- Render assistant output progressively while the response is still being generated.
- Preserve current conversation persistence behavior.
- Keep search and RAG augmentation compatible with streaming.
- Handle completion, interruption, and error states cleanly.

### Work breakdown

#### 1. Audit current streaming flow
- Inspect backend stream response generation.
- Confirm event format, delimiters, and completion markers.
- Inspect frontend request and parsing behavior.
- Document the current mismatch between backend output and frontend consumption.

Status: completed on 2026-08-08.

#### 2. Define the streaming contract
- Standardize event types such as:
  - message delta
  - metadata
  - citations or sources
  - completion
  - error
- Decide whether the frontend should consume native streamed chunks or parsed SSE events.
- Ensure the contract is stable enough for future retry and citation work.

Status: completed on 2026-08-08.

Implemented contract:
- `metadata`
- `citations` with `source: search | rag`
- `message_delta`
- `completion`
- `error`

#### 3. Update backend streaming behavior if needed
- Normalize event payload structure.
- Ensure final completion events are always emitted.
- Ensure error events are emitted in a parseable format.
- Verify conversation persistence still occurs correctly when streaming is enabled.

Status: completed on 2026-08-08.

#### 4. Update frontend stream consumption
- Replace full-response parsing with progressive chunk handling.
- Append assistant text as chunks arrive.
- Keep local state consistent if the stream ends unexpectedly.
- Avoid duplicate final messages after stream completion.

Status: completed on 2026-08-08.

#### 5. Update chat UI behavior
- Show a live “assistant is responding” state.
- Render partial assistant content safely.
- Keep scrolling behavior smooth during streaming.
- Ensure the UI remains usable if the user navigates away or starts a new chat.

Status: completed on 2026-08-08.

#### 6. Add validation coverage
- Manual smoke test for new conversation streaming.
- Manual smoke test for existing conversation streaming.
- Test with search enabled.
- Test with RAG enabled.
- Test provider error handling during stream.

Status: completed on 2026-08-10.
- automated validation completed
- backend SSE behavior verified directly
- manual smoke testing completed enough to close Phase 1 implementation work, with broader follow-up still recommended once frontend chunk/cache instability is cleared

### Suggested files to inspect first
- `backend/app/routers/chat.py`
- `backend/app/services/chat_service.py`
- `frontend/hooks/useChat.ts`
- `frontend/lib/stream.ts`
- chat UI components in `frontend/components/chat/`

### Definition of done
- Assistant text appears progressively during generation.
- No duplicate assistant messages are created.
- Errors are surfaced without breaking the conversation state.
- Search and RAG still work with the streamed path.

---

## Phase 2 — Retry and error UX improvements

### Why this is second
- Once streaming is improved, the next biggest user-facing gap is recovery when something fails.
- Better error handling reduces frustration and support burden.

### Goals
- Make failures understandable.
- Let users retry without manually reconstructing context.
- Improve visibility into provider, search, and RAG failures.

### Work breakdown

#### 1. Audit current error states
- Identify all chat failure paths in frontend and backend.
- Separate provider errors, auth errors, network errors, search errors, and RAG errors.
- Review how errors are currently displayed in the UI.

#### 2. Add retry actions
- Add retry for failed assistant responses.
- Preserve the original user prompt and toggles.
- Prevent accidental duplicate retries.
- Decide whether retry replaces or appends the failed assistant message.

#### 3. Improve error messaging
- Show clearer user-facing messages.
- Distinguish temporary failures from configuration problems.
- Surface actionable guidance where possible.

#### 4. Improve loading and timeout states
- Add clearer pending indicators.
- Handle stalled streams or long waits gracefully.
- Ensure cancellation or interruption leaves the UI in a recoverable state.

#### 5. Validate edge cases
- expired auth token during send
- provider returns malformed response
- search fails but chat can still continue
- RAG retrieval fails but chat can still continue
- network interruption mid-stream

### Suggested files to inspect first
- `frontend/hooks/useChat.ts`
- `frontend/store/chatStore.ts`
- `frontend/lib/api.ts`
- `frontend/lib/stream.ts`
- chat components under `frontend/components/chat/`

### Definition of done
- Users can retry failed sends from the UI.
- Error messages are clearer and more specific.
- Partial failures do not leave the chat in a broken state.

Status: in progress on 2026-08-11.
- implementation landed for structured error metadata, retryable failed assistant responses, auth-aware streaming retry, and non-blocking search/RAG degradation notices
- remaining recommended follow-up: targeted manual smoke coverage for auth-expiry, provider failure, and degraded search/RAG paths

---

## Phase 3 — Automated tests for major flows

### Why this is third
- The platform now has enough surface area that manual-only validation is risky.
- Tests will reduce regressions while implementing the remaining roadmap items.

### Goals
- Add practical coverage for the highest-risk flows.
- Focus first on smoke and integration-style confidence, not perfect coverage.

### Recommended test order
1. Authentication flow
2. Chat flow
3. Admin model management
4. RAG upload and retrieval

### Work breakdown

#### 1. Establish current testing baseline
- Review existing test setup in backend and frontend.
- Decide whether to prioritize backend API tests, frontend component tests, or end-to-end smoke tests first.
- Document the minimum viable test strategy.

#### 2. Add auth coverage
- login success/failure
- token refresh behavior
- protected route access behavior
- logout and invalid token handling

#### 3. Add chat coverage
- create conversation and send first message
- send message in existing conversation
- title summarization trigger if applicable
- stream completion and error handling

#### 4. Add admin coverage
- model CRUD validation
- admin authorization checks
- provider config edge cases where safe to test

#### 5. Add RAG coverage
- upload document
- chunk creation
- retrieval returns expected context
- deletion cleanup behavior

#### 6. Add lightweight regression commands
- backend test command
- frontend test or lint/type-check command
- documented smoke-test sequence for major changes

### Definition of done
- Major flows have repeatable automated checks.
- New feature work can rely on a basic regression suite.
- Testing commands are documented and usable.

---

## Phase 4 — Asynchronous RAG ingestion pipeline

### Why this is fourth
- It improves scalability and admin experience.
- It matters more once the core chat path is stronger and safer.

### Goals
- Remove long-running ingestion work from the upload request path.
- Provide visibility into ingestion progress and failure states.

### Work breakdown

#### 1. Audit current ingestion flow
- Identify where parsing, chunking, embedding, and persistence happen.
- Measure which steps are synchronous and slow.

#### 2. Design async ingestion model
- Decide between background tasks, queue-based jobs, or another lightweight approach.
- Define document statuses such as:
  - uploaded
  - processing
  - completed
  - failed
- Decide how failures are stored and surfaced.

#### 3. Update backend data model if needed
- Add ingestion status fields.
- Add timestamps or error detail fields if useful.
- Add migration if schema changes are required.

#### 4. Update admin API and UI
- Upload should return quickly.
- Admin document list should show processing state.
- Failed ingestions should be visible and retryable if possible.

#### 5. Validate operational behavior
- large document upload
- failed embedding call
- partial ingestion failure
- restart behavior during processing

### Suggested files to inspect first
- `backend/app/routers/admin_rag.py`
- `backend/app/services/rag_service.py`
- `backend/app/services/embedding_service.py`
- RAG models and schemas under `backend/app/models/` and `backend/app/schemas/`
- `frontend/app/admin/` RAG pages

### Definition of done
- Upload requests no longer block on full ingestion.
- Admins can see whether a document is processing, completed, or failed.
- Retrieval only uses successfully processed documents.

---

## Phase 5 — Admin UX polish and responsive/empty-state review

### Why this is fifth
- The functionality exists, but usability still needs refinement.
- This work becomes more valuable after core chat and reliability improvements.

### Goals
- Improve edit flows, validation feedback, and general usability.
- Review responsive behavior and empty/loading states across key screens.

### Work breakdown

#### 1. Audit admin flows
- user management
- model management
- system prompt management
- usage logs
- RAG document management

#### 2. Improve form UX
- clearer validation messages
- better save/cancel behavior
- safer destructive actions
- more consistent loading and success states

#### 3. Review responsive behavior
- admin pages on tablet widths
- chat layout on smaller screens
- sidebar behavior
- overflow handling

#### 4. Review empty and loading states
- no conversations
- no models
- no documents
- failed loads
- long-running operations

### Definition of done
- Admin flows feel consistent and predictable.
- Key pages remain usable across common screen sizes.
- Empty and loading states are intentional rather than incidental.

---

## Phase 6 — Citation and source presentation improvements

### Why this follows UX polish
- Source quality matters, but the current limitation is more about presentation than correctness.
- This work pairs well with streaming and RAG improvements.

### Goals
- Make search and RAG sources easier to understand and trust.
- Improve assistant-side citation presentation.

### Work breakdown
- Improve source card layout and hierarchy.
- Add clearer distinction between web search sources and RAG sources.
- Explore assistant-side citation rendering instead of only user-side source cards.
- Improve interaction patterns for expanding or inspecting sources.

### Definition of done
- Users can more easily understand where answers came from.
- Citation UI feels integrated into the assistant response flow.

---

## Phase 7 — Process management and operational consistency

### Goals
- Standardize frontend and backend startup paths.
- Fix helper inconsistencies such as restart behavior.
- Reduce confusion between dev and production-like workflows.

### Work breakdown
- Review `scripts/` helpers.
- Fix incomplete restart helper behavior.
- Standardize documented commands.
- Align docs with the preferred workflow.

### Definition of done
- Common run and restart paths are predictable and documented.

---

## Phase 8 — Structured logging

### Goals
- Improve observability for backend and operational debugging.
- Reduce reliance on ad hoc log inspection.

### Work breakdown
- Define logging format and levels.
- Add structured logs around auth, chat, provider calls, RAG ingestion, and admin actions.
- Ensure logs remain safe and do not expose secrets.

### Definition of done
- Important flows emit consistent, searchable logs.

---

## Phase 9 — Deployment hardening and production validation

### Goals
- Improve confidence in systemd/nginx deployment behavior.
- Close remaining gaps around HTTPS and production validation.

### Work breakdown
- Validate service restart behavior across reboot scenarios.
- Validate nginx routing and proxy behavior.
- Review TLS termination and certificate renewal workflow.
- Expand post-deploy smoke tests.

### Definition of done
- Production deployment steps are documented, repeatable, and validated.

---

## Cross-cutting rules for every phase

### Documentation
- Update relevant docs after meaningful architecture, workflow, or behavior changes.
- Keep `docs/ai-agent-handoff.md` aligned if read paths or major behavior change.
- Update `docs/status/current-state.md` and `docs/status/known-issues.md` when issues are resolved or priorities shift.

### Validation
- Prefer the smallest useful validation first.
- After backend changes, run feasible backend checks.
- After frontend changes, run feasible frontend checks.
- After major behavior changes, run a focused smoke test.

### Scope control
- Keep changes targeted.
- Avoid changing provider config, secrets, ports, or deployment behavior unless explicitly needed.
- Do not mix unrelated refactors into roadmap work.

---

## Suggested execution sequence by milestone

### Milestone A
- Phase 1: true incremental chat streaming

### Milestone B
- Phase 2: retry and error UX
- Begin Phase 3: auth and chat automated tests

### Milestone C
- Complete Phase 3: admin and RAG automated tests
- Phase 4: asynchronous RAG ingestion

### Milestone D
- Phase 5: admin UX polish
- Phase 6: citation and source presentation improvements

### Milestone E
- Phase 7: process management consistency
- Phase 8: structured logging
- Phase 9: deployment hardening and production validation

---

## Recommended immediate next action
Start with a focused implementation plan for Phase 1 by inspecting the current streaming path in backend and frontend, then define the exact event contract before editing code.
