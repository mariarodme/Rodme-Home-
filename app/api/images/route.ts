import { getChatGPTUser } from '../../chatgpt-auth';
import { bucket, householdOwner } from '../../../lib/storage';
export async function POST(request:Request) {
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Inicia sesión para guardar imágenes.'},{status:401});
 const origin=request.headers.get('origin');if(origin && origin!==new URL(request.url).origin)return new Response(null,{status:403});
 try {
  const form=await request.formData();const file=form.get('file');
  if(!(file instanceof File) || file.size>8*1024*1024 || !['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return Response.json({error:'Selecciona una imagen JPG, PNG, WebP o GIF de hasta 8 MB.'},{status:400});
  const id=crypto.randomUUID();const bytes=await file.arrayBuffer();const b=new Uint8Array(bytes);
  const valid=(file.type==='image/png'&&b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71)||(file.type==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255)||(file.type==='image/webp'&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')||(file.type==='image/gif'&&String.fromCharCode(...b.slice(0,3))==='GIF');
  if(!valid)return Response.json({error:'El archivo no corresponde a una imagen válida.'},{status:400});
  await bucket().put(`${householdOwner(user.userId)}/${id}`,bytes,{httpMetadata:{contentType:file.type}});
  return Response.json({url:`/api/images/${id}`});
 }catch(e){console.error(e);return Response.json({error:'No se pudo guardar la imagen. Intenta nuevamente.'},{status:503});}
}
