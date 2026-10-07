import type {Home} from './model';
import {calculatorExpression,total} from './model';
import {calculate} from './calculator';
import {quickAdd} from './pantry';
export function parseLabelAmount(raw:string):number|null{
 let value=raw.replace(/[^\d.,]/g,'');if(!value)return null;
 const decimal=value.match(/[.,](\d{1,2})$/);if(decimal){const index=value.length-decimal[0].length;value=value.slice(0,index).replace(/[.,]/g,'')+'.'+decimal[1];}else value=value.replace(/[.,]/g,'');
 const amount=Number(value);return Number.isFinite(amount)&&amount>0&&amount<=10000000?amount:null;
}
export function priceCandidates(text:string){
 const values=new Map<number,{amount:number;label:string;priority:number}>();
 for(const line of text.split(/\n/)){const matches=[...line.matchAll(/(?:₡|¢|CRC\s*)?\s*\d+(?:[.,]\d+|\s\d{3})*/gi)];for(const match of matches){const token=match[0].trim(),after=line.slice(match.index!+match[0].length);if(/^\s*(?:%|g\b|kg\b|ml\b|l\b|unid|und|pack|x\b|\/)/i.test(after))continue;const amount=parseLabelAmount(token);if(amount===null||amount<10)continue;const priority=/₡|¢|CRC/i.test(token)?2:/precio|oferta|total|colones/i.test(line)?1:0;const old=values.get(amount);if(!old||old.priority<priority)values.set(amount,{amount,label:line.trim(),priority});}}
 return [...values.values()].sort((a,b)=>b.priority-a.priority).slice(0,8);
}
export function addPhotoPrice(h:Home,amount:number,draft?:string|null){if(!Number.isFinite(amount)||amount<=0||amount>10000000)throw Error('Revisa el monto antes de sumar.');const expression=(draft??calculatorExpression(h)).trim().replace(/[+\-*/×÷−]\s*$/,'');if(calculate(expression).value===null)throw Error('Revisa la cuenta de la calculadora antes de sumar.');h.calculatorExpression=expression?expression+'+'+amount:String(amount);h.quickCart=[];}
export function addPhotoProduct(h:Home,name:string,quantity:number,price:number|null,image:string,id:string,draft?:string|null){const before=total(h.cart),expression=draft??h.calculatorExpression;if(!image||!image.startsWith('data:image/')&&!image.startsWith('/images/'))throw Error('Primero toma la foto del producto.');const productId=quickAdd(h,name,quantity,price,id);const p=h.products.find(p=>p.id===productId)!;if(!p.image)p.image=image;if(expression){const base=expression.trim().replace(/[+\-*/×÷−]\s*$/,'');if(calculate(base).value===null)throw Error('Revisa la calculadora antes de agregar el producto.');const delta=Math.round((total(h.cart)-before)*100)/100;h.calculatorExpression=(base||'0')+(delta>=0?'+':'-')+Math.abs(delta);h.quickCart=[];}return productId;}
