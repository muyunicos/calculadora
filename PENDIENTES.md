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

### 4. `README.md:52` — árbol de `hooks/` desactualizado
Todavía lista `useAdminState.ts`, que fue eliminado (el estado admin vive inline
en `App.tsx`). Quitar esa línea.

### 5. `README.md:126` — documentar el endpoint con ETag
El ejemplo de `wp_localize_script` debe reflejar el `configUrl` del paso 1, más una
línea explicando el mecanismo ETag/304 y el `max-age=60` de
`assets/datos_config_etag.php`.

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

### 8. `.gitignore` — se ignora `PLAN_REFACTOR.md` a mano
Si `PENDIENTES.md` también debería ser efímero, agregar el patrón al `.gitignore`
cuando este archivo se borre. (Hoy quedó trackeado a propósito para que las
tareas no se pierdan.)

## ✅ YA RESUELTO (referencia, no hacer nada)
- `useAdminState.ts` eliminado por ser código muerto (la lógica ya estaba en `App.tsx`).
- Timers con memory leak arreglados en `ToastProvider` / `ToastItem` / `MobileSummaryBar`.
- `deepEqual` propio reemplazado por `fast-deep-equal`.
- `useDebounce` passage a genérico `<T>`.
- `wp_localize_script` duplicado del nonce eliminado del plugin de WooCommerce.
- `visibilitychange` de 5 min eliminado de `useConfig` (ya innecesario con ETag).
- `.gitattributes` agregado → se eliminaron los warnings de LF/CRLF.
