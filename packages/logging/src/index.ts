import { randomUUID } from 'node:crypto';
export function logEvent(service:string,event:string,requestId:string,extra:Record<string,string|number|boolean|null>={}) { console.log(JSON.stringify({timestamp:new Date().toISOString(),service,event,requestId,...extra})); }
export function safeRequestId(input:string|null):string { return input && /^[A-Za-z0-9_-]{1,96}$/.test(input)?input:'internal_'+randomUUID(); }
