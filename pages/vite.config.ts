import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {readdirSync,writeFileSync,readFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,relative} from 'node:path';
const output=fileURLToPath(new URL('../dist-pages',import.meta.url));
function offlineShell(){return {name:'rodme-offline-shell',closeBundle(){
 const ocr=join(output,'ocr');mkdirSync(ocr,{recursive:true});
 const modules=fileURLToPath(new URL('./node_modules/',import.meta.url));
 copyFileSync(join(modules,'tesseract.js/dist/worker.min.js'),join(ocr,'worker.min.js'));
 copyFileSync(join(modules,'tesseract.js-core/tesseract-core-lstm.wasm.js'),join(ocr,'tesseract-core-lstm.wasm.js'));
 copyFileSync(join(modules,'@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),join(ocr,'eng.traineddata.gz'));
 const files:string[]=[];
 function walk(dir:string){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(!['sw.js','.DS_Store'].includes(entry.name)&&!relative(output,path).startsWith('images/')&&!relative(output,path).startsWith('ocr/'))files.push(relative(output,path));}}
 walk(output);
 const version=Date.now().toString(36);
 const source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8').replace('/*PRECACHE*/ []',JSON.stringify(files)).replace('rodme-offline-dev','rodme-offline-'+version);
 writeFileSync(join(output,'sw.js'),source);
}};}
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),base:'/Rodme-Home-/',publicDir:'../public',plugins:[react(),offlineShell()],css:{postcss:{plugins:[]}},build:{outDir:output,emptyOutDir:true,rollupOptions:{input:{app:fileURLToPath(new URL('./index.html',import.meta.url)),preview:fileURLToPath(new URL('./preview.html',import.meta.url))}}},resolve:{dedupe:['react','react-dom']}});
