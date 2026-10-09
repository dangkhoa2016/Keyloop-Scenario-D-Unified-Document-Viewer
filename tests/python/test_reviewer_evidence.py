import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
from reviewer_evidence import inspect_request, EvidenceError

RID = "req_83ceea56-76da-4637-9818-eb4ce0ae838f"

class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root/"logs"/"requests").mkdir(parents=True)
        self.trace = dict(requestId=RID, vin="WVWZZZ1JZXW000001", startedAt="2026-10-09T01:37:33Z",
            completedAt="2026-10-09T01:37:33.020Z", auditPersisted=True, documentCount=10,
            totalDurationMs=8.0, overlapMs=4.0, sourceStatus={"sales":"SUCCESS","service":"SUCCESS"},
            events=[dict(source="SALES",event="started",offsetMs=0.2),dict(source="SERVICE",event="started",offsetMs=1.0),
                    dict(source="SALES",event="completed",offsetMs=6.2),dict(source="SERVICE",event="completed",offsetMs=5.0)])
        self.write_trace()
        self.db = self.root / "audit.sqlite"
        with sqlite3.connect(self.db) as db:
            db.execute("""CREATE TABLE request_audit(request_id TEXT,vin TEXT,total_document_count INT,sales_status TEXT,service_status TEXT,
                sales_document_count INT,service_document_count INT,total_duration_ms REAL,partial_result INT,response_status INT)""")
            db.execute("INSERT INTO request_audit VALUES (?,?,?,?,?,?,?,?,?,?)", (RID,self.trace["vin"],10,"SUCCESS","SUCCESS",4,6,8.0,0,200))
        for service,count in (("sales",4),("service",6)):
            rows=[{"requestId":RID,"event":"request_received","timestamp":"2026-10-09T01:37:33Z"},
                  {"requestId":RID,"event":"response_sent","timestamp":"2026-10-09T01:37:33Z","documentCount":count}]
            (self.root/"logs"/f"{service}-runtime.log").write_text("\n".join(map(json.dumps,rows)))
        (self.root/"logs"/"unified-runtime.log").write_text(json.dumps({"requestId":RID,"event":"aggregation_completed","timestamp":"2026-10-09T01:37:33Z"}))
    def write_trace(self):
        (self.root/"logs"/"requests"/f"{RID}.json").write_text(json.dumps(self.trace))
    def inspect(self, **kw):
        return inspect_request(RID, self.root/"logs"/"requests", self.db, self.root/"logs", **kw)
    def tearDown(self): self.temp.cleanup()
    def test_valid_correlation_and_overlap(self):
        result=self.inspect(min_started_at="2026-10-09T01:37:00Z")
        self.assertTrue(result["parallelExecution"]); self.assertEqual(result["overlapMs"],4)
        self.assertEqual(result["totalDocumentCount"],10)
    def test_rejects_sequential_calls(self):
        self.trace["events"][1]["offsetMs"]=6.3
        self.trace["events"][3]["offsetMs"]=7.3
        self.trace["overlapMs"]=0
        self.write_trace()
        with self.assertRaisesRegex(EvidenceError, "No actual"): self.inspect()
    def test_rejects_stale_request(self):
        with self.assertRaisesRegex(EvidenceError,"Stale"):self.inspect(min_started_at="2026-10-09T02:00:00Z")
    def test_rejects_wrong_count(self):
        self.trace["documentCount"]=11;self.write_trace()
        with self.assertRaisesRegex(EvidenceError,"Document count mismatch"):self.inspect()
    def test_rejects_missing_source_log(self):
        (self.root/"logs"/"sales-runtime.log").unlink()
        with self.assertRaisesRegex(EvidenceError,"Missing source log"):self.inspect()
    def test_rejects_tampered_overlap(self):
        self.trace["overlapMs"]=12;self.write_trace()
        with self.assertRaisesRegex(EvidenceError,"Incorrect recorded overlap"):self.inspect()
    def test_rejects_bad_id(self):
        with self.assertRaisesRegex(EvidenceError,"Invalid request ID"):inspect_request("../etc/passwd",self.root,self.db,self.root)
if __name__=="__main__":unittest.main()
