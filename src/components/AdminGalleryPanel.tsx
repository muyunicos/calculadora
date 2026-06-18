import React, { useState } from 'react';
import { Plus, Trash2, ImageIcon, Eye, EyeOff, Upload } from 'lucide-react';
import type { GalleryItem, Order } from '../types';

interface AdminGalleryPanelProps {
  gallery: GalleryItem[];
  resolveImage: (src: string) => string;
  updateGalleryItem: (id: string, field: keyof GalleryItem, value: string | boolean) => void;
  addGalleryItem: () => void;
  removeGalleryItem: (id: string) => void;
  captureCurrentOrder: (id: string, order: Order) => boolean;
  order: Order;
  isDeleteMode?: boolean;
}

export const AdminGalleryPanel: React.FC<AdminGalleryPanelProps> = ({
  gallery,
  resolveImage,
  updateGalleryItem,
  addGalleryItem,
  removeGalleryItem,
  captureCurrentOrder,
  order,
  isDeleteMode = false,
}) => {
  // Función para abrir la galería de WordPress
  const openWordPressMediaLibrary = (galleryItemId: string) => {
    // Verificar si estamos en el entorno de WordPress y si wp.media está disponible
    if (typeof window !== 'undefined' && (window as any).wp && (window as any).wp.media) {
      const mediaUploader = (window as any).wp.media({
        title: 'Seleccionar imagen para la galería',
        button: { text: 'Usar esta imagen' },
        multiple: false,
        library: {
          type: 'image'
        }
      });

      mediaUploader.on('select', () => {
        const attachment = mediaUploader.state().get('selection').first().toJSON();
        if (attachment && attachment.url) {
          // Usar la URL de tamaño completo o la URL del tamaño seleccionado
          const imageUrl = attachment.sizes && attachment.sizes.full ? attachment.sizes.full.url : attachment.url;
          updateGalleryItem(galleryItemId, 'image', imageUrl);
        }
      });

      mediaUploader.open();
    } else {
      // Fallback: abrir el media uploader de WordPress en una nueva ventana
      const mediaUrl = '/wp-admin/media-upload.php?post_id=' + (typeof window !== 'undefined' ? (window as any).WP_STICKER_DATA?.productId || 0 : 0);
      if (typeof window !== 'undefined') {
        window.open(mediaUrl, '_blank', 'width=800,height=600');
      }
    }
  };
  return (
    <div className="cl-card bg-white p-6">
      <div className="flex flex-col md:flex-row cl-flex-between items-start md:items-center cl-gap-md border-b border-slate-100 pb-4 cl-mb-lg">
        <h2 className="text-xl font-bold text-slate-800 flex items-center cl-gap-md">
          <ImageIcon className="w-6 h-6 cl-text-primario" /> Galería de ejemplos
        </h2>
        <button onClick={addGalleryItem} className="flex items-center cl-gap-md cl-button-primary-small">
          <Plus className="w-4 h-4" /> Añadir foto
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">Cada foto carga un pedido al tocarla (vista cliente). Pegá la URL de la imagen, un texto opcional y el <strong>código de pedido</strong>. Para obtener el código: armá el pedido en el Cotizador y tocá <em>“Usar pedido actual”</em>.</p>

      {gallery.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Todavía no hay fotos. Tocá "Añadir foto" para empezar.</p>
      ) : (
        <div className="space-y-4">
          {gallery.map((g) => (
            <div key={g.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-full sm:w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 flex items-center justify-center">
                {g.image ? (
                  <img src={resolveImage(g.image)} alt={g.caption || 'Ejemplo'} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">URL de la imagen</label>
                  <div className="flex gap-2">
                    <input type="text" value={g.image} onChange={(e) => updateGalleryItem(g.id, 'image', e.target.value)} className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="https://… o galeria/foto1.webp" />
                    <button 
                      onClick={() => openWordPressMediaLibrary(g.id)} 
                      className="px-3 py-2 bg-blue-50 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors flex items-center gap-2"
                      title="Abrir galería de WordPress"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-xs font-medium">Galería</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Título (se ve en la miniatura)</label>
                  <input type="text" value={g.title ?? ''} onChange={(e) => updateGalleryItem(g.id, 'title', e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Ej: Stickers para botellas" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Descripción (opcional)</label>
                  <input type="text" value={g.caption ?? ''} onChange={(e) => updateGalleryItem(g.id, 'caption', e.target.value)} className="w-full p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="Ej: Vinilo circular 3cm, ideal para logos" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Código de pedido</label>
                  <div className="flex gap-2">
                    <input type="text" value={g.order} onChange={(e) => updateGalleryItem(g.id, 'order', e.target.value)} className="flex-1 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition-all" placeholder="v1.m11.s201.q25.f2.d0" />
                    <button onClick={() => captureCurrentOrder(g.id, order)} className="text-xs whitespace-nowrap bg-white border border-slate-300 text-slate-600 px-3 py-1 rounded-lg hover:text-blue-600 hover:border-blue-400 transition-colors" title="Volcar el pedido configurado en el Cotizador">Usar pedido actual</button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => updateGalleryItem(g.id, 'visible', !(g.visible ?? true))}
                  className={`p-2 rounded-lg transition-colors ${g.visible ?? true ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                  title={g.visible ?? true ? 'Ocultar foto' : 'Mostrar foto'}
                >
                  {g.visible ?? true ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => removeGalleryItem(g.id)} 
                  className={`
                    self-start p-2 rounded-lg transition-colors flex-shrink-0
                    ${isDeleteMode 
                      ? 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md' 
                      : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                    }
                    ${!isDeleteMode ? 'opacity-40' : ''}
                  `}
                  title={isDeleteMode ? 'Borrar foto (modo eliminación activo)' : 'Activa el modo eliminación para borrar'}
                  disabled={!isDeleteMode}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
