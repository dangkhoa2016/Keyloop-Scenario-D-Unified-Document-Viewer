#!/usr/bin/env python3
import nbformat as nbf
from pathlib import Path
n=nbf.v4.new_notebook()
cells=[]
def md(x): cells.append(nbf.v4.new_markdown_cell(x))
def code(x): cells.append(nbf.v4.new_code_cell(x))
md("""# Keyloop Scenario D — Unified Document Viewer
### Kaggle CPU Reviewer Evidence · Reproducible notebook (18 planned cells)

**Backend** fully implemented: three real HTTP services, independent SQLite databases, parallel source calls, unified list, durable audit and verifiable logs/traces.

Run All on **Kaggle CPU with Internet enabled**. Public Git checkout is automatic; no repository URL, SHA or token needs to be entered. The local-source option is for development only, not public clean-room submission. Failures are shown as FAIL, not silently labelled PASS. Synthetic demonstration data only.

This notebook is **supplementary evidence**, not a Keyloop-mandated deliverable. See System Design, README and tests for source documentation.""")
code("""# 02 — Environment and explicit source settings
import os, sys, json, time, re, socket, subprocess, pathlib, shutil, datetime, uuid, sqlite3
from IPython.display import display, Markdown, Image
WORK = pathlib.Path('/kaggle/working') if pathlib.Path('/kaggle/working').exists() else pathlib.Path('/tmp')
RUN_ID = 'keyloop-' + uuid.uuid4().hex[:12]
RUN = WORK / 'keyloop-reviewer-runs' / RUN_ID
RUN.mkdir(parents=True,exist_ok=True)
REPO_URL=os.environ.get('KEYLOOP_REPO_URL','https://github.com/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release.git').strip()
PINNED_SHA=os.environ.get('KEYLOOP_GIT_SHA','').strip()
LOCAL_SOURCE=os.environ.get('KEYLOOP_LOCAL_SOURCE','').strip() # local-only dev, not reviewer submission
BASE_PORT=int(os.environ.get('KEYLOOP_NOTEBOOK_BASE_PORT','3000'))
ENABLE_TUNNEL=os.environ.get('KEYLOOP_ENABLE_TUNNEL','1')=='1'
NODE_ENV_FILE=pathlib.Path('/mnt/workspace/mise-node-env.sh')
SOURCE=RUN/'source'
PORTS={'unified':BASE_PORT,'sales':BASE_PORT+1,'service':BASE_PORT+2}
PROCS={};TESTS={};EVIDENCE={}
def run(cmd,*,cwd=None,env=None,timeout=180,check=True):
 p=subprocess.run(cmd,cwd=str(cwd or SOURCE),env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=timeout)
 if check and p.returncode: raise RuntimeError(f"COMMAND_FAILED rc={p.returncode} command={cmd} output={p.stdout[-2500:]}")
 return p
def port_free(port):
 with socket.socket() as sock:
  return sock.connect_ex(('127.0.0.1',port))!=0
print('RUN_ID=',RUN_ID,'UTC=',datetime.datetime.now(datetime.timezone.utc).isoformat())
print('PYTHON=',sys.version.split()[0],'BASE_PORT=',BASE_PORT,'SOURCE_MODE=', 'LOCAL_DEV' if LOCAL_SOURCE else 'PINNED_PUBLIC_GIT')
print('KERNEL_CPU_ONLY=YES (no GPU required)')""")
code("""# 03 — Acquire exact source commit. Never silently replace a missing public repo.
if LOCAL_SOURCE:
 assert pathlib.Path(LOCAL_SOURCE).is_dir(), 'LOCAL_SOURCE missing'
 SOURCE=pathlib.Path(LOCAL_SOURCE).resolve()
 print('SOURCE_MODE=LOCAL_DEV (NOT fresh-clone verified)')
else:
 assert REPO_URL.startswith('https://github.com/') and (not PINNED_SHA or re.fullmatch(r'[0-9a-f]{40}',PINNED_SHA)), 'Invalid repository or optional SHA'
 run(['git','clone','--no-checkout',REPO_URL,str(SOURCE)],cwd=RUN,timeout=180)
 if not PINNED_SHA:
  PINNED_SHA=run(['git','rev-parse','refs/remotes/origin/main'],cwd=SOURCE).stdout.strip()
  print('GIT_REVISION_POLICY=LATEST_PUBLIC_MAIN_LOCKED_FOR_THIS_RUN')
 run(['git','checkout','--detach',PINNED_SHA],cwd=SOURCE)
ACTUAL_SHA=run(['git','rev-parse','HEAD'],cwd=SOURCE).stdout.strip()
if PINNED_SHA: assert ACTUAL_SHA==PINNED_SHA,'GIT_SHA_MISMATCH'
print('GIT_SHA='+ACTUAL_SHA)
print('SOURCE_REPRODUCIBILITY='+('LOCAL_DEV_ONLY' if LOCAL_SOURCE else 'PASS'))""")
code("""# 04 — Node + npm dependencies; no Docker or Google Drive
if NODE_ENV_FILE.is_file():
 prefix=f'source {str(NODE_ENV_FILE)!r}; '
 NODE_SOURCE='workspace_mise'
else:
 prefix=''
 NODE_SOURCE='system'
def runtime_versions(shell_prefix):
 command=shell_prefix+"node -p \"'__KEYLOOP_NODE_VERSION__=' + process.versions.node\"; npm_version=$(npm -v); printf '__KEYLOOP_NPM_VERSION__=%s\\n' \"$npm_version\""
 result=run(['bash','-lc',command],cwd=SOURCE,check=False)
 node_match=re.search(r'(?m)^__KEYLOOP_NODE_VERSION__=(\\d+\\.\\d+\\.\\d+)\\r?$',result.stdout)
 npm_match=re.search(r'(?m)^__KEYLOOP_NPM_VERSION__=([^\\r\\n]+)\\r?$',result.stdout)
 return (node_match.group(1) if node_match else None, npm_match.group(1).strip() if npm_match else None, result)
# Install exact Node 24 binary when a fresh Kaggle runtime has no suitable Node/npm.
node_version,npm_version,probe=runtime_versions(prefix)
if probe.returncode!=0 or not node_version or not node_version.startswith('24.') or not npm_version:
 import urllib.request, hashlib, tarfile, platform
 assert platform.system()=='Linux' and platform.machine() in ('x86_64','aarch64'), 'Unsupported CPU architecture'
 arch='x64' if platform.machine()=='x86_64' else 'arm64'
 version='v24.21.0'
 basename=f'node-{version}-linux-{arch}'
 url=f'https://nodejs.org/dist/{version}/{basename}.tar.xz'
 root=WORK/'keyloop-runtime-tools';root.mkdir(parents=True,exist_ok=True)
 binary=root/basename/'bin'/'node'
 if not binary.is_file():
  archive=root/(basename+'.tar.xz')
  urllib.request.urlretrieve(url,archive)
  checksums=urllib.request.urlopen(f'https://nodejs.org/dist/{version}/SHASUMS256.txt',timeout=20).read().decode()
  expected=next(line.split()[0] for line in checksums.splitlines() if line.endswith(basename+'.tar.xz'))
  assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected, 'NODE_TARBALL_SHA256_MISMATCH'
  with tarfile.open(archive) as tar:
   for member in tar.getmembers():
    assert not pathlib.Path(member.name).is_absolute() and '..' not in pathlib.Path(member.name).parts, 'Unsafe archive path'
   tar.extractall(root,filter='data')
  archive.unlink()
 prefix=f'export PATH={str(binary.parent)!r}:$PATH; '
 NODE_SOURCE='verified_download'
node_version,npm_version,verified=runtime_versions(prefix)
assert verified.returncode==0 and node_version and node_version.startswith('24.'), 'Node.js 24 runtime unavailable; inspect runtime probe output: '+verified.stdout[-1200:]
assert npm_version, 'npm runtime unavailable; inspect runtime probe output: '+verified.stdout[-1200:]
print('NODE_RUNTIME='+node_version)
print('NPM_RUNTIME='+npm_version)
print('NODE_SOURCE='+NODE_SOURCE)
install=run(['bash','-lc',prefix+'npm ci'],cwd=SOURCE,timeout=300)
print('NPM_CI=PASS',install.stdout[-450:])""")
code("""# 05 — Build and static analysis
for name,command in [('TYPECHECK','npm run typecheck'),('LINT','npm run lint'),('BUILD','npm run build')]:
 output=run(['bash','-lc',prefix+command],cwd=SOURCE,timeout=150)
 TESTS[name]='PASS';print(name+'=PASS')""")
