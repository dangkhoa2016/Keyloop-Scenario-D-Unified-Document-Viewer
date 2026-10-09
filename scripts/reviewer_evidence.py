#!/usr/bin/env python3
"""Validate and render evidence from one freshly executed Kaggle notebook request.

All data are loaded from local, run-scoped runtime artifacts. Never invent PASS.
The module makes no HTTP requests and does not expose raw logs publicly.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import math
from pathlib import Path
import re
import sqlite3
from typing import Any

REQUEST_ID = re.compile(r"^req_[a-f0-9-]{36}$")
SOURCES = ("SALES", "SERVICE")


class EvidenceError(AssertionError):
    pass


def check(condition: bool, message: str) -> None:
    if not condition:
        raise EvidenceError(message)


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    check(path.is_file(), f"Missing source log: {path.name}")
    results = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue  # startup banners are not JSON events
        if isinstance(obj, dict):
            results.append(obj)
    return results


def inspect_request(
    request_id: str, trace_dir: Path, audit_db: Path, log_dir: Path,
    *, min_started_at: str | None = None,
) -> dict[str, Any]:
    check(bool(REQUEST_ID.fullmatch(request_id)), "Invalid request ID format")
    trace_file = trace_dir / f"{request_id}.json"
    check(trace_file.is_file(), "Trace does not exist for this request ID")
    trace = json.loads(trace_file.read_text(encoding="utf-8"))
    check(trace.get("requestId") == request_id, "Trace request ID mismatch")
    check(bool(trace.get("auditPersisted")), "Trace reports audit persistence failure")
    check(bool(trace.get("vin")), "Trace VIN missing")
    started_at = trace.get("startedAt")
    check(isinstance(started_at, str), "Trace start time missing")
    if min_started_at:
        check(
            dt.datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            >= dt.datetime.fromisoformat(min_started_at.replace("Z", "+00:00")),
            "Stale trace: request predates this notebook run",
        )
    check(audit_db.is_file(), "Audit SQLite database missing")
    connection = sqlite3.connect(f"file:{audit_db.resolve()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        record = connection.execute(
            "SELECT * FROM request_audit WHERE request_id = ?", (request_id,)
        ).fetchone()
    finally:
        connection.close()
    check(record is not None, "No matching persistent SQLite audit row")
    audit = dict(record)
    check(audit["vin"] == trace["vin"], "Trace and audit VIN mismatch")
    check(audit["total_document_count"] == trace["documentCount"], "Document count mismatch")
    check(audit["sales_status"] == trace["sourceStatus"]["sales"], "Sales status mismatch")
    check(audit["service_status"] == trace["sourceStatus"]["service"], "Service status mismatch")
    check(audit["partial_result"] in (0, 1), "Invalid partial-result flag")
    check(audit["response_status"] in (200, 404, 503), "Invalid HTTP outcome in audit")
    events = trace.get("events", [])
    indexed: dict[tuple[str, str], float] = {}
    for event in events:
        key = (event.get("source"), event.get("event"))
        check(key[0] in SOURCES and key[1] in ("started", "completed"), "Unknown timeline event")
        check(key not in indexed, "Duplicate timeline event")
        value = event.get("offsetMs")
        check(isinstance(value, (int, float)) and math.isfinite(value) and value >= 0, "Invalid timeline offset")
        indexed[key] = float(value)
    check(len(indexed) == 4, "Expected exactly four source start/end events")
    start = {s: indexed[(s, "started")] for s in SOURCES}
    end = {s: indexed[(s, "completed")] for s in SOURCES}
    check(all(end[s] > start[s] for s in SOURCES), "Non-positive source interval")
    overlap = max(0, min(end.values()) - max(start.values()))
    check(overlap > 0, "No actual HTTP request interval overlap")
    check(max(start.values()) < min(end.values()), "Sequential rather than overlapping source calls")
    check(abs(overlap - float(trace.get("overlapMs", -1))) < 0.05, "Incorrect recorded overlap")
    check(float(trace["totalDurationMs"]) >= max(end.values()) - 0.05, "End event exceeds request duration")
    check(abs(float(audit["total_duration_ms"]) - float(trace["totalDurationMs"])) < 0.05, "Audit duration mismatch")
    log_evidence = {}
    for source in ("sales", "service", "unified"):
        events_for_id = [e for e in read_jsonl(log_dir / f"{source}-runtime.log") if e.get("requestId") == request_id]
        needed = {"unified": ("aggregation_completed",), "sales": ("request_received", "response_sent"), "service": ("request_received", "response_sent")}[source]
        check(all(any(e.get("event") == name for e in events_for_id) for name in needed), f"{source}: missing correlated log events")
        log_evidence[source] = [{"timestamp": e.get("timestamp"), "event": e.get("event"), "documentCount": e.get("documentCount")} for e in events_for_id if e.get("event") in needed]
    for source in ("sales", "service"):
        emitted = next(e for e in log_evidence[source] if e["event"] == "response_sent")
        expected = audit[f"{source}_document_count"]
        check(emitted["documentCount"] == expected, f"{source} document count in log differs from audit")
    return {
        "requestId": request_id,
        "vin": trace["vin"],
        "startedAt": started_at,
        "completedAt": trace["completedAt"],
        "httpStatus": audit["response_status"],
        "partial": bool(audit["partial_result"]),
        "totalDocumentCount": audit["total_document_count"],
        "totalDurationMs": float(trace["totalDurationMs"]),
        "overlapMs": overlap,
        "parallelExecution": True,
        "auditVerified": True,
        "sourceStatus": trace["sourceStatus"],
        "sourceDocumentCounts": {
            "sales": audit["sales_document_count"],
            "service": audit["service_document_count"],
        },
        "intervals": {s: {"startedMs": start[s], "completedMs": end[s], "durationMs": end[s] - start[s]} for s in SOURCES},
        "correlatedLogs": log_evidence,
    }


def print_report(data: dict[str, Any]) -> None:
    print("KEYLOOP OPTION D — END-TO-END REQUEST TRACE")
    print(f"Request ID: {data['requestId']}")
    print(f"VIN: {data['vin']}")
    print(f"Request UTC: {data['startedAt']}")
    for source in SOURCES:
        t = data["intervals"][source]
        print(f"Unified -> {source} start +{t['startedMs']:.3f} ms; finish +{t['completedMs']:.3f} ms; duration {t['durationMs']:.3f} ms")
        entries = data["correlatedLogs"][source.lower()]
        print(f"{source} log: " + " | ".join(f"{e['event']}={e['timestamp']}" for e in entries))
    print(f"Client response: HTTP {data['httpStatus']}, documents={data['totalDocumentCount']}, total={data['totalDurationMs']:.3f} ms")
    print(f"Interval overlap: {data['overlapMs']:.3f} ms")
    print("SQLITE_AUDIT=PASS" if data["auditVerified"] else "SQLITE_AUDIT=FAIL")
    print("TRACE_CORRELATION=PASS")
    print("PARALLEL_EXECUTION=PASS" if data["parallelExecution"] else "PARALLEL_EXECUTION=FAIL")


def render_timeline(data: dict[str, Any], destination: Path) -> Path:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(10, 3))
    for row, source in enumerate(SOURCES):
        x = data["intervals"][source]
        ax.broken_barh([(x["startedMs"], x["durationMs"])], (row - 0.25, 0.5))
    ax.set_yticks([0, 1], labels=list(SOURCES))
    ax.set_ylim(-0.6, 1.6)
    ax.set_xlabel("Elapsed time since Unified received request (ms)")
    ax.set_title(f"Real HTTP overlap {data['overlapMs']:.2f} ms — {data['requestId'][:16]}")
    ax.grid(True, axis="x", alpha=.25)
    fig.tight_layout()
    destination.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(destination, dpi=140)
    plt.close(fig)
    return destination


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--request-id", required=True)
    parser.add_argument("--trace-dir", type=Path, required=True)
    parser.add_argument("--audit-db", type=Path, required=True)
    parser.add_argument("--log-dir", type=Path, required=True)
    parser.add_argument("--min-started-at")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--timeline", type=Path)
    args = parser.parse_args()
    data = inspect_request(args.request_id, args.trace_dir, args.audit_db, args.log_dir, min_started_at=args.min_started_at)
    print_report(data)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    if args.timeline:
        print(f"TIMELINE_PNG={render_timeline(data, args.timeline)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (EvidenceError, ValueError, KeyError, sqlite3.Error) as error:
        print(f"EVIDENCE_VERIFICATION=FAIL reason={error}")
        raise SystemExit(1)
