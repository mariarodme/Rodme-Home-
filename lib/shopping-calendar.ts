import type {Entity,Product,Home} from './model';
import {suggestedLocation} from './classify-products';
import {stock} from './pantry';
export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function planStock(product:Product,plan:Entity){
 const desired=plan.plannedQuantities?.[product.id]??1;
 const available=stock(product);
 return {desired,available,missing:available===undefined?undefined:Math.max(0,Math.round((desired-available)*1e6)/1e6)};
}
export function validPlanDate(value:unknown){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function scheduleProduct(home:Home,options:{date:string;label:string;quantity:number;productId?:string;name?:string;sectionId?:string}){
 if(!validPlanDate(options.date)||!Number.isFinite(options.quantity)||options.quantity<=0||options.quantity>100000)throw new Error('Revisa la fecha y la cantidad.');
 const normalize=(name:string)=>name.trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
 const name=options.name?.trim().replace(/\s+/g,' ');
 if(options.name!==undefined&&(!name||name.length>500))throw new Error('Escribe el nombre del producto.');
 let product=options.productId?home.products.find(p=>p.id===options.productId):home.products.find(p=>normalize(p.name)===normalize(name||''));
 if(!product&&name){const section=home.sections.find(s=>s.id===options.sectionId);product={id:crypto.randomUUID(),name,image:'',icon:section?.icon||'🛒',storeId:'',sectionId:section?.id||'',purchased:false,finished:false,frequent:false,price:null,lastPrice:null,lastDate:'',notes:''};product.pantryLocation=suggestedLocation(product,section?.name);home.products.push(product);}
 if(!product)throw new Error('Selecciona un producto o crea uno nuevo.');
 let plan=home.lists.find(l=>l.scheduledDate===options.date);
 if(!plan){plan={id:crypto.randomUUID(),name:'Compra del '+options.label,image:'',icon:'📅',scheduledDate:options.date,date:options.date,productIds:[],plannedQuantities:{},completed:false,storeId:''};home.lists.push(plan);}
 if(!(plan.productIds||[]).includes(product.id))plan.productIds=[...(plan.productIds||[]),product.id];
 plan.plannedQuantities={...plan.plannedQuantities,[product.id]:options.quantity};
 return product;
}