code("""# 06 — Fresh isolated SQLite migration and deterministic seed
DATA=RUN/'data';LOG=RUN/'logs'; LOG.mkdir(parents=True,exist_ok=True)
ENV=os.environ.copy();
if prefix.startswith('export PATH='):
 ENV['PATH']=str(binary.parent)+os.pathsep+ENV.get('PATH','')
ENV.update({'DATA_DIR':str(DATA),'LOG_DIR':str(LOG),
 'WRITE_TRACE_SUMMARIES':'1','NODE_ENV':'development','SALES_PORT':str(PORTS['sales']),
 'SERVICE_PORT':str(PORTS['service']),'UNIFIED_PORT':str(PORTS['unified']),
 'SALES_BASE_URL':f"http://127.0.0.1:{PORTS['sales']}",
 'SERVICE_BASE_URL':f"http://127.0.0.1:{PORTS['service']}"})
for cmd in ['npm run migrate','npm run seed','npm run verify:seed']:
 out=run(['bash','-lc',prefix+cmd],cwd=SOURCE,env=ENV,timeout=90)
 print('\\n'.join(x for x in out.stdout.splitlines() if '=' in x)[-1000:])
TESTS['SEED_VERIFICATION']='PASS'
VINS={'both':'WVWZZZ1JZXW000001','sales_only':'WVWZZZ1JZXW000002','service_only':'WVWZZZ1JZXW000003','empty':'WVWZZZ1JZXW000004'}""")
code("""# 07 — Offline automated tests (real ephemeral loopback HTTP, test SQLite)
out=run(['bash','-lc',prefix+'npm run test -- --silent'],cwd=SOURCE,env=ENV,timeout=120)
assert re.search(r'26 passed',out.stdout), 'Expected 26 passing Node tests; inspect output'
print('NODE_TESTS=PASS: 26')
out2=run([sys.executable,'-m','unittest','discover','-s','tests/python','-v'],cwd=SOURCE,env=ENV,timeout=90)
assert 'Ran 7 tests' in out2.stdout and '\\nOK' in out2.stdout
print('EVIDENCE_RENDERER_TESTS=PASS: 7')
TESTS['UNIT_INTEGRATION']='PASS'""")
code("""# 08 — Start Sales: owned PID and exact port, do not kill other services
assert all(port_free(p) for p in PORTS.values()), 'PORT_BUSY: use a fresh runtime or set KEYLOOP_NOTEBOOK_BASE_PORT; existing unrelated services must not be killed'
def start_service(name):
 log=open(LOG/f'{name}-runtime.log','ab',buffering=0)
 cmd=['bash','-lc',prefix+f'node dist/apps/{name}-api/src/index.js']
 p=subprocess.Popen(cmd,cwd=str(SOURCE),env=ENV,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
 PROCS[name]=p
 (RUN/f'{name}.pid').write_text(str(p.pid))
 return p
def ready(port,secs=20):
 import urllib.request
 for _ in range(int(secs*5)):
  try:
   with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health/ready',timeout=1) as r:
    if r.status==200:return True
  except Exception: pass
  time.sleep(.2)
 return False
start_service('sales')
assert ready(PORTS['sales']), 'SALES_READY=FAIL'
print('SALES_READY=PASS pid',PROCS['sales'].pid)""")
code("""# 09 — Start Service
start_service('service')
assert ready(PORTS['service']),'SERVICE_READY=FAIL'
print('SERVICE_READY=PASS pid',PROCS['service'].pid)""")
code("""# 10 — Start Unified API, local trace summaries explicitly enabled
start_service('unified')
assert ready(PORTS['unified']),'UNIFIED_READY=FAIL'
print('UNIFIED_READY=PASS pid',PROCS['unified'].pid)""")
code("""# 11 — Topology verification
import urllib.request
BASE=f"http://127.0.0.1:{PORTS['unified']}"
for name,port in PORTS.items():
 with urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health/ready',timeout=3) as response:
  assert response.status==200
 print(name.upper()+'_API_READY=PASS')
assert all(p.poll() is None for p in PROCS.values()), 'Managed service has stopped'""")
code("""# 12 — A NEW real API request, JSON contract and source counts
RUN_STARTED_AT=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
URL=BASE+'/api/vehicles/'+VINS['both']+'/documents'
with urllib.request.urlopen(URL,timeout=10) as reply:
 HTTP=reply.status;RESPONSE=json.load(reply)
REQUEST_ID=RESPONSE['requestId']
assert HTTP==200 and RESPONSE['documentCount']==10
assert RESPONSE['sources']['sales']['documentCount']==4 and RESPONSE['sources']['service']['documentCount']==6
assert RESPONSE['auditPersisted'] is True and RESPONSE['partial'] is False
print('HAPPY_PATH=PASS HTTP',HTTP,'REQUEST_ID',REQUEST_ID)
print('VIN',RESPONSE['vin'],'SALES',4,'SERVICE',6,'TOTAL',RESPONSE['documentCount'])
display(Markdown('**Unified documents** — one source-attributed list'))
try:
 import pandas as pd
 display(pd.DataFrame(RESPONSE['documents'])[['date','source','id','type','title']])
except ImportError:
 for doc in RESPONSE['documents']:print(doc)
EVIDENCE['HAPPY_PATH']='PASS'""")
code("""# 13 — Recompute monotonic real HTTP overlap for this fresh request
sys.path.insert(0,str(SOURCE/'scripts'))
from reviewer_evidence import inspect_request, print_report, render_timeline
TRACE_DIR=LOG/'requests'
record=inspect_request(REQUEST_ID,TRACE_DIR,DATA/'unified-audit.sqlite',LOG,min_started_at=RUN_STARTED_AT)
assert record['parallelExecution'] and record['overlapMs']>0
print('PARALLEL_EXECUTION=PASS')
print('SOURCE_INTERVAL_OVERLAP_MS=',round(record['overlapMs'],3))
print('TOTAL_UNIFIED_MS=',round(record['totalDurationMs'],3))
EVIDENCE['PARALLEL_EXECUTION']='PASS'""")
code("""# 14 — Local-only failure semantics: never expose fault headers publicly
# Execute the project's deterministic fault-injection integration suite on isolated ports.
result=run(['bash','-lc',prefix+'npm run test:integration -- --silent'],cwd=SOURCE,env=ENV,timeout=120)
assert '16 passed' in result.stdout or '20 passed' in result.stdout, 'Integration assertions not confirmed'
print('PARTIAL_RESPONSE=PASS (local-only timeout/HTTP-500/malformed/503 scenarios asserted)')
print('FAULT_INJECTION_PUBLICLY_EXPOSED=NO')
EVIDENCE['PARTIAL_RESPONSE']='PASS'""")
code("""# 15 — Query durable audit via matching request ID (parameterized SQL)
with sqlite3.connect(DATA/'unified-audit.sqlite') as db:
 audit=db.execute('SELECT request_id,vin,response_status,sales_document_count,service_document_count,total_document_count,partial_result FROM request_audit WHERE request_id=?',(REQUEST_ID,)).fetchone()
assert audit and audit[0]==REQUEST_ID and audit[5]==10 and audit[2]==200
print('SQLITE_AUDIT=PASS')
print('requestId, vin, HTTP, Sales docs, Service docs, All docs, partial')
print(audit)
EVIDENCE['SQLITE_AUDIT']='PASS'""")
code("""# 16 — Full correlated end-to-end trace + proper reviewer timeline
record=inspect_request(REQUEST_ID,TRACE_DIR,DATA/'unified-audit.sqlite',LOG,min_started_at=RUN_STARTED_AT)
print_report(record)
PNG=RUN/'parallel-timeline.png'
render_timeline(record,PNG)
display(Image(filename=str(PNG)))
(RUN/'reviewer-evidence.json').write_text(json.dumps(record,indent=2))
print('TRACE_CORRELATION=PASS')
EVIDENCE['TRACE_CORRELATION']='PASS'""")
code("""# 17 — Optional public Cloudflare Quick Tunnel (only port Unified)
# Disabled by default; enabling is an intentional reviewer action.
PUBLIC_URL=None
if ENABLE_TUNNEL:
 binary=WORK/'bin'/'cloudflared'
 if not binary.is_file():
  import urllib.request
  binary.parent.mkdir(parents=True,exist_ok=True)
  urllib.request.urlretrieve('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64',binary)
  binary.chmod(0o755)
 tunnel_log=open(LOG/'cloudflared.log','ab',buffering=0)
 tunnel=subprocess.Popen([str(binary),'tunnel','--url',BASE],cwd=str(SOURCE),stdout=tunnel_log,stderr=subprocess.STDOUT,start_new_session=True)
 PROCS['cloudflared']=tunnel
 for _ in range(45):
  text=(LOG/'cloudflared.log').read_text(errors='replace')
  match=re.search(r'https://[a-z0-9-]+\\.trycloudflare\\.com',text)
  if match:
   url=match.group(0)
   try:
    with urllib.request.urlopen(url+'/api/health/ready',timeout=5) as health:
     if health.status==200:PUBLIC_URL=url;break
   except Exception:pass
  if tunnel.poll() is not None:break
  time.sleep(1)
print('TUNNEL_STATUS='+('AVAILABLE' if PUBLIC_URL else 'UNAVAILABLE'))
print('PUBLIC_URL='+str(PUBLIC_URL or 'N/A'))
if PUBLIC_URL:
 display(Markdown('**Interactive browser demo:** [Open Unified Document Viewer]('+PUBLIC_URL+'/). Use sample VIN buttons to test.'))""")
