import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://example.test/Rodme-Home-/',pretendToBeVisual:true});
for(const name of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLDialogElement','Event','MouseEvent','FormData'])Object.defineProperty(globalThis,name,{configurable:true,value:(dom.window as any)[name]});
(globalThis as any).requestAnimationFrame=(fn:any)=>setTimeout(fn,0);
Object.defineProperty(dom.window.document,'visibilityState',{value:'visible'});
dom.window.scrollTo=()=>{};
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
