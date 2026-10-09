# Kaggle Reviewer Evidence — Execution Status and Remaining Gates (2026-10-09)

## Current artifacts

- Public repository: https://github.com/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release
- Canonical notebook: `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`, **35 physical cells = 18 Markdown + 17 executable steps**.
- Generator/source of truth: `scripts/build-reviewer-notebook.py`; rebuild after any generator changes.
- Evidence checker: `scripts/reviewer_evidence.py`; regression suite: `tests/python/test_reviewer_evidence.py`.
- Structured HTTP overlap, three-service request-ID correlation, private trace, SQLite audit and PNG timeline are generated for **fresh run-scoped requests** in `/kaggle/working/keyloop-reviewer-runs/<run-id>`.
- Public frontend: **Step 16**, summary: **Step 17**. Cloudflare Quick Tunnel is enabled by default, ephemeral, and verified via HTTPS before being labeled available.

## Observed earlier verified execution (historical, not a new run)

- Local-source notebook run: 17 executable cells completed, 26 Node tests and 7 Python tests passed; request `req_9a18cc07-2ef2-4310-8a16-b72b53c66659`, overlap 26.75 ms.
- Public anonymous pinned-SHA clone and public-mode notebook run passed in an earlier session; representative request `req_eb133766-c395-4947-a574-326fa721a241`, overlap 27.58 ms.
- A prior **zero-input** public-mode run completed all 17 executable steps, produced verified HTTP overlap and an available tunnel (request `req_7e1ee060-3264-490f-b538-ec1fe27be0b3`, overlap 26.165 ms).
- After documentation updates, local and GitHub HEAD were both verified at `58110f27e1f2d11ac968fad49586d01ceacb6dae`. Notebook JSON had 35 structural cells. This does **not** itself prove fresh Kaggle Run All on that SHA.

## Remaining acceptance checks (do not call PASS early)

- Click-test the actual Kaggle GitHub notebook Link import UI; menu labels and accepted input may vary. Raw-file import remains fallback.
- Perform fresh Kaggle **CPU + Internet** public GitHub Run All against current reviewed SHA; capture exact resolved SHA, request ID, counts, overlap, audit, logs and runtime URL.
- Test a second Run All in same session without terminating unrelated processes; owned-process recovery is still pending.
- Human touch/keyboard/screen-reader/error-state browser acceptance has not been documented for this Keyloop frontend.
- Final review of System Design, OpenAPI, requirement traceability, public-file security and 5–10 minute assessment video remain necessary.

**Boundaries:** Tests prove overlapping outgoing HTTP intervals, not parallel CPU instruction execution. Notebook and Quick Tunnel require active runtime. The app is synthetic document metadata aggregation, not an authenticated real-dealer service or PDF binary renderer.

## Fresh public-clone execution observed 2026-10-09 10:44 ICT (non-Kaggle-UI run)

- Runner: `nbclient` on the existing remote Kaggle-style Linux machine, **not** a newly imported notebook via Kaggle browser UI.
- Public clone checkout: `58110f27e1f2d11ac968fad49586d01ceacb6dae`; `SOURCE_REPRODUCIBILITY=PASS`.
- Executed **17/17 code steps**, no failed assertions. Run folder: `/kaggle/working/keyloop-reviewer-runs/keyloop-b310e418c2a5`.
- Fresh request: `req_94eb3349-7174-4544-ad09-500202b03e78`; VIN `WVWZZZ1JZXW000001`, HTTP 200, **10 documents**, total **54.182 ms**, concurrent HTTP overlap **23.999 ms** (recomputed from private intervals).
- `PARALLEL_EXECUTION=PASS`, `SQLITE_AUDIT=PASS`, `TRACE_CORRELATION=PASS`; artifacts `reviewer-evidence.json` and `parallel-timeline.png` exist in the run folder.
- This execution set `KEYLOOP_ENABLE_TUNNEL=0` intentionally to leave the already-working public port 3000 tunnel untouched; notebook output `TUNNEL_STATUS=UNAVAILABLE` must **not** be described as a tunnel connectivity failure or a successful new tunnel test.
- First public-clone attempt on ports 3400–3402 stopped with `PORT_BUSY`, correctly protecting earlier occupied processes. Retry on an independently free port range (39000–39002) passed. Safe same-kernel rerun ownership/cleanup is **still pending**.
- Separate latest documentation changes were committed locally after the public clone's earlier SHA; a public-clone run of those documentation changes still requires publishing them first. This run does not demonstrate Kaggle UI Link import.
