# 01 — Stack Calculadora

App **Calculadora de stickers** (React + TypeScript) para el tema GeneratePress child
de Muy Únicos. Build con **esbuild** (JS) + **Tailwind** (CSS); integración PHP/Woo en
`woocommerce-plugin/` y `assets/*.php`. Repo propio `muyunicos/calculadora`, rama `main`.

## Estructura
- `src/` — React/TS (`index.tsx`, `App.tsx`, `core/`, `components/`, `hooks/`, `utils/`).
- `assets/` — salida generada (`js/calculadora_stickers.js`, `css/calculadora_stickers.css`) + PHP.
- `woocommerce-plugin/` — integración carrito/precios Woo (PHP + JS).
- `tests/` — suites Node (`*.test.js`) y paridad PHP (`*.php`).
- `scripts/` — `publicar-tema.ps1`, `generar-reglas.js`.

## Reglas
- **Build**: `npm run build` (js+css). **Typecheck**: `npm run typecheck`.
- **Tests**: `npm test` (`node tests/core.test.js`); paridad PHP con `php tests/*.php`.
- **No editar la salida generada** en `assets/js` y `assets/css` a mano: se regenera.
- Datos de configuración en `assets/datos_config.json` (runtime, fuera de git si aplica).
- Leer `README.md` / `MIGRATION-GUIDE.md` antes de cambios de arquitectura.