# ADR-001 — Independent backend HTTP sources

Status: Accepted planning baseline.

Decision: Node.js/TypeScript/Hono, three independent listeners, isolated source databases, a thin UI. Alternative in-process stubs would not verify real HTTP failure/overlap semantics. Trade-off: more process lifecycle complexity on a single CPU machine. No claim of multi-host fault tolerance.
