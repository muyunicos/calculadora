import React, { useState } from 'react';
import { ImagePlus, Plus, Upload } from 'lucide-react';

interface InfoExtraEditorProps {
  description?: string;
  image?: string;
  onChange: (field: 'description' | 'image', value: string) => void;
  resolveImage?: (src: string) => string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  imagePlaceholder?: string;
  hint?: string;
}

// Editor unificado de "info extra" (descripción + foto) para el Admin. Cualquier
// opción de la app (material, tamaño, formato de corte, diseño…) lo reutiliza:
// si todavía no hay info, muestra un botón "Agregar info extra" que despliega los
// campos; si ya hay contenido, los muestra directamente. La foto se previsualiza.
const InfoExtraEditor: React.FC<InfoExtraEditorProps> = ({
  description,
  image,
  onChange,
  resolveImage,
  descriptionLabel = 'Descripción para el cliente',
  descriptionPlaceholder = 'Ej: Resistente al agua, ideal para exterior…',
  imagePlaceholder = 'Ej: assets/img.png o https://…',
  hint = 'Se muestra al cliente al tocar la (i).',
}) => {
  const hasContent = !!description || !!image;
  const [open, setOpen] = useState(hasContent);

  // Función para abrir la galería de WordPress con modal nativo
  const openWordPressMediaLibrary = () => {
    // Verificar si estamos en el entorno de WordPress y si wp.media está disponible
    if (typeof window !== 'undefined' && (window as any).wp && (window as any).wp.media) {
      const wp = (window as any).wp;

      // Si el frame ya existe, solo abrirlo
      if (wp.media.frames.calculadoraInfoFrame) {
        wp.media.frames.calculadoraInfoFrame.open();
        return;
      }

      // Crear un nuevo media frame
      wp.media.frames.calculadoraInfoFrame = wp.media({
        title: 'Seleccionar imagen',
        button: {
          text: 'Usar esta imagen'
        },
        multiple: false, // Permitir solo una imagen
        library: {
          type: 'image'
        }
      });

      // Cuando se selecciona una imagen
      wp.media.frames.calculadoraInfoFrame.on('select', function() {
        const attachment = wp.media.frames.calculadoraInfoFrame.state().get('selection').first().toJSON();

        if (attachment && attachment.url) {
          // Usar la URL de tamaño completo o la URL del tamaño seleccionado
          const imageUrl = attachment.sizes && attachment.sizes.full ? attachment.sizes.full.url : attachment.url;
          onChange('image', imageUrl);
        }
      });

      // Abrir el modal
      wp.media.frames.calculadoraInfoFrame.open();
    } else {
      // Mostrar alerta si no está disponible
      alert('La galería de WordPress no está disponible. Asegúrate de estar en el entorno de WordPress admin y que el plugin de integración esté activado.');
    }
  };

  if (!open && !hasContent) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-3 py-1.5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Agregar info extra
      </button>
    );
  }

  const preview = image && resolveImage ? resolveImage(image) : image;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">{descriptionLabel}</label>
        <textarea
          value={description ?? ''}
          onChange={(e) => onChange('description', e.target.value)}
          rows={3}
          placeholder={descriptionPlaceholder}
          className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y bg-white transition-all"
        />
        {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">URL imagen (opcional)</label>
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              {preview ? (
                <img
                  src={preview}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget.style.display = 'none'); }}
                />
              ) : (
                <ImagePlus className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={image ?? ''}
                onChange={(e) => onChange('image', e.target.value)}
                placeholder={imagePlaceholder}
                className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
              />
              <button
                type="button"
                onClick={openWordPressMediaLibrary}
                className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors flex items-center gap-2 flex-shrink-0"
                title="Abrir galería de WordPress"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">La foto se amplía al tocarla en la vista cliente.</p>
        </div>
      </div>
    </div>
  );
};

export default InfoExtraEditor;
