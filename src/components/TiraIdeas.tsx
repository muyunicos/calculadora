import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Star, Trash2, Wand2, Clock, Pencil } from 'lucide-react';

import type { FavoritoRef, GalleryItem, GalleryPricing, IdeaCustom, TiraItem } from '../types';
import { precioActualizado, tiraOrden } from '../core/mockups';
import type { HistorialPedido } from '../hooks/useClientIdeas';
import {
  abrirVisor,
  cerrarVisor,
  metaDeItem,
  montarColeccion,
} from '../core/muGaleria';
import {
  categoriaTira,
  descripcionVisible,
  normalizarTitulo,
  precioTira,
} from '../core/tiraDatos';
import { useMotorVisor } from '../hooks/useMotorVisor';

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
  /** Spec 038 (D7): renombra una idea guardada por el cliente. */
  onRenombrar?: (ideaId: string, titulo: string) => void;
  className?: string;
}

const fmt0 = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });

/** Planchas del codigo v1 (`v1.m11.s201.q25.f2.d0` -> 25): el precio es por lote. */
const extractSheets = (code: string): number => {
  const m = code.match(/\.q(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
};

/** Tipo que espera `onEstrella` para el item de la tira. */
const tipoDe = (item: TiraItem): 'tienda' | 'historial' | 'custom' =>
  item.origen === 'custom' ? 'custom' : item.origen === 'historial' ? 'historial' : 'tienda';

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
    categoria: 'GUARDADO',
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
    categoria: 'COMPRADO',
  }));

  return [...deCustom, ...deTienda, ...deHistorial].sort(tiraOrden);
}

const OrigenBadge: React.FC<{ item: TiraItem }> = ({ item }) => {
  // Spec 038 (D6): la categoria manda (PROMO/GUARDADO/COMPRADO). Sin categoria, una
  // idea comun no lleva etiqueta (no saturar la tira).
  const texto = item.categoria || (item.origen === 'custom' ? 'Guardada' : item.origen === 'historial' ? 'Comprada' : '');
  if (!texto) return null;
  const tono = texto === 'PROMO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tono}`}>{texto}</span>
  );
};

