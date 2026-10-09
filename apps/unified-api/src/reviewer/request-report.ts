import type {StoredRequestEvent} from '../../../../packages/logging/src/request-events.js';

const first=(events:StoredRequestEvent[],name:string)=>events.find(event=>event.event===name)??null;
const index=(events:StoredRequestEvent[],name:string)=>events.findIndex(event=>event.event===name);
const source=(event:StoredRequestEvent|null)=>({status:event?.httpStatus??null,documents:event?.documentCount??0,durationMs:event?.durationMs??null});

export function buildRequestReport(requestId:string,events:StoredRequestEvent[]){
 if(events.length===0)return null;
 const browserRequest=first(events,'browser_request_received')??events[0]!;
 const browserResponse=first(events,'browser_response_sent')??events.at(-1)!;
 const salesResponse=first(events,'sales_response_received');
 const serviceResponse=first(events,'service_response_received');
 const aggregation=first(events,'aggregation_completed');
 const positions=['sales_request_started','service_request_started','sales_response_received','service_response_received'].map(name=>index(events,name));
 return {
  requestId,vin:events.find(event=>event.vin)?.vin??null,startedAt:browserRequest.occurredAt,completedAt:browserResponse.occurredAt,
  durationMs:browserResponse.durationMs??Math.max(0,Date.parse(browserResponse.occurredAt)-Date.parse(browserRequest.occurredAt)),events,
  summary:{sales:source(salesResponse),service:source(serviceResponse),aggregatedDocuments:aggregation?.documentCount??browserResponse.documentCount??0,partial:aggregation?.partial??browserResponse.partial??false},
  checks:{
   browserRequestCaptured:index(events,'browser_request_received')>=0,
   salesRequestCaptured:index(events,'sales_request_started')>=0&&index(events,'sales_request_received')>=0,
   serviceRequestCaptured:index(events,'service_request_started')>=0&&index(events,'service_request_received')>=0,
   salesResponseCaptured:index(events,'sales_response_sent')>=0&&index(events,'sales_response_received')>=0,
   serviceResponseCaptured:index(events,'service_response_sent')>=0&&index(events,'service_response_received')>=0,
   correlationIdConsistent:events.every(event=>event.requestId===requestId),
   parallelFanOutObserved:positions.every(i=>i>=0)&&Math.max(positions[0]!,positions[1]!)<Math.min(positions[2]!,positions[3]!),
   aggregatedResponseReturned:index(events,'aggregation_completed')>=0&&index(events,'browser_response_sent')>=0
  }
 };
}
