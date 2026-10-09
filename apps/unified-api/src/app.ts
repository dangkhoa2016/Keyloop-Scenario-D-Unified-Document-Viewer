import {randomUUID} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,readdirSync,unlinkSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Hono} from 'hono';
import type Database from 'better-sqlite3';
import {parseVin} from '../../../packages/shared/src/vin.js';
import {decideOutcome,reconcileVehicles,sortDocuments} from '../../../packages/shared/src/aggregate.js';
import {UnifiedSchema} from '../../../packages/shared/src/contracts.js';
import {DEMO_VINS} from '../../../scripts/fixture-data.js';
import {adaptSales,adaptService} from './adapters/source-adapters.js';
import {requestSource,type TimelineEvent} from './clients/upstream.js';
import {persistAudit} from './persistence/audit.js';
export interface UnifiedOptions{salesBaseUrl:string;serviceBaseUrl:string;timeoutMs?:number;auditDb:Database.Database;testFaults?:{sales?:string;service?:string};onTrace?:(trace:{requestId:string;events:TimelineEvent[];overlapMs:number;totalDurationMs:number})=>void}
export function createUnifiedApp(config:UnifiedOptions){
 const app=new Hono();
 const reviewerEnabled=process.env.REVIEWER_PUBLIC_EVIDENCE==='1' && process.env.NODE_ENV!=='production';
 type CapturedEvidence={requestId:string;vin:string;recordedAt:string;sales:unknown;service:unknown;unified:unknown;overlapMs:number};
 const captures=new Map<string,CapturedEvidence>();
 const putCapture=(e:CapturedEvidence)=>{if(!reviewerEnabled)return;captures.set(e.requestId,e);while(captures.size>30){const first=captures.keys().next().value;if(first)captures.delete(first);else break;}};
 const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]??char));
 const jsonText=(value:unknown)=>escapeHtml(JSON.stringify(value,null,2)??'null');
 if(reviewerEnabled){
  app.get('/reviewer/requests/:requestId',c=>{
   const id=c.req.param('requestId');
   if(!/^req_[0-9a-f-]{36}$/.test(id))return c.text('Not found',404);
   const item=captures.get(id);
   if(!item)return c.text('Evidence expired or request was not captured in this running session',404);
   const section=(label:string,value:unknown)=>'<section><h2>'+escapeHtml(label)+'</h2><pre>'+jsonText(value)+'</pre></section>';
   const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Request evidence '+escapeHtml(id)+'</title><style>body{font:15px system-ui;background:#0d1726;color:#eef4ff;max-width:1200px;margin:30px auto;padding:0 18px}h1{font-size:1.7rem}h2{font-size:1.1rem}p{color:#adc3d7}pre{font:12px/1.6 ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#16283e;padding:18px;border:1px solid #37506a;border-radius:10px}section{margin:24px 0}a{color:#87c9ff}</style></head><body><h1>Captured request / response evidence</h1><p>Same request ID: <strong>'+escapeHtml(id)+'</strong> · VIN '+escapeHtml(item.vin)+' · HTTP overlap '+item.overlapMs.toFixed(3)+' ms</p><p>Captured in memory at '+escapeHtml(item.recordedAt)+'. Synthetic demo only; no replay or additional VIN lookup. Old requests and restarted processes are not available.</p>'+section('Sales API — original HTTP response',item.sales)+section('Service API — original HTTP response',item.service)+section('Unified API — actual response',item.unified)+'</body></html>';
   return c.html(html,200,{'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",'X-Robots-Tag':'noindex, nofollow'});
  });
 }

 let auditDegraded=false;
 const staticFiles=new Map<string,[string,string]>([['/', ['index.html','text/html; charset=utf-8']],['/assets/app.css',['assets/app.css','text/css; charset=utf-8']],['/assets/app.js',['assets/app.js','text/javascript; charset=utf-8']]]);
 for(const [route,[filename,contentType]] of staticFiles)app.get(route,c=>{const path=resolve('public',filename);if(!existsSync(path))return c.text('Page unavailable',404);return c.body(readFileSync(path),200,{'Content-Type':contentType,'Cache-Control':'no-cache'});});
 const traceDir=resolve(process.env.LOG_DIR??'./logs','requests');
 const tracesEnabled=process.env.WRITE_TRACE_SUMMARIES==='1';
 if(tracesEnabled)mkdirSync(traceDir,{recursive:true});
 app.use('*',async(c,next)=>{await next();c.header('X-Content-Type-Options','nosniff');c.header('Cache-Control','no-store');});
 app.get('/api/health/live',c=>c.json({service:'unified',status:'live'}));
 app.get('/api/health/ready',c=>{let audit='ready';try{config.auditDb.prepare('SELECT 1').get();}catch{audit='degraded';}
  return c.json({service:'unified',status:auditDegraded||audit==='degraded'?'degraded':'ready',audit:auditDegraded?'degraded':audit},auditDegraded||audit==='degraded'?503:200);
 });
 app.get('/api/demo-vins',c=>c.json(DEMO_VINS));
 app.get('/api/vehicles/:vin/documents',async c=>{
  const requestId='req_'+randomUUID(),start=performance.now(),startedAt=new Date().toISOString();
  const vin=parseVin(c.req.param('vin'));
  if(!vin)return c.json({requestId,error:{code:'INVALID_VIN',message:'VIN must contain exactly 17 valid characters.'}},400);
  const events:TimelineEvent[]=[];
  const timeoutMs=Math.max(1,Math.min(10000,config.timeoutMs??2000));
  const [sales,service]=await Promise.all([
   requestSource({source:'SALES',baseUrl:config.salesBaseUrl,vin,requestId,timeoutMs,requestStart:start,adapt:adaptSales,events,testFault:config.testFaults?.sales}),
   requestSource({source:'SERVICE',baseUrl:config.serviceBaseUrl,vin,requestId,timeoutMs,requestStart:start,adapt:adaptService,events,testFault:config.testFaults?.service}),
  ]);
  const sources={sales:sales.summary,service:service.summary};
  const decision=decideOutcome(sources.sales,sources.service);
  const reconciled=reconcileVehicles(sales.data?.vehicle??null,service.data?.vehicle??null);
  const vehicle=reconciled.vehicle,warnings:string[]=[...reconciled.warnings];
  if(decision.partial){if(!sales.data)warnings.push('SALES_UNAVAILABLE_PARTIAL_RESULTS');if(!service.data)warnings.push('SERVICE_UNAVAILABLE_PARTIAL_RESULTS');}
  const documents=sortDocuments([...(sales.data?.documents??[]),...(service.data?.documents??[])]);
  const totalDurationMs=performance.now()-start;
  const auditPersisted=persistAudit(config.auditDb,{requestId,vin,startedAt,completedAt:new Date().toISOString(),httpStatus:decision.httpStatus,sales:sources.sales,service:sources.service,documentCount:documents.length,partial:decision.partial,durationMs:totalDurationMs});
  if(!auditPersisted)auditDegraded=true;
  const overlapMs=Math.max(0,Math.min(sales.endMs,service.endMs)-Math.max(sales.startMs,service.startMs));
  config.onTrace?.({requestId,events,overlapMs,totalDurationMs});
  if(tracesEnabled){try{writeFileSync(resolve(traceDir,requestId+'.json'),JSON.stringify({requestId,vin,startedAt,completedAt:new Date().toISOString(),events,overlapMs,sourceStatus:{sales:sources.sales.status,service:sources.service.status},documentCount:documents.length,auditPersisted,totalDurationMs},null,2),{flag:'wx',mode:0o600});const entries=readdirSync(traceDir).filter(x=>/^req_[a-f0-9-]{36}\.json$/.test(x)).sort();for(const filename of entries.slice(0,Math.max(0,entries.length-50)))unlinkSync(resolve(traceDir,filename));}catch{console.error(JSON.stringify({event:'trace_write_failed',requestId}));}}
  console.log(JSON.stringify({timestamp:new Date().toISOString(),service:'unified',event:'aggregation_completed',requestId,vin,status:decision.httpStatus,salesStatus:sources.sales.status,serviceStatus:sources.service.status,documentCount:documents.length,partial:decision.partial,overlapMs,auditPersisted}));
  if(decision.errorCode){const message=decision.httpStatus===404?'No vehicle was found for the supplied VIN.':'Both source systems are unavailable.';
   const body={requestId,vin,error:{code:decision.errorCode,message},sources,totalDurationMs};
   putCapture({requestId,vin,recordedAt:new Date().toISOString(),sales:{httpStatus:sales.capturedHttpStatus,body:sales.capturedResponse??null,summary:sales.summary},service:{httpStatus:service.capturedHttpStatus,body:service.capturedResponse??null,summary:service.summary},unified:{httpStatus:decision.httpStatus,body},overlapMs});
   return c.json(body,decision.httpStatus===404?404:503);
  }
  const result={requestId,vin,partial:decision.partial,vehicle,sources,documents,documentCount:documents.length,warnings,auditPersisted,totalDurationMs};
  const validation=UnifiedSchema.safeParse(result);
  if(!validation.success){console.error(JSON.stringify({event:'unified_contract_error',requestId}));return c.json({requestId,error:{code:'INTERNAL_ERROR',message:'Unable to complete document search.'}},500);}
  putCapture({requestId,vin,recordedAt:new Date().toISOString(),sales:{httpStatus:sales.capturedHttpStatus,body:sales.capturedResponse??null,summary:sales.summary},service:{httpStatus:service.capturedHttpStatus,body:service.capturedResponse??null,summary:service.summary},unified:{httpStatus:200,body:validation.data},overlapMs});
  return c.json(validation.data,200);
 });
 return app;
}
