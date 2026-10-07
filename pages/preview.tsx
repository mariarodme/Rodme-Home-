import React from 'react';
import {createRoot} from 'react-dom/client';
import HomeApp from '../app/home-app';
import seed from '../lib/seed.json';
import {addCatalogPhotos} from '../lib/catalog-photos';
import {classifyProducts} from '../lib/classify-products';
import type {Home} from '../lib/model';
import '../app/globals.css';

// This preview uses only the catalog already bundled in the public repository.
// Its temporary changes never read or write a Firebase household.
let home=structuredClone(seed) as Home,revision=1;
addCatalogPhotos(home);classifyProducts(home);
const request=(async(_url:unknown,init:RequestInit={})=>{
 if(init.method==='POST'){const data=JSON.parse(String(init.body));if(data.action==='save'){home=data.home;revision++;}else return Response.json({error:'Abre tu hogar para guardar compras reales.'},{status:400});}
 return Response.json({home,revision});
}) as typeof fetch;
const base=import.meta.env.BASE_URL;
const imageUrl=(src:string)=>src.startsWith('/')?base+src.replace(/^\//,''):src;
createRoot(document.getElementById('root')!).render(<><div className="design-preview-note">Vista de diseño · Cambios de prueba <a href={base}>Abrir mi hogar</a></div><HomeApp request={request} imageUrl={imageUrl} serviceWorkerPath={base+'sw.js'} imageUpload={async()=>{throw Error('Abre tu hogar para guardar imágenes.')}}/></>);
