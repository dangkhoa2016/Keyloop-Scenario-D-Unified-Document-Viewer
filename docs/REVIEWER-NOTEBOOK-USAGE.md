# Kaggle reviewer notebook

`notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb` has 18 cells as required by the revised implementation plan. Cell 01 contains background and Cell 02 exposes configuration via environment variables.

## Zero-input reviewer flow (default)

Import `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb` to Kaggle CPU, enable Internet and click **Run All**. No GitHub URL, SHA, token, environment variable or secret is needed. The notebook clones this public repository at the current main HEAD, checks out and prints that exact SHA, then runs tests and starts the app. Cell 17 now starts a Cloudflare Quick Tunnel by default, verifies its HTTPS health check and displays a clickable interactive frontend URL. In that webpage use sample VIN shortcuts and the All / Sales / Service filters. Review Cell 18 for the full validation summary. The tunnel is temporary and requires the Kaggle session to remain active. If Cloudflare is unavailable, backend/evidence PASS remains independent of the public demo status.

Optional advanced overrides: KEYLOOP_REPO_URL, KEYLOOP_GIT_SHA, KEYLOOP_ENABLE_TUNNEL=0. The latest public main policy makes default execution zero-input; an explicit SHA override freezes a run across repository updates.

## Public reproduction mode (advanced overrides)
The notebook uses the public Keyloop GitHub repository and automatically resolves its main commit. For optional exact-version reproduction, set `KEYLOOP_GIT_SHA=<40-character-public-commit>` before Run All. Do not set `KEYLOOP_LOCAL_SOURCE` in public review mode.

Cell 04 uses an existing Node 24 runtime when available; otherwise it downloads official Node v24.21.0 for the Kaggle CPU architecture, verifies its SHA-256 against the official SHASUMS256 listing and installs it under /kaggle/working/keyloop-runtime-tools (without system-global installation). Internet is required for this fallback. Set `KEYLOOP_ENABLE_TUNNEL=1` only if a Cloudflare public demo is desired and accepted. Public URL output must be a newly verified HTTPS endpoint.

## Existing local environment validation
```bash
export KEYLOOP_LOCAL_SOURCE=/mnt/workspace/keyloop-unified-document-viewer
export KEYLOOP_NOTEBOOK_BASE_PORT=3100
export KEYLOOP_ENABLE_TUNNEL=0
```
This is a development-only verification, **not** clean-room reproduction.

## Reviewer evidence
Cell 12 initiates a NEW API request. Cells 13 and 16 independently verify four monotonic HTTP interval events, positive overlap, request ID across three server logs, document counts, request status and SQLite audit, then produce a static PNG timeline and JSON evidence. Cell 14 executes isolated fault tests; it does not expose fault injection through the public server. Cell 18 reports actual outcomes (including unverified public-clone status).

Trace and database paths are run-scoped. Evidence from an older notebook run must never be used as new evidence.
