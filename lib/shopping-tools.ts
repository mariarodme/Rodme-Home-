import type {Home,Product,Entity} from './model';
import {stock} from './pantry';
export function neededQuantity(p:Product){const have=stock(p);if(have===undefined)return null;const target=p.targetStock??(Number(p.minimumStock||0)+1);return Math.max(0,Math.round((target-have)*1000000)/1000000);}
export function finishProduct(p:Product){p.pantryLots=[];p.finished=true;p.runningLow=true;p.purchased=false;}
export function toggleNotFound(h:Home,productId:string){const p=h.products.find(p=>p.id===productId);if(!p)return;const store=h.cartStoreId||'';const ids:string[]=p.notFoundStores||[];if(ids.includes(store))p.notFoundStores=ids.filter(id=>id!==store);else{p.notFoundStores=[...ids,store];p.purchased=false;h.cart=h.cart.filter(i=>i.productId!==productId);}}
export function reviewRoutine(h:Home,list:Entity){for(const id of list.productIds||[]){const p=h.products.find(p=>p.id===id);if(!p)continue;const needed=neededQuantity(p);p.purchased=needed!==null&&needed===0;if(!p.purchased)p.runningLow=true;}const current=h.lists.find(l=>l.id===list.id);if(current)current.completed=false;}
export function barcodeProduct(h:Home,code:string){return h.products.find(p=>p.barcode===code.trim());}
export function assignBarcode(h:Home,productId:string,code:string){code=code.trim();if(!/^\d{8,14}$/.test(code))throw Error('Escribe entre 8 y 14 dígitos del código de barras.');if(h.products.some(p=>p.id!==productId&&p.barcode===code))throw Error('Ese código ya está asociado a otro producto.');const p=h.products.find(p=>p.id===productId);if(!p)throw Error('Producto no encontrado');p.barcode=code;}
