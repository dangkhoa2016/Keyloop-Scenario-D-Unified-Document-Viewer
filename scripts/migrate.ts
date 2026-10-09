import Database from 'better-sqlite3';import {readFileSync,mkdirSync} from 'node:fs';import {resolve} from 'node:path';
const dir=resolve(process.env.DATA_DIR??'./data');mkdirSync(dir,{recursive:true});
for(const name of ['sales','service','unified-audit']){const db=new Database(resolve(dir,name+'.sqlite'));try{db.pragma('foreign_keys=ON');db.pragma('journal_mode=WAL');db.exec(readFileSync(resolve('database',name+'.sql'),'utf8'));console.log('MIGRATE_'+name.toUpperCase().replace('-','_')+'=PASS');}finally{db.close();}}
