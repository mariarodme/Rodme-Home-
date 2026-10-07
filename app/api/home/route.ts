import { getChatGPTUser } from '../../chatgpt-auth';
import { database, householdOwner } from '../../../lib/storage';
import seed from '../../../lib/seed.json';
import { addCatalogPhotos } from '../../../lib/catalog-photos';
import { calculate } from '../../../lib/calculator';
import { Home, cartTotal, lineTotal, total, quickSteps, operationLabel } from '../../../lib/model';
export const dynamic = 'force-dynamic';
const json = (value: any, status=200) => Response.json(value, {status, headers: {'Cache-Control':'no-store'}});
function valid(h: any): h is Home {
  if (!h || !Array.isArray(h.cart) || !Array.isArray(h.history) || typeof h.cover !== 'string') return false;
  for (const key of ['products','stores','sections','lists']) {
    if (!Array.isArray(h[key]) || h[key].length > 10000) return false;
    const ids = new Set();
    for (const x of h[key]) {
      if (!x || typeof x.id !== 'string' || typeof x.name !== 'string' || x.name.length > 500 || ids.has(x.id)) return false;
      ids.add(x.id);
      if (x.image && (typeof x.image !== 'string' || !/^\/(images|api\/images)\/[\w.-]+$/.test(x.image))) return false;
    }
  }
  if (h.cover && !/^\/(images|api\/images)\/[\w.-]+$/.test(h.cover)) return false;
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
async function load(owner:string) {
 const db=database();
 await db.prepare('INSERT OR IGNORE INTO homes (owner,data,revision) VALUES (?,?,0)').bind(owner,JSON.stringify(seed)).run();
 for(let attempt=0;attempt<3;attempt++) {
  const row=await db.prepare('SELECT data,revision FROM homes WHERE owner=?').bind(owner).first<{data:string;revision:number}>();
  if(!row)throw new Error('No se pudo cargar Rodme Home.');
  const home=JSON.parse(row.data) as Home;
  if(!addCatalogPhotos(home))return {home,revision:row.revision};
  const result=await db.prepare('UPDATE homes SET data=?,revision=revision+1 WHERE owner=? AND revision=?').bind(JSON.stringify(home),owner,row.revision).run();
  if(result.meta.changes)return {home,revision:row.revision+1};
 }
 throw new Error('Los datos cambiaron mientras se cargaban. Intenta nuevamente.');
}
export async function GET() {
 const user=await getChatGPTUser(); if(!user)return json({error:'Inicia sesión para abrir tu hogar.'},401);
 try { return json(await load(householdOwner(user.userId))); } catch(e) {console.error(e);return json({error:'No pudimos cargar tus datos. Intenta nuevamente.'},503);}
}
export async function POST(request:Request) {
 const user=await getChatGPTUser(); if(!user)return json({error:'Inicia sesión para guardar.'},401);
 const origin=request.headers.get('origin'); if(origin && origin!==new URL(request.url).origin)return json({error:'Solicitud no autorizada.'},403);
 try {
  if(Number(request.headers.get('content-length'))>5000000)return json({error:'El respaldo es demasiado grande.'},413);
  const body:any=await request.json(); const current=await load(householdOwner(user.userId));
  if(body.revision!==current.revision)return json({error:'Tus datos cambiaron en otra ventana. Recarga para continuar.',...current},409);
  let home:Home=body.home;
  if(body.action==='checkout') {
   home=current.home;
   if(typeof body.calculatorExpression==='string') {
    const expression=body.calculatorExpression.replace(/[+\-*/×÷−]\s*$/,'');
    if(!expression||calculate(expression).value===null)return json({error:'Revisa la cuenta antes de guardar la compra.'},400);
    home.calculatorExpression=expression;home.quickCart=[];
   }
   if(!(home.cart.length+(home.quickCart?.length||0)+(home.calculatorExpression?1:0)) || home.cart.some(x=>x.price===null))return json({error:'Agrega los precios de todos los productos antes de finalizar.'},400);
   if(cartTotal(home)<0)return json({error:'El total de una compra no puede ser negativo. Revisa las operaciones.'},400);
   const date=new Date().toISOString(); const checkoutId=typeof body.checkoutId==='string'?body.checkoutId:crypto.randomUUID();
   const calculationItems=home.calculatorExpression?[{productId:null,name:'Cuenta de la compra',expression:home.calculatorExpression,image:'',quantity:1,price:cartTotal(home),discount:0,subtotal:cartTotal(home)-total(home.cart)}]:quickSteps(home.quickCart,total(home.cart)).map(i=>({productId:null,name:operationLabel(i.operation),operation:i.operation||'add',image:'',quantity:1,price:i.amount,discount:0,subtotal:i.delta,result:Math.round(i.after*100)/100}));
   const receipt={id:checkoutId,date,storeId:home.cartStoreId,storeName:home.stores.find(x=>x.id===home.cartStoreId)?.name||'Compra',listId:home.cartListId,budget:home.budget,total:cartTotal(home),items:[...home.cart.map(i=>({...i,name:home.products.find(p=>p.id===i.productId)?.name||'',image:home.products.find(p=>p.id===i.productId)?.image||'',subtotal:lineTotal(i)})),...calculationItems]};
   home.products=home.products.map(p=>{const i=home.cart.find(i=>i.productId===p.id);return i?{...p,purchased:true,finished:false,lastPrice:i.price,price:i.price,lastDate:date}:p});
   if(home.cartListId)home.lists=home.lists.map(l=>l.id===home.cartListId?{...l,completed:true}:l);
   home.history=[receipt,...home.history];home.cart=[];home.quickCart=[];home.calculatorExpression='';home.cartListId='';
  }
  if(!valid(home))return json({error:'Revisa los datos: el archivo o los valores no son válidos.'},400);
  const saved=await database().prepare('UPDATE homes SET data=?,revision=revision+1 WHERE owner=? AND revision=?').bind(JSON.stringify(home),householdOwner(user.userId),current.revision).run();
  if(!saved.meta.changes)return json({error:'Tus datos cambiaron en otra ventana. Recarga para continuar.'},409);
  return json({home,revision:current.revision+1});
 }catch(e){console.error(e);return json({error:'No se pudo guardar. Tu cambio no se ha perdido; intenta nuevamente.'},503);}
}
