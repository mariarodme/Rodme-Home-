'use client';
import {useEffect,useRef,useState} from 'react';
import {calculate,removeNumber,replaceNumber} from '../lib/calculator';
import {money} from '../lib/model';
export default function Calculator({initial,onDraft,onSave,onClear,busy}:{initial:string;onDraft:(expression:string)=>void;onSave:(expression:string)=>Promise<boolean>;onClear:()=>Promise<boolean>;busy:boolean}) {
 const [expression,setExpression]=useState(initial),[message,setMessage]=useState('');
 const [editIndex,setEditIndex]=useState<number|null>(null),[amountDraft,setAmountDraft]=useState('');
 const input=useRef<HTMLInputElement>(null);
 const latestSave=useRef(onSave),lastSaved=useRef(initial),lastAttempt=useRef(initial);
 latestSave.current=onSave;
 const draftCallback=useRef(onDraft);draftCallback.current=onDraft;
 useEffect(()=>draftCallback.current(expression),[expression]);
 const previousInitial=useRef(initial);
 useEffect(()=>{const previous=previousInitial.current;setExpression(current=>current===previous?initial:current);previousInitial.current=initial;lastSaved.current=initial;lastAttempt.current=initial;},[initial]);
 function editAmount(){if(editIndex===null)return;try{setExpression(replaceNumber(expression,editIndex,amountDraft));setEditIndex(null);setMessage('');}catch(e:any){setMessage(e.message);}}
 useEffect(()=>{if(busy)return;const normalized=expression.replace(/[+\-*/×÷−]\s*$/,'');if(normalized===lastSaved.current||normalized===lastAttempt.current||calculate(normalized).value===null)return;const timer=setTimeout(async()=>{lastAttempt.current=normalized;if(await latestSave.current(normalized))lastSaved.current=normalized},500);return()=>clearTimeout(timer)},[expression,busy]);
 const result=calculate(expression,true);
 const tokens=[...expression.matchAll(/(?:\d+(?:[.,]\d*)?|[.,]\d+)/g)];
 function insert(key:string){
  setMessage('');const field=input.current;const active=document.activeElement===field;const start=active?(field?.selectionStart??expression.length):expression.length;const end=active?(field?.selectionEnd??start):start;
  const next=expression.slice(0,start)+key+expression.slice(end);if(next.length>2000)return;
  setExpression(next);requestAnimationFrame(()=>{field?.focus();field?.setSelectionRange(start+key.length,start+key.length)});
 }
 function backspace(){
  setMessage('');const field=input.current;const active=document.activeElement===field;const start=active?(field?.selectionStart??expression.length):expression.length;const end=active?(field?.selectionEnd??start):start;
  const from=start===end?Math.max(0,start-1):start;setExpression(expression.slice(0,from)+expression.slice(end));requestAnimationFrame(()=>{field?.focus();field?.setSelectionRange(from,from)});
 }
 async function equals(){
  if(busy)return;const trimmed=expression.replace(/[+\-*/×÷−]\s*$/,'');const value=calculate(trimmed);
  if(value.value===null){setMessage(value.error);return}setExpression(trimmed);setMessage('');if(trimmed!==lastSaved.current){lastAttempt.current=trimmed;if(await onSave(trimmed))lastSaved.current=trimmed;}
 }
 async function clear(){if(busy)return;if(await onClear()){lastSaved.current='';lastAttempt.current='';setExpression('');setMessage('');input.current?.focus()}}
 function keyPress(e:React.KeyboardEvent<HTMLInputElement>){if(e.key==='Enter'||e.key==='='){e.preventDefault();equals()}else if(e.key==='Escape'){e.preventDefault();clear()}}
 return <div className="normal-calculator"><div className="calculator-screen"><label htmlFor="calculator-expression">Tu cuenta</label><input id="calculator-expression" ref={input} type="text" inputMode="none" autoComplete="off" spellCheck={false} value={expression} placeholder="0" aria-label="Cuenta, por ejemplo 2500+3500*2" maxLength={2000} onChange={e=>{setExpression(e.target.value);setMessage('')}} onKeyDown={keyPress}/><output aria-live="polite">{result.value===null?'—':money(result.value)}</output></div><div className="normal-keypad" role="group" aria-label="Teclado de calculadora">{['AC','(',')','⌫','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map(key=><button key={key} type="button" className={key==='='?'equals-key':/[+−×÷]/.test(key)?'operation-key':key==='AC'||key==='⌫'?'utility-key':''} aria-label={({'AC':'Borrar toda la cuenta','⌫':'Borrar último dígito','÷':'Dividir','×':'Multiplicar','−':'Restar','+':'Sumar','=':'Calcular resultado'} as Record<string,string>)[key]||key} disabled={busy&&(key==='='||key==='AC')} onMouseDown={e=>e.preventDefault()} onClick={()=>key==='AC'?clear():key==='⌫'?backspace():key==='='?equals():insert(key)}>{key}</button>)}</div>{(message||result.error)&&<p className="form-error" role="alert">{message||result.error}</p>}{tokens.length>0&&<details className="calculator-amounts"><summary>Montos de la cuenta ({tokens.length})</summary><p className="secondary">Toca un monto para corregirlo, o bórralo con la X.</p>{tokens.map((token,index)=><div className="quick-amount-row" key={index}><span>{index+1}</span>{editIndex===index?<div className="amount-edit"><input autoFocus inputMode="decimal" aria-label="Corregir monto" value={amountDraft} onChange={e=>setAmountDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();editAmount();}if(e.key==='Escape')setEditIndex(null);}}/><button type="button" onClick={editAmount}>Guardar</button><button type="button" onClick={()=>setEditIndex(null)}>Cancelar</button></div>:<button type="button" className="amount-value" aria-label={'Editar monto '+token[0]} onClick={()=>{setEditIndex(index);setAmountDraft(token[0]);}}>{token[0]} ✎</button>}<button type="button" className="icon-button" aria-label={'Borrar monto '+token[0]} onClick={()=>{setExpression(removeNumber(expression,index));setEditIndex(null);setMessage('')}}>×</button></div>)}</details>}</div>;
}
