import type {Home, Entity} from './model';

export function repeatPurchase(home:Home, receipt:any, id:string):Entity {
 const existing=new Set(home.products.map(p=>p.id));
 const productIds=[...new Set<string>((receipt.items||[]).map((i:any)=>i.productId).filter((id:string)=>existing.has(id)))];
 if(!productIds.length)throw new Error('Esta compra no tiene productos del catálogo para repetir.');
 return {id,name:`${receipt.storeName||'Compra'} · ${new Date(receipt.date).toLocaleDateString('es-CR')}`,image:home.stores.find(s=>s.id===receipt.storeId)?.image||'',icon:'🛍️',storeId:home.stores.some(s=>s.id===receipt.storeId)?receipt.storeId:'',productIds,date:'',completed:false};
}

export function pricesByStore(home:Home, productId:string){
 const prices=new Map<string,{storeId:string;storeName:string;price:number;date:string}>();
 for(const receipt of [...home.history].sort((a,b)=>b.date.localeCompare(a.date))){
  if(prices.has(receipt.storeId||''))continue;
  const items=(receipt.items||[]).filter((i:any)=>i.productId===productId&&Number.isFinite(i.price)&&i.quantity>0);
  if(!items.length)continue;
  const quantity=items.reduce((n:number,i:any)=>n+i.quantity,0);
  const amount=items.reduce((n:number,i:any)=>n+Math.max(0,i.price*i.quantity-(i.discount||0)),0);
  prices.set(receipt.storeId||'',{storeId:receipt.storeId||'',storeName:receipt.storeName||'Sin tienda',price:Math.round(amount/quantity*100)/100,date:receipt.date});
 }
 return [...prices.values()].sort((a,b)=>a.price-b.price);
}

export function routeSections(home:Home,storeId:string){
 const order=home.storeRoutes?.[storeId]||[];
 const rank=(id:string)=>{const i=order.indexOf(id);return i<0?Number.MAX_SAFE_INTEGER:i};
 return [...home.sections].sort((a,b)=>rank(a.id)-rank(b.id)||(a.order||0)-(b.order||0));
}
