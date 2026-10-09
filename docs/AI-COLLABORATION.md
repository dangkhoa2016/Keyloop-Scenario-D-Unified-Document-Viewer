# AI Collaboration Narrative

Generative AI was used as an engineering assistant during architecture exploration, contract design, implementation scaffolding, test design, debugging, documentation and reviewer-evidence planning. The project does not treat model-generated text or PASS statements as proof of correctness.

## Human ownership and verification

The submitted architecture, source code and documentation remain human-owned. Material changes were reviewed against the repository itself and verified through the appropriate combination of TypeScript typechecking, ESLint, production builds, automated tests, real loopback HTTP integration, deterministic SQLite fixtures and reviewer-evidence checks.

Runtime claims are intentionally narrower than the measurements that support them. For example, concurrency is demonstrated through overlapping outbound HTTP intervals; this is not described as simultaneous CPU execution. Temporary Cloudflare URLs are treated as demo transport rather than durable deployment infrastructure.

## Design areas where AI assisted

AI assistance was used to compare and refine several design choices, including:

- keeping Sales, Service and Unified as separate Hono HTTP processes rather than in-process source stubs;
- validating two deliberately different upstream schemas before normalization;
- defining partial-failure, timeout and unavailable-source semantics;
- simplifying the demonstration UI to local HTML/CSS/JavaScript so reviewer execution does not depend on a frontend CDN or build chain;
- designing persisted request lifecycle events and the request-ID evidence endpoint;
- hardening the guided notebook and reviewer evidence so claims can be reproduced from observable runtime behavior.

## Boundaries

AI assistance did not replace executable verification, source review or human responsibility for the submission. The public documentation describes the final implementation and its tradeoffs rather than preserving internal prompt history, temporary development notes or superseded intermediate states.
