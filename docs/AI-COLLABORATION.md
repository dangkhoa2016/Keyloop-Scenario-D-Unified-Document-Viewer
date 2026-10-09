# AI Collaboration Evidence

GenAI-assisted work covered the architecture, source-system contracts, deterministic data lifecycle, concurrent aggregation, failure policy, reviewer UI, Kaggle reproducibility, same-request evidence presentation, and persisted lifecycle observability. Release claims are accepted only after compiler, lint, automated-test, and runtime evidence gates; assistant-generated PASS text is never treated as proof by itself.

## Reviewed corrections and design evolution

- Source APIs: the Hono server return type was wider than the initial Node HTTP assumption; the implementation moved to `ReturnType<typeof serve>` and then passed typecheck/build/tests.
- Unified aggregation: TypeScript exposed `never[]`, HTTP status overload, and lint issues; explicit typing and contract validation resolved them before the change was accepted.
- Reviewer UI: static-route metadata and URL handling required stricter types. The original Vue/Tailwind plan was intentionally simplified to local HTML/CSS/JS to remove CDN/build-chain risk from the reviewer flow.
- Reviewer evidence: real Kaggle reruns exposed port collisions. The notebook evolved to collision-safe automatic port-group selection without terminating unrelated processes, then added live browser-request monitoring, same-request captured upstream responses, readable evidence cards, and a measured SVG HTTP-overlap timeline.
- Persisted lifecycle evidence was added test-first after comparing the frozen implementation with a separate reference implementation. The new RED test first observed HTTP 404 for the missing endpoint; after implementation it verifies all 11 lifecycle events, one request ID, derived checks, and final document count. The full gate now passes 27 Node tests and 7 Python evidence tests.

## Verification discipline

The project uses real loopback HTTP boundaries in integration tests, temporary SQLite databases for automated tests, deterministic Faker fixtures, Zod validation for upstream payloads, and independent Python evidence verification. Concurrency claims use monotonic outbound start/end offsets and positive overlap; they do not claim simultaneous CPU execution. Request-event persistence is best-effort and does not replace the original request-level audit, JSONL logs, private trace summaries, or bounded same-request response capture.

## Human-owned submission gates

Human review remains authoritative for final accessibility acceptance, narrated video quality, public repository/tag publication, and any executed Kaggle notebook artifact chosen for submission. Temporary Cloudflare URLs are runtime conveniences, not durable submission links.
