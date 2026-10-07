import type {Entity,Product} from './model';
import {stock} from './pantry';
export const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function planStock(product:Product,plan:Entity){
 const desired=plan.plannedQuantities?.[product.id]??1;
 const available=stock(product);
 return {desired,available,missing:available===undefined?undefined:Math.max(0,Math.round((desired-available)*1e6)/1e6)};
}
export function validPlanDate(value:unknown){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
