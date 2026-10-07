import type {Home} from '../lib/model';
export type Conflict={path:string;label:string;local:unknown;remote:unknown};
export const copy=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const object=(x:any)=>x!==null&&typeof x==='object'&&!Array.isArray(x);
// Merge independent edits, matching entities by stable ID instead of array index.
export function mergeHomes(base:Home,local:Home,remote:Home,choices:Record<string,'local'|'remote'>={}){
 const conflicts:Conflict[]=[];
 function merge(b:any,l:any,r:any,path:string,label:string):any{
  if(equal(l,b))return r;
  if(equal(r,b)||equal(l,r))return l;
  if(Array.isArray(l)&&Array.isArray(r)){
   const all=[...(b||[]),...l,...r];
   const key=all.every(x=>object(x)&&typeof x.id==='string')?'id':all.every(x=>object(x)&&typeof x.productId==='string')?'productId':null;
   if(key){
    const bm=new Map((b||[]).map((x:any)=>[x[key],x])),lm=new Map(l.map(x=>[x[key],x])),rm=new Map(r.map(x=>[x[key],x]));
    return [...new Set([...r,...l].map(x=>x[key]))].map(id=>merge(bm.get(id),lm.get(id),rm.get(id),`${path}/${id}`,lm.get(id)?.name||rm.get(id)?.name||label)).filter(x=>x!==undefined);
   }
   if(all.every(x=>typeof x==='string')&&!path.startsWith('/storeRoutes/')){
    const bs=new Set(b||[]),ls=new Set(l),rs=new Set(r);
    return [...new Set([...r,...l])].filter(x=>bs.has(x)?ls.has(x)&&rs.has(x):true);
   }
  }
  if(object(l)&&object(r)&&(b===undefined||object(b))){
   const out:Record<string,unknown>={};
   for(const k of new Set([...Object.keys(b||{}),...Object.keys(l),...Object.keys(r)])){
    const value=merge(b?.[k],l[k],r[k],`${path}/${k}`,`${label}${label?' · ':''}${({name:'nombre',price:'precio',lastPrice:'último precio',purchased:'comprado',runningLow:'se está acabando',calculatorExpression:'calculadora',budget:'presupuesto',cart:'carrito',storeRoutes:'recorrido'} as Record<string,string>)[k]||k}`);
    if(value!==undefined)out[k]=value;
   }return out;
  }
  const choice=choices[path];if(choice)return choice==='local'?l:r;
  conflicts.push({path,label:label||'Dato del hogar',local:l,remote:r});return l;
 }
 return {home:merge(base,local,remote,'','') as Home,conflicts};
}
