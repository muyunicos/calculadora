import { z } from 'zod';
import type { AppData } from '../types';

// Schema de validación para Config
const ConfigSchema = z.object({
  calcSalaryMode: z.boolean(),
  monthlySalary: z.number().min(0),
  weeklyHours: z.number().min(0).max(168),
  hourlyRate: z.number().min(0),
  packagingCost: z.number().min(0),
  wasteMargin: z.number().min(0).max(100),
  profitMargin: z.number().min(0).max(1000),
  timeCustomerService: z.number().min(0),
  timeDelivery: z.number().min(0),
  timeDesignBasic: z.number().min(0),
  timeDesignCustom: z.number().min(0),
  galleryRefSheets: z.number().min(1).max(1000),
});

// Schema de validación para Material
const MaterialSchema = z.object({
  id: z.string().min(1),
  code: z.number().int().min(0).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  sheetCost: z.number().min(0),
  printTime: z.number().min(0),
  inkCost: z.number().min(0),
  printWear: z.number().min(0),
  minCutTime: z.number().min(0),
  maxCutTime: z.number().min(0),
  cutWear: z.number().min(0),
  visible: z.boolean().optional(),
});

// Schema de validación para ShapeItem
const ShapeItemSchema = z.object({
  size: z.string().min(1),
  qty: z.number().int().min(0),
  code: z.number().int().min(0).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  visible: z.boolean().optional(),
});

// Schema de validación para DeliveryOption
const DeliveryOptionSchema = z.object({
  id: z.enum(['sincorte', 'individual', 'plancha']),
  code: z.number().int().min(0),
  label: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  cutFactor: z.number().min(0),
  cutWearFactor: z.number().min(0),
  visible: z.boolean(),
});

// Schema de validación para DesignOption
const DesignOptionSchema = z.object({
  id: z.enum(['none', 'basic', 'custom']),
  code: z.number().int().min(0),
  label: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  designMinutes: z.number().min(0).optional(),
  isCustomTime: z.boolean(),
  visible: z.boolean(),
});

// Schema de validación para GalleryItem
const GalleryItemSchema = z.object({
  id: z.string().min(1),
  image: z.string().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
  order: z.string().min(1),
  visible: z.boolean().optional(),
});

// Schema de validación para ShapesShowMoreIndex
const ShapesShowMoreIndexSchema = z.record(z.string(), z.number().int().min(0));

// Schema de validación para ShapesCatalog
const ShapesCatalogSchema = z.record(z.string(), z.array(ShapeItemSchema));

// Schema completo para datos_config.json
export const AppDataSchema = z.object({
  config: ConfigSchema,
  materials: z.array(MaterialSchema).min(1),
  shapesCatalog: ShapesCatalogSchema,
  shapesShowMoreIndex: ShapesShowMoreIndexSchema.optional(),
  gallery: z.array(GalleryItemSchema).optional(),
  deliveryOptions: z.array(DeliveryOptionSchema).optional(),
  designOptions: z.array(DesignOptionSchema).optional(),
});

// Tipo inferido del schema
export type ValidatedAppData = z.infer<typeof AppDataSchema>;

// Función para validar datos de configuración
export function validateAppData(data: unknown): { success: true; data: ValidatedAppData } | { success: false; error: string } {
  const result = AppDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessages = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  }).join(', ');
  return { success: false, error: `Validación fallida: ${errorMessages}` };
}

// Función para normalizar datos de configuración y asignar valores por defecto
export function normalizeAppData(data: ValidatedAppData): ValidatedAppData {
  const DEFAULT_IMAGE = 'https://muyunicos.com/wp-content/themes/generatepress-child/assets/images/default.webp';

  // Normalizar galería: asignar imagen por defecto si está vacía
  // La galería DEBE tener imágenes porque es un catálogo de ejemplos visuales
  const normalizedGallery = data.gallery?.map(item => ({
    ...item,
    image: item.image && item.image.trim() !== '' ? item.image : DEFAULT_IMAGE
  })) || [];

  // NO normalizar materials, shapes, deliveryOptions, designOptions
  // Estos pueden tener image vacío si no hay info adicional
  // Si no hay description ni image, OptionInfoPanel no mostrará nada (comportamiento correcto)

  return {
    ...data,
    gallery: normalizedGallery,
  };
}
