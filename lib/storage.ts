import { env } from 'cloudflare:workers';
export function database() {
  if (!env.DB) throw new Error('El guardado no está disponible. Intenta nuevamente.');
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new Error('Las imágenes no están disponibles. Intenta nuevamente.');
  return env.BUCKET;
}

// All invited visitors use the same household and uploaded-image namespace.
// Sites controls the audience; every caller still requires authenticated access.
export function householdOwner(userId: string) {
  return env.SHARED_HOME_OWNER_ID?.trim() || userId;
}
