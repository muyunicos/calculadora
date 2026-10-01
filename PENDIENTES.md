# PENDIENTES — Calculadora de stickers

> Lista de tareas para borrar cuando se vacíe. El deploy está en **CHECKLIST-DEPLOY.md**.

## ✅ DEPLOY

Ver **CHECKLIST-DEPLOY.md** en la raíz. Resumen: subir el endpoint, cambiar
`configUrl` en el `functions.php` del servidor, subir el bundle recién después,
purgar caché y verificar el `304`.

> Nota de infraestructura: la CDN ahora es **Hostinger por subdominio**, no Cloudflare.
> Las verificaciones que usaban `cf-cache-status` no sirven; y la purga automática de
> caché vía API de Cloudflare ya no está disponible (hay que purgar a mano).
> El `MIGRATION-GUIDE.md` de este repo sigue nombrando a Cloudflare: queda como deuda
> de documentación (ver punto 11).

## 🔴 BLOQUEANTES (hay que hacerlos sí o sí)

### 1. Activar el ETag en producción — `functions.php` del tema hijo
Este archivo **no está en este repo**. Mientras no se toque, todo el trabajo de
caché es inerte:

```php
// ANTES (rompe el ETag)
'configUrl' => get_stylesheet_directory_uri() . '/assets/datos_config.json',

// DESPUÉS
'configUrl' => get_stylesheet_directory_uri() . '/assets/datos_config_etag.php',
```

Motivo: en `src/core/wp.ts` la constante es
`WP.configUrl || \`${ASSETS_URL}/datos_config_etag.php\`` — el valor inyectado por
WordPress **siempre gana** sobre el fallback en código. Con el valor viejo, el
frontend sigue pidiendo el `.json` crudo y el endpoint con ETag nunca se ejecuta.

### 2. Subir `assets/datos_config_etag.php` al servidor
Va en `/generatepress-child/assets/`. Si el JS actualizado sube sin este archivo,
la calculadora queda sin configuración y `useConfig` expone `loadError`
(la pantalla de error de `App.tsx`).

### 3. Verificar el `304 Not Modified` en el navegador
DevTools → Network → recargar dos veces:
- 1ª carga: `200` con el JSON.
- 2ª carga: **`304`**.

Si sigue apareciendo `200`, el paso 1 no se aplicó o hay caché de LiteSpeed / CDN
de Hostinger sirviendo la URL vieja. Considerar purgar caché en ambos.
(El detalle completo está en **CHECKLIST-DEPLOY.md**.)

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
