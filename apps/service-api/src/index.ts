import {serve} from '@hono/node-server';
import {resolve} from 'node:path';
import {openDatabase} from '../../../scripts/db-utils.js';
import {createServiceApp} from './app.js';
const host=process.env.SERVICE_HOST??'127.0.0.1',port=Number(process.env.SERVICE_PORT??3002),dataDir=resolve(process.env.DATA_DIR??'./data');
const db=openDatabase(dataDir,'service'),eventDb=openDatabase(dataDir,'unified-audit');
const server=serve({fetch:createServiceApp(db,{eventDb}).fetch,hostname:host,port});
console.log('SERVICE_LISTEN='+host+':'+port);
for(const sig of ['SIGTERM','SIGINT'] as const)process.on(sig,()=>server.close(()=>{db.close();eventDb.close();process.exit(0);}));
