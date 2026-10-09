# Keyloop Scenario D — 5–10 minute submission video plan

**Status:** Recording and upload have **not** been completed. This is a storyboard to use when recording, not proof of a recorded video.

| Time | On-screen demonstration | Reviewer takeaway |
|---|---|---|
| 0:00–0:45 | State Scenario D: one VIN, two independent Sales and Service sources | Clearly scope metadata consolidation, not PDF binaries |
| 0:45–1:45 | Open System Design architecture diagram: browser → Unified :3000 → Sales :3001 and Service :3002 → three isolated SQLite databases | Two sources, three HTTP services; separate audit SQLite |
| 1:45–2:45 | Open public GitHub README and Kaggle notebook file; show the import instruction and 35 cells / 17 steps | Reviewer can reproduce without manual SHA, credentials or Docker |
| 2:45–3:45 | Show CPU, Internet On, Run All and exact resolved public SHA | Immutable SHA is captured per run; report only fresh visible success |
| 3:45–5:00 | In Step 16 use **current verified** Cloudflare URL; test synthetic VIN and All / Sales / Service filters | Consolidated list preserves source badges and accessible status hints |
| 5:00–6:30 | Show Step 11 search result, Step 12 monotonic interval overlap, Step 15 timeline and SQLite audit matching request ID | Concurrency means overlapping outbound HTTP intervals, not CPU parallelism |
| 6:30–7:30 | Demonstrate known empty vehicle, unknown VIN, and isolated one-source failure test outcome | Clear 200 empty vs 404 unknown vs partial HTTP 200 vs both down 503 |
| 7:30–8:30 | Show automated Node/Python tests, System Design and AI collaboration notes | Human review + reproducible correctness checks |
| 8:30–9:00 | Explain limitations: mocked SQLite, temporary tunnel, metadata only, no production auth/PDF renderer | Accurate engineering tradeoffs |

**Capture checklist:** screen-record the actual Kaggle imported notebook; make sure no account credentials, session secrets, API tokens or unrelated browser tabs appear. Capture the full fresh SHA, fresh request ID, timeline chart, audit row and interactive UI. Confirm the recording is 5–10 minutes and playable before marking the video deliverable complete.
