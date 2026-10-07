export type Calculation = { value: number | null; error: string; complete: boolean; expression: string };
export function calculate(input: string, preview = false): Calculation {
 let expression=input.replace(/[×x]/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/,/g,'.').replace(/\s+/g,'');
 if(!expression)return {value:0,error:'',complete:true,expression:''};
 const original=expression;
 if(preview)expression=expression.replace(/[+\-*/]+$/,'');
 if(!expression)return {value:null,error:'',complete:false,expression:original};
 let pos=0;
 try {
  if(expression.length>2000||/[^\d.+\-*/()]/.test(expression))throw new Error('syntax');
  function factor():number {
   if(expression[pos]==='+'){pos++;return factor()}
   if(expression[pos]==='-'){pos++;return -factor()}
   if(expression[pos]==='('){pos++;const value=sum();if(expression[pos]!==')')throw new Error('syntax');pos++;return value}
   const match=/^(?:\d+(?:\.\d*)?|\.\d+)/.exec(expression.slice(pos));
   if(!match)throw new Error('syntax');pos+=match[0].length;const value=Number(match[0]);if(!Number.isFinite(value))throw new Error('big');return value;
  }
  function product():number {
   let value=factor();
   while(expression[pos]==='*'||expression[pos]==='/'){const op=expression[pos++];const right=factor();if(op==='/'&&right===0)throw new Error('zero');value=op==='*'?value*right:value/right;}
   return value;
  }
  function sum():number {
   let value=product();
   while(expression[pos]==='+'||expression[pos]==='-'){const op=expression[pos++];const right=product();value=op==='+'?value+right:value-right;}
   return value;
  }
  const value=sum();if(pos!==expression.length)throw new Error('syntax');if(!Number.isFinite(value)||Math.abs(value)>1e12)throw new Error('big');
  return {value:Math.round(value*100)/100,error:'',complete:original===expression,expression:original};
 }catch(e:any){return {value:null,error:e.message==='zero'?'No se puede dividir entre cero.':e.message==='big'?'El resultado es demasiado grande.':preview?'':'Revisa la cuenta: falta un número o un paréntesis.',complete:false,expression:original};}
}
export function removeNumber(expression:string,index:number):string {
 const matches=[...expression.matchAll(/(?:\d+(?:[.,]\d*)?|[.,]\d+)/g)];const token=matches[index];if(!token)return expression;
 let from=token.index!,to=from+token[0].length;
 // Remove its adjacent operator so a simple shopping sum stays valid.
 const left=expression.slice(0,from).match(/[+\-*/×÷−]\s*$/);
 if(left)from-=left[0].length;
 else{const right=expression.slice(to).match(/^\s*[+\-*/×÷−]/);if(right)to+=right[0].length;}
 return expression.slice(0,from)+expression.slice(to);
}
