import {Hono} from 'hono';
import type Database from 'better-sqlite3';
import {parseVin} from '../../../packages/shared/src/vin.js';
import {logEvent,safeRequestId} from '../../../packages/logging/src/index.js';
export function createSalesApp(db:Database.Database,config:{testFaults?:boolean}={}){
 const app=new Hono();
 app.get('/api/health/live',c=>c.json({service:'sales',status:'live'}));
 app.get('/api/health/ready',c=>{try{db.prepare('SELECT 1').get();return c.json({service:'sales',status:'ready'});}catch{return c.json({service:'sales',status:'unavailable'},503);}});
 app.get('/api/vehicles/:vin/documents',async c=>{
  const requestId=safeRequestId(c.req.header('X-Request-ID')??null),vin=parseVin(c.req.param('vin'));logEvent('sales','request_received',requestId);
  if(!vin)return c.json({error:{code:'INVALID_VIN',message:'Invalid VIN'}},400);
  if(config.testFaults&&process.env.ENABLE_TEST_FAULTS==='1'){
   const fault=c.req.header('X-Test-Fault');
   if(fault==='http-500')return c.json({error:'Synthetic upstream fault'},500);
   if(fault==='malformed-json')return c.text('{ malformed',200,{'Content-Type':'application/json'});
   if(fault==='invalid-schema')return c.json({vehicleFound:true,vehicle:null,salesDocuments:[{}]});
   if(fault?.startsWith('delay:')){const ms=Number(fault.slice(6));if(Number.isInteger(ms)&&ms>=0&&ms<=1500)await new Promise(r=>setTimeout(r,ms));}
  }
  const vehicle=db.prepare('SELECT vin,make,model,year FROM vehicles WHERE vin=?').get(vin) as {vin:string;make:string;model:string;year:number}|undefined;
  const documents=db.prepare('SELECT id AS salesDocumentId,category AS documentCategory,title AS documentTitle,contract_date AS contractDate,sales_person AS salesPerson FROM sales_documents WHERE vin=? ORDER BY contract_date DESC,id').all(vin);
  logEvent('sales','response_sent',requestId,{vehicleFound:Boolean(vehicle),documentCount:documents.length});
  return c.json({vehicleFound:Boolean(vehicle),vehicle:vehicle??null,salesDocuments:documents});
 });
 return app;
}
