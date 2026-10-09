import { faker } from '@faker-js/faker';

export const FAKER_SEED = 20261008;
export const REFERENCE_DATE = '2026-09-30';
const vinFor = (n: number) => 'WVWZZZ1JZXW' + String(n).padStart(6, '0');
export const DEMO_VINS = Object.freeze({
  VIN_BOTH: vinFor(1),
  VIN_SALES_ONLY: vinFor(2),
  VIN_SERVICE_ONLY: vinFor(3),
  VIN_NO_DOCUMENTS: vinFor(4),
  VIN_UNKNOWN: 'AAAAAAAAAAAAAAAAA',
});
type VehicleRow = { vin: string; make: string; model: string; year: number };
type SaleRow = { id: string; vin: string; category: string; title: string; contract_date: string; sales_person: string };
type EventRow = { id: string; vin: string; service_date: string; workshop: string; odometer: number };
type ServiceRow = { id: string; event_id: string; type: string; title: string; document_date: string };
export interface FixtureDataset {
  salesVehicles: VehicleRow[];
  salesDocuments: SaleRow[];
  serviceVehicles: VehicleRow[];
  serviceEvents: EventRow[];
  serviceDocuments: ServiceRow[];
}
function calendarDate(daysBefore: number): string {
  const date = new Date('2026-09-30T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() - daysBefore);
  return date.toISOString().slice(0, 10);
}
export function generateFixtures(): FixtureDataset {
  faker.seed(FAKER_SEED);
  const salesVehicles: VehicleRow[] = [], serviceVehicles: VehicleRow[] = [];
  const salesDocuments: SaleRow[] = [], serviceEvents: EventRow[] = [], serviceDocuments: ServiceRow[] = [];
  const models = [['Volkswagen','Golf'], ['Toyota','Corolla'], ['Ford','Focus'], ['Honda','Civic'], ['Volvo','XC40']] as const;
  const salesKinds = [['Purchase Agreement','Vehicle Purchase Agreement'], ['Finance Contract','Finance Agreement'], ['Warranty','Warranty Confirmation'], ['Sales Invoice','Vehicle Sales Invoice']] as const;
  const serviceKinds = [['Service Invoice','Scheduled Maintenance Invoice'], ['Inspection Report','Vehicle Inspection Report'], ['Service Record','Maintenance Service Record']] as const;
  for (let i = 0; i < 25; i++) {
    const vin = vinFor(i + 1);
    const [make, model] = models[i % models.length]!;
    const vehicle = { vin, make, model, year: 2018 + (i % 8) };
    salesVehicles.push(vehicle);
    serviceVehicles.push({ ...vehicle });
    const saleCount = i === 1 || i >= 4 || i === 0 ? (i === 1 ? 3 : 4) : 0;
    const serviceCount = i === 0 ? 6 : i === 2 ? 5 : i >= 4 ? 6 : 0;
    for (let j = 0; j < saleCount; j++) {
      const [category, title] = salesKinds[j % salesKinds.length]!;
      salesDocuments.push({
        id: 'SAL-' + String(1001 + salesDocuments.length),
        vin, category, title,
        contract_date: calendarDate(35 + (i * 9 + j * 17) % 200),
        sales_person: faker.person.fullName(),
      });
    }
    for (let j = 0; j < Math.ceil(serviceCount / 2); j++) {
      const eventId = 'EVT-' + String(5001 + serviceEvents.length);
      const serviceDate = calendarDate(2 + (i * 7 + j * 23) % 175);
      serviceEvents.push({ id: eventId, vin, service_date: serviceDate, workshop: 'Synthetic Workshop ' + faker.number.int({min: 1, max: 9}), odometer: 12000 + i * 3100 + j * 1400 });
      for (let k = j * 2; k < Math.min(serviceCount, j * 2 + 2); k++) {
        const [type, title] = serviceKinds[k % serviceKinds.length]!;
        serviceDocuments.push({ id: 'SRV-' + String(9001 + serviceDocuments.length), event_id: eventId, type, title, document_date: serviceDate });
      }
    }
  }
  return {salesVehicles, salesDocuments, serviceVehicles, serviceEvents, serviceDocuments};
}
