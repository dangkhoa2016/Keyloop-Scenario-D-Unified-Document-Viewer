import {serve} from '@hono/node-server';
import {resolve} from 'node:path';
import {openDatabase} from '../../../scripts/db-utils.js';
import {createServiceApp} from './app.js';
const host=process.env.SERVICE_HOST??'127.0.0.1',port=Number(process.env.SERVICE_PORT??3002);
const db=openDatabase(resolve(process.env.DATA_DIR??'./data'),'service');
const server=serve({fetch:createServiceApp(db).fetch,hostname:host,port});
console.log('SERVICE_LISTEN='+host+':'+port);
for(const sig of ['SIGTERM','SIGINT'] as const)process.on(sig,()=>server.close(()=>{db.close();process.exit(0);}));
