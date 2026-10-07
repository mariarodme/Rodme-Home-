import BrandMark from '../app/brand-mark';
import React,{useEffect,useMemo,useState,lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged,signOut,User} from 'firebase/auth';
import {auth,login,friendlyError} from './firebase';
import {currentHome,createHome,joinHome,inviteHome,transport,uploadImage,imageUrl,base,watchHome,watchStatus,syncStatus,resolveSync} from './storage';
const HomeApp=lazy(()=>import('../app/home-app'));
import type {SyncStatus} from './sync-engine';
import '../app/globals.css';
import './style.css';
function App(){
 const [user,setUser]=useState<User|null>(null),[homeId,setHomeId]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[invite,setInvite]=useState(''),[sharing,setSharing]=useState(''),[joinOpen,setJoinOpen]=useState(false);
 const [sync,setSync]=useState<SyncStatus>({offline:!navigator.onLine,pending:false,conflicts:[],error:''}),[choices,setChoices]=useState<Record<string,'local'|'remote'>>({});
 const request=useMemo(()=>homeId?transport(homeId):undefined,[homeId]);
 useEffect(()=>onAuthStateChanged(auth,async next=>{
  setUser(next);setHomeId(null);setSharing('');setLoading(true);setError('');
  try{if(next){const id=await currentHome(updated=>{if(auth.currentUser?.uid===next.uid)setHomeId(updated);});if(auth.currentUser?.uid===next.uid)setHomeId(id);}}catch(e){setError(friendlyError(e));}finally{setLoading(false);}
 }),[]);
 useEffect(()=>{
  if(!homeId||!user)return;
  const update=()=>setSync({...syncStatus(homeId),offline:!navigator.onLine});update();
  const off=watchStatus(homeId,update);window.addEventListener('online',update);window.addEventListener('offline',update);
  return()=>{off();window.removeEventListener('online',update);window.removeEventListener('offline',update);};
 },[homeId,user?.uid]);
 const subscribe=useMemo(()=>homeId?((callback:()=>void)=>{
  const off=watchHome(homeId,callback);const local=()=>callback();window.addEventListener('rodme-sync',local);
  return()=>{off();window.removeEventListener('rodme-sync',local);};
 }):undefined,[homeId]);
 async function retry(){if(!request)return;await work(async()=>{await request('/api/home');window.dispatchEvent(new Event('rodme-sync'));});}
 useEffect(()=>{const params=new URLSearchParams(location.hash.slice(1));const value=params.get('invite');if(value){setInvite(value);setJoinOpen(true);}},[]);
 async function work(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}
 async function join(){await work(async()=>{setHomeId(await joinHome(invite));setJoinOpen(false);setSharing('');history.replaceState(null,'',base);});}
 const enter=()=>work(async()=>{await login();});
 const exit=()=>work(async()=>{if(sync.pending)throw new Error('Sincroniza tus cambios pendientes antes de cerrar sesión.');await signOut(auth);setHomeId(null);setSharing('');});
 if(loading)return <main className="loading" aria-busy="true"><BrandMark/><h1>Rodme Home</h1><p>Preparando tu espacio…</p><div className="loading-line"/></main>;
 if(!user)return <main className="loading welcome"><BrandMark/><span className="eyebrow">BIENVENIDA A TU ESPACIO</span><h1>Rodme Home 🏠</h1><p>Tu casa, en orden. Tus compras, más sencillas.</p><div className="welcome-details"><span>🥫 Tu alacena</span><span>✍️ Tus listas</span><span>🛒 Tus compras</span></div><p className="secondary">Entra con Google para abrir tu hogar y guardar tus cambios.</p><button className="primary" disabled={busy} onClick={enter}>{busy?'Abriendo Google…':'Entrar con Google'}</button>{error&&<p role="alert">{error}</p>}</main>;
 const joinForm=<form onSubmit={e=>{e.preventDefault();join();}}><label>Enlace de invitación<input value={invite} onChange={e=>setInvite(e.target.value)} placeholder="Pega el enlace del hogar" required/></label><button className="primary" disabled={busy}>Unirme a este hogar</button>{homeId&&<button type="button" disabled={busy} onClick={()=>setJoinOpen(false)}>Cancelar</button>}</form>;
 if(!homeId||joinOpen)return <main className="loading household"><h1>Rodme Home 🏠</h1><p>{homeId?'Al unirte verás las listas y compras de ese hogar.':'Crea tu hogar o únete al que te compartieron.'}</p>{!homeId&&<button disabled={busy} className="primary" onClick={()=>work(async()=>{setHomeId(await createHome());})}>Crear mi hogar</button>}{joinForm}{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={exit}>Cerrar sesión</button></main>;
 const syncControls=<aside className="sync-bar" aria-live="polite">
  <span>{sync.offline?'Sin conexión · Guardado en este dispositivo':sync.pending?'Cambios guardados aquí · Pendientes de sincronizar':'Hogar compartido · Sincronizado'}</span>
  {(sync.pending||sync.error)&&!sync.offline&&<button disabled={busy} onClick={retry}>Sincronizar ahora</button>}
  {sync.error&&<p role="alert">{sync.error}</p>}
  {sync.conflicts.length>0&&<details open><summary>Revisar {sync.conflicts.length} cambios coincidentes</summary><p>Dos personas cambiaron estos mismos datos. Elige qué versión conservar; los demás cambios se combinarán.</p><form onSubmit={e=>{e.preventDefault();work(async()=>{await resolveSync(homeId,choices);setChoices({});window.dispatchEvent(new Event('rodme-sync'));});}}>
  {sync.conflicts.map(c=><label key={c.path}>{c.label}<select required value={choices[c.path]||''} onChange={e=>setChoices({...choices,[c.path]:e.target.value as 'local'|'remote'})}><option value="">Elige una versión</option><option value="local">Mi cambio: {describe(c.local)}</option><option value="remote">El otro cambio: {describe(c.remote)}</option></select></label>)}<button className="primary" disabled={busy||sync.offline}>Guardar selección</button></form></details>}
 </aside>;
 const controls=<div className="household"><h2>Tu cuenta y hogar</h2><p>{user.email}</p><button disabled={busy} onClick={()=>work(async()=>{setSharing(await inviteHome(homeId));})}>Compartir mi hogar</button>{sharing&&<><p>Quien reciba esta invitación podrá ver y editar tus listas y compras al entrar con Google.</p><label>Enlace para compartir<input value={sharing} readOnly onFocus={e=>e.target.select()}/></label><button onClick={()=>work(async()=>{await navigator.clipboard.writeText(sharing);})}>Copiar enlace</button></>}<button disabled={busy} onClick={()=>{setInvite('');setJoinOpen(true);}}>Unirme a otro hogar</button><button disabled={busy} onClick={exit}>Cerrar sesión</button>{error&&<p role="alert">{error}</p>}</div>;
 return <Suspense fallback={<main className="loading"><p>Abriendo tus listas…</p></main>}><HomeApp key={homeId} request={request} imageUpload={uploadImage} imageUrl={imageUrl} subscribeHome={subscribe} syncControls={syncControls} sessionControls={controls} serviceWorkerPath={base+'sw.js'} signIn={enter}/></Suspense>;
}
function describe(value:unknown){if(value===undefined)return 'Eliminado';if(typeof value==='boolean')return value?'Sí':'No';if(typeof value==='string'||typeof value==='number')return String(value).slice(0,90)||'Vacío';if(value&&typeof value==='object'&&'name'in value)return String(value.name);return Array.isArray(value)?`${value.length} elementos`:'Datos modificados';}
createRoot(document.getElementById('root')!).render(<App/>);
