# PENDIENTES — Calculadora de stickers

> Lista de tareas para borrar cuando se vacíe. El deploy está en **CHECKLIST-DEPLOY.md**.

## ✅ DEPLOY — COMPLETADO 2026-10-01

Los pasos 1, 2, 3 y 12 están **resueltos y verificados en producción**:

| # | Qué | Verificación |
|---|---|---|
| 1 | `configUrl` → `datos_config_etag.php` | Network muestra el `.php`, no el `.json` |
| 2 | `datos_config_etag.php` subido al tema | `200` + `ETag` + `Cache-Control: max-age=60` |
| 3 | Revalidación condicional | `curl` desde el repo: ETag coincidente → **`304`**, 0 bytes |
| 12 | `wp_enqueue_media()` en el shortcode | El modal de galería abre sobre la página |

Controles que confirman que el 304 es real y no un caché que miente:
ETag **incorrecto** → `200` con los 8816 bytes; sin `If-None-Match` → `200`.

> Nota de infraestructura: la CDN es **Hostinger por subdominio**, no Cloudflare.
> No existe `cf-cache-status` y la purga es manual (LiteSpeed + CDN).

## 🔴 BLOQUEANTES

### ~~1. Activar el ETag en producción~~ ✅ RESUELTO 2026-10-01
`'configUrl' => $assets_url . '/datos_config_etag.php'` aplicado en el shortcode del
servidor. Verificado en Network: el bundle pide el `.php`, no el `.json`.

Recordatorio de por qué era necesario: en `src/core/wp.ts:21` la constante es
`WP.configUrl || \`${ASSETS_URL}/datos_config_etag.php\``, y el valor inyectado por
WordPress **siempre gana** sobre el fallback en código.

### ~~2. Subir `assets/datos_config_etag.php` al servidor~~ ✅ RESUELTO 2026-10-01
En `/generatepress-child/assets/`. Verificado con `curl`:
`200` + `ETag: W/"90a6538e..."` + `Cache-Control: public, max-age=60`.

### ~~3. Verificar el `304 Not Modified`~~ ✅ RESUELTO 2026-10-01
Verificado con `curl` desde el repo, no solo a ojo:

| Prueba | Resultado |
|---|---|
| GET sin `If-None-Match` | `200`, 8816 bytes |
| GET con ETag coincidente | **`304`**, 0 bytes |
| GET con ETag **incorrecto** | `200`, 8816 bytes (control) |

El control es lo importante: confirma que la revalidación funciona de verdad y no
que un caché esté respondiendo 304 por inercia.

> ⚠️ **Aprendido en este deploy:** subir la carpeta `assets/` completa pisa el
> `datos_config.json` de producción, que es un archivo de datos vivos (lo edita el
> admin vía `guardar_datos.php`). La copia del repo tiene meses y puede estar
> desactualizada. **Subir archivo por archivo, nunca la carpeta.**
> Pasó en este deploy: la copia local y la de producción coincidían (8816 bytes),
> así que no hubo pérdida, pero fue por suerte.

## 🟡 LIMPIEZA / DOCS

### ~~4. `README.md:52` — árbol de `hooks/`~~ ✅ RESUELTO
`useAdminState.ts` ya no figura en el árbol de `hooks/` (el estado admin vive inline en `App.tsx`).

### ~~5. `README.md:126` — documentar el endpoint con ETag~~ ✅ RESUELTO
El ejemplo de `wp_localize_script` ya apunta a `datos_config_etag.php`, con el comentario que
advierte que `WP_STICKER_DATA.configUrl` gana sobre el fallback de `src/core/wp.ts`.
Se agregó además una nota de deploy en la sección 4 (subir el `.php` sí o sí).

### ~~6. Comentarios que dicen `datos_config.json`~~ ✅ RESUELTO
Los que necesitaban aclaración se actualizaron:
- `src/hooks/useConfig.ts:33` → aclara que el archivo se pide a `CONFIG_URL` (el endpoint).
- `src/types/index.ts:136` → idem.
- `src/App.tsx:485` → el mensaje de error **decía** que no se pudo leer
  `datos_config.json`, cuando el frontend ahora pide `datos_config_etag.php`. Era el más
  problemático: si faltaba el endpoint, el mensaje mandaba a revisar el archivo
  equivocado. Ahora nombra el endpoint y pide verificar ambos.
- `src/core/options.ts:7` → se revisó y **no necesitó cambio**: habla del archivo de
  datos, no del transporte.

## 🟢 OPCIONALES

