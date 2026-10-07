import {locations} from '../lib/pantry';
import {calculate} from '../lib/calculator';
import {Home, cartTotal, lineTotal, total, quickSteps, operationLabel} from '../lib/model';
function validImage(src:string){return /^\/images\/[\w.-]+$/.test(src)||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src);}
export function valid(h: any): h is Home {
  if (!h || !Array.isArray(h.cart) || !Array.isArray(h.history) || typeof h.cover !== 'string') return false;
  for (const key of ['products','stores','sections','lists']) {
    if (!Array.isArray(h[key]) || h[key].length > 10000) return false;
    const ids = new Set();
    for (const x of h[key]) {
      if (!x || typeof x.id !== 'string' || typeof x.name !== 'string' || x.name.length > 500 || ids.has(x.id)) return false;
      ids.add(x.id);
      if (x.image && (typeof x.image !== 'string' || !validImage(x.image))) return false;
    }
  }
  if (h.cover && !validImage(h.cover)) return false;
  if(h.storeRoutes!==undefined&&(typeof h.storeRoutes!=='object'||h.storeRoutes===null||Array.isArray(h.storeRoutes)||Object.values(h.storeRoutes).some((route:any)=>!Array.isArray(route)||route.some((id:any)=>typeof id!=='string')||new Set(route).size!==route.length)))return false;
  if(h.products.some((p:any)=>p.runningLow!==undefined&&typeof p.runningLow!=='boolean'))return false;
  for(const p of h.products){
    if(p.pantryLocation!==undefined&&!locations.includes(p.pantryLocation))return false;
    if(p.pantryUnit!==undefined&&!['unidad','kg','l'].includes(p.pantryUnit))return false;
    if(p.targetStock!==undefined&&(!Number.isFinite(p.targetStock)||p.targetStock<0||p.targetStock>100000))return false;
    if(p.barcode!==undefined&&p.barcode!==''&&(typeof p.barcode!=='string'||!/^\d{8,14}$/.test(p.barcode)))return false;
    if(p.notFoundStores!==undefined&&(!Array.isArray(p.notFoundStores)||p.notFoundStores.some((id:any)=>typeof id!=='string')||new Set(p.notFoundStores).size!==p.notFoundStores.length))return false;
    if(p.minimumStock!==undefined&&(!Number.isFinite(p.minimumStock)||p.minimumStock<0||p.minimumStock>100000))return false;
    if(p.autoRestock!==undefined&&typeof p.autoRestock!=='boolean')return false;
    if(p.pantryLots!==undefined){if(!Array.isArray(p.pantryLots)||p.pantryLots.length>10000)return false;const ids=new Set();for(const l of p.pantryLots){if(!l||typeof l.id!=='string'||ids.has(l.id)||!Number.isFinite(l.quantity)||l.quantity<=0||l.quantity>100000||typeof l.expiry!=='string'||l.expiry!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(l.expiry)||!Number.isFinite(Date.parse(l.expiry))||new Date(l.expiry).toISOString().slice(0,10)!==l.expiry))return false;ids.add(l.id);}}
  }
  const codes=h.products.map((p:any)=>p.barcode).filter(Boolean);if(new Set(codes).size!==codes.length)return false;
  if(h.lists.some((l:any)=>l.routine!==undefined&&l.routine!==''&&!['weekly','monthly'].includes(l.routine)))return false;
  if (h.budget !== null && (!Number.isFinite(h.budget) || h.budget < 0)) return false;
  if (h.calculatorExpression !== undefined && (typeof h.calculatorExpression !== 'string' || h.calculatorExpression.length > 2000 || calculate(h.calculatorExpression).value === null)) return false;
  if (h.quickCart !== undefined) {
    if (!Array.isArray(h.quickCart) || h.quickCart.length > 10000) return false;
    const quickIds = new Set();
    for (const item of h.quickCart) {
      if (!item || typeof item.id !== 'string' || quickIds.has(item.id) || !Number.isFinite(item.amount) || item.amount < 0 || item.amount > 1e9 || (item.operation !== undefined && !['add','subtract','multiply','divide'].includes(item.operation)) || (item.operation === 'divide' && item.amount === 0)) return false;
      quickIds.add(item.id);
    }
  }
  const ids = new Set(h.products.map((x: any)=>x.id)); const cartIds = new Set();
  for (const i of h.cart) {
    if (!ids.has(i.productId) || cartIds.has(i.productId) || !Number.isFinite(i.quantity) || i.quantity<=0 || i.quantity>100000 || !Number.isFinite(i.discount) || i.discount<0 || (i.price !== null && (!Number.isFinite(i.price) || i.price<0))) return false;
    cartIds.add(i.productId);
  }
  for (const p of h.products) for (const k of ['price','lastPrice']) if (p[k]!=null && (!Number.isFinite(p[k]) || p[k]<0)) return false;
  if (!Number.isFinite(cartTotal(h)) || Math.abs(cartTotal(h)) > 1e12) return false;
  return true;
}

export function checkout(home:Home,body:any){
   if(typeof body.calculatorExpression==='string') {
    const expression=body.calculatorExpression.replace(/[+\-*/×÷−]\s*$/,'');
    if(!expression||calculate(expression).value===null)throw new Error('Revisa la cuenta antes de guardar la compra.');
    home.calculatorExpression=expression;home.quickCart=[];
   }
   if(!(home.cart.length+(home.quickCart?.length||0)+(home.calculatorExpression?1:0)) || home.cart.some(x=>x.price===null))throw new Error('Agrega los precios de todos los productos antes de finalizar.');
   if(cartTotal(home)<0)throw new Error('El total de una compra no puede ser negativo. Revisa las operaciones.');
   const date=new Date().toISOString(); const checkoutId=typeof body.checkoutId==='string'?body.checkoutId:crypto.randomUUID();
   const calculationItems=home.calculatorExpression?[{productId:null,name:'Cuenta de la compra',expression:home.calculatorExpression,image:'',quantity:1,price:cartTotal(home),discount:0,subtotal:cartTotal(home)-total(home.cart)}]:quickSteps(home.quickCart,total(home.cart)).map(i=>({productId:null,name:operationLabel(i.operation),operation:i.operation||'add',image:'',quantity:1,price:i.amount,discount:0,subtotal:i.delta,result:Math.round(i.after*100)/100}));
   const receipt={id:checkoutId,date,storeId:home.cartStoreId,storeName:home.stores.find(x=>x.id===home.cartStoreId)?.name||'Compra',listId:home.cartListId,budget:home.budget,total:cartTotal(home),items:[...home.cart.map(i=>({...i,name:home.products.find(p=>p.id===i.productId)?.name||'',image:home.products.find(p=>p.id===i.productId)?.image||'',subtotal:lineTotal(i)})),...calculationItems]};
   home.products=home.products.map(p=>{const i=home.cart.find(i=>i.productId===p.id);return i?{...p,purchased:true,finished:false,runningLow:false,notFoundStores:[],lastPrice:i.price,price:i.price,lastDate:date}:p});
   if(home.cartListId)home.lists=home.lists.map(l=>l.id===home.cartListId?{...l,completed:!l.routine&&(l.productIds||[]).filter((id:string)=>home.products.some(p=>p.id===id)).every((id:string)=>home.products.find(p=>p.id===id)?.purchased)}:l);
   home.history=[receipt,...home.history];home.cart=[];home.quickCart=[];home.calculatorExpression='';home.cartListId='';

 return home;
}
