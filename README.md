# Keyloop Scenario D — Unified Document Viewer

This repository implements the **backend track** for Keyloop Scenario D, with independent Sales and Service source systems, a concurrent Unified API, deterministic SQLite fixtures, a lightweight reviewer UI, request/audit evidence and a guided reproducible notebook.

The Keyloop assessment calls for a VIN search, concurrent Sales and Service API requests, one consolidated source-labelled document list, a System Design document, working code/tests and a 5–10 minute video. The backend is implemented fully, with a lightweight UI for demonstration.

**Public documentation:** [`docs/SYSTEM-DESIGN.md`](docs/SYSTEM-DESIGN.md) is the single canonical architecture and requirements document. [`docs/AI-COLLABORATION.md`](docs/AI-COLLABORATION.md) explains GenAI-assisted work and verification boundaries. Focused architectural rationale is recorded under [`docs/decisions/`](docs/decisions/).

## Architecture
Browser → Unified Hono API (3000) → concurrently Sales HTTP API (3001) and Service HTTP API (3002). Sales and Service keep independent business SQLite databases; `unified-audit.sqlite` stores request-level audit rows plus append-only correlated lifecycle events. Only Unified is publicly accessible through the optional temporary Cloudflare tunnel; source services remain loopback-only.

## Reviewer quick start — complete Kaggle beginner's guide

**No GitHub token, repository URL, SHA, manual Node.js installation or command-line skills required.**

