import {doc,getDoc,writeBatch,runTransaction,onSnapshot} from 'firebase/firestore';
import {readCache,writeCache} from './offline-cache';
import {SyncEngine,type SyncStatus} from './sync-engine';
import {db,auth,friendlyError} from './firebase';
import type {Home} from '../lib/model';
import {valid,checkout} from './home-actions';
const CHUNK=300000;
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
export const base=import.meta.env.BASE_URL;
export const imageUrl=(src:string)=>src.startsWith('/images/')?base+src.slice(1):src;
function serialize(home:Home){const text=JSON.stringify(home);if(new TextEncoder().encode(text).length>5000000)throw new Error('El hogar supera el tamaño permitido. Descarga un respaldo y reduce el historial o las imágenes antes de guardar.');const chunks:string[]=[];for(let i=0;i<text.length;){let end=Math.min(i+CHUNK,text.length);const last=text.charCodeAt(end-1);if(end<text.length&&last>=0xd800&&last<=0xdbff)end--;chunks.push(text.slice(i,end));i=end;}return chunks;}
const stateRef=(id:string)=>doc(db,'homes',id,'state','current');
const chunkRef=(id:string,index:number)=>doc(db,'homes',id,'chunks',String(index));
function uid(){if(!auth.currentUser)throw new Error('Inicia sesión con Google.');return auth.currentUser.uid;}
export async function currentHome(onUpdate?:(id:string|null)=>void){
 const owner=uid(),key='rodme-home-profile:'+owner,cached=localStorage.getItem(key);
 const refresh=async()=>{
  const profile=await getDoc(doc(db,'users',owner));
  const id=profile.exists()?profile.data().homeId as string:null;
  if(id)localStorage.setItem(key,id);else localStorage.removeItem(key);
  return id;
 };
 if(cached){
  if(navigator.onLine)void refresh().then(id=>{if(id!==cached&&auth.currentUser?.uid===owner)onUpdate?.(id);}).catch(()=>{});
  return cached;
 }
 if(!navigator.onLine)return null;
 return refresh();
}
function requireConnection(){if(!navigator.onLine)throw new Error('Conéctate a internet para crear o compartir un hogar.');}
export async function createHome(){
 requireConnection();
 const [{default:seed},{addCatalogPhotos}]=await Promise.all([import('../lib/seed.json'),import('../lib/catalog-photos')]);
 const owner=uid(),id=crypto.randomUUID(),home=clone(seed) as Home;addCatalogPhotos(home);
 const batch=writeBatch(db),chunks=serialize(home);
 batch.set(doc(db,'homes',id),{owner});batch.set(doc(db,'homes',id,'members',owner),{owner:true});
 batch.set(stateRef(id),{revision:0,chunkCount:chunks.length});chunks.forEach((data,i)=>batch.set(chunkRef(id,i),{data}));
 batch.set(doc(db,'users',owner),{homeId:id});await batch.commit();localStorage.setItem('rodme-home-profile:'+uid(),id);return id;
}
export async function inviteHome(id:string){
 requireConnection();
 const code=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
 const batch=writeBatch(db);batch.set(doc(db,'invites',code),{homeId:id,owner:uid()});await batch.commit();
 return new URL(base+'#invite='+code,location.origin).href;
}
export async function joinHome(raw:string){
 requireConnection();
 let code=raw.trim();if(code.includes('#invite='))code=code.split('#invite=')[1];
 if(!/^[a-f0-9]{64}$/.test(code))throw new Error('Pega el enlace de invitación completo que te compartieron.');
 const invitation=await getDoc(doc(db,'invites',code));if(!invitation.exists())throw new Error('La invitación no existe o ya no está disponible.');
 const id=invitation.data().homeId as string,member=uid();
 const existing=await getDoc(doc(db,'homes',id,'members',member));
 const batch=writeBatch(db);if(!existing.exists())batch.set(doc(db,'homes',id,'members',member),{invite:code});batch.set(doc(db,'users',member),{homeId:id});await batch.commit();localStorage.setItem('rodme-home-profile:'+uid(),id);return id;
}
const engines=new Map<string,SyncEngine>();
const statusListeners=new Map<string,Set<()=>void>>();
function engine(id:string){
 const key=uid()+':'+id;
 if(!engines.has(key)){
  const transact=async(change?: (remote:{home:Home;revision:number})=>Home|null)=>runTransaction(db,async tx=>{
   const state=await tx.get(stateRef(id));if(!state.exists())throw new Error('Este hogar no tiene información guardada.');
   const {revision,chunkCount}=state.data();
   const docs=await Promise.all(Array.from({length:chunkCount},(_,i)=>tx.get(chunkRef(id,i))));
   if(docs.some(d=>!d.exists()))throw new Error('No pudimos cargar el hogar completo. Intenta nuevamente.');
   const remote={home:JSON.parse(docs.map(d=>d.data()!.data).join('')) as Home,revision:revision as number};
   if(!change)return remote;
   const home=change(remote);if(!home)return remote;
   if(!valid(home))throw new Error('Revisa los datos antes de sincronizar.');
   const chunks=serialize(home);
   tx.set(stateRef(id),{revision:revision+1,chunkCount:chunks.length});chunks.forEach((data,i)=>tx.set(chunkRef(id,i),{data}));
   for(let i=chunks.length;i<chunkCount;i++)tx.delete(chunkRef(id,i));
   return {home,revision:revision+1};
  }).catch(e=>{throw new Error(friendlyError(e));});
  engines.set(key,new SyncEngine({read:()=>transact(),commit:edit=>transact(edit)},
   {read:()=>readCache(key),write:value=>writeCache(key,value)},()=>navigator.onLine,
   ()=>statusListeners.get(key)?.forEach(fn=>fn())));
 }return engines.get(key)!;
}
export function syncStatus(id:string):SyncStatus{return engine(id).status;}
export function watchStatus(id:string,callback:()=>void){const key=uid()+':'+id;const set=statusListeners.get(key)||new Set();set.add(callback);statusListeners.set(key,set);return()=>{set.delete(callback);};}
export function watchHome(id:string,callback:()=>void){
 let last:number|undefined;
 const off=onSnapshot(stateRef(id),snapshot=>{const revision=snapshot.data()?.revision;if(revision!==last){last=revision;callback();}},()=>callback());
 const connection=()=>callback();window.addEventListener('online',connection);window.addEventListener('offline',connection);
 return()=>{off();window.removeEventListener('online',connection);window.removeEventListener('offline',connection);};
}
export async function resolveSync(id:string,choices:Record<string,'local'|'remote'>){const run=()=>engine(id).resolve(choices);return navigator.locks?navigator.locks.request('rodme-home:'+uid()+':'+id,run):run();}
export function transport(id:string):typeof fetch{
 let firstRead=true;
 return (async(_input:RequestInfo|URL,init?:RequestInit)=>{
  if(!auth.currentUser)return Response.json({error:'Inicia sesión con Google.'},{status:401});
  try{
   const run=async()=>{
    if(init?.method!=='POST'){const preferCache=firstRead;firstRead=false;return engine(id).load(preferCache);}
    const body=JSON.parse(init.body as string);
    return engine(id).save(body,(home,payload)=>{
     if(!valid(home))throw new Error('Revisa los datos: el archivo o los valores no son válidos.');
     const result=payload.action==='checkout'?checkout(home,payload):home;
     if(!valid(result))throw new Error('Revisa los datos antes de guardar.');serialize(result);return result;
    });
   };
   // Serialise tabs on this device as well as writes within a tab.
   const result=navigator.locks?await navigator.locks.request('rodme-home:'+uid()+':'+id,run):await run();
   return Response.json(result);
  }catch(e){return Response.json({error:friendlyError(e)},{status:503});}
 }) as typeof fetch;
}
export async function uploadImage(file:File){
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw new Error('Selecciona una imagen PNG, JPG, WebP o GIF.');
 if(file.size>20000000)throw new Error('Selecciona una imagen de menos de 20 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
  // WebP preserves transparent product cutouts while keeping shared images small.
  return canvas.toDataURL('image/webp',0.75);
 }finally{bitmap.close();}
}
