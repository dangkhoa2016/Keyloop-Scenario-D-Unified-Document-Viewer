# System Design — Scenario D: Unified Document Viewer

**Reviewer summary.** This file is a concise as-built view of the current implementation, not a separate design authority. The canonical public system-design specification is [`../Keyloop-Scenario-D-Unified-Document-Viewer-System-Design.md`](../Keyloop-Scenario-D-Unified-Document-Viewer-System-Design.md).

**Implementation status (2026-10-09):** The documented implementation is complete and locally verified with 27 Node/Vitest tests and 7 Python evidence tests. Code, OpenAPI and executable tests are used to verify the implementation described by the canonical specification.

## Objective and topology

One 17-character VIN lookup produces a consolidated, deterministic list of source-attributed Sales and Service document **metadata**. There are **two external source systems** and **three HTTP services**, because Unified is a separate orchestrator. Three SQLite files isolate Sales data, Service data and Unified request audits.

```mermaid
flowchart TD
  Browser[Browser / Kaggle reviewer] -->|Cloudflare HTTPS, only port 3000| U[Unified Hono API + static HTML/CSS/JS :3000]
  U -->|concurrent HTTP| S[Sales Hono API :3001]
  U -->|concurrent HTTP| V[Service Hono API :3002]
  S --> SD[(sales.sqlite)]
  V --> VD[(service.sqlite)]
  U --> AD[(unified-audit.sqlite)]
  S -. correlated lifecycle events .-> AD
  V -. correlated lifecycle events .-> AD
```

All application listeners bind loopback `127.0.0.1`. Only Unified :3000 is tunnel-eligible; source endpoints and test fault controls remain private. Each source has its own raw schema; Zod adapters normalize to common document and vehicle contracts. No distributed transaction spans the two sources.

## Request and concurrency sequence

Canonical business route: `GET /api/vehicles/:vin/documents`. Sales and Service expose the same route shape but deliberately return different raw JSON schemas.

1. Validate and uppercase VIN (17 characters, excluding I/O/Q); reject malformed input with HTTP 400.
2. Start Sales and Service outbound HTTP requests together using `Promise.all`. Both calls have independent timeout/error classification, including non-2xx HTTP, network refusal, invalid JSON and Zod schema violations.
3. Normalize source records, namespace document IDs with `SALES:` and `SERVICE:`, reconcile vehicle metadata, and deterministically sort by date descending and tie-break fields.
4. Persist the request-level audit row plus append-only correlated lifecycle events in `unified-audit.sqlite`. Sales and Service record actual receipt/response events; Unified records browser receipt, fan-out start, upstream response receipt, aggregation and browser response. Audit failure never suppresses the business result, while readiness reflects request-audit degradation.
5. Return one response with documents, per-source status summaries, warning messages, partial flag and matching request ID. Reviewer automation can fetch the same request via `GET /api/observability/requests/:requestId` without querying SQLite or parsing log files.

```mermaid
sequenceDiagram
  participant R as Reviewer
  participant U as Unified
  participant S as Sales
  participant V as Service
  participant A as SQLite audit
  R->>U: GET /api/vehicles/{vin}/documents
  par Both HTTP calls initiated concurrently
    U->>S: Sales source query + propagated request ID
    S->>A: Best-effort Sales lifecycle events
    S-->>U: Sales documents/status
  and
    U->>V: Service source query + propagated request ID
    V->>A: Best-effort Service lifecycle events
    V-->>U: Service documents/status
  end
  U->>A: Best-effort request audit + Unified lifecycle events
  U-->>R: Merged documents and source summaries
```

## Response and failure matrix

| Condition | HTTP outcome | Behavior |
|---|---|---|
| Malformed VIN | 400 | Structured INVALID_VIN error |
| Both healthy, VIN exists | 200 | Merged, source-labeled list; may be empty |
| Both healthy, neither knows VIN | 404 | VEHICLE_NOT_FOUND |
| One technical failure | 200 | `partial=true`, healthy-source results and warning |
| Both technical failures | 503 | ALL_SOURCES_UNAVAILABLE |
| Conflicting source vehicle metadata | 200 | `vehicle=null` and explicit warning |
| Audit write failure | Otherwise determined outcome | Do not suppress result; flag persistence failure and degraded readiness |

Unknown VIN is distinct from an existing vehicle with zero documents. One source's NOT_FOUND is not the same as a technical failure.

## Data models and persistence

Sales and Service use deliberately **different mocked data models** and independent SQLite files, seeded with deterministic synthetic Faker fixtures. The Unified canonical record has `id,sourceDocumentId,source,type,title,date`. The API vehicle shape is `vin,make,model,year`; `sources.sales` and `sources.service` each include `status,durationMs,documentCount,vehicleFound` and optional `errorCode`. Correlated audit rows do not store PDF binaries or a replay of full user responses.

## Evidence and verification limitations

The authoritative durable reviewer evidence is persisted in `unified-audit.sqlite` and exported through `GET /api/observability/requests/:requestId`. That DB-backed report verifies the correlated lifecycle, source receipt/response capture, fan-out ordering and final aggregation for the **same fresh requestId**. Separately, the bounded private reviewer trace records monotonic start/end intervals and the human-readable reviewer page computes the positive HTTP overlap used for measured concurrency evidence. The notebook renders a timing PNG and retains run-scoped evidence. Its bounded Step 18 live monitor may tail private runtime logs and cross-check SQLite to surface newly generated browser requests; those logs are supplementary diagnostics rather than the authoritative evidence contract. **Positive overlap demonstrates concurrently outstanding HTTP requests, not simultaneous CPU database instructions.** The current source passes 27 Node tests and 7 Python evidence tests, including a real-HTTP request that verifies the complete persisted lifecycle and machine-readable evidence export.

## Technology and architectural tradeoffs

- **Node.js 24 / TypeScript / Hono:** small explicit independent HTTP boundaries; **Zod:** validation of runtime data from mocked sources.
- **SQLite:** persistent and easy for Kaggle reproducibility, but not a shared highly available horizontally scalable datastore.
- **Vanilla HTML/CSS/JS UI:** no framework, CDN dependency or frontend build pipeline; provides a single consolidated list with All/Sales/Service filters, source attribution, error and loading states.
- **Cloudflare Quick Tunnel:** optional temporary reviewer access; not production hosting, permanent DNS or authentication.
- No real dealership integrations, tenant isolation, production auth, binary PDF renderer, high availability or OpenTelemetry deployment is claimed.

## Human review and GenAI collaboration

AI was used for architecture comparison, failure policy and implementation/test scaffolding; code changes and test corrections were reviewed against compiler, integration and reproducibility evidence. Refer to `docs/AI-COLLABORATION.md` and individual execution reports. Historic success and yet-unverified reviewer-browser acceptance must not be conflated.
