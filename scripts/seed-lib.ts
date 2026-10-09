import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { openDatabase } from './db-utils.js';
import { generateFixtures, type FixtureDataset } from './fixture-data.js';

function snapshot(sales: Database.Database, service: Database.Database): FixtureDataset {
  return {
    salesVehicles: sales.prepare('SELECT vin, make, model, year FROM vehicles ORDER BY vin').all() as FixtureDataset['salesVehicles'],
    salesDocuments: sales.prepare('SELECT id, vin, category, title, contract_date, sales_person FROM sales_documents ORDER BY id').all() as FixtureDataset['salesDocuments'],
    serviceVehicles: service.prepare('SELECT vin, make, model, year FROM vehicles ORDER BY vin').all() as FixtureDataset['serviceVehicles'],
    serviceEvents: service.prepare('SELECT id, vin, service_date, workshop, odometer FROM service_events ORDER BY id').all() as FixtureDataset['serviceEvents'],
    serviceDocuments: service.prepare('SELECT id, event_id, type, title, document_date FROM service_documents ORDER BY id').all() as FixtureDataset['serviceDocuments'],
  };
}
export function fingerprint(dataset: FixtureDataset): string {
  return createHash('sha256').update(JSON.stringify(dataset)).digest('hex');
}
export function verifySeed(dir: string) {
  const sales = openDatabase(dir, 'sales'), service = openDatabase(dir, 'service');
  try {
    const expected = generateFixtures(), actual = snapshot(sales, service);
    const expectedHash = fingerprint(expected), actualHash = fingerprint(actual);
    if (expectedHash !== actualHash) throw new Error('Dataset fingerprint mismatch: expected '+ expectedHash +', actual '+actualHash);
    return {fingerprint: actualHash, counts: {
      salesVehicles: actual.salesVehicles.length, salesDocuments: actual.salesDocuments.length,
      serviceVehicles: actual.serviceVehicles.length, serviceEvents: actual.serviceEvents.length,
      serviceDocuments: actual.serviceDocuments.length,
    }};
  } finally { sales.close(); service.close(); }
}
export function seedDemoData(dir: string): 'CREATED' | 'ALREADY_PRESENT' {
  const sales = openDatabase(dir, 'sales'), service = openDatabase(dir, 'service');
  try {
    const current = snapshot(sales, service);
    const existing = Object.values(current).reduce((n, rows) => n + rows.length, 0);
    if (existing > 0) {
      if (fingerprint(current) !== fingerprint(generateFixtures()))
        throw new Error('Refusing to overwrite existing or partially seeded database; use a fresh DATA_DIR');
      return 'ALREADY_PRESENT';
    }
    const data = generateFixtures();
    sales.transaction(() => {
      const vehicle = sales.prepare('INSERT INTO vehicles(vin,make,model,year) VALUES (@vin,@make,@model,@year)');
      const doc = sales.prepare('INSERT INTO sales_documents(id,vin,category,title,contract_date,sales_person) VALUES (@id,@vin,@category,@title,@contract_date,@sales_person)');
      for (const row of data.salesVehicles) vehicle.run(row);
      for (const row of data.salesDocuments) doc.run(row);
    })();
    service.transaction(() => {
      const vehicle = service.prepare('INSERT INTO vehicles(vin,make,model,year) VALUES (@vin,@make,@model,@year)');
      const event = service.prepare('INSERT INTO service_events(id,vin,service_date,workshop,odometer) VALUES (@id,@vin,@service_date,@workshop,@odometer)');
      const doc = service.prepare('INSERT INTO service_documents(id,event_id,type,title,document_date) VALUES (@id,@event_id,@type,@title,@document_date)');
      for (const row of data.serviceVehicles) vehicle.run(row);
      for (const row of data.serviceEvents) event.run(row);
      for (const row of data.serviceDocuments) doc.run(row);
    })();
    return 'CREATED';
  } finally { sales.close(); service.close(); }
}
