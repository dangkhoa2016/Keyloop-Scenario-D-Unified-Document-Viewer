import {Hono} from 'hono';
import type Database from 'better-sqlite3';
import {parseVin} from '../../../packages/shared/src/vin.js';
import {logEvent,safeRequestId} from '../../../packages/logging/src/index.js';
export function createServiceApp(db:Database.Database,config:{testFaults?:boolean}={}){
 const app=new Hono();
 app.get('/api/health/live',c=>c.json({service:'service',status:'live'}));
 app.get('/api/health/ready',c=>{try{db.prepare('SELECT 1').get();return c.json({service:'service',status:'ready'});}catch{return c.json({service:'service',status:'unavailable'},503);}});
 app.get('/api/vehicles/:vin/documents',async c=>{
  const requestId=safeRequestId(c.req.header('X-Request-ID')??null),vin=parseVin(c.req.param('vin'));logEvent('service','request_received',requestId);
  if(!vin)return c.json({error:{code:'INVALID_VIN',message:'Invalid VIN'}},400);
  if(config.testFaults&&process.env.ENABLE_TEST_FAULTS==='1'){
   const fault=c.req.header('X-Test-Fault');
   if(fault==='http-500')return c.json({error:'Synthetic upstream fault'},500);
   if(fault==='malformed-json')return c.text('{ malformed',200,{'Content-Type':'application/json'});
   if(fault==='invalid-schema')return c.json({exists:true,vehicleDetails:null,records:[{}]});
   if(fault?.startsWith('delay:')){const ms=Number(fault.slice(6));if(Number.isInteger(ms)&&ms>=0&&ms<=1500)await new Promise(r=>setTimeout(r,ms));}
  }
  const vehicle=db.prepare('SELECT vin,make,model,year FROM vehicles WHERE vin=?').get(vin) as {vin:string;make:string;model:string;year:number}|undefined;
  const records=db.prepare(`SELECT d.id,d.type,d.title AS label,d.document_date AS serviceDate,e.workshop FROM service_documents d JOIN service_events e ON d.event_id=e.id WHERE e.vin=? ORDER BY d.document_date DESC,d.id`).all(vin);
  logEvent('service','response_sent',requestId,{vehicleFound:Boolean(vehicle),documentCount:records.length});
  return c.json({exists:Boolean(vehicle),vehicleDetails:vehicle?{vinCode:vehicle.vin,brand:vehicle.make,name:vehicle.model,modelYear:vehicle.year}:null,records});
 });
 return app;
}
