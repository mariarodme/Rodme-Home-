import type {Home,Product} from './model';
const clean=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
/** Initial storage suggestions. User-selected locations always take precedence. */
export function suggestedLocation(p:Product,section=''){
 const name=clean(p.name),group=clean(section);
 if(/mascota/.test(group)||/arena para gato|comida para mascota|bolsas para gato/.test(name))return 'Mascotas';
 if(/helad|congelad/.test(name+' '+group))return 'Congelador';
 if(/aseo personal|cuidado personal/.test(group)||/shampoo|acondicionador|pasta dental|pasta de dientes|jabon dove|papel higienico|toallas nocturnas|protectores caja/.test(name))return 'Baño';
 if(/limpieza/.test(group)||/detergente|suavizante|desinfectante|lavaplatos|cloro|limpiador|bolsa basura|esponja|aromatizante|controlador olores|perlas fresh/.test(name))return 'Limpieza';
 if(/lacteo|embutido|pescado|carnes/.test(group)||/ques|yogur|kefir|natill|margar|crema dulce|filet|pechug|carne|pescado/.test(name))return 'Refrigeradora';
 if(/frutas y vegetales/.test(group)){
  if(/papa|ceboll|platano|banana|banano|yuca|ayote|sandia/.test(name)&&!/cebollino/.test(name))return 'Alacena';
  return 'Refrigeradora';
 }
 return 'Alacena';
}
export function classifyProducts(home:Home){let changed=false;for(const p of home.products){if(!p.name.trim()||p.pantryLocation)continue;p.pantryLocation=suggestedLocation(p,home.sections.find(s=>s.id===p.sectionId)?.name||'');changed=true;}return changed;}