### ~~7. `test.js` en la raíz — archivo muerto~~ ✅ RESUELTO (borrado)
Era una copia compilada a mano de `useDebounce`, que hoy existe en TypeScript en
`src/hooks/useDebounce.ts`. No lo referenciaba nada, no estaba en `package.json` scripts
y usaba `require()` dentro de un proyecto ESM. Eliminado con `git rm` (recuperable con
`git checkout HEAD~1 -- test.js` si alguna vez hizo falta).

### ~~8. `README.md` — referencia a `plugin/plugin-calculadora-admin-integration.php`~~ ✅ RESUELTO
Ese directorio no existe en el repo, así que el `cp` de la instrucción no podía
funcionar. La sección 2 ahora aclara que el plugin vive solo en el servidor
(`wp-content/plugins/`), que se instala por FTP, y que el código que lo usa es
`AdminGalleryPanel` vía `window.wp.media`, con fallback a abrir el media uploader en
otra pestaña (verificado en `AdminGalleryPanel.tsx:49-54`).

### 9. El código de integración con WP no está en ningún repo local
`mu_sticker_calculator_enqueue` / `mu_sticker_calculator_shortcode` viven solo en
el servidor: el repo `muyunicos` (tema hijo) no los menciona, ni en el código ni
en el historial. Por eso los pasos 1 y 2 de acá hay que hacerlos por FTP o
Administrador de archivos, y no se pueden versionar. Vale la pena commitear esa
integración en algún repo para que no viva solo en producción.

### 10. `PENDIENTES.md` / `CHECKLIST-DEPLOY.md` — decidir su destino
Una vez vaciados, borrar los archivos o agregar los patrones al `.gitignore` (hoy están
trackeados a propósito para que las tareas no se pierdan).

### 12. ~~Media Library: faltaba `wp_enqueue_media()`~~ ✅ RESUELTO 2026-10-01
Diagnóstico: el botón "Galería" caía al fallback (`/wp-admin/media-upload.php` en
una pestaña nueva) porque `window.wp.media` no estaba cargado.

Causa raíz: **nadie llamaba a `wp_enqueue_media()`**. No había ninguna llamada en el
repo, ni en el shortcode, ni en el plugin de WooCommerce. Es una función del núcleo
de WordPress, así que no hace falta ningún plugin (el "plugin de Media Library" que
describía el README no existe).

Fix aplicado en el shortcode del servidor:

```php
if ( $is_admin ) {
    wp_enqueue_media();
}
```

Verificado: el modal abre sobre la página y `window.wp.media` es `function`.
El `if ( $is_admin )` evita que los clientes descargen varios cientos de KB de
`wp-media`, Backbone, underscore y jQuery UI que no necesitan.

> Nota de proceso: durante el deploy el snippet volvió a una versión anterior sin
> estos cambios, y hubo que reaplicarlos. **Siempre verificar en Network que se pide
> `datos_config_etag.php` y no `datos_config.json` antes de dar por hecho que guardó.**

**Detalle menor, no bloqueante:** el fallback abre `?post_id=0` porque el shortcode no
pasa `productId` en `WP_STICKER_DATA`, y `AdminGalleryPanel.tsx:51` cae al `|| 0`.
Con `wp_enqueue_media()` aplicado el fallback ya no se usa, así que es cosmético.

### ~~11. `MIGRATION-GUIDE.md` — Cloudflare~~ ✅ RESUELTO (en este repo)
La sección 2 quedó alineada con la infraestructura real:
- CDN de Hostinger por subdominio, con bloqueo de país en el edge y TLS 1.3.
- La purga de caché es **manual** (antes decía automática vía API de Cloudflare).
- Se advierte que `cf-cache-status` no existe: hay que verificar desde Network.
- PHP 8.5.4 (antes 8.3.28).

Las dos menciones que quedan de "Cloudflare" son intencionales: documentan el retiro.

**Pendiente equivalente en el tema hijo**: este `MIGRATION-GUIDE.md` es una copia.
La versión original está en el repo del tema hijo y también debería corregirse, pero
queda fuera de este repo.

## ✅ YA RESUELTO (referencia, no hacer nada)
- `useAdminState.ts` eliminado por ser código muerto (la lógica ya estaba en `App.tsx`).
- Timers con memory leak arreglados en `ToastProvider` / `ToastItem` / `MobileSummaryBar`.
- `deepEqual` propio reemplazado por `fast-deep-equal`.
- `useDebounce` passage a genérico `<T>`.
- `wp_localize_script` duplicado del nonce eliminado del plugin de WooCommerce.
- `visibilitychange` de 5 min eliminado de `useConfig` (ya innecesario con ETag).
- `.gitattributes` agregado → se eliminaron los warnings de LF/CRLF.
