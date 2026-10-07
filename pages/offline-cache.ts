import type {Home} from '../lib/model';
export type CachedHome={home:Home;serverHome:Home;serverRevision:number;viewRevision:number;pending:boolean};
let database:Promise<IDBDatabase>|undefined;
function open(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('rodme-home-offline',1);r.onupgradeneeded=()=>r.result.createObjectStore('homes');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function readCache(key:string):Promise<CachedHome|undefined>{const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('homes');const r=tx.objectStore('homes').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function writeCache(key:string,value:CachedHome){const db=await open();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('homes','readwrite');tx.objectStore('homes').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
