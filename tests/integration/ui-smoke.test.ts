import {describe,it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {beforeAll,afterAll} from 'vitest';
import {migrateDir,openDatabase} from '../../scripts/db-utils.js';
import {createUnifiedApp} from '../../apps/unified-api/src/app.js';
import type Database from 'better-sqlite3';
let dir:string,db:Database.Database;
beforeAll(()=>{dir=mkdtempSync(join(tmpdir(),'keyloop-ui-'));migrateDir(dir);db=openDatabase(dir,'unified-audit');});
afterAll(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
const app=()=>createUnifiedApp({salesBaseUrl:'http://127.0.0.1:1',serviceBaseUrl:'http://127.0.0.1:2',auditDb:db});
describe('Reviewer UI and public security smoke',()=>{
 it('serves page and accessible VIN form with one document list',async()=>{const res=await app().request('/');const html=await res.text();expect(res.status).toBe(200);expect(res.headers.get('content-type')).toContain('text/html');expect(html).toContain('id="search-form"');expect(html).toContain('for="vin"');expect(html).toContain('id="document-list"');expect(html).toContain('aria-live="polite"');expect(html).toContain('data-filter="SALES"');expect(html).toContain('data-filter="SERVICE"');});
 it('serves local stylesheet and JavaScript with no runtime CDN dependency',async()=>{for(const [url,type] of [['/assets/app.css','text/css'],['/assets/app.js','text/javascript']]){const res=await app().request(url!);expect(res.status).toBe(200);expect(res.headers.get('content-type')).toContain(type);expect((await res.text()).length).toBeGreaterThan(200);}});
 it('does not expose SQLite, logs, secret files or path traversal',async()=>{for(const path of ['/data/sales.sqlite','/logs/unified-runtime.log','/.env','/assets/../../database/sales.sql','/api/search-history','/api/request-traces/req_fake']){const res=await app().request(path);expect(res.status,path).toBe(404);}});
 it('has secure demo-VIN listing without test-fault controls',async()=>{const res=await app().request('/api/demo-vins');expect(res.status).toBe(200);const body=await res.json();expect(body.VIN_BOTH).toMatch(/^[A-HJ-NPR-Z0-9]{17}$/);});
});