### 1. Create or access a Kaggle account
1. Visit [kaggle.com](https://www.kaggle.com/), select **Register** or **Sign In**, and follow Kaggle's account verification prompts.
2. Navigate to Kaggle **Code / Notebooks**. A Kaggle notebook is a hosted Python environment running in your browser; no installation is required on your computer.

### 2. Import the notebook directly from GitHub (recommended — no download)

1. Open [Kaggle Notebooks](https://www.kaggle.com/code) and create a **New Notebook**.
2. In the notebook editor open **File → Import Notebook** (the wording may differ slightly between Kaggle layouts).
3. Choose the **Link** option. Paste this **direct notebook URL**, not only the repository homepage:

   ```text
   https://github.com/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer/blob/main/notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb
   ```

4. Click **Import** and confirm the notebook is loaded with **37 cells (19 Markdown explanations and 18 executable code cells)**.
5. Alternatively, if the import dialog includes a **GitHub** tab, select the repository `dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer` and the file `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`.
6. **Fallback only:** If the Kaggle version you use has no Link/GitHub import, download the notebook file from GitHub using **Raw**, then import/upload the `.ipynb` file through the same Kaggle menu.

**Do not paste the repository homepage URL into the Link import field.** It points to a repository, not the notebook file. You do not need to clone GitHub, enter credentials, or paste code into Kaggle; notebook Run All automatically handles the public source clone.

### 3. Configure the Kaggle session
1. In notebook **Settings / Session options**, choose **Accelerator: None (CPU)**.
2. Turn **Internet: On**. GitHub, npm and Cloudflare require outbound network access.
3. Keep the session connected. You do **not** need any secrets, PAT, Drive mount, GPU, Docker, extra datasets or environment-variable edits.
4. If Internet is unavailable, follow Kaggle's account verification/setup guidance; a network-disabled session cannot reproduce the installation and tunnel steps.

### 4. Run All (without editing any code)
1. Select **Run All** in the notebook's toolbar or **Run** menu. Run All executes Steps 01–17 and then enters the live Step 18 log monitor (37 physical cells including Markdown). Step 18 runs up to 30 minutes; use Kernel Interrupt to stop watching.
2. The notebook automatically clones this public repository, resolves `main` to the exact 40-character SHA for this run, checks it out, prepares Node.js, installs dependencies, initializes three SQLite databases, starts the services, executes automated tests and captures fresh correlation evidence.
3. Look for `SOURCE_REPRODUCIBILITY=PASS`, `TYPECHECK=PASS`, `BUILD=PASS`, `PARALLEL_EXECUTION=PASS`, `SQLITE_AUDIT=PASS`, and `TRACE_CORRELATION=PASS`. Failed assertions stop execution rather than printing fictional PASS results.
4. No manual URL or SHA entry is required. Advanced overrides `KEYLOOP_REPO_URL`, `KEYLOOP_GIT_SHA` and `KEYLOOP_ENABLE_TUNNEL=0` are **optional**. The exact resolved commit is printed in Step 17 (final summary).

### Optional alternative — run the same notebook in Google Colab

Kaggle remains the primary reviewer path and the published acceptance evidence was captured there. As an additional reproduction option, the same notebook can also be opened in Google Colab without cloning the repository on your computer.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer/blob/main/notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb)

1. Open the **Open in Colab** link above, or go to [Google Colab](https://colab.research.google.com/) and choose **File → Open notebook → GitHub**.
2. Enter `dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer` and select `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`.
3. Use the standard **CPU** runtime; no GPU or Google Drive mount is required.
4. Select **Runtime → Run all**. The notebook uses a temporary working directory when `/kaggle/working` is unavailable, then follows the same public-source clone, dependency setup, SQLite initialization, test and evidence flow.
5. Colab still needs outbound Internet access for GitHub, npm/Node downloads and the optional Cloudflare Quick Tunnel. The temporary demo URL remains available only while that Colab runtime and tunnel process are alive.

This Colab path is provided for convenience and independent reproduction; it does not replace or rewrite the historical Kaggle acceptance evidence.

### 5. Open the interactive frontend from Step 16
1. Scroll to **Step 16** and look for `TUNNEL_STATUS=AVAILABLE`.
2. Click **Interactive browser demo**, or copy that cell's newly generated `PUBLIC_URL` (an HTTPS `trycloudflare.com` address) into a new browser tab.
3. On the **Unified Document Viewer** page, click a sample VIN chip or paste a sample below. Select **Search documents**.
4. Switch between **All**, **Sales** and **Service**. The **All** tab presents one merged document list; each item shows its originating service.
5. To inspect the backend, append `/api/health/ready`, `/api/demo-vins` or `/api/vehicles/WVWZZZ1JZXW000001/documents` to the current `PUBLIC_URL`. For any returned `requestId`, `/api/observability/requests/<requestId>` returns the persisted chronological lifecycle, summary, and verification checks. Only Unified's port 3000 is public; Sales/Service remain internal.

### 6. Suggested hands-on searches

| VIN | Expected behavior |
|---|---|
| `WVWZZZ1JZXW000001` | 10 documents: 4 Sales and 6 Service (HTTP 200) |
| `WVWZZZ1JZXW000002` | 3 Sales documents (HTTP 200) |
| `WVWZZZ1JZXW000003` | 5 Service documents (HTTP 200) |
| `WVWZZZ1JZXW000004` | Known vehicle with zero documents (HTTP 200) |
| `AAAAAAAAAAAAAAAAA` | Unknown vehicle (HTTP 404) |
| `INVALID` | Input validation error before upstream requests |

### 7. Understand the last notebook cells

| Executable step | Evidence presented |
|---|---|
| 10 | Readiness of all three HTTP services |
| 11 | New Unified API request, mixed-source document table, request ID |
| 12 | Actual HTTP start/end times with positive overlap |
| 13 | Separate, local-only timeout/partial failure integration tests |
| 14 | SQLite audit lookup by the same exact request ID |
| 15 | End-to-end correlated logs, audit verification and timeline chart |
| 16 | Fresh temporary clickable Cloudflare browser demo |
| 17 | Final run summary including the checked-out Git SHA and evidence PASS/FAIL |
| 18 | Live request monitor: Unified/Sales/Service events and correlated SQLite audit every 10 seconds |

Concurrency evidence measures overlapping HTTP request intervals **inside Unified**, not simultaneous CPU execution or the browser-to-Cloudflare latency.

### 8. Troubleshooting and important limitations

- **Cannot import:** download the GitHub **raw .ipynb**, not the rendered HTML; find **Import Notebook** or **Upload** in the editor's File menu.
- **Git/npm/Node download fails:** turn on Kaggle Internet; check account verification and network restrictions, then restart the session and Run All.
- **PORT_BUSY:** a previous notebook execution owns a port; restart that notebook session instead of killing unrelated processes.
- **TUNNEL_STATUS=UNAVAILABLE:** a free Cloudflare Quick Tunnel could not be established; backend and evidence can still PASS independently. Inspect the Step 16 log and retry that cell after connectivity recovers.
- **Demo URL stops working:** keep the Kaggle session active and use the current Step 16 URL. Quick Tunnel addresses are ephemeral, not permanent hosting.
- **A cell fails:** share the first failing cell number, error and resolved Git SHA; do not interpret incomplete outputs as a passing run.

**Data safety:** All fixtures are synthetic; do not enter real customer data. This is an assessment demo, not an authenticated production service.

## Developer setup

The project runs locally with Node.js 24 and SQLite. Docker, an external database, cloud credentials, API keys and GitHub tokens are not required.

### Prerequisites

- Git
- Node.js **24.x** and npm
- `curl` for the verification examples below
- `jq` is optional and is used only for formatted JSON output

The required Node major is pinned in `.nvmrc` and `package.json` (`>=24 <25`).

### 1. Clone the repository

```bash
git clone https://github.com/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer.git
cd Keyloop-Scenario-D-Unified-Document-Viewer
```

### 2. Select Node.js 24

If you use `nvm`:

```bash
nvm install
nvm use
node --version
npm --version
```

`node --version` should report Node.js 24.x. If Node.js 24 is already installed, no version-manager-specific setup is required.

The author's supplied remote development workspace may provide `/mnt/workspace/mise-node-env.sh`; that helper is environment-specific and is **not** required on a normal development machine.

### 3. Install dependencies

```bash
npm ci
```

### 4. Initialize the SQLite databases

```bash
npm run migrate
npm run seed
npm run verify:seed
```

By default these commands use `./data` and prepare three independent databases: `sales.sqlite`, `service.sqlite` and `unified-audit.sqlite`. To use another directory, set `DATA_DIR` consistently for migration, seeding and all three running services.

### 5. Run the development verification suite

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```

### 6. Start the three HTTP services

Open three terminals in the repository root.

**Terminal 1 — Sales API**

```bash
npm run start:sales
```

Expected listener: `SALES_LISTEN=127.0.0.1:3001`.

**Terminal 2 — Service API**

```bash
npm run start:service
```

Expected listener: `SERVICE_LISTEN=127.0.0.1:3002`.

**Terminal 3 — Unified API and reviewer UI**

Start this after Sales and Service are running:

```bash
npm run start:unified
```

Expected listener: `UNIFIED_LISTEN=127.0.0.1:3000`.

The default topology is Browser/API client → Unified `:3000` → Sales `:3001` + Service `:3002`. Sales and Service remain independent HTTP services; Unified calls both and returns the consolidated result.

### 7. Verify the running application

Readiness:

```bash
curl -sS http://127.0.0.1:3000/api/health/ready
```

Known VIN search:

```bash
curl -sS http://127.0.0.1:3000/api/vehicles/WVWZZZ1JZXW000001/documents
```

For formatted JSON, if `jq` is installed:

```bash
curl -sS http://127.0.0.1:3000/api/vehicles/WVWZZZ1JZXW000001/documents | jq .
```

You can also open `http://127.0.0.1:3000/` in a browser. For the sample VIN above, the expected successful response contains 10 documents: 4 from Sales and 6 from Service.

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATA_DIR` | `./data` | Directory containing the three SQLite databases |
| `SALES_HOST` | `127.0.0.1` | Sales API bind address |
| `SALES_PORT` | `3001` | Sales API port |
| `SERVICE_HOST` | `127.0.0.1` | Service API bind address |
| `SERVICE_PORT` | `3002` | Service API port |
| `UNIFIED_HOST` | `127.0.0.1` | Unified API bind address |
| `UNIFIED_PORT` | `3000` | Unified API port |
| `SALES_BASE_URL` | `http://127.0.0.1:3001` | Sales URL used by Unified |
| `SERVICE_BASE_URL` | `http://127.0.0.1:3002` | Service URL used by Unified |
| `UPSTREAM_TIMEOUT_MS` | `2000` | Unified upstream request timeout |

Test fault injection is disabled in regular servers. All bundled fixture data is synthetic.

## Current verification baseline
The current source passes `npm run typecheck`, `npm run lint`, `npm run build`, 27 Node tests, and 15 Python evidence tests. A separate three-process smoke using independent Sales, Service, and Unified processes verified a successful VIN search with 10 documents, 11 persisted lifecycle events, and all derived request-evidence checks true. Current behavior is authoritative in code, [`docs/SYSTEM-DESIGN.md`](docs/SYSTEM-DESIGN.md), ADRs, tests and OpenAPI.

## AI Collaboration Narrative
GenAI assistance was used across architecture comparison, contracts, failure semantics, implementation, test scaffolding, reviewer evidence design, notebook hardening, and the persisted lifecycle addition. Changes are accepted only after repeatable compiler/lint/test/runtime gates. [`docs/AI-COLLABORATION.md`](docs/AI-COLLABORATION.md) describes the areas where AI assisted, the verification discipline applied, and the boundaries of that assistance.

## Scope and assumptions
Synthetic VINs only; 17 characters excluding I/O/Q. A known vehicle with zero documents is not an unknown vehicle. If one upstream fails, successful-source results remain available with `partial=true`; both failing is HTTP 503. PDF rendering and real dealership connections are out of scope.

## Reviewer UI

Start the three services using `npm run start:sales`, `npm run start:service`, and `npm run start:unified` in separate shells after migrate/seed. Open `http://127.0.0.1:3000/`. For optional **private, bounded** request trace files, set `WRITE_TRACE_SUMMARIES=1` for Unified before startup; traces are stored only in `logs/requests/` and are not publicly served. The interface uses local HTML/CSS/JavaScript; the rationale is documented in [`ADR-002`](docs/decisions/ADR-002-local-static-ui.md). Run `npm run test` for API and UI smoke checks.

## Guided Kaggle notebook for first-time reviewers

The notebook contains 19 Markdown explanation cells (one introduction and one immediately above each of 18 executable steps). Start by importing the notebook into Kaggle, selecting CPU, turning Internet ON, and clicking Run All. Each step explains its purpose, expected output and troubleshooting. No manual GitHub URL, SHA or PAT is required. In Step 16, open the automatically generated temporary public demo and test the VIN search and All / Sales / Service filters; Step 17 summarizes the evidence; Step 18 watches new real browser requests every 10 seconds (up to 30 minutes, stop with Interrupt).

## Full captured upstream HTTP response evidence

In Kaggle reviewer mode only, the notebook enables `REVIEWER_PUBLIC_EVIDENCE=1` for Unified. After opening the temporary Cloudflare frontend in Step 16 and searching a synthetic VIN, Step 18 outputs a link for that exact request ID: `PUBLIC_URL/reviewer/requests/<requestId>`. It opens a styled HTML page with **the captured original Sales HTTP JSON, captured original Service HTTP JSON, and actual Unified JSON response** from the same aggregate search; no second VIN lookup is made. Each section includes source status, while the header gives the HTTP interval overlap. The page is an ephemeral, synthetic-only demonstration; it is not an authenticated production debugging endpoint. The in-memory store retains at most 30 requests and is cleared on server restart; a missing or expired ID is HTTP 404. The endpoint is disabled without the explicit flag and in production mode. Do not put credentials or real VIN/customer data in the demo.

### Readable request evidence summary

The same-request `/reviewer/requests/<requestId>` page now opens with a responsive **Request overview** section showing vehicle identity, HTTP outcome, total document count, Sales/Service breakdown, actual source durations, measured HTTP overlap, and the SQLite audit persistence field recorded in the response. Below it, expandable technical sections preserve the original captured Sales, Service and Unified JSON payloads. Error/empty/partial states are derived from the actual response rather than presumed successful. Captures remain ephemeral and synthetic-only.

### Measured request execution chart

The evidence page includes a responsive SVG timeline of Unified, Sales HTTP, and Service HTTP intervals using the four monotonic start/end events from the **same request ID**. It highlights measured overlap and provides an accessible textual description and timing table. Missing or inconsistent events are indicated explicitly; no values are invented. This represents outbound HTTP overlap, not CPU parallelism or browser-to-Cloudflare latency.
