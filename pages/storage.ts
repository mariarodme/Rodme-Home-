import {doc,getDoc,writeBatch,runTransaction} from 'firebase/firestore';
import {db,auth,friendlyError} from './firebase';
import type {Home} from '../lib/model';
import seed from '../lib/seed.json';
import {addCatalogPhotos} from '../lib/catalog-photos';
import {valid,checkout} from './home-actions';
const CHUNK=300000;
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
export const base=import.meta.env.BASE_URL;
export const imageUrl=(src:string)=>src.startsWith('/images/')?base+src.slice(1):src;
function serialize(home:Home){const text=JSON.stringify(home);if(new TextEncoder().encode(text).length>5000000)throw new Error('El hogar supera el tamaño permitido. Descarga un respaldo y reduce el historial o las imágenes antes de guardar.');const chunks:string[]=[];for(let i=0;i<text.length;){let end=Math.min(i+CHUNK,text.length);const last=text.charCodeAt(end-1);if(end<text.length&&last>=0xd800&&last<=0xdbff)end--;chunks.push(text.slice(i,end));i=end;}return chunks;}
const stateRef=(id:string)=>doc(db,'homes',id,'state','current');
const chunkRef=(id:string,index:number)=>doc(db,'homes',id,'chunks',String(index));
function uid(){if(!auth.currentUser)throw new Error('Inicia sesión con Google.');return auth.currentUser.uid;}
export async function currentHome(){const profile=await getDoc(doc(db,'users',uid()));return profile.exists()?profile.data().homeId as string:null;}
export async function createHome(){
 const owner=uid(),id=crypto.randomUUID(),home=clone(seed) as Home;addCatalogPhotos(home);
 const batch=writeBatch(db),chunks=serialize(home);
 batch.set(doc(db,'homes',id),{owner});batch.set(doc(db,'homes',id,'members',owner),{owner:true});
 batch.set(stateRef(id),{revision:0,chunkCount:chunks.length});chunks.forEach((data,i)=>batch.set(chunkRef(id,i),{data}));
 batch.set(doc(db,'users',owner),{homeId:id});await batch.commit();return id;
}
export async function inviteHome(id:string){
 const code=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
 const batch=writeBatch(db);batch.set(doc(db,'invites',code),{homeId:id,owner:uid()});await batch.commit();
 return new URL(base+'#invite='+code,location.origin).href;
}
export async function joinHome(raw:string){
 let code=raw.trim();if(code.includes('#invite='))code=code.split('#invite=')[1];
 if(!/^[a-f0-9]{64}$/.test(code))throw new Error('Pega el enlace de invitación completo que te compartieron.');
 const invitation=await getDoc(doc(db,'invites',code));if(!invitation.exists())throw new Error('La invitación no existe o ya no está disponible.');
 const id=invitation.data().homeId as string,member=uid();
 const existing=await getDoc(doc(db,'homes',id,'members',member));
 const batch=writeBatch(db);if(!existing.exists())batch.set(doc(db,'homes',id,'members',member),{invite:code});batch.set(doc(db,'users',member),{homeId:id});await batch.commit();return id;
}
export function transport(id:string):typeof fetch{
 return (async(_input:RequestInfo|URL,init?:RequestInit)=>{
  if(!auth.currentUser)return Response.json({error:'Inicia sesión con Google.'},{status:401});
  try{
   const body=init?.method==='POST'?JSON.parse(init.body as string):null;
   const result=await runTransaction(db,async tx=>{
    const state=await tx.get(stateRef(id));if(!state.exists())throw new Error('Este hogar no tiene información guardada.');
    const {revision,chunkCount}=state.data();
    const docs=await Promise.all(Array.from({length:chunkCount},(_,i)=>tx.get(chunkRef(id,i))));
    if(docs.some(d=>!d.exists()))throw new Error('No pudimos cargar el hogar completo. Intenta nuevamente.');
    let home=JSON.parse(docs.map(d=>d.data()!.data).join('')) as Home;
    if(!body)return {home,revision};
    if(body.revision!==revision)throw new Error('Tus datos cambiaron en otro dispositivo. Recarga para verlos antes de guardar.');
    home=body.action==='checkout'?checkout(clone(home),body):body.home;
    if(!valid(home))throw new Error('Revisa los datos: el archivo o los valores no son válidos.');
    const chunks=serialize(home);
    tx.set(stateRef(id),{revision:revision+1,chunkCount:chunks.length});chunks.forEach((data,i)=>tx.set(chunkRef(id,i),{data}));
    for(let i=chunks.length;i<chunkCount;i++)tx.delete(chunkRef(id,i));
    return {home,revision:revision+1};
   });return Response.json(result);
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
