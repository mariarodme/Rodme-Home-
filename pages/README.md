# Rodme Home en GitHub Pages

Esta versión conserva la interfaz original y usa Firebase Authentication (Google) y Cloud Firestore. Las cuentas pueden crear un hogar privado o unirse a uno con una invitación. Los integrantes ven y editan la misma información desde sus dispositivos. Las fotos incluidas, las listas y la calculadora se conservan. Las compras nuevas se guardan con control de revisiones para evitar sobrescribir cambios de otro dispositivo.

## Activación

1. En el proyecto Firebase **rodme-home**, habilitar Google en Authentication.
2. En Authentication → Configuración → Dominios autorizados, agregar **mariarodme.github.io** (solo el dominio).
3. En Compilación/Build → Firestore Database, crear una base de datos **Standard**, ID `(default)`, en modo producción. Elegir una ubicación antes de crearla.
4. En Firestore → Reglas, reemplazar el contenido por `pages/firestore.rules` y publicar. Las reglas exigen Google y pertenencia al hogar; no usar reglas abiertas.
5. En GitHub → Settings → Pages → Source, elegir **GitHub Actions**. El workflow `Publicar Rodme Home` compila y publica automáticamente al cambiar `main`.
6. Abrir https://mariarodme.github.io/Rodme-Home-/ y entrar con Google. Crear el hogar inicial. En Configuración → Compartir mi hogar, copiar el enlace y enviarlo a los integrantes. Cada uno entra con su propia cuenta Google y acepta la invitación.

Los enlaces de invitación permiten editar ese hogar: compartirlos solo con las personas elegidas. Pueden eliminarse desde la colección `invites` para impedir nuevas incorporaciones; eliminar una invitación no elimina integrantes existentes.

## Datos y fotos

La primera creación carga los datos incluidos en `lib/seed.json`. Los cambios posteriores hechos en el servidor anterior no se pueden recuperar desde GitHub: exportar un respaldo desde la aplicación anterior y restaurarlo en Configuración si fuera necesario. Los respaldos con imágenes de `/api/images/` requieren volver a seleccionar esas imágenes: pertenecían al servidor anterior.

Las imágenes cargadas se reducen a WebP y se guardan junto con el hogar; no requieren Firebase Storage. La información se divide en documentos y se actualiza en una transacción. El límite del hogar es de 5 MB; los respaldos incluyen las imágenes nuevas. Se requiere internet para guardar. Cada dispositivo consulta cambios cada 15 segundos cuando no hay un formulario ni una entrada de calculadora abiertos.

## Desarrollo

Desde la raíz: `npm ci --prefix pages`, crear enlace `node_modules` a `pages/node_modules`, `npm run dev --prefix pages`. La compilación se guarda en `dist-pages`. Usar `npm run check --prefix pages` y `npm run build --prefix pages` para validar. La versión original del servidor se conserva en el repositorio.

El código Firebase de configuración web identifica el proyecto; las reglas de Firestore controlan el acceso. No se incluyen credenciales de administrador.
