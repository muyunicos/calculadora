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

### 6. Comentarios que siguen diciendo `datos_config.json`
Son correctos (es el nombre del archivo de datos) pero pueden confundir ahora que
el transporte es un endpoint PHP. Revisar:
- `src/App.tsx:485` (texto del error en pantalla)
- `src/hooks/useConfig.ts:33`
- `src/core/options.ts:7`
- `src/types/index.ts:136`

Sugerencia: dejar el nombre del archivo, aclarando que se sirve vía
`datos_config_etag.php`.

## 🟢 OPCIONALES

### 7. `test.js` en la raíz — archivo muerto
Contiene un `useDebounce` compilado a mano; no lo importa nadie y no está en
`package.json` scripts. Está **trackeado** en git. Decidir: borrar, o mover a
scripts de prueba reales.

### 8. `README.md:151` — referencia a `plugin/plugin-calculadora-admin-integration.php`
Ese directorio **no existe** en el repo (los PHP del proyecto son
`assets/guardar_datos.php`, `assets/datos_config_etag.php` y
`woocommerce-plugin/plugin-calculadora-cart-integration.php`). El plugin de Media
Library debe estar en el servidor o en otro repo. Actualizar la instrucción o
documentar de dónde sale.

### 9. El código de integración con WP no está en ningún repo local
`mu_sticker_calculator_enqueue` / `mu_sticker_calculator_shortcode` viven solo en
el servidor: el repo `muyunicos` (tema hijo) no los menciona, ni en el código ni
en el historial. Por eso los pasos 1 y 2 de acá hay que hacerlos por FTP o
Administrador de archivos, y no se pueden versionar. Vale la pena commitear esa
integración en algún repo para que no viva solo en producción.

### 10. `PENDIENTES.md` / `CHECKLIST-DEPLOY.md` — decidir su destino
Una vez vaciados, borrar los archivos o agregar los patrones al `.gitignore` (hoy están
trackeados a propósito para que las tareas no se pierdan).

### 11. `MIGRATION-GUIDE.md` — sección 2 todavía describe Cloudflare como CDN activa
Este repo tiene su propio `MIGRATION-GUIDE.md` (copiado del tema hijo) que quedó
desactualizado respecto de la infraestructura real:

- Línea 43: "DNS en Cloudflare con reglas de bloqueo por IP/País" → ahora es CDN de
  Hostinger por subdominio, con el bloqueo de país en el edge.
- Líneas 46 y 49-56: "Cloudflare es la ÚNICA CDN activa", la API de Cloudflare
  integrada en LiteSpeed, y el header `cf-cache-status`. **Nada de eso es válido hoy**,
  así que cualquier verificación de caché que se apoye en `cf-cache-status` es
  inejecutable. Hay que verificar desde la pestaña Network del navegador.
- La purga automática de caché vía API de Cloudflare ya no existe: ahora hay que purgar
  LiteSpeed y la CDN de Hostinger a mano.
- PHP real: **8.5.4** (el guide de la calculadora dice 8.3.28).

Fuente verificada: `.specify/memory/constitution.md` del repo `muyunicos`, que registra
el cambio de infraestructura y avisa que "el guide está pendiente de actualizar".
Ojo: ese `MIGRATION-GUIDE.md` **no está en la calculadora sino en el repo del tema
hijo** (`muyunicos`), que es donde debería corregirse; la copia de este repo es derivada.

## ✅ YA RESUELTO (referencia, no hacer nada)
- `useAdminState.ts` eliminado por ser código muerto (la lógica ya estaba en `App.tsx`).
- Timers con memory leak arreglados en `ToastProvider` / `ToastItem` / `MobileSummaryBar`.
- `deepEqual` propio reemplazado por `fast-deep-equal`.
- `useDebounce` passage a genérico `<T>`.
- `wp_localize_script` duplicado del nonce eliminado del plugin de WooCommerce.
- `visibilitychange` de 5 min eliminado de `useConfig` (ya innecesario con ETag).
- `.gitattributes` agregado → se eliminaron los warnings de LF/CRLF.
