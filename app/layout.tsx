import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Rodme Home 🏠', description:'Tus listas, tiendas y compras del hogar.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'Rodme Home',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="es"><body>{children}</body></html>;}
