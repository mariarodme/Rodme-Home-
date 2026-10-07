import './dom-setup';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
Object.assign(globalThis,{indexedDB,IDBKeyRange});
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,fireEvent,waitFor,cleanup,within} from '@testing-library/react';
import Calculator from '../../app/calculator';
import HomeApp from '../../app/home-app';
import {readCache,writeCache} from '../offline-cache';
import type {Home} from '../../lib/model';
const product=(id:string,name:string,sectionId:string)=>({id,name,sectionId,image:'',icon:'',storeId:'shop',purchased:false,finished:false,frequent:false,price:100,lastPrice:100,lastDate:'',notes:''});
function sample():Home{return {products:[product('soap','Jabón Dove Rosado','care'),product('rice','Arroz','food')],stores:[{id:'shop',name:'Auto Mercado',image:'',icon:'🏪'},{id:'other',name:'Otra tienda',image:'',icon:'🏪'}],sections:[{id:'food',name:'Alimentos',image:'',icon:'🍚',order:1},{id:'care',name:'Cuidado Personal',image:'',icon:'🧼',order:2}],lists:[],cover:'',cart:[],calculatorExpression:'',budget:null,cartStoreId:'shop',cartListId:'',history:[{id:'old',date:'2026-10-07T12:00:00Z',storeId:'shop',storeName:'Auto Mercado',total:190,items:[{productId:'soap',name:'Jabón Dove Rosado',quantity:2,price:100,discount:10,subtotal:190}]},{id:'older',date:'2026-10-06T12:00:00Z',storeId:'other',storeName:'Otra tienda',total:110,items:[{productId:'soap',name:'Jabón Dove Rosado',quantity:1,price:110,discount:0,subtotal:110}]}]};}
afterEach(()=>cleanup());
async function menu(label:string){fireEvent.click(screen.getByRole('button',{name:'Abrir menú',exact:true}));fireEvent.click(screen.getByRole('button',{name:label,exact:true}));}
test('calculator amount editor keeps expression and recalculates the total',async()=>{
 render(<Calculator initial="2500+3500*2+" busy={false} onDraft={()=>{}} onSave={async()=>true} onClear={async()=>true}/>);
 fireEvent.click(screen.getByText(/Montos de la cuenta/));fireEvent.click(screen.getByRole('button',{name:'Editar monto 3500'}));fireEvent.change(screen.getByLabelText('Corregir monto'),{target:{value:'4000'}});fireEvent.click(screen.getByRole('button',{name:'Guardar',exact:true}));
 assert.equal((screen.getByLabelText('Cuenta, por ejemplo 2500+3500*2') as HTMLInputElement).value,'2500+4000*2+');assert.equal(screen.getByRole('status').textContent?.replace(/\D/g,''),'10500');
});
test('shopping controls create pending products, compare prices, repeat receipt, order route and receive updates',async()=>{
 let home=sample(),revision=1,refresh:()=>void=()=>{};
 const request=(async(_url:any,init:any={})=>{if(init.method==='POST'){home=JSON.parse(init.body).home;revision++;}return Response.json({home,revision});}) as typeof fetch;
 render(<HomeApp request={request} subscribeHome={callback=>{refresh=callback;return()=>{};}}/>);
 await screen.findByRole('heading',{name:'Rodme Home 🏠',exact:true});
 fireEvent.click(screen.getAllByRole('button',{name:'🧴 Se acaba',exact:true})[0]);await waitFor(()=>assert.equal(home.products[0].runningLow,true));
 await menu('🏷️ Comparar precios');fireEvent.change(screen.getByLabelText('Producto'),{target:{value:'soap'}});await screen.findByText('₡95');assert.equal(document.querySelectorAll('.price-row').length,2);
 await menu('🧾 Historial');fireEvent.click(document.querySelector('.receipt-row')!);fireEvent.click(screen.getByRole('button',{name:'🛍️ Repetir esta compra'}));await waitFor(()=>assert.equal(home.lists.length,1));assert.equal(document.querySelectorAll('.product-row').length,1);
 await menu('🚶 Recorrido por tienda');fireEvent.change(screen.getByLabelText('Tienda'),{target:{value:'shop'}});fireEvent.click(screen.getByRole('button',{name:'Subir Cuidado Personal'}));await waitFor(()=>assert.equal(home.storeRoutes?.shop[0],'care'));fireEvent.click(screen.getByRole('button',{name:'← Volver a comprar'}));await screen.findByText('🧼 Cuidado Personal');assert.equal(document.querySelector('.shopping-section h2')?.textContent,'🧼 Cuidado Personal');
 home=structuredClone(home);home.products[1].name='Arroz compartido';revision++;refresh();await screen.findByText('Arroz compartido');
});
test('IndexedDB retains queued household data and isolates account/household keys',async()=>{
 const home=sample();home.products[0].notes='Sin conexión';const value={home,serverHome:sample(),serverRevision:7,viewRevision:8,pending:true};await writeCache('ana:home',value);assert.equal((await readCache('ana:home'))?.home.products[0].notes,'Sin conexión');assert.equal((await readCache('ana:home'))?.pending,true);assert.equal(await readCache('sister:home'),undefined);assert.equal(await readCache('ana:other'),undefined);
});
