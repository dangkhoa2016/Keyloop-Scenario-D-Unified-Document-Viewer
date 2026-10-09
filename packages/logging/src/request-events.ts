import type Database from 'better-sqlite3';

export interface RequestEvent {
  requestId:string;
  service:'unified'|'sales'|'service';
  event:string;
  occurredAt?:string;
  method?:string|null;
  path?:string|null;
  vin?:string|null;
  upstream?:'SALES'|'SERVICE'|null;
  httpStatus?:number|null;
  durationMs?:number|null;
  documentCount?:number|null;
  partial?:boolean|null;
  errorCode?:string|null;
  metadata?:Record<string,unknown>|null;
}

export interface StoredRequestEvent extends RequestEvent { id:number; occurredAt:string; }

export function writeRequestEvent(db:Database.Database|undefined,event:RequestEvent):boolean {
  if(!db)return false;
  try {
    db.prepare(`INSERT INTO request_events(request_id,occurred_at,service,event,method,path,vin,upstream,http_status,duration_ms,document_count,partial,error_code,metadata_json)
      VALUES (@requestId,@occurredAt,@service,@event,@method,@path,@vin,@upstream,@httpStatus,@durationMs,@documentCount,@partial,@errorCode,@metadataJson)`).run({
      requestId:event.requestId,occurredAt:event.occurredAt??new Date().toISOString(),service:event.service,event:event.event,
      method:event.method??null,path:event.path??null,vin:event.vin??null,upstream:event.upstream??null,httpStatus:event.httpStatus??null,
      durationMs:event.durationMs??null,documentCount:event.documentCount??null,partial:event.partial==null?null:(event.partial?1:0),
      errorCode:event.errorCode??null,metadataJson:event.metadata==null?null:JSON.stringify(event.metadata)
    });
    return true;
  } catch {
    return false;
  }
}

export function readRequestEvents(db:Database.Database,requestId:string):StoredRequestEvent[] {
  const rows=db.prepare(`SELECT id,request_id,occurred_at,service,event,method,path,vin,upstream,http_status,duration_ms,document_count,partial,error_code,metadata_json
    FROM request_events WHERE request_id=? ORDER BY occurred_at,id`).all(requestId) as Record<string,unknown>[];
  return rows.map(row=>({
    id:Number(row.id),requestId:String(row.request_id),occurredAt:String(row.occurred_at),service:row.service as StoredRequestEvent['service'],event:String(row.event),
    method:row.method as string|null,path:row.path as string|null,vin:row.vin as string|null,upstream:row.upstream as StoredRequestEvent['upstream'],
    httpStatus:row.http_status as number|null,durationMs:row.duration_ms as number|null,documentCount:row.document_count as number|null,
    partial:row.partial==null?null:Boolean(row.partial),errorCode:row.error_code as string|null,
    metadata:row.metadata_json==null?null:JSON.parse(String(row.metadata_json)) as Record<string,unknown>
  }));
}
