import React from 'react';
import { Info, ChevronUp, ChevronDown, ImageIcon } from 'lucide-react';
import type { ShapesCatalog, A4Layout, Order } from '../types';
import StepSection, { StepSectionRef } from './StepSection';
import OptionInfoPanel from './OptionInfoPanel';
import { NumberInput } from './NumberInput';

interface ShapeSizeSelectorProps {
  order: Order;
  setOrder: (order: Order | ((prev: Order) => Order)) => void;
  shapesCatalog: ShapesCatalog;
  shapesShowMoreIndex: Record<string, number> | null;
  customRectMath: A4Layout;
  expandedShapesCategory: string | null;
  infoOpenSizeIndex: number | null;
  infoBtnClass: (active: boolean) => string;
  setExpandedShapesCategory: (category: string | null) => void;
  setInfoOpenSizeIndex: (index: number | null) => void;
  resolveImage: (src: string) => string;
  activeStep: 0 | 1 | 2 | 3;
  onStepOpen?: () => void;
  onNavigateToNext?: () => void;
  rectCalcMode: 'preciso' | 'economico';
  shouldScrollOnMount: boolean;
}

export const ShapeSizeSelector: React.FC<ShapeSizeSelectorProps> = ({
  order,
  setOrder,
  shapesCatalog,
  shapesShowMoreIndex,
  customRectMath,
  expandedShapesCategory,
  infoOpenSizeIndex,
  infoBtnClass,
  setExpandedShapesCategory,
  setInfoOpenSizeIndex,
  resolveImage,
  activeStep,
  onStepOpen,
  onNavigateToNext,
  rectCalcMode,
  shouldScrollOnMount,
}) => {
  const stepRef = React.useRef<StepSectionRef>(null);
  const sizeText = order.shapeType === 'Rectangulares'
    ? `${order.customRectW}x${order.customRectH}cm`
    : shapesCatalog?.[order.shapeType]?.[order.sizeIndex]?.size || '';

  // Función centralizada para obtener límites según modo
  const getSheetLimits = () => {
    return {
      sheetW: rectCalcMode === 'preciso' ? 20.3 : 21,
      sheetH: rectCalcMode === 'preciso' ? 27.1 : 29.7,
    };
  };

  // El valor crudo se guarda tal cual: se permite tipear cualquier número y la
  // advertencia (mínimo/máximo/no entra) se muestra en el bloque inferior.
  const handleRectChange = (field: 'customRectW' | 'customRectH', value: string) => {
    setOrder({ ...order, [field]: value });
  };

  const RECT_MIN_CM = 2;

  // Devuelve el mensaje de advertencia para las medidas, o null si son válidas.
  const getRectValidation = (): string | null => {
    const wRaw = String(order.customRectW ?? '').trim();
    const hRaw = String(order.customRectH ?? '').trim();
    if (wRaw === '' || hRaw === '') return 'Ingresá ANCHO y ALTO para calcular.';
    const w = parseFloat(wRaw);
    const h = parseFloat(hRaw);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return 'Ingresá ANCHO y ALTO numéricos y mayores a 0.';
    }
    const { sheetH } = getSheetLimits();
    if (w < RECT_MIN_CM || h < RECT_MIN_CM) return `El mínimo es ${RECT_MIN_CM} cm por lado.`;
    if (w > sheetH || h > sheetH) return `El máximo es ${sheetH} cm por lado (hoja A4).`;
    if (customRectMath.qty === 0) return 'Esas medidas no entran en la hoja A4. Probá achicarlas.';
    return null;
  };

  // Formatea cm con 1 decimal, sin ceros sobrantes (5,25 -> "5,3"; 5 -> "5").
  const fmtCm = (v?: number): string =>
    v == null ? '' : String(Number(v.toFixed(1))).replace('.', ',');

  // Determinar si el paso está completado
  const isStepComplete = !!order.shapeType && (
    order.shapeType === 'Rectangulares'
      ? !!order.customRectW && !!order.customRectH
      : order.sizeIndex >= 0
  );

  const isOpen = activeStep === 2;
  const isDone = isStepComplete;
  // Solo se suprime el scroll en el PRIMER render (mount).
  // Antes se usaba `hasScrolledRef` como "ya scrolleé alguna vez", así que la
  // primera apertura del paso (al tocar "Continuar") no bajaba hasta el
  // contenido y había que volver a tocar el paso para que scrolleara.
  const isFirstRenderRef = React.useRef(true);

  // Scroll automático cuando se abre este paso.
  React.useEffect(() => {
    const isFirstRender = isFirstRenderRef.current;
    isFirstRenderRef.current = false;
    if (!isOpen || !stepRef.current) return;
    // En el mount inicial no se scrollea salvo que vengamos de un link `?o=`.
    if (isFirstRender && !shouldScrollOnMount) return;
    stepRef.current.scrollTo();
  }, [isOpen, shouldScrollOnMount]);

  // Manejador para seleccionar forma/tamaño y avanzar al paso 3
  const handleShapeTypeChange = (shape: string) => {
    setOrder({ ...order, shapeType: shape, sizeIndex: -1 });
    setInfoOpenSizeIndex(null);
  };

  const handleSizeSelect = (idx: number) => {
    setOrder({ ...order, sizeIndex: idx });
    // Si el panel de info está abierto, actualizarlo para mostrar la nueva selección
    if (infoOpenSizeIndex !== null) {
      setInfoOpenSizeIndex(idx);
    }
  };

  // Ajustar valores automáticamente al cambiar entre modos
  // OPTIMIZACIÓN: Solo ejecutar cuando cambia rectCalcMode, no en cada cambio de input
  React.useEffect(() => {
    const w = parseFloat(String(order.customRectW));
    const h = parseFloat(String(order.customRectH));

    if (w > 0 || h > 0) {
      const { sheetW, sheetH } = getSheetLimits();

      // Ajustar valores si exceden los límites del nuevo modo
      let newW = order.customRectW;
      let newH = order.customRectH;

      // Ajustar si excede el ALTO de la hoja (límite máximo)
      if (w > sheetH) {
        newW = String(sheetH);
      }
      if (h > sheetH) {
        newH = String(sheetH);
      }

      if (newW !== order.customRectW || newH !== order.customRectH) {
        setOrder({ ...order, customRectW: newW, customRectH: newH });
      }
    }
  }, [rectCalcMode]); // Solo depende de rectCalcMode


  return (
    <StepSection
      ref={stepRef}
      index={2}
      title="Forma y Tamaño"
      summary={`${order.shapeType} · ${sizeText}`}
      isOpen={isOpen}
      isDone={isDone}
      onOpen={() => onStepOpen?.()}
    >
      {/* Selector de tipo de forma */}
      <div className="flex cl-gap-sm cl-mb-lg cl-p-sm overflow-x-auto">
        {['Circulares', 'Rectangulares', 'A Medida'].map((shape) => {
          // Map "A Medida" to "Formas" for shapesCatalog lookup
          const catalogKey = shape === 'A Medida' ? 'Formas' : shape;
          return (
            <button key={shape} onClick={() => handleShapeTypeChange(catalogKey)}
              className={`flex-1 py-3 sm:py-2.5 px-3 text-sm font-semibold cl-rounded-md cl-transition-all whitespace-nowrap ${order.shapeType === catalogKey ? 'cl-shape-selector-button-selected' : 'cl-shape-selector-button'}`}>
              {shape}
            </button>
          );
        })}
      </div>

      {/* Contenido condicional según la forma */}
      {order.shapeType === 'Rectangulares' ? (

        // VISTA PARA RECTANGULARES (Personalizado y Canvas A4)
        <div className="flex flex-col cl-flex-row-from-480 cl-gap-lg items-center sm:items-start cl-p-lg   p-0">
          <div className="flex-1 space-y-4 w-full">
            <p className="text-sm text-slate-600 font-medium">Ingresá las medidas del sticker:</p>
            <div className="flex flex-col sm:grid sm:grid-cols-2 cl-gap-md">
              <div>
                <label className="block text-xs font-bold text-slate-500 cl-mb-sm uppercase">Ancho (cm)</label>
                <NumberInput
                  value={order.customRectW}
                  onChange={(value) => handleRectChange('customRectW', value)}
                  step={0.5}
                  min={2}
                  max={rectCalcMode === 'preciso' ? 27.1 : 29.7}
                  clampOnBlur={false}
                  className="py-3 sm:py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 cl-mb-sm uppercase">Alto (cm)</label>
                <NumberInput
                  value={order.customRectH}
                  onChange={(value) => handleRectChange('customRectH', value)}
                  step={0.5}
                  min={2}
                  max={rectCalcMode === 'preciso' ? 27.1 : 29.7}
                  clampOnBlur={false}
                  className="py-3 sm:py-2"
                />
              </div>
            </div>

            <div className="cl-bg-blue-50 cl-p-md cl-rounded-xl cl-border-sm flex flex-col sm:flex-row items-start cl-gap-md mt-4">
              <div className="flex-1">
                <div className="text-sm font-bold text-blue-900">Calculador A4 Inteligente</div>

                {/* Toggle de modo */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setOrder({ ...order, rectCalcMode: 'preciso' })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${rectCalcMode === 'preciso' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  >
                    Preciso
                  </button>
                  <button
                    onClick={() => setOrder({ ...order, rectCalcMode: 'economico' })}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${rectCalcMode === 'economico' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                  >
                    Económico
                  </button>
                </div>

                {/* Detalles según el modo */}
                <div className="mt-2 text-xs text-blue-700">
                  {(() => {
                    const error = getRectValidation();
                    if (error) return <div>{error}</div>;
                    return (
                      <>
                        {rectCalcMode === 'preciso' ? (
                          <div>
                            En modo Preciso{customRectMath.sheetRotated ? ' (hoja rotada)' : ''} entran <strong>{customRectMath.qty}</strong> unidades de {String(order.customRectW).replace('.', ',')}x{String(order.customRectH).replace('.', ',')}cm por plancha.
                          </div>
                        ) : (
                          <div>
                            En modo Económico{customRectMath.sheetRotated ? ' (hoja rotada)' : ''} entran <strong>{customRectMath.qty}</strong> unidades de {fmtCm(customRectMath.exactW)}x{fmtCm(customRectMath.exactH)}cm por plancha.
                            <div className="mt-1 text-blue-600">Se ajusta hasta 5 mm para aprovechar la hoja (no es un margen blanco).</div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Representación Visual de la Hoja */}
              <div className="w-32 h-32 relative flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                {customRectMath.qty > 0 ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Hoja A4 - dimensiones según rotación, sin transform CSS */}
                    <div
                      className="bg-slate-100 cl-border-md cl-rounded-md cl-shadow-sm relative flex flex-col items-center justify-center"
                      style={{
                        width: customRectMath.sheetRotated ? '128px' : '88px',
                        height: customRectMath.sheetRotated ? '88px' : '128px',
                      }}
                    >
                      <div className="absolute top-1 left-2 text-[8px] text-slate-400 font-bold uppercase">Hoja A4</div>

                      {/* Línea guía - contenedor del espacio disponible según modo */}
                      <div
                        className="relative flex items-center justify-center border-2"
                        style={{
                          width: customRectMath.sheetRotated
                            ? (rectCalcMode === 'preciso' ? '113px' : '128px')
                            : (rectCalcMode === 'preciso' ? '85px' : '88px'),
                          height: customRectMath.sheetRotated
                            ? (rectCalcMode === 'preciso' ? '85px' : '88px')
                            : (rectCalcMode === 'preciso' ? '113px' : '128px'),
                          borderColor: rectCalcMode === 'preciso' ? '#94a3b8' : '#cbd5e1',
                          borderStyle: rectCalcMode === 'preciso' ? 'dashed' : 'solid',
                          borderWidth: rectCalcMode === 'preciso' ? '2px' : '2px',
                        }}
                      >
                        {/* Sticker con proporciones correctas según valores ingresados por usuario */}
                        {customRectMath.renderW > 0 && customRectMath.renderH > 0 && (
                          <div
                            className="bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center"
                            style={{
                              width: `${(customRectMath.renderW / (customRectMath.sheetRotated ? (rectCalcMode === 'preciso' ? 27.1 : 29.7) : (rectCalcMode === 'preciso' ? 20.3 : 21))) * (customRectMath.sheetRotated ? (rectCalcMode === 'preciso' ? 113 : 128) : (rectCalcMode === 'preciso' ? 85 : 88))}px`,
                              height: `${(customRectMath.renderH / (customRectMath.sheetRotated ? (rectCalcMode === 'preciso' ? 20.3 : 21) : (rectCalcMode === 'preciso' ? 27.1 : 29.7))) * (customRectMath.sheetRotated ? (rectCalcMode === 'preciso' ? 85 : 88) : (rectCalcMode === 'preciso' ? 113 : 128))}px`,
                            }}
                          >
                            <ImageIcon className="w-3 h-3 text-blue-600/50" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center">Ingresá medidas</div>
                )}
              </div>
            </div>
          </div>
        </div>

      ) : (

        // VISTA PARA CIRCULARES Y FORMAS (Catálogo con imágenes)
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 cl-gap-md">
            {(() => {
              const catalog = shapesCatalog[order.shapeType] || [];
              const visibleShapes = catalog.filter((s) => s.visible !== false);
              return visibleShapes.map((s, visibleIdx) => {
              const originalIdx = catalog.indexOf(s);
              const showMoreIdx = shapesShowMoreIndex?.[order.shapeType] ?? catalog.length;
              const isHidden = originalIdx >= showMoreIdx && expandedShapesCategory !== order.shapeType;
              if (isHidden) return null;

              // Solo se muestra imagen si el tamaño tiene una cargada. Antes se
              // generaba "2_x_y.png", que en /cotizador/ daba 404 siempre.
              const imagePath = s.image ? resolveImage(s.image) : '';

              const hasInfo = !!(s.description || s.image);
              return (
                <div key={originalIdx} className="relative">
                  <button onClick={() => handleSizeSelect(originalIdx)}
                    className={`w-full h-full cl-option-card flex flex-col items-center justify-center min-h-[110px] sm:min-h-[100px] text-center p-3 sm:p-4 ${order.sizeIndex === originalIdx ? 'cl-option-card-selected' : ''} active:scale-95 transition-transform`}>

                    <div className="w-12 h-12 cl-mb-sm flex items-center justify-center opacity-80">
                      {imagePath && (
                        <img
                          src={imagePath}
                          alt={s.size}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className={`absolute -z-10 w-8 h-8 cl-border-md border-slate-200 border-dashed ${order.shapeType === 'Circulares' ? 'cl-rounded-full' : order.shapeType === 'A Medida' ? 'cl-star-shape' : 'cl-rounded-full'}`}></div>
                    </div>

                    {order.sizeIndex === originalIdx && <div className="absolute inset-0 border-2 border-blue-600 rounded-xl pointer-events-none"></div>}
                    <div className="font-bold text-slate-500">{s.size}</div>
                    <div className="text-xs mt-0.5 font-medium text-slate-500">{s.qty} uni/plancha</div>
                  </button>
                  {hasInfo && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setInfoOpenSizeIndex(infoOpenSizeIndex === originalIdx ? null : originalIdx); }}
                      className={infoBtnClass(infoOpenSizeIndex === originalIdx)}
                      title="Más info"
                      aria-label={`Más info sobre ${s.size}`}
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            });
            })()}
          </div>

          {/* Botón "Ver más" si hay tamaños visibles por debajo de la línea */}
          {(() => {
            const catalog = shapesCatalog[order.shapeType] || [];
            const showMoreIdx = shapesShowMoreIndex?.[order.shapeType] ?? catalog.length;
            // Cuenta los tamaños que el cliente no ve por la línea "Ver más".
            // Antes se exigía además que hubiera tamaños con visible=false, así
            // que con todos visibles el botón no aparecía y los tamaños de abajo
            // quedaban inaccesibles (bug real con los datos de producción).
            const hiddenByLine = catalog.filter((s, idx) => s.visible !== false && idx >= showMoreIdx).length;
            return (
              hiddenByLine > 0 && (
                <button
                  onClick={() => setExpandedShapesCategory(expandedShapesCategory === order.shapeType ? null : order.shapeType)}
                  className="w-full py-3 sm:py-2.5 cl-rounded-xl cl-border-sm text-slate-600 font-semibold text-sm hover:bg-slate-50 cl-transition-colors flex items-center justify-center cl-gap-md active:bg-slate-100"
                >
                  {expandedShapesCategory === order.shapeType ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {expandedShapesCategory === order.shapeType ? 'Ocultar tamaños' : `Ver más (${hiddenByLine})`}
                </button>
              )
            );
          })()}

          {/* Motor de info: panel "MÁS INFO" del tamaño elegido / consultado. */}
          {(() => {
            const catalog = shapesCatalog[order.shapeType] || [];
            const expandedIdx = infoOpenSizeIndex;
            const selIdx = order.sizeIndex;
            const idx = expandedIdx != null
              ? expandedIdx
              : (selIdx >= 0 && catalog[selIdx] && (catalog[selIdx].description || catalog[selIdx].image) ? selIdx : -1);
            const item = idx >= 0 ? catalog[idx] : null;
            if (!item) return null;
            return (
              <OptionInfoPanel
                option={{ name: `${order.shapeType} ${item.size}`, description: item.description, image: item.image }}
                isOpen={expandedIdx === idx}
                onToggle={() => setInfoOpenSizeIndex(infoOpenSizeIndex === idx ? null : idx)}
                resolveImage={resolveImage}
              />
            );
          })()}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onNavigateToNext}
          disabled={!isStepComplete}
          className="cl-button-primary-small disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continuar
        </button>
      </div>

    </StepSection>
  );
};
