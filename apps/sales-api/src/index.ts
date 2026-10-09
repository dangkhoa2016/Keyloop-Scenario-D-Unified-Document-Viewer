import {serve} from '@hono/node-server';
import {resolve} from 'node:path';
import {openDatabase} from '../../../scripts/db-utils.js';
import {createSalesApp} from './app.js';
const host=process.env.SALES_HOST??'127.0.0.1',port=Number(process.env.SALES_PORT??3001),dataDir=resolve(process.env.DATA_DIR??'./data');
const db=openDatabase(dataDir,'sales'),eventDb=openDatabase(dataDir,'unified-audit');
const server=serve({fetch:createSalesApp(db,{eventDb}).fetch,hostname:host,port});
console.log('SALES_LISTEN='+host+':'+port);
for(const sig of ['SIGTERM','SIGINT'] as const)process.on(sig,()=>server.close(()=>{db.close();eventDb.close();process.exit(0);}));
