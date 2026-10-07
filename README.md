# Rodme Home 🏠

Aplicación personal de organización del hogar y compras, basada en la exportación original de Notion.

Aplicación: https://mariarodme.github.io/Rodme-Home-/

## Funciones

- Productos, tiendas, secciones, imágenes y listas editables.
- Modo Supermercado y calculadora normal con suma, resta, multiplicación y división. En **Montos de la cuenta**, toca un monto para corregirlo o usa la X para borrarlo.
- Carrito, presupuesto e historial. **Repetir esta compra** crea una nueva lista con los productos que todavía existen en el catálogo.
- **Se acaba** marca un producto para reponer y lo agrega a pendientes. Al guardar su compra, la marca se limpia.
- **Comparar precios** muestra el último precio por unidad pagado en cada tienda, incluyendo descuentos y fecha. También aparece al editar un producto. Las cuentas de calculadora sin productos identificados no generan comparaciones.
- **Recorrido por tienda** permite subir y bajar secciones. El Modo Supermercado usa el orden guardado para la tienda seleccionada.
- Inicio directo con Google mediante Firebase y hogares compartidos por invitación.
- Actualizaciones en tiempo real del hogar. Una edición abierta o una cuenta en curso se conservan hasta terminar.
- Uso sin conexión después de abrir el hogar con internet. La aplicación y las imágenes del catálogo se guardan con el service worker; los datos y cambios pendientes se conservan en IndexedDB, por cuenta y hogar. Al reconectar se combinan los cambios independientes. Si dos personas cambian el mismo dato, se solicita elegir una versión antes de sincronizar. Es necesario sincronizar antes de cerrar sesión.
- Imágenes propias comprimidas como WebP y guardadas con el hogar; respaldo JSON y aplicación instalable.

## Desarrollo y publicación de GitHub Pages

Requiere Node.js 22 o posterior.

```sh
npm ci --prefix pages
ln -s pages/node_modules node_modules
npm run check --prefix pages
npm test --prefix pages
npm run build --prefix pages
```

El cliente para GitHub Pages está en `pages/` y reutiliza la interfaz de `app/home-app.tsx`. La salida es `dist-pages/`. `.github/workflows/pages.yml` verifica tipos, compila y publica cuando cambia `main`.

`pages/firebase.ts` contiene la configuración pública del cliente Firebase. No es una contraseña ni una clave de administrador. Google debe estar habilitado en Authentication y `mariarodme.github.io` debe figurar como dominio autorizado. Cloud Firestore usa las reglas de `pages/firestore.rules`; estas mejoras mantienen las mismas rutas y no requieren modificar las reglas existentes.

El código del servidor original de Sites se conserva como referencia en `app/api/`, `build/` y `lib/storage.ts`. Su autenticación de ChatGPT y sus recursos D1/R2 no se usan en GitHub Pages.

## Datos y sincronización

Firestore almacena el hogar en bloques y confirma cambios en una transacción con revisión. El cliente registra primero los cambios en IndexedDB y sincroniza con una combinación de tres versiones: la base, los cambios locales y la versión actual del hogar. Los conflictos nunca se resuelven sobreescribiendo todo el hogar automáticamente.

Cada cuenta puede crear un hogar o unirse a uno mediante **Compartir mi hogar**. Los miembros del mismo hogar comparten productos, listas, carrito, presupuesto e historial. Una persona que solo abre la aplicación no obtiene automáticamente acceso a otro hogar.

## Imágenes

Los recursos originales y las fotos representativas están en `public/images/`. Las fuentes están en `lib/photo-credits.json`. `lib/product-cutouts.json` relaciona las imágenes con sus versiones transparentes completadas; las originales se conservan.

El repositorio guarda código y recursos. Las compras y cambios del hogar se guardan en Firebase y en el dispositivo mientras están pendientes, no en GitHub.
