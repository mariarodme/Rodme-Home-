import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {onAuthStateChanged,signOut,User} from 'firebase/auth';
import {auth,login,friendlyError} from './firebase';
import {currentHome,createHome,joinHome,inviteHome,transport,uploadImage,imageUrl,base} from './storage';
import HomeApp from '../app/home-app';
import '../app/globals.css';
import './style.css';
function App(){
 const [user,setUser]=useState<User|null>(null),[homeId,setHomeId]=useState<string|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[invite,setInvite]=useState(''),[sharing,setSharing]=useState(''),[joinOpen,setJoinOpen]=useState(false);
 const request=useMemo(()=>homeId?transport(homeId):undefined,[homeId]);
 useEffect(()=>onAuthStateChanged(auth,async next=>{
  setUser(next);setHomeId(null);setSharing('');setLoading(true);setError('');
  try{if(next){const id=await currentHome();if(auth.currentUser?.uid===next.uid)setHomeId(id);}}catch(e){setError(friendlyError(e));}finally{setLoading(false);}
 }),[]);
 useEffect(()=>{const params=new URLSearchParams(location.hash.slice(1));const value=params.get('invite');if(value){setInvite(value);setJoinOpen(true);}},[]);
 async function work(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(friendlyError(e));}finally{setBusy(false);}}
 async function join(){await work(async()=>{setHomeId(await joinHome(invite));setJoinOpen(false);setSharing('');history.replaceState(null,'',base);});}
 const enter=()=>work(async()=>{await login();});
 const exit=()=>work(async()=>{await signOut(auth);setHomeId(null);setSharing('');});
 if(loading)return <main className="loading"><p>Abriendo Rodme Home…</p></main>;
 if(!user)return <main className="loading"><h1>Rodme Home 🏠</h1><p>Entra con Google para guardar tus listas y compras.</p><button className="primary" disabled={busy} onClick={enter}>{busy?'Abriendo Google…':'Entrar con Google'}</button>{error&&<p role="alert">{error}</p>}</main>;
 const joinForm=<form onSubmit={e=>{e.preventDefault();join();}}><label>Enlace de invitación<input value={invite} onChange={e=>setInvite(e.target.value)} placeholder="Pega el enlace del hogar" required/></label><button className="primary" disabled={busy}>Unirme a este hogar</button>{homeId&&<button type="button" disabled={busy} onClick={()=>setJoinOpen(false)}>Cancelar</button>}</form>;
 if(!homeId||joinOpen)return <main className="loading household"><h1>Rodme Home 🏠</h1><p>{homeId?'Al unirte verás las listas y compras de ese hogar.':'Crea tu hogar o únete al que te compartieron.'}</p>{!homeId&&<button disabled={busy} className="primary" onClick={()=>work(async()=>{setHomeId(await createHome());})}>Crear mi hogar</button>}{joinForm}{error&&<p role="alert">{error}</p>}<button disabled={busy} onClick={exit}>Cerrar sesión</button></main>;
 const controls=<div className="household"><h2>Tu cuenta y hogar</h2><p>{user.email}</p><button disabled={busy} onClick={()=>work(async()=>{setSharing(await inviteHome(homeId));})}>Compartir mi hogar</button>{sharing&&<><p>Quien reciba esta invitación podrá ver y editar tus listas y compras al entrar con Google.</p><label>Enlace para compartir<input value={sharing} readOnly onFocus={e=>e.target.select()}/></label><button onClick={()=>work(async()=>{await navigator.clipboard.writeText(sharing);})}>Copiar enlace</button></>}<button disabled={busy} onClick={()=>{setInvite('');setJoinOpen(true);}}>Unirme a otro hogar</button><button disabled={busy} onClick={exit}>Cerrar sesión</button>{error&&<p role="alert">{error}</p>}</div>;
 return <HomeApp key={homeId} request={request} imageUpload={uploadImage} imageUrl={imageUrl} sessionControls={controls} serviceWorkerPath={base+'sw.js'} signIn={enter}/>;
}
createRoot(document.getElementById('root')!).render(<App/>);
