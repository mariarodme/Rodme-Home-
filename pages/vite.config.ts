import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),base:'/Rodme-Home-/',publicDir:'../public',plugins:[react()],css:{postcss:{plugins:[]}},build:{outDir:'../dist-pages',emptyOutDir:true},resolve:{dedupe:['react','react-dom']}});
