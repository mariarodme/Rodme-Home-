import type {Home} from '../lib/model';
import {copy,mergeHomes,type Conflict} from './merge';
import type {CachedHome} from './offline-cache';
export type RemoteHome={home:Home;revision:number};
export type SyncStatus={pending:boolean;offline:boolean;conflicts:Conflict[];error:string};
export type SyncBackend={read:()=>Promise<RemoteHome>;commit:(edit:(remote:RemoteHome)=>Home|null)=>Promise<RemoteHome>};
export class SyncEngine {
 private cache:CachedHome|undefined;
 private views=new Map<number,Home>();
 private queue:Promise<unknown>=Promise.resolve();
 status:SyncStatus={pending:false,offline:false,conflicts:[],error:''};
 constructor(private backend:SyncBackend,private persistence:{read:()=>Promise<CachedHome|undefined>;write:(value:CachedHome)=>Promise<void>},private online:()=>boolean,private changed:()=>void=()=>{}){}
 private async serial<T>(work:()=>Promise<T>):Promise<T>{const next=this.queue.then(work,work);this.queue=next.catch(()=>{});return next;}
 private async init(){this.cache=await this.persistence.read();}
 private notify(error=''){this.status={...this.status,pending:!!this.cache?.pending,offline:!this.online(),error};this.changed();}
 private async persist(value:CachedHome){await this.persistence.write(value);this.cache=value;}
 private snapshot(){if(!this.cache)throw new Error('Abre este hogar con internet una vez para usarlo sin conexión.');this.views.set(this.cache.viewRevision,copy(this.cache.home));if(this.views.size>30)this.views.delete(this.views.keys().next().value!);return {home:copy(this.cache.home),revision:this.cache.viewRevision,pending:this.cache.pending};}
 private async accept(remote:RemoteHome){const c=this.cache;const changed=!c||JSON.stringify(c.home)!==JSON.stringify(remote.home);await this.persist({home:copy(remote.home),serverHome:copy(remote.home),serverRevision:remote.revision,viewRevision:(c?.viewRevision||0)+(changed?1:0),pending:false});this.status.conflicts=[];}
 private async flush(choices:Record<string,'local'|'remote'>={}){
  if(!this.cache?.pending||!this.online()){this.notify();return;}
  const cached=copy(this.cache);let conflicts:Conflict[]=[];
  try{
   const result=await this.backend.commit(remote=>{const merged=mergeHomes(cached.serverHome,cached.home,remote.home,choices);conflicts=merged.conflicts;return conflicts.length?null:merged.home;});
   if(conflicts.length){this.status.conflicts=conflicts;this.notify();return;}
   await this.accept(result);this.notify();
  }catch(e){this.notify((e as Error).message||'No pudimos sincronizar. Tus cambios siguen guardados aquí.');}
 }
 async load(preferCache=false){return this.serial(async()=>{
  await this.init();
  if(preferCache&&this.cache){this.notify();return this.snapshot();}
  if(this.cache?.pending)await this.flush();
  if(this.online()&&!this.cache?.pending){try{await this.accept(await this.backend.read());this.notify();}catch(e){if(!this.cache)throw e;this.notify((e as Error).message);}}
  else this.notify();return this.snapshot();
 });}
 async save(body:any,prepare:(home:Home,body:any)=>Home){return this.serial(async()=>{
  await this.init();if(!this.cache)throw new Error('Primero abre el hogar.');
  const baseline=this.views.get(body.revision);if(!baseline)throw new Error('Recarga el hogar antes de guardar estos cambios.');
  const candidate=prepare(copy(body.home),body);
  const local=mergeHomes(baseline,candidate,this.cache.home);
  if(local.conflicts.length)throw new Error('Este hogar cambió en otra pestaña. Recarga antes de guardar.');
  await this.persist({...this.cache,home:local.home,viewRevision:this.cache.viewRevision+1,pending:true});
  this.status.conflicts=[];this.notify();await this.flush();return this.snapshot();
 });}
 async resolve(choices:Record<string,'local'|'remote'>){return this.serial(async()=>{await this.init();await this.flush(choices);return this.snapshot();});}
}
