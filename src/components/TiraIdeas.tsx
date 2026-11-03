import React, { useMemo } from 'react';
import { Star, Trash2, Wand2, Clock } from 'lucide-react';

import type { FavoritoRef, GalleryItem, GalleryPricing, IdeaCustom, TiraItem } from '../types';
import { precioActualizado, tiraOrden } from '../core/mockups';
import type { HistorialPedido } from '../hooks/useClientIdeas';

/**
 * Tira UNIFICADA de ideas (spec 037, T032-T034).
 *
 * Una sola superficie con TRES origenes y la MISMA tarjeta:
 *  - `tienda`: las fotos de ejemplo del admin (`gallery`);
 *  - `custom`: las ideas que guardo el comprador (`customs/` del plugin);
 *  - `historial`: sus pedidos con diseno (se derivan de Woo, no se guardan).
 *
 * La estrella aplica a CUALQUIER item (D4) y ordena al inicio; el borrado solo
 * existe en los customs propios (FR-025); el precio se recalcula al cargar con el
 * catalogo vigente y se avisa cuando difiere del guardado (D7/FR-027).
 */

export interface TiraIdeasProps {
  titulo: string;
  tienda: GalleryItem[];
  ideas: IdeaCustom[];
  favoritos: FavoritoRef[];
  pedidos: HistorialPedido[];
  resolveImage: (src: string) => string;
  getPricing: (orderCode: string, displaySheets?: number) => GalleryPricing | null;
  onUsar: (item: TiraItem) => void;
  onEstrella?: (tipo: 'custom' | 'tienda' | 'historial', ref: string, valor: boolean) => void;
  onBorrar?: (ideaId: string) => void;
  className?: string;
}

const fmt0 = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });

/** Mezcla los tres origenes en tarjetas del mismo tipo y las ordena (D4). */
function tarjetas(props: TiraIdeasProps): TiraItem[] {
  const { tienda, ideas, favoritos, pedidos } = props;
  const esFav = (tipo: 'tienda' | 'historial', ref: string) =>
    favoritos.some((f) => f.tipo === tipo && f.ref === ref);

  const deTienda: TiraItem[] = tienda
    .filter((item) => item.visible !== false)
    .map((item) => ({
      key: `tienda:${item.id}`,
      origen: 'tienda',
      titulo: item.title?.trim() || 'Idea de la tienda',
      descripcion: item.caption,
      imagen: item.image,
      order: item.order,
      favorito: esFav('tienda', item.id),
      orden: 0,
      creado: 0,
    }));

  const deCustom: TiraItem[] = ideas.map((idea) => ({
    key: `custom:${idea.id}`,
    origen: 'custom',
    titulo: idea.titulo || 'Mi diseno',
    descripcion: idea.descripcion,
    imagen: idea.url || idea.mockup?.url,
    order: idea.order,
    favorito: !!idea.favorito,
    orden: idea.orden ?? 0,
    creado: idea.creado ?? 0,
    idea,
    precio: idea.precio,
  }));

  const deHistorial: TiraItem[] = pedidos.map((pedido) => ({
    key: `historial:${pedido.order_id}`,
    origen: 'historial',
    titulo: `Pedido ${pedido.order_code || pedido.order_id}`,
    descripcion: pedido.fecha,
    order: pedido.diseno?.order,
    favorito: esFav('historial', String(pedido.order_id)),
    orden: 0,
    creado: 0,
  }));

  return [...deCustom, ...deTienda, ...deHistorial].sort(tiraOrden);
}

const OrigenBadge: React.FC<{ origen: TiraItem['origen'] }> = ({ origen }) => {
  const texto = origen === 'custom' ? 'Guardada' : origen === 'historial' ? 'Comprada' : 'Tienda';
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{texto}</span>
  );
};

/** Referencia del item para la estrella (custom = id de la idea; resto = ref). */
function referencia(item: TiraItem): string {
  if (item.origen === 'custom') return String(item.idea?.id ?? '');
  return String(item.key.split(':').slice(1).join(':'));
}
export const TiraIdeas: React.FC<TiraIdeasProps> = (props) => {
  const items = useMemo(() => tarjetas(props), [props]);
  if (items.length === 0) return null;

  return (
    <section className={props.className}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-sm font-bold text-slate-800">{props.titulo}</h3>
        <span className="text-xs text-slate-500">
          {items.length} idea{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => {
          const precio = item.order ? props.getPricing(item.order) : null;
          const cambio = precioActualizado(item.precio, precio);
          const imagen = item.imagen
            ? (item.imagen.startsWith('http') ? item.imagen : props.resolveImage(item.imagen))
            : '';
          return (
            <article
              key={item.key}
              className="relative w-[190px] shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <div className="relative h-[120px] bg-slate-100">
                {imagen ? (
                  <img src={imagen} alt={item.titulo} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <Clock className="w-6 h-6" />
                  </div>
                )}
                {props.onEstrella && (
                  <button
                    type="button"
                    aria-label={item.favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                    aria-pressed={item.favorito}
                    onClick={() => props.onEstrella?.(
                      item.origen === 'custom' ? 'custom' : item.origen === 'historial' ? 'historial' : 'tienda',
                      referencia(item),
                      !item.favorito,
                    )}
                    className={`absolute top-1.5 right-1.5 p-1.5 rounded-full ${item.favorito ? 'bg-amber-400 text-white' : 'bg-white/90 text-slate-500'}`}
                  >
                    <Star className="w-4 h-4" fill={item.favorito ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>
              <div className="p-2 space-y-1">
                <OrigenBadge origen={item.origen} />
                <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{item.titulo}</p>
                {item.descripcion && (
                  <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">{item.descripcion}</p>
                )}
                {precio && (
                  <p className="text-[11px] font-bold text-emerald-700">
                    ${fmt0(precio.perUnit)} c/u
                    {cambio && (
                      <span className="ml-1 text-[10px] font-semibold text-amber-700">actualizado</span>
                    )}
                  </p>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <button
                    type="button"
                    className="cl-button-secondary-small flex-1"
                    onClick={() => props.onUsar(item)}
                    disabled={!item.order}
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Usar
                  </button>
                  {item.origen === 'custom' && props.onBorrar && item.idea && (
                    <button
                      type="button"
                      className="cl-button-secondary-small"
                      aria-label="Borrar esta idea"
                      onClick={() => {
                        const idea = item.idea;
                        if (!idea) return;
                        if (typeof window !== 'undefined'
                          && !window.confirm('Borrar esta idea guardada?')) {
                          return;
                        }
                        props.onBorrar?.(idea.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default TiraIdeas;