# ADR-003 — Persist correlated request lifecycle events

**Status:** Accepted  
**Date:** 2026-10-09

## Context

Unified records request-level audit information and measured source-request intervals, but reviewer verification is clearer when the complete Browser → Unified → Sales/Service → Unified → Browser lifecycle for one request ID can be inspected through one durable evidence source.

## Decision

Keep `unified-audit.sqlite` as the technical evidence database and persist append-only `request_events` rows. Unified, Sales and Service write lifecycle events using the same propagated request ID. Event persistence is best-effort and must not replace or weaken the business response, request-level audit semantics or bounded reviewer response capture.

Unified exposes:

`GET /api/observability/requests/:requestId`

The endpoint returns chronological persisted events plus a derived summary and deterministic correlation/order checks.

A successful request records `browser_request_received`, `sales_request_started`, `service_request_started`, `sales_request_received`, `service_request_received`, `sales_response_sent`, `service_response_sent`, `sales_response_received`, `service_response_received`, `aggregation_completed`, and `browser_response_sent`.

## Consequences

- Reviewer automation can inspect one machine-readable request lifecycle without querying SQLite directly or parsing logs.
- `/reviewer/requests/:requestId` remains the human-facing same-request response inspector with measured HTTP timing.
- Sales and Service use independent connections to `unified-audit.sqlite`; SQLite WAL/busy-timeout behavior remains a single-host demo constraint.
- Persisted events contain metadata only; captured response bodies remain bounded and in-memory in reviewer mode.
