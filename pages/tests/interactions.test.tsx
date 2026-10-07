import PhotoShopping from '../../app/photo-shopping';
import BarcodeScanner from '../../app/barcode-scanner';
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

test('pantry quantity buttons and checkout intake work through saved household state',async()=>{
 let home=sample(),revision=1;
 const request=(async(_url:any,init:any={})=>{if(init.method==='POST'){home=JSON.parse(init.body).home;revision++;}return Response.json({home,revision});}) as typeof fetch;
 render(<HomeApp request={request}/>);await screen.findByRole('heading',{name:'Rodme Home 🏠'});
 fireEvent.click(screen.getByRole('button',{name:'🏠 Mi casa',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Añadir existencia Jabón Dove Rosado'}));await waitFor(()=>assert.equal(home.products[0].pantryLots[0].quantity,1));
 fireEvent.click(screen.getByRole('button',{name:'Consumir Jabón Dove Rosado'}));await waitFor(()=>assert.equal(home.products[0].pantryLots.length,0));
 await menu('🛍️ Guardar compras en casa');fireEvent.click(screen.getByRole('button',{name:'Confirmar y guardar en casa'}));await waitFor(()=>assert.equal(home.history[0].pantryReceived,true));assert.equal(home.products[0].pantryLots[0].quantity,2);
});

test('supermarket picked toggle is reversible and quick product form adds a named item',async()=>{
 let home=sample(),revision=1;const request=(async(_url:any,init:any={})=>{if(init.method==='POST'){home=JSON.parse(init.body).home;revision++;}return Response.json({home,revision});}) as typeof fetch;
 render(<HomeApp request={request}/>);await screen.findByRole('heading',{name:'Rodme Home 🏠'});fireEvent.click(screen.getByRole('button',{name:'🛒 Supermercado',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Mis productos',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'Ya lo eché al carrito: Jabón Dove Rosado'}));await waitFor(()=>assert.equal(home.cart.length,1));fireEvent.click(screen.getByRole('button',{name:'Ya lo eché al carrito: Jabón Dove Rosado'}));await waitFor(()=>assert.equal(home.cart.length,0));
 fireEvent.click(screen.getByText('＋ Agregar un producto rápidamente'));fireEvent.change(screen.getByLabelText('Nombre'),{target:{value:'Leche nueva'}});fireEvent.change(screen.getByLabelText('Precio por unidad (opcional)'),{target:{value:'1500'}});fireEvent.click(screen.getByRole('button',{name:'Agregar al carrito',exact:true}));await waitFor(()=>assert.equal(home.cart.length,1));assert.equal(home.products.at(-1)?.name,'Leche nueva');assert.equal(home.cart[0].price,1500);
});

test('finish action can be undone through the saved app and missing products remain pending',async()=>{
 let home=sample(),revision=1;home.products[0].pantryLots=[{id:'lot',quantity:3,expiry:''}];const request=(async(_url:any,init:any={})=>{if(init.method==='POST'){home=JSON.parse(init.body).home;revision++;}return Response.json({home,revision});}) as typeof fetch;
 render(<HomeApp request={request}/>);await screen.findByRole('heading',{name:'Rodme Home 🏠'});fireEvent.click(screen.getByRole('button',{name:'🏠 Mi casa',exact:true}));fireEvent.click(screen.getAllByRole('button',{name:'Se terminó',exact:true})[0]);await waitFor(()=>assert.equal(home.products[0].pantryLots.length,0));fireEvent.click(screen.getByRole('button',{name:'↶ Deshacer último cambio'}));await waitFor(()=>assert.equal(home.products[0].pantryLots[0].quantity,3));
 fireEvent.click(screen.getByRole('button',{name:'🛒 Supermercado',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Mis productos',exact:true}));fireEvent.click(screen.getByRole('button',{name:'No encontré: Jabón Dove Rosado'}));await waitFor(()=>assert.deepEqual(home.products[0].notFoundStores,['shop']));assert.equal(home.products[0].purchased,false);
});
test('scanner manually finds a stored product and stops camera on a decoded barcode',async()=>{
 const home=sample();home.products[0].barcode='7501000123456';let picked='';let stops=0;
 const readerFactory=async()=>({decodeFromConstraints:async(_constraints:any,_video:any,callback:any)=>{const controls={stop:()=>stops++};callback({getText:()=> '7501000123456'},undefined,controls);return controls;}});
 render(<BarcodeScanner home={home} busy={false} onProduct={p=>picked=p.id} onAssign={async()=>true} readerFactory={readerFactory}/>);fireEvent.click(screen.getByRole('button',{name:'📷 Buscar por código de barras'}));fireEvent.change(screen.getByLabelText('Código de barras'),{target:{value:'7501000123456'}});fireEvent.click(screen.getByRole('button',{name:'Buscar código',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Agregar este producto'}));assert.equal(picked,'soap');
 fireEvent.click(screen.getByRole('button',{name:'Abrir cámara'}));await waitFor(()=>assert.ok(stops>=1));await waitFor(()=>assert.equal(document.querySelector('video'),null));
});

test('photo price is read but only added after confirmation and can be corrected first',async()=>{
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{};let amount=0;
 try{render(<PhotoShopping busy={false} upload={async()=>''} readPhoto={async()=> 'PRECIO ₡2.500'} onPrice={async value=>{amount=value;return true}} onProduct={async()=>true}/>);fireEvent.click(screen.getByRole('button',{name:'📷 Foto rápida'}));fireEvent.change(screen.getByLabelText('Foto rápida'),{target:{files:[new File(['photo'],'label.jpg',{type:'image/jpeg'})]}});await waitFor(()=>assert.equal((screen.getByLabelText('Monto de la foto') as HTMLInputElement).value,'2500'));assert.equal(amount,0);fireEvent.change(screen.getByLabelText('Monto de la foto'),{target:{value:'2600'}});fireEvent.click(screen.getByRole('button',{name:'Sumar ₡2 600'}));await waitFor(()=>assert.equal(amount,2600));}finally{URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;}
});


test('location cards filter original photos and empty reset, while compact shopping keeps store selection and live total',async()=>{
 let home=sample(),revision=1;home.products[0].pantryLocation='Baño';home.products[0].image='/images/soap.png';home.products[1].pantryLocation='Alacena';
 const request=(async(_url:any,init:any={})=>{if(init.method==='POST'){home=JSON.parse(init.body).home;revision++;}return Response.json({home,revision});}) as typeof fetch;
 render(<HomeApp request={request}/>);await screen.findByRole('heading',{name:'Rodme Home 🏠'});
 fireEvent.click(screen.getByRole('button',{name:'Ver lo que tengo'}));fireEvent.click(screen.getByRole('button',{name:'Baño',exact:true}));
 assert.equal(document.querySelectorAll('.pantry-product').length,1);assert.equal(document.querySelector('.location-card[aria-label="Baño"] img')?.getAttribute('src'),'/images/soap.png');
 fireEvent.change(screen.getByLabelText('Buscar en casa'),{target:{value:'No existe'}});fireEvent.click(screen.getByRole('button',{name:'Ver todo mi hogar'}));assert.equal(document.querySelectorAll('.pantry-product').length,2);
 fireEvent.click(screen.getByRole('button',{name:'🛒 Supermercado',exact:true}));fireEvent.change(screen.getByLabelText('Cuenta, por ejemplo 2500+3500*2'),{target:{value:'2500+3500*2+'}});
 assert.equal(document.querySelector('.cart-amount')?.textContent?.replace(/\D/g,''),'9500');
 fireEvent.click(screen.getByRole('button',{name:'Mis productos',exact:true}));fireEvent.click(screen.getByText('Tienda y lista de esta compra'));fireEvent.change(screen.getByLabelText('Tienda de esta compra'),{target:{value:'other'}});await waitFor(()=>assert.equal(home.cartStoreId,'other'));
 assert.equal(screen.getByRole('button',{name:'🛒 Supermercado',exact:true}).getAttribute('aria-current'),'page');
});
