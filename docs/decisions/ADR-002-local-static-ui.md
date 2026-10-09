# ADR-002 — Local static reviewer interface

**Status:** Accepted

## Context

The browser interface exists to demonstrate a single VIN search, consolidated Sales/Service document metadata, source attribution and reviewer-visible states. The initial project plan considered Vue 3 and Tailwind CSS, but the final interface has a small state model and must remain reliable in temporary reviewer environments.

## Decision

Serve versioned local HTML, CSS and vanilla JavaScript directly from Unified. Do not require a frontend framework, runtime CDN dependency or separate frontend build pipeline for the assessment UI. This is a project implementation choice, not a change to the Keyloop scenario requirements.

## Consequences

- Reviewer execution has fewer external dependencies and a smaller failure surface.
- The frontend remains straightforward to inspect alongside the backend implementation.
- UI behavior is manually structured rather than componentized; a larger production interface would justify a framework and dedicated frontend toolchain.
