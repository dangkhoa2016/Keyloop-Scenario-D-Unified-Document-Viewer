import { SalesRawSchema, ServiceRawSchema } from '../../../../packages/shared/src/raw.js';
import type { UnifiedDocument, Vehicle } from '../../../../packages/shared/src/contracts.js';
export type Adapted={vehicle:Vehicle|null;vehicleFound:boolean;documents:UnifiedDocument[]};
export function adaptSales(raw:unknown,vin:string):Adapted {
 const value=SalesRawSchema.parse(raw);
 if(value.vehicle && value.vehicle.vin!==vin) throw new Error('Sales VIN mismatch');
 return {vehicle:value.vehicle,vehicleFound:value.vehicleFound,documents:value.salesDocuments.map(d=>({
  id:'SALES:'+d.salesDocumentId,sourceDocumentId:d.salesDocumentId,source:'SALES',type:d.documentCategory,title:d.documentTitle,date:d.contractDate
 }))};
}
export function adaptService(raw:unknown,vin:string):Adapted {
 const value=ServiceRawSchema.parse(raw);
 if(value.vehicleDetails&&value.vehicleDetails.vinCode!==vin) throw new Error('Service VIN mismatch');
 const v=value.vehicleDetails;
 return {vehicle:v?{vin:v.vinCode,make:v.brand,model:v.name,year:v.modelYear}:null,vehicleFound:value.exists,documents:value.records.map(d=>({
  id:'SERVICE:'+d.id,sourceDocumentId:d.id,source:'SERVICE',type:d.type,title:d.label,date:d.serviceDate
 }))};
}
