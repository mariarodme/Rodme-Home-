export async function readPhoto(file:File,onProgress:(progress:number)=>void){
 const {createWorker}=await import('tesseract.js');
 const base=new URL('./ocr/',document.baseURI).href;
 const worker=await createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base+'tesseract-core-lstm.wasm.js',langPath:base,gzip:true,workerBlobURL:false,logger:message=>onProgress(message.status==='recognizing text'?0.3+message.progress*0.7:0.15)});
 let bitmap:ImageBitmap|undefined;
 try{bitmap=await createImageBitmap(file);const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');if(!context)throw Error('No se pudo abrir la foto');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);const result=await worker.recognize(canvas);return result.data.text;}finally{bitmap?.close();await worker.terminate();}
}
