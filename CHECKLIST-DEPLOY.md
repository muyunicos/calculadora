# CHECKLIST DE DEPLOY — Calculadora de stickers

> Deploy **manual** (FTP / Administrador de archivos de Hostinger) a `/generatepress-child/`.
> Este repo no despliega: el push a GitHub no sube nada al servidor.
> Ordenado por riesgo: cada paso deja el sitio en un estado funcional si se corta acá.
>
> Ramas: el `perf(cache)`/`refactor(cleanup)`/`build` ya están en `main`.

## Contexto de infraestructura (verificado 2026-10-01)

- **CDN: Hostinger por subdominio**, nivel de seguridad alto. Cloudflare **ya no se usa**
  (el proveedor anterior fue retirado).
- **Object cache**: LiteSpeed Memcached (LSMCD) activo.
- **PHP 8.5.4** en Hostinger Business.
- **No hay `cf-cache-status`**: cualquier verificación de caché que dependa de esa
  cabecera es inválida. Para verificar caché usá la pestaña **Network** del navegador
  (status `200` / `304`), no headers de CDN.
- Los cambios de servidor/DNS/CDN **se hacen desde el panel de Hostinger**, no desde un commit.
- Fuente: `.specify/memory/constitution.md` del repo del tema hijo `muyunicos`.

## ⚠️ Lo único que bloquea todo

`src/core/wp.ts:21` define
`CONFIG_URL = WP.configUrl || \`${ASSETS_URL}/datos_config_etag.php\``.
**`WP.configUrl` siempre gana.** La integración de la calculadora
(`mu_sticker_calculator_enqueue` con su `wp_localize_script`) **no está versionada en
ningún repo local** — el repo `muyunicos` (tema hijo) no la menciona, ni en el código
ni en el historial. Vive solo en el servidor y hay que editarla por FTP.

Mientras `configUrl` apunte a `datos_config.json`, **el ETag no se ejecuta nunca**
y todo el trabajo de caché es inerte.

---

## Paso 1 — Subir el endpoint (sin riesgo, no cambia comportamiento)

```
origen:  assets/datos_config_etag.php
destino: /generatepress-child/assets/datos_config_etag.php
```

Aunque todavía nadie lo llame, subirlo primero evita el escenario de rotura del paso 3.
Verificar permisos: el resto de `assets/*.php` es `644`.

## Paso 2 — Editar el `functions.php` del tema hijo (activa el ETag)

Archivo del tema hijo en el servidor, sección del enqueue de la calculadora:

```php
// ANTES (el ETag queda inerte)
'configUrl' => get_stylesheet_directory_uri() . '/assets/datos_config.json',

// DESPUÉS
'configUrl' => get_stylesheet_directory_uri() . '/assets/datos_config_etag.php',
```

No cambiar `saveUrl`: el admin sigue guardando sobre `datos_config.json` y el ETag se
calcula sobre ese mismo archivo. El ciclo guardar → leer queda coherente.

## Paso 3 — Subir el bundle compilado (recién después del paso 1)

```
origen:  assets/js/calculadora_stickers.js
destino: /generatepress-child/assets/js/calculadora_stickers.js
```

**Este es el único paso que puede romper la página.** Si subís el `.js` sin el `.php`
del paso 1, la calculadora pide un archivo inexistente y queda en la pantalla de
`loadError` (`App.tsx:485`).

El CSS no se tocó en esta tanda; su build es opcional.

## Paso 4 — Purgar caché

Al cambiar `functions.php` y un JS con el mismo nombre, LiteSpeed/CDN pueden servir
lo viejo. Purgar caché en **ambos** (LiteSpeed Cache y CDN de Hostinger). La purga
automática que se mencionaba era vía API de Cloudflare: **esa vía ya no existe**,
hay que purgar a mano.

## Paso 5 — Verificar (en este orden)

1. **La calculadora carga y cotiza** → si falla, el paso 3 se subió sin el paso 1.
2. **DevTools → Network**: 1ª carga `200` (con el JSON), 2ª carga **`304`**.
   - Si la 2ª sigue en `200`: el paso 2 no se aplicó, o hay caché sirviendo la URL vieja.
   - El `304` es la confirmación de que todo el trabajo de caché sirve.
3. **Modo admin** (`manage_options`): editar un material y guardar → el `POST` a
   `guardar_datos.php` debe seguir funcionando y, tras ~60 s, la config pública debe
   reflejar el cambio. El `max-age=60` es deliberado: un cambio de precio tarda hasta
   1 minuto en verse públicamente.
4. **Recarga tras inactividad** (dejar la pestaña oculta >5 min y volver): antes había
   un listener que recargaba la config; se eliminó por ser redundante con el ETag.
   No debe aparecer ningún error.

## Archivos involucrados

| Archivo | Paso | Nota |
|---|---|---|
| `assets/datos_config_etag.php` | 1 | **Nuevo.** Requisito del paso 3 |
| `assets/js/calculadora_stickers.js` | 3 | Regenerado con `npm run build:js` |
| `functions.php` (tema hijo, en el servidor) | 2 | Sin versionar; editar por FTP |
| `assets/datos_config.json` | — | **No subir.** Solo lo escribe el admin vía `guardar_datos.php` |

## Rollback

Si algo falla, los cambios son independientes y se revierten por separado:

- Revertir el `functions.php` a `datos_config.json` → la calculadora vuelve a pedir el
  JSON crudo. **Este es el rollback más simple y no requiere tocar archivos.**
- Volver a subir el bundle anterior si el problema fuera de los timers.
