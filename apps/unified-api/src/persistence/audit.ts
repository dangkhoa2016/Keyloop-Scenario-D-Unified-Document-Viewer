import type Database from 'better-sqlite3';
import type {SourceSummary} from '../../../../packages/shared/src/contracts.js';
export interface AuditEvent {requestId:string;vin:string|null;startedAt:string;completedAt:string;httpStatus:number;sales:SourceSummary;service:SourceSummary;documentCount:number;partial:boolean;durationMs:number}
export function persistAudit(db:Database.Database,event:AuditEvent):boolean{
 try {
  db.prepare(`INSERT INTO request_audit(request_id,vin,started_at,completed_at,response_status,sales_status,sales_duration_ms,sales_document_count,service_status,service_duration_ms,service_document_count,total_document_count,partial_result,total_duration_ms)
   VALUES (@requestId,@vin,@startedAt,@completedAt,@httpStatus,@salesStatus,@salesDuration,@salesCount,@serviceStatus,@serviceDuration,@serviceCount,@documentCount,@partial,@durationMs)`).run({
   requestId:event.requestId,vin:event.vin,startedAt:event.startedAt,completedAt:event.completedAt,httpStatus:event.httpStatus,
   salesStatus:event.sales.status,salesDuration:event.sales.durationMs,salesCount:event.sales.documentCount,
   serviceStatus:event.service.status,serviceDuration:event.service.durationMs,serviceCount:event.service.documentCount,
   documentCount:event.documentCount,partial:event.partial?1:0,durationMs:event.durationMs
  });
  return true;
 }catch{console.error(JSON.stringify({timestamp:new Date().toISOString(),service:'unified',event:'audit_failed',requestId:event.requestId}));return false;}
}
