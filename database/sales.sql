PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS vehicles(vin TEXT PRIMARY KEY,make TEXT NOT NULL,model TEXT NOT NULL,year INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sales_documents(id TEXT PRIMARY KEY,vin TEXT NOT NULL REFERENCES vehicles(vin),category TEXT NOT NULL,title TEXT NOT NULL,contract_date TEXT NOT NULL,sales_person TEXT);
CREATE INDEX IF NOT EXISTS idx_sales_documents_vin ON sales_documents(vin);
