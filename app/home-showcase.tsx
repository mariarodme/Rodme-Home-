import React from 'react';
import {ShoppingCart,House,ListChecks,Calculator,History,ImagePlus} from 'lucide-react';
import type {Home,Product} from '../lib/model';

type Props={home:Home;imageUrl:(src:string)=>string;productImage:(p:Product)=>React.ReactNode;go:(view:string)=>void;category:(id:string)=>void;editCover:()=>void};

export default function HomeShowcase({home,imageUrl,productImage,go,category,editCover}:Props){
 const sections=[...home.sections].sort((a,b)=>(a.order||0)-(b.order||0));
 return <>
  <div className="shop-category-nav" aria-label="Secciones de tus productos">{sections.map(s=><button key={s.id} aria-label={s.name} onClick={()=>category(s.id)}>{s.name}</button>)}</div>
  <section className="shop-hero">
   <div className="shop-hero-copy"><span>Todo listo para tu próxima compra</span><h1>Rodme Home 🏠</h1><p>Lo que necesitas,<br/>cuando lo necesitas.</p><button className="primary" onClick={()=>go('supermarket')}><ShoppingCart size={18}/> Empezar mi compra</button></div>
   <div className="shop-hero-photo">{home.cover?<img src={imageUrl(home.cover)} alt="Portada de Rodme Home"/>:<div className="shop-hero-products">{home.products.filter(p=>p.image).slice(0,3).map(p=><span key={p.id}>{productImage(p)}</span>)}</div>}<button className="cover-edit" onClick={editCover}><ImagePlus size={15}/> Cambiar portada</button></div>
  </section>
  <div className="shop-benefits">
   {([{icon:House,title:'Mi alacena',text:'Revisa lo que hay en casa',view:'pantry'},{icon:ListChecks,title:'Mis listas',text:'Prepara tu próxima compra',view:'lists'},{icon:Calculator,title:'Cuenta rápida',text:'Suma mientras compras',view:'supermarket'},{icon:History,title:'Mis compras',text:'Consulta tu historial',view:'history'}]).map(({icon:Icon,title,text,view})=><button key={view} onClick={()=>go(view)}><Icon size={32}/><span><strong>{title}</strong><small>{text}</small></span></button>)}
  </div>
 </>;
}

export function HomeBrowsePanels({home,imageUrl,productImage,go,category}:Omit<Props,'editCover'>){
 const sections=[...home.sections].sort((a,b)=>(a.order||0)-(b.order||0));
 const fresh=home.products.find(p=>p.image&&p.pantryLocation==='Estante de verduras');
 const cleaning=home.products.find(p=>p.image&&p.pantryLocation==='Limpieza');
 return <>
  <section className="shop-categories"><h2>Tus secciones</h2><div className="shop-category-grid">{sections.map(s=>{const product=home.products.find(p=>p.sectionId===s.id&&p.image);return <button key={s.id} aria-label={s.name} onClick={()=>category(s.id)}><span className="shop-category-image">{s.image?<img src={imageUrl(s.image)} alt=""/>:product?productImage(product):<span className="shop-category-emoji">{s.icon||'🛒'}</span>}</span><strong>{s.name}</strong></button>})}</div></section>
  <div className="shop-feature-banners"><section className="shop-feature fresh"><div><span>En casa</span><h2>Frutas y verduras,<br/>en su lugar.</h2><button onClick={()=>go('pantry')}>Revisar mi alacena</button></div>{fresh&&<div className="shop-feature-image">{productImage(fresh)}</div>}</section><section className="shop-feature cleaning"><div><span>Para el hogar</span><h2>Que no falte<br/>lo de siempre.</h2><button onClick={()=>go('lists')}>Preparar una lista</button></div>{cleaning&&<div className="shop-feature-image">{productImage(cleaning)}</div>}</section></div>
 </>;
}
