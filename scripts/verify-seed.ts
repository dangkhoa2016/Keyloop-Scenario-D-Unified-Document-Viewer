import { resolve } from 'node:path';
import { verifySeed } from './seed-lib.js';
const result = verifySeed(resolve(process.env.DATA_DIR ?? './data'));
console.log('DATASET_VERIFICATION=PASS');
for (const [key, value] of Object.entries(result.counts)) console.log(key.toUpperCase()+'='+value);
console.log('DATASET_FINGERPRINT_SHA256='+result.fingerprint);
