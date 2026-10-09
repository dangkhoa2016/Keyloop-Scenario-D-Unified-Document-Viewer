import {describe,it,expect} from 'vitest';import {parseVin,DateSchema,SalesRawSchema,ServiceRawSchema,sortDocuments,reconcileVehicles,decideOutcome} from '../../packages/shared/src/index.js';
const vin='WVWZZZ1JZXW000001',vehicle={vin,make:'Volkswagen',model:'Golf',year:2020};
const summary=(status:'SUCCESS'|'EMPTY'|'NOT_FOUND'|'TIMEOUT'|'NETWORK_ERROR')=>({status,durationMs:1,documentCount:status==='SUCCESS'?1:0,vehicleFound:status==='SUCCESS'||status==='EMPTY'?true:status==='NOT_FOUND'?false:null});
describe('Foundation contracts',()=>{
it('normalizes VIN and rejects invalid characters',()=>{expect(parseVin(' wvwzzz1jzxw000001 ')).toBe(vin);expect(parseVin('ABCDEFGHIJKLMNOPQ')).toBeNull();});
it('checks actual calendar date',()=>{expect(DateSchema.safeParse('2026-02-30').success).toBe(false);expect(DateSchema.safeParse('2026-02-28').success).toBe(true);});
it('validates distinct upstream envelopes',()=>{expect(SalesRawSchema.safeParse({vehicleFound:true,vehicle,salesDocuments:[]}).success).toBe(true);expect(ServiceRawSchema.safeParse({exists:true,vehicleDetails:{vinCode:vin,brand:'Volkswagen',name:'Golf',modelYear:2020},records:[]}).success).toBe(true);});
it('sorts a single mixed-source list',()=>{const a={id:'SALES:1',sourceDocumentId:'1',source:'SALES' as const,type:'Contract',title:'Contract',date:'2026-01-01'};expect(sortDocuments([a,{...a,id:'SERVICE:2',sourceDocumentId:'2',source:'SERVICE',date:'2026-09-01'}]).map(x=>x.id)).toEqual(['SERVICE:2','SALES:1']);});
it('does not silently prefer conflicting metadata',()=>{expect(reconcileVehicles(vehicle,{...vehicle,make:'Different'}).vehicle).toBeNull();});
it('distinguishes degraded, unknown, unavailable',()=>{expect(decideOutcome(summary('SUCCESS'),summary('TIMEOUT'))).toMatchObject({httpStatus:200,partial:true});expect(decideOutcome(summary('NOT_FOUND'),summary('NOT_FOUND')).httpStatus).toBe(404);expect(decideOutcome(summary('NETWORK_ERROR'),summary('TIMEOUT')).httpStatus).toBe(503);});
});