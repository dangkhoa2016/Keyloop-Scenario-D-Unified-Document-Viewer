PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS vehicles(vin TEXT PRIMARY KEY,make TEXT NOT NULL,model TEXT NOT NULL,year INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS service_events(id TEXT PRIMARY KEY,vin TEXT NOT NULL REFERENCES vehicles(vin),service_date TEXT NOT NULL,workshop TEXT NOT NULL,odometer INTEGER NOT NULL CHECK(odometer>=0));
CREATE TABLE IF NOT EXISTS service_documents(id TEXT PRIMARY KEY,event_id TEXT NOT NULL REFERENCES service_events(id),type TEXT NOT NULL,title TEXT NOT NULL,document_date TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_service_events_vin ON service_events(vin);
CREATE INDEX IF NOT EXISTS idx_service_documents_event ON service_documents(event_id);
