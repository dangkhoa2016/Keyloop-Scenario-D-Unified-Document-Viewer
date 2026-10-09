# ADR-003 — Persist correlated request lifecycle events

**Status:** Accepted  
**Date:** 2026-10-09

## Context

The existing implementation already proved concurrency with monotonic Unified-side intervals, correlated JSONL logs, request-level SQLite audit rows, and same-request captured HTTP response evidence. Reviewer inspection still required combining multiple evidence forms when the question was simply: what happened across Browser → Unified → Sales/Service → Unified → Browser for one request ID?

## Decision

Keep `unified-audit.sqlite` as the technical evidence database and add an append-only `request_events` table. Unified, Sales and Service write correlated lifecycle events using the same request ID. Event persistence is best-effort and must never replace or weaken the existing business result, request-level audit semantics, trace capture, or reviewer HTML evidence.

Unified exposes:

`GET /api/observability/requests/:requestId`

The endpoint returns chronological persisted events plus a derived summary and deterministic checks for correlation, upstream receipt/response capture, fan-out ordering and final aggregation response.

## Event lifecycle

A successful request records `browser_request_received`, `sales_request_started`, `service_request_started`, `sales_request_received`, `service_request_received`, `sales_response_sent`, `service_response_sent`, `sales_response_received`, `service_response_received`, `aggregation_completed`, and `browser_response_sent`.

## Consequences

- Reviewer automation gets one machine-readable HTTP evidence source without querying SQLite or parsing log files.
- Existing `/reviewer/requests/:requestId` remains the human-facing same-request response inspector with measured SVG timing.
- Sales and Service open independent connections to `unified-audit.sqlite`; SQLite WAL/busy-timeout settings remain the concurrency boundary for the Kaggle single-host demo.
- Persisted events contain metadata only; original response bodies remain bounded in-memory reviewer captures and are not copied into SQLite.
