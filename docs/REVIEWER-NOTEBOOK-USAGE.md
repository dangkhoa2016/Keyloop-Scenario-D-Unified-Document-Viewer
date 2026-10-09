# Kaggle reviewer notebook — step-by-step guide

The public notebook `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb` contains **37 physical cells: 19 Markdown explanation cells and 18 executable code steps**. Each executable step has a preceding Markdown explanation. **Always use Step 01–17 headings**, not physical cell numbers, when navigating in Kaggle.

## Direct GitHub import (no manual clone or credentials)

1. Sign in to [Kaggle Code](https://www.kaggle.com/code) and create a New Notebook.
2. In the notebook editor, look for **File → Import Notebook → Link** (menu labels may vary). Paste the complete notebook *file* URL:
   `https://github.com/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release/blob/main/notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`
3. If available, use the GitHub import tab and select repository `dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release` and path `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`.
4. If neither option works, open that file on GitHub, select **Raw**, download the `.ipynb`, and upload it through Kaggle's notebook import option.
5. Confirm 37 cells. Select **CPU** (no accelerator), enable **Internet**, and choose **Run All**.

**Important:** The File → Import Notebook → Link route is documented from previous guidance, but has **not been independently click-tested in the current Kaggle interface**. Do not paste only the repository homepage into the file-link field.

## What to inspect after Run All

| Step heading | Verified artifact or action |
|---|---|
| 01–06 | Source SHA, reproducible dependencies, migrations and automated checks |
| 07–10 | Start the three separate HTTP services and verify readiness |
| 11 | Fresh VIN request, merged Sales/Service document list and request ID |
| 12 | Monotonic overlapping HTTP request intervals (not parallel CPU execution) |
| 13 | Local-only controlled upstream failure tests |
| 14 | SQLite audit row for the exact fresh request ID |
| 15 | Correlated three-server logs, audit, trace JSON and timeline PNG |
| **16** | **Temporary Cloudflare URL and interactive VIN search, All/Sales/Service filters** |
| **17** | **Final evidence summary, resolved Git SHA and independent PASS/FAIL results** |
| **18** | **Live browser request monitor (10-second log polling; 30-minute limit)** |

The notebook itself clones current public `main` and checks out its resolved SHA in each run. No GitHub token, manual SHA, URL, Docker, Drive mount or GPU is required. Advanced optional overrides are `KEYLOOP_REPO_URL`, `KEYLOOP_GIT_SHA` and `KEYLOOP_ENABLE_TUNNEL=0` (disable public tunnel). The default Run All requires an active Kaggle runtime with Internet.

A new run gets an isolated `/kaggle/working/keyloop-reviewer-runs/<run-id>` evidence directory. Do not relabel old traces or older commit tests as fresh evidence.

## Troubleshooting and safety

- **PORT_BUSY:** The notebook does not kill arbitrary listener PIDs. For now, restart the Kaggle kernel/session and Run All; rerun-safe process ownership remains an unverified improvement.
- **TUNNEL_STATUS=UNAVAILABLE:** Backend validation may still succeed; inspect Step 16 diagnostics and retry only when connectivity returns. The public URL is not permanent.
- **Import fails:** Use GitHub Raw download/upload fallback and confirm JSON notebook is loaded rather than GitHub HTML.
- **Tests fail:** Capture the first failing Step, error and resolved SHA. Never report a partial run as full PASS.
- Only synthetic demo data is supported. Never expose private SQLite databases, logs, credentials or local fault-injection controls through the public static frontend.

## Development-only local source mode

```bash
export KEYLOOP_LOCAL_SOURCE=/mnt/workspace/keyloop-unified-document-viewer
export KEYLOOP_NOTEBOOK_BASE_PORT=3100
export KEYLOOP_ENABLE_TUNNEL=0
```

This convenience mode is **not** a clean public GitHub reproduction test.

## Step 18: live review after opening Cloudflare

Leave Step 18 running while testing the Step 16 browser URL in another tab. It reads only NEW private Unified, Sales and Service events every 10 seconds and joins the matching request ID to the run-specific SQLite audit. It polls readiness, but **does not issue VIN searches** and does **not store full HTTP response bodies**. Stop with Kaggle **Interrupt** (not Restart). The monitor runs for at most 30 minutes to protect limited Kaggle sessions; restart only Step 18 if more time is required.

## Full captured upstream HTTP response evidence

In Kaggle reviewer mode only, the notebook enables `REVIEWER_PUBLIC_EVIDENCE=1` for Unified. After opening the temporary Cloudflare frontend in Step 16 and searching a synthetic VIN, Step 18 outputs a link for that exact request ID: `PUBLIC_URL/reviewer/requests/<requestId>`. It opens a styled HTML page with **the captured original Sales HTTP JSON, captured original Service HTTP JSON, and actual Unified JSON response** from the same aggregate search; no second VIN lookup is made. Each section includes source status, while the header gives the HTTP interval overlap. The page is an ephemeral, synthetic-only demonstration; it is not an authenticated production debugging endpoint. The in-memory store retains at most 30 requests and is cleared on server restart; a missing or expired ID is HTTP 404. The endpoint is disabled without the explicit flag and in production mode. Do not put credentials or real VIN/customer data in the demo.
