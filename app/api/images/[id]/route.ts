import { getChatGPTUser } from '../../../chatgpt-auth';
import { bucket, householdOwner } from '../../../../lib/storage';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
 const user=await getChatGPTUser();if(!user)return new Response(null,{status:401});
 const {id}=await params;if(!/^[\w-]+$/.test(id))return new Response(null,{status:404});
 try {const file=await bucket().get(`${householdOwner(user.userId)}/${id}`);if(!file)return new Response(null,{status:404});
 return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/png','Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});
 }catch{return new Response(null,{status:503});}
}
