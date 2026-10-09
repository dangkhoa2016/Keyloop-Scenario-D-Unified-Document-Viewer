# Kaggle reviewer notebook — step-by-step guide

The public notebook `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb` contains **35 physical cells: 18 Markdown explanation cells and 17 executable code steps**. Each executable step has a preceding Markdown explanation. **Always use Step 01–17 headings**, not physical cell numbers, when navigating in Kaggle.

## Direct GitHub import (no manual clone or credentials)

1. Sign in to [Kaggle Code](https://www.kaggle.com/code) and create a New Notebook.
2. In the notebook editor, look for **File → Import Notebook → Link** (menu labels may vary). Paste the complete notebook *file* URL:
   `https://github.com/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release/blob/main/notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`
3. If available, use the GitHub import tab and select repository `dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release` and path `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`.
4. If neither option works, open that file on GitHub, select **Raw**, download the `.ipynb`, and upload it through Kaggle's notebook import option.
5. Confirm 35 cells. Select **CPU** (no accelerator), enable **Internet**, and choose **Run All**.

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
