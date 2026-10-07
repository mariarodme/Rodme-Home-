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

### Alacena y compra rápida

Mi casa organiza existencias por Alacena, Refrigeradora, Congelador, Limpieza y Baño. Las existencias son opcionales: los productos antiguos permanecen sin registrar hasta que se introduzca una cantidad. Los botones +/− ajustan una unidad (kg/l cuando esa es la unidad elegida); Editar permite cantidades fraccionarias, ubicación, mínimo y vencimientos por lote. El consumo descuenta primero el lote que vence antes. La reposición automática marca el mismo producto pendiente cuando llega al mínimo, sin crear duplicados.

Después de guardar una compra con productos, se abre la confirmación para guardarla en casa. Cantidades, ubicación y vencimiento son editables; cero omite un producto. Cada compra se registra en la alacena una sola vez. Las compras guardadas únicamente con la calculadora no crean existencias: se pueden registrar manualmente en Mi casa.

El supermercado incluye Lo eché/Deshacer, ocultar productos ya recogidos, alta rápida con nombre/cantidad/precio y comparación de presentaciones por kg/l/unidad. Los precios faltantes deben completarse antes de finalizar. No se cambió el inicio visual, las fotos originales ni la calculadora. Las fotos se descargan y quedan disponibles sin conexión después de visualizarlas; no se descargan todas al iniciar.

### Reposición y herramientas de supermercado

Editar un producto en Mi casa permite indicar la cantidad que se quiere tener. La lista muestra existencias y cantidad faltante; el carrito propone esa cantidad al agregar. Se terminó deja el stock en cero y el producto pendiente. No encontré conserva el producto pendiente por tienda; una lista parcialmente comprada permanece abierta.

Las listas pueden marcarse como habituales semanales o mensuales. Revisar faltantes compara sus productos con las existencias; no crea recordatorios ni agrega productos que ya alcanzaron su cantidad deseada. Un producto sin existencias registradas queda pendiente para revisar. Estas listas se reutilizan después de cada compra.

Deshacer último cambio guarda una sola operación durante la sesión. Revierte los campos modificados y conserva cambios independientes compartidos. Si el mismo dato cambió después, solicita revisarlo en lugar de sobrescribirlo. La calculadora y finalizar una compra no se incluyen en este botón.

El lector de códigos usa ZXing, cargado al abrir la cámara. Requiere permiso del navegador; escribir el código es una alternativa. Los códigos se asocian al catálogo propio y se guardan con el hogar. Un código desconocido puede vincularse a un producto existente. La cámara se detiene al cerrar el lector o reconocer el código.