/** Referencia del item para la estrella (custom = id de la idea; resto = ref). */
function referencia(item: TiraItem): string {
  if (item.origen === 'custom') return String(item.idea?.id ?? '');
  return String(item.key.split(':').slice(1).join(':'));
}
/** Tarjetas React de respaldo: se usan SOLO si el tema no trae el motor. */
const TarjetasLegacy: React.FC<TiraIdeasProps & { items: TiraItem[] }> = (props) => {
  // Spec 038 (D7): que tarjeta se esta renombrando (solo una a la vez).
  const [editando, setEditando] = useState<string | null>(null);
  const { items } = props;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {items.map((item) => {
        const precio = item.order ? props.getPricing(item.order) : null;
        const cambio = precioActualizado(item.precio, precio);
        const imagen = item.imagen
          ? (item.imagen.startsWith('http') ? item.imagen : props.resolveImage(item.imagen))
          : '';
        // Spec 038 (Fase N): la descripcion que repite el titulo no se pinta.
        const descripcion = descripcionVisible(item.titulo, item.descripcion);
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
              <OrigenBadge item={item} />
              {editando ? (
                <input
                  autoFocus
                  type="text"
                  defaultValue={item.titulo}
                  maxLength={80}
                  aria-label={'Nombre de tu diseno'}
                  className={'w-full text-xs font-semibold text-slate-800 border border-emerald-300 rounded px-1 py-0.5'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.currentTarget.blur(); }
                    if (e.key === 'Escape') { setEditando(null); }
                  }}
                  onBlur={(e) => {
                    setEditando(null);
                    const v = e.target.value.trim();
                    if (v && v !== item.titulo) props.onRenombrar?.(String(item.idea?.id ?? ''), v);
                  }}
                />
              ) : (
                <div className="flex items-start gap-1">
                  <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2 flex-1">{item.titulo}</p>
                  {item.origen === 'custom' && props.onRenombrar && (
                    <button
                      type="button"
                      aria-label={'Renombrar esta idea'}
                      onClick={() => setEditando(item.key)}
                      className={'shrink-0 text-slate-400 hover:text-emerald-600'}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              {descripcion && (
                <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">{descripcion}</p>
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
                  <Wand2 className="w-3.5" /> Usar
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
                    <Trash2 className="w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export const TiraIdeas: React.FC<TiraIdeasProps> = (props) => {
  const items = useMemo(() => tarjetas(props), [props]);
  const titulo = normalizarTitulo(props.titulo);
  // Tira del MOTOR DEL TEMA (spec 019/020): `MU.coleccion` la pinta con el tema
  // `cotizador`; sin motor quedan las tarjetas React de abajo (dependencia blanda).
  const tiraRef = useRef<HTMLDivElement | null>(null);
  const [motor, setMotor] = useState(false);
  const visor = useMotorVisor(items.length, motor);

  // Un solo lugar calcula el precio de un item (el visor y la tira no divergen).
  const pricingDe = (item: TiraItem) =>
    item.order ? props.getPricing(item.order, extractSheets(item.order)) : null;

  const datos = useMemo(
    () => items.map((item) => {
      const precio = pricingDe(item);
      const imagen = item.imagen
        ? (item.imagen.startsWith('http') ? item.imagen : props.resolveImage(item.imagen))
        : '';
      return {
        item,
        imagen,
        etiqueta: item.titulo,
        // Spec 038 (Fase N): comprado > guardado > promo > nada.
        categoria: categoriaTira(item.origen, precio ? precio.promo : null),
        // La descripcion que repite el titulo no se pinta.
        descripcion: descripcionVisible(item.titulo, item.descripcion),
        unidades: precio ? precio.totalStickers : undefined,
        precio: precioTira(precio),
        favorito: item.favorito,
      };
    }),
    // `props` cambia en cada render: la firma de abajo es la dependencia real.
    [items, props],
  );

  const firma = datos.map((d) => `${d.item.key}:${d.favorito ? 1 : 0}`).join('|');
  useEffect(() => {
    const el = tiraRef.current;
    if (!el || datos.length === 0) { setMotor(false); return; }
    setMotor(
      montarColeccion(el, {
        items: datos.map((d) => ({
          url: d.imagen,
          thumb: d.imagen,
          etiqueta: d.etiqueta,
          categoria: d.categoria,
          descripcion: d.descripcion,
          unidades: d.unidades,
          precio: d.precio,
          favorito: d.favorito,
          // Spec 038 (O): solo se puede borrar lo que guardo el cliente.
          eliminable: d.item.origen === 'custom',
          acciones: [{ etiqueta: 'Personalizar', onAccion: () => props.onUsar(d.item) }],
        })),
        layout: 'fila',
        navegable: true,
        preset: 'tarjeta',
        slots: {
          titulo: false, etiqueta: true, categoria: true, descripcion: true,
          precio: true, acciones: true, favorito: true, eliminar: true,
        },
        tamano: { ancho: 168, alto: 150 },
        onAbrir: (i: number) => abrir(i),
        onFavorito: props.onEstrella
          ? (i: number, valor: boolean) => {
            const it = datos[i] && datos[i].item;
            if (!it) return;
            props.onEstrella!(tipoDe(it), referencia(it), valor);
          }
          : undefined,
        // Spec 038 (O): la confirmacion la hace EL MOTOR (una sola, con el texto
        // correcto). Antes preguntaba el motor y otra vez el componente.
        confirmar: (i: number) => {
          const it = datos[i] && datos[i].item;
          if (!it || it.origen !== 'custom') return false;
          if (typeof window !== 'undefined' && !window.confirm('Borrar esta idea guardada?')) return false;
          return true;
        },
        onEliminar: props.onBorrar
          ? (i: number) => {
            const it = datos[i] && datos[i].item;
            if (!it || !it.idea) return;
            props.onBorrar!(it.idea.id);
          }
          : undefined,
      }),
    );
  }, [firma]);

  // Visor del MOTOR (spec 020 D26): tono claro + tema `cotizador` + filtro por
  // categoria (TODOS/GUARDADO/COMPRADO/PROMO). El titulo se puede editar si la
  // idea es del cliente (spec 038 D7).
  // Spec 020 (D26) + spec 038 (F5c): la META va POR ITEM. Antes se mandaba una sola
  // (la del item clickeado) y al navegar solo cambiaba la foto: titulo, descripcion,
  // precios y badge se quedaban clavados. `metaDeItem` solo lee `title`/`caption`.
  const metaItem = (x: (typeof datos)[number]): Record<string, unknown> => {
    const meta = metaDeItem(
      { title: x.item.titulo, caption: x.descripcion } as never,
      pricingDe(x.item),
      undefined,
    ) || {};
    if (x.item.origen === 'custom' && props.onRenombrar) meta.tituloEditable = true;
    return meta;
  };

  const abrir = (i: number) => {
    const d = datos[i];
    if (!d) return;
    const ok = abrirVisor({
      items: datos.map((x) => ({
        url: x.imagen,
        thumb: x.imagen,
        etiqueta: x.etiqueta,
        meta: metaItem(x),
      })),
      indice: i,
      titulo,
      filtros: 'categoria',
      tono: 'claro',
      tema: 'cotizador',
      // La accion usa el INDICE actual del visor (no el del click original): al
      // navegar, "Personalizar" carga la idea que se esta viendo.
      acciones: [{
        etiqueta: 'Personalizar',
        onAccion: (idx: number) => {
          const it = datos[idx] && datos[idx].item;
          cerrarVisor();
          if (it) props.onUsar(it);
        },
      }],
      onEditarTitulo: props.onRenombrar
        ? (idx: number, texto: string) => {
          const it = datos[idx] && datos[idx].item;
          if (it && it.idea) props.onRenombrar!(it.idea.id, texto);
        }
        : undefined,
      alCerrar: () => visor.cerrar(),
    });
    if (!ok) visor.abrir(i);
  };

  if (items.length === 0) return null;

  return (
    <section className={props.className} data-mu-tema="cotizador">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
        <span className="text-xs text-slate-500">
          {items.length} idea{items.length === 1 ? '' : 's'}
        </span>
      </div>
      <div ref={tiraRef} className={motor ? 'mu-gal-tira-cotizador' : 'hidden'} />
      {!motor && <TarjetasLegacy {...props} titulo={titulo} items={items} />}
    </section>
  );
};

export default TiraIdeas;
