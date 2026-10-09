import { performance } from 'node:perf_hooks';
import { ZodError } from 'zod';
import type {SourceSummary} from '../../../../packages/shared/src/contracts.js';
import type {Adapted} from '../adapters/source-adapters.js';
export interface TimelineEvent{source:'SALES'|'SERVICE';event:'started'|'completed';offsetMs:number}
export interface SourceOutcome{summary:SourceSummary;data:Adapted|null;startMs:number;endMs:number}
export interface SourceRequestOptions {source:'SALES'|'SERVICE';baseUrl:string;vin:string;requestId:string;timeoutMs:number;requestStart:number;adapt:(body:unknown,vin:string)=>Adapted;events:TimelineEvent[];testFault?:string}
class UpstreamHttpError extends Error {constructor(public readonly status:number){super('Upstream HTTP error');}}
class UpstreamPayloadError extends Error {constructor(){super('Invalid upstream payload');}}
export async function requestSource(opts:SourceRequestOptions):Promise<SourceOutcome> {
 const startMs=performance.now(),started=startMs-opts.requestStart;
 opts.events.push({source:opts.source,event:'started',offsetMs:started});
 const summary:SourceSummary={status:'NETWORK_ERROR',durationMs:0,documentCount:0,vehicleFound:null};
 let data:Adapted|null=null;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),opts.timeoutMs);
 try {
  const headers:Record<string,string>={'X-Request-ID':opts.requestId};
  if(opts.testFault) headers['X-Test-Fault']=opts.testFault;
  const response=await fetch(opts.baseUrl+'/api/vehicles/'+encodeURIComponent(opts.vin)+'/documents',{headers,signal:controller.signal});
  if(!response.ok) throw new UpstreamHttpError(response.status);
  let body:unknown;
  try {body=await response.json();}catch{throw new UpstreamPayloadError();}
  try {data=opts.adapt(body,opts.vin);}catch{throw new UpstreamPayloadError();}
  summary.status=data.vehicleFound?(data.documents.length?'SUCCESS':'EMPTY'):'NOT_FOUND';
  summary.documentCount=data.documents.length;summary.vehicleFound=data.vehicleFound;
 }catch(error){
  if(controller.signal.aborted){summary.status='TIMEOUT';summary.errorCode='UPSTREAM_TIMEOUT';}
  else if(error instanceof UpstreamHttpError){summary.status='HTTP_ERROR';summary.errorCode='UPSTREAM_HTTP_ERROR';}
  else if(error instanceof UpstreamPayloadError||error instanceof ZodError){summary.status='INVALID_RESPONSE';summary.errorCode='UPSTREAM_INVALID_RESPONSE';}
  else {summary.status='NETWORK_ERROR';summary.errorCode='UPSTREAM_NETWORK_ERROR';}
 }finally{clearTimeout(timer);}
 const endMs=performance.now();
 summary.durationMs=Math.max(0,endMs-startMs);
 opts.events.push({source:opts.source,event:'completed',offsetMs:endMs-opts.requestStart});
 return {summary,data,startMs,endMs};
}
