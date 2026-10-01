# CHECKLIST DE DEPLOY — Calculadora de stickers

> Deploy **manual** (FTP / Administrador de archivos de Hostinger) a `/generatepress-child/`.
> Este repo no despliega: el push a GitHub no sube nada al servidor.
>
> ✅ **Ejecutado y verificado el 2026-10-01.** Se conserva como referencia para el
> próximo deploy y para saber qué se comprobó. Resultados al final.

## 🛑 La regla más importante de este checklist

**Nunca subir la carpeta `assets/` completa. Subir archivo por archivo.**

`assets/datos_config.json` es un archivo de **datos vivos**: lo edita el admin desde el
cotizador vía `guardar_datos.php`. La copia que está en el repo tiene meses y puede
estar desactualizada. Subir la carpeta entera lo pisa y **se pierden los cambios de
precios, materiales, formas e imágenes** sin aviso.

En este deploy pasó: la copia local y la de producción coincidían (8816 bytes), así
que no hubo pérdida. **Fue suerte, no diseño.**

Durante este deploy, la advertencia estaba en la tabla de archivos ("no subir"), pero
la instrucción natural de "subí los assets" es copiar la carpeta. Por eso está aquí,
al principio, y no en una tabla al final.

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

## ⚠️ Los dos cambios que bloquean (ambos en el mismo archivo)

El shortcode (`mu_sticker_calculator_shortcode`) **no está versionado en ningún repo
local** — el repo `muyunicos` (tema hijo) no lo menciona, ni en el código ni en el
historial. Vive solo en el servidor, en un plugin de snippets, y hay que editarlo por FTP.

**Cambio 1 — ETag.** En `src/core/wp.ts:21`,
`CONFIG_URL = WP.configUrl || \`${ASSETS_URL}/datos_config_etag.php\``.
**`WP.configUrl` siempre gana**, así que mientras apunte a `datos_config.json` el
endpoint nunca se ejecuta y todo el trabajo de caché es inerte.

**Cambio 2 — Media Library.** Hoy el botón "Galería" del admin abre
`/wp-admin/media-upload.php` en una pestaña nueva, porque `window.wp.media` no está
cargado: nadie llama a `wp_enqueue_media()`. Es una función del núcleo de WordPress,
no hace falta ningún plugin.

Los dos van en el mismo archivo, así que conviene hacerlos de una sola vez.

---

## Paso 1 — Subir el endpoint (sin riesgo, no cambia comportamiento)

```
origen:  assets/datos_config_etag.php
destino: /generatepress-child/assets/datos_config_etag.php
```

Aunque todavía nadie lo llame, subirlo primero evita el escenario de rotura del paso 3.
Verificar permisos: el resto de `assets/*.php` es `644`.

## Paso 2 — Editar el shortcode (ETag + Media Library)

Archivo del tema hijo en el servidor, dentro de `mu_sticker_calculator_shortcode()`.

**2a. Activar el ETag** — cambiar dentro del `wp_localize_script`:

```php
// ANTES (el ETag queda inerte)
'configUrl' => $assets_url . '/assets/datos_config.json',

// DESPUÉS
'configUrl' => $assets_url . '/assets/datos_config_etag.php',
```

No cambiar `saveUrl`: el admin sigue guardando sobre `datos_config.json` y el ETag se
calcula sobre ese mismo archivo. El ciclo guardar → leer queda coherente.

**2b. Cargar la Media Library** — agregar **después** del `wp_localize_script`:

```php
// Media Library para el botón de galería del admin. Solo para admins:
// son varios cientos de KB (wp-media, Backbone, underscore, jQuery UI).
if ( $is_admin ) {
    wp_enqueue_media();
}
```

> ⚠️ **El `if ( $is_admin )` no es opcional.** Sin el condicional, los clientes
> también descargan esos scripts. El botón de galería solo existe para admins.

> 📌 El docblock del snippet dice que espera `/assets/datos_config.json` pero no
> menciona `datos_config_etag.php`. Conviene agregarlo para que la lista de archivos
> esperados refleje lo que el shortcode realmente necesita.

La versión canónica y completa de este shortcode está en el **README de este repo**
(sección 1), con los tres cambios ya aplicados.

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
5. **Botón "Galería" del admin**: debe abrir el modal **sobre la página**.
   - Si abre una pestaña nueva con `/wp-admin/media-upload.php` → falta el
     `wp_enqueue_media()` del paso 2b.
   - En DevTools → Network, el `<head>` de un admin debe incluir los scripts
     `wp-media-views`, `media-views` y `backbone`. Un cliente normal **no** debe
     verlos (verifícalo con una ventana incógnita sin login).

## Archivos involucrados

| Archivo / cambio | Paso | Nota |
|---|---|---|
| `assets/datos_config_etag.php` | 1 | **Nuevo.** Requisito del paso 3 |
| `assets/js/calculadora_stickers.js` | 3 | Regenerado con `npm run build:js` |
| `configUrl` → endpoint ETag | 2a | En el shortcode del servidor, no versionado |
| `wp_enqueue_media()` condicional | 2b | En el shortcode del servidor, no versionado |
| `assets/datos_config.json` | — | **No subir.** Solo lo escribe el admin vía `guardar_datos.php` |

## Rollback

Si algo falla, los cambios son independientes y se revierten por separado:

- Revertir el `configUrl` a `datos_config.json` → la calculadora vuelve a pedir el
  JSON crudo. **Este es el rollback más simple y no requiere tocar archivos.**
- Quitar el `wp_enqueue_media()` → vuelve el fallback de abrir el uploader en otra
  pestaña. Nada más se rompe.
- Volver a subir el bundle anterior si el problema fuera de los timers.

## ✅ Resultado del deploy del 2026-10-01

Todo verificado. La verificación del `304` se hizo con `curl` contra el servidor real,
no a ojo en el navegador:

| Comprobación | Resultado |
|---|---|
| Endpoint responde | `200` + `ETag: W/"90a6538e..."` + `Cache-Control: public, max-age=60` |
| PHP del servidor | 8.5.4 |
| GET sin `If-None-Match` | `200`, 8816 bytes |
| GET con ETag coincidente | **`304`**, 0 bytes |
| GET con ETag incorrecto (control) | `200`, 8816 bytes |
| `datos_config.json` | 8816 bytes, idéntico a la copia del repo |
| Bundle en producción | Contiene los fixes (mensaje de error + alert) |
| Modal de galería | Abre sobre la página, `wp.media` es `function` |

El **control con ETag incorrecto** es el que da confianza: si también devolviera
`304`, el caching estaría mintiendo en lugar de revalidar.

### Qué salió distinto de lo planificado

- El snippet **volvió a una versión anterior** en medio del deploy, sin el
  `configUrl` ni el `wp_enqueue_media()`. Hubo que reaplicarlo. La forma de detectarlo
  fue mirar Network: si pide `datos_config.json`, el `configUrl` no se guardó.
- Se subió la carpeta `assets/` completa (ver la advertencia al principio). Sin
  consecuencias en este caso, pero fue el riesgo real del deploy.
- El `?ver=` del bundle en producción es el `filemtime()` **en el servidor**, o sea
  la hora de subida. Siempre es más reciente que el archivo local: no sirve para
  comparar versiones. Para eso, comparar contenido.
