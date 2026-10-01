# PENDIENTES — calculations de stickers

> Generado al cerrar el commit del trabajo de caché ETag + limpieza.
> **No es documentación**: es una lista de tareas para borrar cuando se vacíe.

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

Si sigue apareciendo `200`, el paso 1 no se aplicó o hay caché de LiteSpeed /
Cloudflare sirviendo la URL vieja. Considerar purgar caché en ambos.

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

### 10. `PENDIENTES.md` — decidir su destino
Una vezvaciado, borrar el archivo o agregar el patrón al `.gitignore` (hoy está
trackeado a propósito para que las tareas no se pierdan).

## ✅ YA RESUELTO (referencia, no hacer nada)
- `useAdminState.ts` eliminado por ser código muerto (la lógica ya estaba en `App.tsx`).
- Timers con memory leak arreglados en `ToastProvider` / `ToastItem` / `MobileSummaryBar`.
- `deepEqual` propio reemplazado por `fast-deep-equal`.
- `useDebounce` passage a genérico `<T>`.
- `wp_localize_script` duplicado del nonce eliminado del plugin de WooCommerce.
- `visibilitychange` de 5 min eliminado de `useConfig` (ya innecesario con ETag).
- `.gitattributes` agregado → se eliminaron los warnings de LF/CRLF.
