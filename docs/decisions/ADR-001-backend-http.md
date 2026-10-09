# ADR-001 — Independent backend HTTP sources

**Status:** Accepted

## Context

Scenario D requires one unified document view backed by two mocked source systems. An in-process stub implementation would be simpler, but it would not exercise actual HTTP boundaries, independent source availability or measurable request overlap.

## Decision

Run three independent Node.js/TypeScript/Hono HTTP services: Unified, Sales and Service. Sales and Service own separate SQLite business databases and remain private loopback services. Unified is the only browser-facing entry point and calls both sources over HTTP.

## Consequences

- Integration tests exercise real HTTP serialization, timeouts and failure classification.
- Concurrency evidence measures overlapping outbound source requests rather than simulated function calls.
- Each source keeps independent business persistence.
- The single-host demo has more process-lifecycle complexity and does not claim multi-host fault tolerance or high availability.
