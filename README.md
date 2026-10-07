# Rodme Home 🏠

Aplicación personal de organización del hogar y compras, basada en la exportación original de Notion.

Aplicación: https://rodme-home.anrodriguezme.chatgpt.site

Incluye productos, tiendas, secciones y listas editables; Modo Supermercado; calculadora con suma, resta, multiplicación y división; carrito, presupuesto e historial; subida de imágenes y aplicación instalable.

## Desarrollo

Requiere Node.js 22.13 o posterior y pnpm 11.25.

```sh
pnpm install
pnpm dev
```

```sh
pnpm build
```

La aplicación usa React/Vinext y un Worker de Cloudflare. D1 almacena los datos y R2 guarda las imágenes subidas. Los recursos originales del catálogo están incluidos en `public/images`.

## Hogar compartido

En el servidor, `SHARED_HOME_OWNER_ID` apunta al identificador del hogar existente. Las personas invitadas al sitio usan el mismo catálogo, listas, carrito, presupuesto, historial e imágenes. Si la variable está vacía, cada usuario utiliza su propio hogar.

El sitio actual permite el acceso a cualquier persona que inicie sesión con ChatGPT. La migración al inicio directo con Google mediante Firebase está pendiente; todavía no está implementada. Esta variable nunca debe exponerse como `NEXT_PUBLIC`. Los cambios se revisan periódicamente y al volver a la ventana; los conflictos al guardar se detectan mediante revisiones.

## Imágenes

Las fuentes de las fotos representativas están en `lib/photo-credits.json`. `lib/product-cutouts.json` relaciona las imágenes con sus versiones transparentes completadas. La extracción de fondos y la revisión de marcas continúan; las imágenes originales se conservan.

## GitHub y publicación

Este repositorio guarda el código y los recursos, no las compras guardadas en el servidor ni contraseñas o claves. Publicar el código en GitHub no cambia quién puede acceder a los datos de la aplicación.

GitHub Pages sirve archivos estáticos y no ejecuta directamente las funciones de servidor de esta aplicación. La versión funcional permanece en su dirección de Sites.
