type SourceCapture={httpStatus?:number;body?:unknown;summary?:{status?:string;documentCount?:number;durationMs?:number}};
export type EvidencePageData={requestId:string;vin:string;recordedAt:string;sales:unknown;service:unknown;unified:unknown;overlapMs:number};
const safe=(v:unknown)=>String(v??'—').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]??ch));
const obj=(v:unknown):Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v)?v as Record<string,unknown>:{};
const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;
const json=(v:unknown)=>safe(JSON.stringify(v,null,2)??'null');
const n=(v:unknown)=>finite(v)===null?'—':String(v);
const ms=(v:unknown)=>finite(v)===null?'—':(v as number).toFixed(2)+' ms';
function sourceCard(label:string,raw:unknown){
 const x=obj(raw) as SourceCapture;
 const sm=obj(x.summary);
 const status=String(sm.status??'UNKNOWN');
 const count=sm.documentCount;
 return '<article class="source"><div class="source-head"><h3>'+safe(label)+'</h3><span class="chip">'+safe(status)+'</span></div><div class="source-stats"><div><span>Documents</span><strong>'+n(count)+'</strong></div><div><span>HTTP response</span><strong>'+n(x.httpStatus)+'</strong></div><div><span>Duration</span><strong>'+ms(sm.durationMs)+'</strong></div></div><p class="source-note">'+(status==='EMPTY'?'Vehicle found; this source has no documents.':status==='NOT_FOUND'?'Vehicle not found in this source.':status==='SUCCESS'?'Documents returned successfully.':'Review source status and technical details below.')+'</p></article>';
}
export function renderEvidencePage(e:EvidencePageData):string{
 const unified=obj(e.unified);
 const result=obj(unified.body);
 const vehicle=obj(result.vehicle);
 const error=obj(result.error);
 const code=finite(unified.httpStatus);
 const count=finite(result.documentCount);
 const sales=obj(obj(e.sales).summary),service=obj(obj(e.service).summary);
 const sourceSum=(finite(sales.documentCount)??0)+(finite(service.documentCount)??0);
 const total=count??(code===200?sourceSum:null);
 const partial=result.partial===true;
 const state=code===200?(partial?'Partial results':'Completed successfully'):code===404?'Vehicle not found':code===503?'Sources unavailable':'Request outcome';
 const signal=code===200&&!partial?'good':code===200?'warn':'neutral';
 const name=[vehicle.year,vehicle.make,vehicle.model].filter(x=>x!==undefined&&x!==null).map(String).join(' ')||'Vehicle information unavailable';
 const audit=result.auditPersisted===true?'Persisted':result.auditPersisted===false?'Not persisted':'Not reported';
 const info=(label:string,value:string)=>'<div class="metric"><span>'+safe(label)+'</span><strong>'+safe(value)+'</strong></div>';
 const block=(id:string,label:string,value:unknown)=>'<section class="raw" id="'+id+'"><h2>'+safe(label)+'</h2><details><summary>View captured JSON response</summary><pre>'+json(value)+'</pre></details></section>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Request evidence '+safe(e.requestId)+'</title><style>'+
 'body{font:15px/1.55 system-ui,-apple-system,sans-serif;background:#0d1726;color:#eef4ff;max-width:1150px;margin:28px auto;padding:0 18px}h1{font-size:1.8rem;margin:0 0 8px}h2{font-size:1.25rem}h3{margin:0;font-size:1.05rem}p{color:#b8cada}a{color:#8bcaff}a:focus-visible,summary:focus-visible{outline:2px solid #8bcaff;outline-offset:3px}main>p{margin:6px 0 20px}.panel{border:1px solid #36516d;background:#14253a;border-radius:16px;padding:22px;margin:20px 0}.eyebrow{letter-spacing:.11em;text-transform:uppercase;font-weight:700;font-size:.75rem;color:#b7cbe2}.heading{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}.chip{background:#283f58;border-radius:100px;padding:5px 10px;font-size:.8rem;font-weight:700}.good{background:#184d40;color:#c1fae5}.warn{background:#60451e;color:#fff0bd}.vehicle{font-size:1.25rem;font-weight:750;margin:14px 0 4px}.vin{font:13px ui-monospace,monospace;overflow-wrap:anywhere;color:#b8cada}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0}.metric,.source{border:1px solid #38516a;background:#172b42;border-radius:12px;padding:15px}.metric span,.source-stats span{display:block;color:#bad0e5;font-size:.8rem}.metric strong{display:block;font-size:1.35rem;margin-top:5px}.sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.source-head{display:flex;gap:8px;justify-content:space-between;align-items:center}.source-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.source-stats strong{font-size:1.13rem}.source-note{font-size:.84rem;margin:14px 0 0}.meta{overflow-wrap:anywhere;font-size:.87rem;color:#b8cada}.raw{margin-top:20px}details{border:1px solid #36516d;border-radius:11px;background:#14253a;overflow:hidden}summary{cursor:pointer;padding:15px;font-weight:650}pre{font:12px/1.65 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#102135;margin:0;padding:18px;border-top:1px solid #36516d}.jump{margin-top:16px}.jump a{margin-right:16px}@media(max-width:720px){.metrics{grid-template-columns:repeat(2,1fr)}.sources{grid-template-columns:1fr}.panel{padding:15px}}@media(max-width:390px){.metrics{grid-template-columns:1fr}}</style></head><body><main>'+
 '<h1>Request evidence</h1><p>Readable summary and original responses from a single completed VIN search.</p>'+
 '<section class="panel" aria-label="Request summary"><div class="heading"><span class="eyebrow">Request overview</span><span class="chip '+signal+'">'+safe(state)+' · HTTP '+n(code)+'</span></div><div class="vehicle">'+safe(name)+'</div><div class="vin">VIN '+safe(e.vin)+'</div>'+
 '<div class="metrics">'+info('Total documents',total===null?'—':String(total))+info('Parallel HTTP overlap',ms(e.overlapMs))+info('Unified duration',ms(result.totalDurationMs))+info('SQLite audit',audit)+'</div>'+
 '<h2>Source breakdown</h2><div class="sources">'+sourceCard('Sales API',e.sales)+sourceCard('Service API',e.service)+'</div>'+
 '<p class="meta">Request ID: <code>'+safe(e.requestId)+'</code><br>Captured at: '+safe(e.recordedAt)+'</p>'+
 (Object.keys(error).length?'<p role="status">Response: '+safe(error.code)+' — '+safe(error.message)+'</p>':'')+
 '<p class="jump"><a href="#sales">Sales JSON</a><a href="#service">Service JSON</a><a href="#unified">Unified JSON</a></p></section>'+
 '<p>Parallel overlap shows concurrently active outbound HTTP intervals, not parallel CPU execution. This page is a synthetic demonstration, not a historical replay or a new lookup.</p>'+
 block('sales','Sales API — original HTTP response',e.sales)+block('service','Service API — original HTTP response',e.service)+block('unified','Unified API — actual response',e.unified)+
 '<p class="meta">Evidence is held in memory for a limited number of requests and expires on server restart.</p></main></body></html>';
}
