import {performance} from 'node:perf_hooks';
import {Hono} from 'hono';
import type Database from 'better-sqlite3';
import {parseVin} from '../../../packages/shared/src/vin.js';
import {logEvent,safeRequestId} from '../../../packages/logging/src/index.js';
import {writeRequestEvent} from '../../../packages/logging/src/request-events.js';
export function createSalesApp(db:Database.Database,config:{testFaults?:boolean;eventDb?:Database.Database}={}){
 const app=new Hono();
 app.get('/api/health/live',c=>c.json({service:'sales',status:'live'}));
 app.get('/api/health/ready',c=>{try{db.prepare('SELECT 1').get();return c.json({service:'sales',status:'ready'});}catch{return c.json({service:'sales',status:'unavailable'},503);}});
 app.get('/api/vehicles/:vin/documents',async c=>{
  const started=performance.now(),requestId=safeRequestId(c.req.header('X-Request-ID')??null),vin=parseVin(c.req.param('vin'));logEvent('sales','request_received',requestId);
  writeRequestEvent(config.eventDb,{requestId,service:'sales',event:'sales_request_received',method:'GET',path:new URL(c.req.url).pathname,vin});
  const send=(body:unknown,status:number,count=0,errorCode:string|null=null)=>{writeRequestEvent(config.eventDb,{requestId,service:'sales',event:'sales_response_sent',method:'GET',path:new URL(c.req.url).pathname,vin,httpStatus:status,durationMs:performance.now()-started,documentCount:count,errorCode});return c.json(body,status as 200);};
  if(!vin)return send({error:{code:'INVALID_VIN',message:'Invalid VIN'}},400,0,'INVALID_VIN');
  if(config.testFaults&&process.env.ENABLE_TEST_FAULTS==='1'){
   const fault=c.req.header('X-Test-Fault');
   if(fault==='http-500')return send({error:'Synthetic upstream fault'},500,0,'SYNTHETIC_HTTP_500');
   if(fault==='malformed-json'){writeRequestEvent(config.eventDb,{requestId,service:'sales',event:'sales_response_sent',vin,httpStatus:200,durationMs:performance.now()-started,documentCount:0});return c.text('{ malformed',200,{'Content-Type':'application/json'});}
   if(fault==='invalid-schema')return send({vehicleFound:true,vehicle:null,salesDocuments:[{}]},200,1);
   if(fault?.startsWith('delay:')){const ms=Number(fault.slice(6));if(Number.isInteger(ms)&&ms>=0&&ms<=1500)await new Promise(r=>setTimeout(r,ms));}
  }
  const vehicle=db.prepare('SELECT vin,make,model,year FROM vehicles WHERE vin=?').get(vin) as {vin:string;make:string;model:string;year:number}|undefined;
  const documents=db.prepare('SELECT id AS salesDocumentId,category AS documentCategory,title AS documentTitle,contract_date AS contractDate,sales_person AS salesPerson FROM sales_documents WHERE vin=? ORDER BY contract_date DESC,id').all(vin);
  logEvent('sales','response_sent',requestId,{vehicleFound:Boolean(vehicle),documentCount:documents.length});
  return send({vehicleFound:Boolean(vehicle),vehicle:vehicle??null,salesDocuments:documents},200,documents.length);
 });
 return app;
}
