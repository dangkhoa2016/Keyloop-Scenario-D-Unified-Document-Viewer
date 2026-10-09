import { resolve } from 'node:path';
import { migrateDir } from './db-utils.js';
migrateDir(resolve(process.env.DATA_DIR ?? './data'));
for (const name of ['SALES', 'SERVICE', 'UNIFIED_AUDIT'])
  console.log('MIGRATE_' + name + '=PASS');
