# 02 — Convenciones y comandos (Calculadora)

## Estilo
- TypeScript + React; mensajes/UI en español, sin tildes en código puro.
- No agregar comentarios salvo pedido explícito.
- Editar con herramienta de edición (diff exacto), no con scripts que reescriban archivos.

## Comandos (desde la raíz del repo)
```powershell
npm run build        # esbuild (js) + tailwind (css) -> assets/
npm run typecheck    # tsc --noEmit
npm test             # node tests/core.test.js
php tests/precio-paridad.php
php tests/guardar-paridad.php
npm run pub:tema     # publica el tema (pwsh)
```

## Reglas de oro
- No commitear/pushear/desplegar sin pedido explícito.
- No tocar `assets/js` ni `assets/css` a mano (generados).
- Un dueño por dato; no duplicar lógica entre `src/core` y `woocommerce-plugin`.