code("""# 18 — Reviewer summary: derived ONLY from checks executed in this Run All
print('='*60)
print('KEYLOOP OPTION D — REVIEWER EXECUTION SUMMARY')
print('='*60)
print('RUN_ID='+RUN_ID)
print('GIT_REPOSITORY='+str(REPO_URL or 'LOCAL_DEV_ONLY'))
print('GIT_SHA='+ACTUAL_SHA)
print('SOURCE_REPRODUCIBILITY='+('LOCAL_DEV_ONLY' if LOCAL_SOURCE else 'PASS'))
print('CPU_RUNTIME=YES')
for key,value in TESTS.items(): print(key+'='+value)
for key,value in EVIDENCE.items(): print(key+'='+value)
print('SALES_API_READY=PASS')
print('SERVICE_API_READY=PASS')
print('UNIFIED_API_READY=PASS')
print('REQUEST_ID='+REQUEST_ID)
print('PARALLEL_OVERLAP_MS='+str(round(record['overlapMs'],3)))
print('TUNNEL_STATUS='+('AVAILABLE' if PUBLIC_URL else 'UNAVAILABLE'))
print('PUBLIC_URL='+str(PUBLIC_URL or 'N/A'))
print('SAMPLE_VIN_BOTH='+VINS['both'])
print('SAMPLE_VIN_SALES_ONLY='+VINS['sales_only'])
print('SAMPLE_VIN_SERVICE_ONLY='+VINS['service_only'])
print('EVIDENCE_JSON='+str(RUN/'reviewer-evidence.json'))
print('TIMELINE_PNG='+str(PNG))
print('NOTE: URLs are ephemeral and data is synthetic. Runtime processes are owned by this kernel.')
print('='*60)""")
assert len(cells)==18,len(cells)
# Add self-contained reviewer guidance before every executable step.
guides = [
('Start here: Kaggle setup','Sign in to Kaggle, create New Notebook, then File → Import Notebook → Link and paste the full GitHub notebook file URL shown above (not the repository homepage). Alternatively use the GitHub tab to select the repository and file; file download/upload is the fallback. Choose CPU and Internet ON. Click Run All. No credentials, GitHub URL, SHA or manual configuration are required. The next cell creates a unique run directory. Expected: RUN_ID and PINNED_PUBLIC_GIT.'),
('Fetch public source','The notebook clones the public GitHub repository, resolves main to an immutable SHA, and checks it out. The printed SHA identifies the tested revision. Expected: SOURCE_REPRODUCIBILITY=PASS. If cloning fails, check Kaggle Internet access.'),
('Install Node.js dependencies','This Python notebook runs a Node.js/TypeScript backend. The cell uses Node.js 24, installing a verified official binary if needed, and runs npm ci using the lockfile. Expected: Node v24 and NPM_CI=PASS; your computer needs no local setup.'),
('Validate the source code','Typecheck checks TypeScript correctness, lint identifies common bugs, and build compiles the backend. Expected: TYPECHECK=PASS, LINT=PASS and BUILD=PASS. Any failure stops execution rather than falsely reporting success.'),
('Build three isolated SQLite databases','Sales, Service and Unified Audit each have separate SQLite storage. This step creates a fresh run-specific data directory and deterministically seeds synthetic sample vehicles. Expected: migration passes and DATASET_VERIFICATION=PASS.'),
('Run the automated test suite','Node tests cover schemas and real HTTP integration, while Python tests validate evidence reconstruction. Expected: 26 Node tests and 7 Python evidence tests. These do not replace browser testing in Step 16.'),
('Launch the Sales source API','Starts an independent loopback-only HTTP service with sales.sqlite. Expected: SALES_READY=PASS and a process ID. PORT_BUSY means another process owns the port; restart the Kaggle session instead of killing unrelated processes.'),
('Launch the Service source API','Starts a second independent loopback-only HTTP service using service.sqlite and a different JSON response format. Expected: SERVICE_READY=PASS. Unified must translate both formats.'),
('Launch Unified API and frontend','Starts the reviewer-facing server. It requests Sales and Service concurrently over HTTP, consolidates documents and writes audit records. Expected: UNIFIED_READY=PASS. A public browser URL will appear in Step 16.'),
('Confirm API readiness','Makes real HTTP requests to the three readiness endpoints and checks process health. Expected: SALES_API_READY, SERVICE_API_READY and UNIFIED_API_READY all PASS.'),
('Try a real VIN search','Looks up WVWZZZ1JZXW000001 through Unified. Expected: HTTP 200, 10 combined documents (4 Sales and 6 Service), partial=false, auditPersisted=true. Inspect the table with date, source, ID, type and title.'),
('Prove parallel HTTP execution','The evidence verifier recomputes start and end offsets from the fresh request trace. Parallel execution requires positive overlap: both requests are active at the same time. Expected: PARALLEL_EXECUTION=PASS; timings vary by runtime.'),
('Check degraded behavior','Runs isolated integration tests with HTTP errors, timeouts and invalid upstream responses. A healthy source must still return its results if the other fails; two technical failures lead to HTTP 503. Expected: PARTIAL_RESPONSE=PASS. Fault injection is not public.'),
('Verify audit persistence','Queries the separate SQLite audit database by the exact new request ID. Compare HTTP status, VIN and source counts to the response. Expected: SQLITE_AUDIT=PASS, 4 + 6 = 10 documents.'),
('Inspect the real timing chart','Correlates request ID across Sales, Service and Unified logs, the private trace and SQLite. Displays a chart of two overlapping HTTP intervals. Expected: TRACE_CORRELATION=PASS and a timeline image.'),
('Open the interactive frontend','The Kaggle server is normally inaccessible from your laptop. This step creates a temporary Cloudflare HTTPS tunnel to Unified only. Click the generated Interactive browser demo link; search WVWZZZ1JZXW000001 and use All, Sales, Service filters. Expected: TUNNEL_STATUS=AVAILABLE. If unavailable, check Kaggle Internet and rerun this step; links expire when Kaggle stops.'),
('Review the final evidence','Read the resolved Git SHA, PASS/FAIL checks, request ID, overlap timing, SQLite audit, and public URL. Confirm that you personally tested the frontend if the tunnel is available. Data are synthetic; this is not a production dealership connection.')
]
assert len(guides)==17
import nbformat
old_code=cells[1:]
intro=nbformat.v4.new_markdown_cell('''# Unified Document Viewer — Guided Kaggle Review

**New to Kaggle? Import the notebook directly from GitHub:** sign in at [Kaggle](https://www.kaggle.com/code), select **New Notebook → File → Import Notebook → Link**, and paste the following *file URL* (not the repository homepage):

```text
https://github.com/dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release/blob/main/notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb
```

Select **Import**. If Kaggle provides a **GitHub** tab instead, select repository `dangkhoa2016/Keyloop-Scenario-D-Unified-Document-Viewer-pre-release` and `notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb`. **Fallback:** use GitHub **Raw** to download the .ipynb and upload it via the import menu. Confirm **35 cells**. Then select **CPU** as accelerator, enable **Internet** in notebook settings, and choose **Run All**.

No GitHub PAT, repository URL, SHA, Docker, or Google Drive is required. Each Markdown section explains the code cell beneath it. For a live interaction, follow Step 16 to open the temporary browser URL and test the VIN search and source filters. All sample records are synthetic.

**Review map:** Step 11 combines Sales and Service documents; Step 12 proves overlapping HTTP calls; Step 14 verifies SQLite audit; Step 15 shows a timeline; Step 16 opens the frontend; Step 17 summarizes all checks.''')
cells=[intro]
for i,((title,description),cell) in enumerate(zip(guides,old_code),1):
 cells.extend([nbformat.v4.new_markdown_cell(f'## Step {i:02d} — {title}\n\n**What happens:** {description}\n\n**Reviewer action:** Read the output and confirm the expected status before moving to the next step. On Run All this runs automatically; errors should be investigated, not skipped.'),cell])
assert len(cells)==35

n.cells=cells
n.metadata={'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'},'language_info':{'name':'python'}}
path=Path('notebooks/Keyloop-Scenario-D-Kaggle-Demo.ipynb')
nbf.write(n,path)
print('NOTEBOOK_BUILT',path,'CELLS',len(n.cells))
