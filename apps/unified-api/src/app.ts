import {randomUUID} from 'node:crypto';
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
 let auditDegraded=false;
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
  console.log(JSON.stringify({timestamp:new Date().toISOString(),service:'unified',event:'aggregation_completed',requestId,vin,status:decision.httpStatus,salesStatus:sources.sales.status,serviceStatus:sources.service.status,documentCount:documents.length,partial:decision.partial,overlapMs,auditPersisted}));
  if(decision.errorCode){const message=decision.httpStatus===404?'No vehicle was found for the supplied VIN.':'Both source systems are unavailable.';return c.json({requestId,vin,error:{code:decision.errorCode,message},sources,totalDurationMs},decision.httpStatus===404?404:503);}
  const result={requestId,vin,partial:decision.partial,vehicle,sources,documents,documentCount:documents.length,warnings,auditPersisted,totalDurationMs};
  const validation=UnifiedSchema.safeParse(result);
  if(!validation.success){console.error(JSON.stringify({event:'unified_contract_error',requestId}));return c.json({requestId,error:{code:'INTERNAL_ERROR',message:'Unable to complete document search.'}},500);}
  return c.json(validation.data,200);
 });
 return app;
}
