# Mejoras de Validación y Galería de WordPress

## Resumen de Cambios

Este documento describe las mejoras implementadas para solucionar errores de validación y agregar integración con la galería nativa de WordPress.

## 1. Manejo Robusto de Errores de Validación

### Problema
La aplicación se rompía cuando había campos de imagen vacíos en `datos_config.json`, mostrando errores como:
```
Validación fallida: gallery.3.image: String must contain at least 1 character(s).
```

### Solución Implementada

#### Modificaciones en `src/core/validation.ts`
- Cambié el esquema `GalleryItemSchema` para permitir imágenes vacías:
  ```typescript
  image: z.string().optional()  // Antes: z.string().min(1)
  ```

- Agregué la función `normalizeAppData()` que asigna automáticamente `assets/images/default.webp` a cualquier campo de imagen vacío:
  - Normaliza gallery (items de galería)
  - Normaliza materials (materiales)
  - Normaliza shapesCatalog (formas y tamaños)
  - Normaliza deliveryOptions (opciones de entrega)
  - Normaliza designOptions (opciones de diseño)

#### Modificaciones en `src/hooks/useConfig.ts`
- Se integra la función `normalizeAppData()` después de validar los datos
- Los datos cargados del servidor ahora se normalizan automáticamente antes de usarse

#### Corrección en `assets/datos_config.json`
- Se corrigió el item `g1781795842620` que tenía `image: ""` asignándole `assets/images/default.webp`

### Beneficios
✅ La aplicación ya no se rompe por imágenes vacías
✅ Se usa automáticamente `default.webp` cuando falta una imagen
✅ Validación más flexible pero robusta
✅ Retrocompatible con configuraciones existentes

## 2. Integración con Galería de WordPress

### Problema
Los administradores tenían que copiar y pegar URLs de imágenes manualmente, lo cual era tedioso y propenso a errores.

### Solución Implementada

#### Nuevo Plugin: `plugin/plugin-calculadora-admin-integration.php`
Este plugin asegura que los scripts de WordPress Media Library estén disponibles:

```php
class CalculadoraAdminIntegration {
    // Carga wp_enqueue_media() para admins en:
    // - Panel de administración de WordPress
    // - Frontend cuando el usuario es admin
}
```

**Instalación:**
1. Copiar el archivo `plugin/plugin-calculadora-admin-integration.php` al directorio de plugins de WordPress
2. Activar el plugin desde el panel de administración de WordPress

#### Modificaciones en `src/components/AdminGalleryPanel.tsx`
- Agregué botón "Galería" al lado del input de URL de imagen
- Implementé función `openWordPressMediaLibrary()` que:
  - Usa `wp.media()` si está disponible
  - Abre el media uploader de WordPress en nueva ventana como fallback
- Los usuarios pueden ahora seleccionar imágenes existentes o subir nuevas fácilmente

#### Modificaciones en `src/components/InfoExtraEditor.tsx`
- Agregué el mismo botón de galería para imágenes de materiales, tamaños, etc.
- Funcionalidad consistente en toda la interfaz de administración

### Uso de la Galería de WordPress

**En el Panel de Administración de la Calculadora:**

1. **Galería de Ejemplos:**
   - Ir a pestaña "Galería" en modo admin
   - En cada item, verás un botón azul "Galería" al lado del input de URL
   - Click en "Galería" abre el media uploader de WordPress
   - Seleccionar imagen existente o subir nueva
   - La URL se asigna automáticamente

2. **Materiales y Tamaños:**
   - Ir a pestaña "Materiales" o "Formas" en modo admin
   - En "Info extra para el cliente", verás el botón de galería
   - Procedimiento igual que arriba

**Requisitos:**
- Usuario debe tener permisos de admin en WordPress
- Plugin `plugin-calculadora-admin-integration.php` debe estar activado
- Estar en el entorno de WordPress (no funciona en desarrollo local sin WP)

### Beneficios
✅ Selección de imágenes intuitiva con interfaz nativa de WordPress
✅ Posibilidad de subir nuevas imágenes directamente
✅ Vista previa de imágenes en la biblioteca
✅ Menor probabilidad de errores en URLs
✅ Experiencia de usuario mejorada para administradores

## Compatibilidad

### WordPress
- WordPress 5.0+
- Usuario con capacidades `manage_options`
- Plugin activado para cargar scripts de media

### Navegadores
- Funciona en todos los navegadores modernos
- Fallback para cuando wp.media no está disponible

### Archivos Modificados
1. `src/core/validation.ts` - Esquemas y normalización
2. `src/hooks/useConfig.ts` - Integración de normalización
3. `src/components/AdminGalleryPanel.tsx` - Botón galería
4. `src/components/InfoExtraEditor.tsx` - Botón galería
5. `assets/datos_config.json` - Corrección de imagen vacía
6. `plugin/plugin-calculadora-admin-integration.php` - NUEVO

## Testing

### Pruebas Realizadas
✅ Compilación exitosa sin errores de TypeScript
✅ Esquema de validación actualizado correctamente
✅ Función de normalización implementada
✅ Integración de galería de WordPress agregada

### Pruebas Recomendadas
1. Probar con `datos_config.json` que tenga imágenes vacías
2. Verificar que se cargue `default.webp` automáticamente
3. Probar el botón de galería en entorno WordPress
4. Verificar selección de imágenes existentes
5. Verificar subida de nuevas imágenes
6. Probar fallback cuando wp.media no está disponible

## Notas Importantes

- La normalización se aplica automáticamente en tiempo de carga, no modifica el archivo JSON original
- El archivo JSON debe ser corregido manualmente para imágenes vacías si se quiere mantener consistencia
- La galería de WordPress solo funciona dentro del entorno WordPress, no en desarrollo local
- El fallback abre el media uploader en una nueva ventana cuando wp.media no está disponible
