import { useState, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';
import { AnnotationToolbar, type AnnotationTool } from './AnnotationToolbar';

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationStroke {
  points: AnnotationPoint[];
  color?: string;
}

export interface AnnotationHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface AnnotationNote {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface AnnotationText {
  id: string;
  x: number;
  y: number;
  text: string;
  color?: string;
}

export interface PatternAnnotationData {
  strokes: AnnotationStroke[];
  highlights: AnnotationHighlight[];
  notes: AnnotationNote[];
  texts?: AnnotationText[];
}

interface PatternViewerProps {
  imageUrl: string;
  highlightRegion?: { x: number; y: number; width: number; height: number } | null;
  annotations?: PatternAnnotationData | null;
  onAnnotationChange?: (data: PatternAnnotationData) => void;
  onSaveAnnotation?: () => void;
  savingAnnotation?: boolean;
}

const EMPTY_ANNOTATION: PatternAnnotationData = {
  strokes: [],
  highlights: [],
  notes: [],
  texts: [],
};

export function PatternViewer({
  imageUrl,
  highlightRegion,
  annotations = EMPTY_ANNOTATION,
  onAnnotationChange,
  onSaveAnnotation,
  savingAnnotation,
}: PatternViewerProps) {
  const { t } = useI18n();
  const [tool, setTool] = useState<AnnotationTool>('none');
  const [drawingStroke, setDrawingStroke] = useState<AnnotationPoint[] | null>(null);
  const [drawingHighlight, setDrawingHighlight] = useState<AnnotationHighlight | null>(null);
  const [highlightStart, setHighlightStart] = useState<AnnotationPoint | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [annotationColor, setAnnotationColor] = useState('#6366f1');
  const containerRef = useRef<HTMLDivElement>(null);

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<PatternAnnotationData[]>([]);
  const [redoStack, setRedoStack] = useState<PatternAnnotationData[]>([]);

  const getRelativePoint = (e: React.PointerEvent<HTMLDivElement>): AnnotationPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const safeAnnotations = annotations || EMPTY_ANNOTATION;

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-49), safeAnnotations]);
    setRedoStack([]);
  }, [safeAnnotations]);

  const updateAnnotations = useCallback((updater: (prev: PatternAnnotationData) => PatternAnnotationData, addToHistory = true) => {
    if (!onAnnotationChange) return;
    if (addToHistory) {
      setUndoStack((prev) => [...prev.slice(-49), safeAnnotations]);
      setRedoStack([]);
    }
    onAnnotationChange(updater(safeAnnotations));
  }, [onAnnotationChange, safeAnnotations]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, safeAnnotations]);
    onAnnotationChange?.(prev);
  }, [undoStack, safeAnnotations, onAnnotationChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, safeAnnotations]);
    onAnnotationChange?.(next);
  }, [redoStack, safeAnnotations, onAnnotationChange]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === 'none' || tool === 'eraser') return;
    const point = getRelativePoint(e);

    if (tool === 'pen') {
      setDrawingStroke([point]);
    }

    if (tool === 'highlight') {
      setHighlightStart(point);
      setDrawingHighlight({ x: point.x, y: point.y, width: 0, height: 0, color: annotationColor });
    }

    if (tool === 'note') {
      updateAnnotations((prev) => ({
        ...prev,
        notes: [
          ...prev.notes,
          { id: crypto.randomUUID(), x: point.x, y: point.y, text: t('pattern.newNote') },
        ],
      }));
    }

    if (tool === 'text') {
      const newId = crypto.randomUUID();
      updateAnnotations((prev) => ({
        ...prev,
        texts: [
          ...(prev.texts || []),
          { id: newId, x: point.x, y: point.y, text: '', color: annotationColor },
        ],
      }));
      setEditingTextId(newId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const point = getRelativePoint(e);

    if (tool === 'pen' && drawingStroke) {
      setDrawingStroke([...drawingStroke, point]);
    }

    if (tool === 'highlight' && highlightStart) {
      const x = Math.min(highlightStart.x, point.x);
      const y = Math.min(highlightStart.y, point.y);
      const width = Math.abs(point.x - highlightStart.x);
      const height = Math.abs(point.y - highlightStart.y);
      setDrawingHighlight({ x, y, width, height, color: annotationColor });
    }
  };

  const handlePointerUp = () => {
    if (tool === 'pen' && drawingStroke && drawingStroke.length > 1) {
      updateAnnotations((prev) => ({ ...prev, strokes: [...prev.strokes, { points: drawingStroke, color: annotationColor }] }));
    }
    if (tool === 'highlight' && drawingHighlight && drawingHighlight.width > 0.2 && drawingHighlight.height > 0.2) {
      updateAnnotations((prev) => ({ ...prev, highlights: [...prev.highlights, drawingHighlight] }));
    }

    setDrawingStroke(null);
    setDrawingHighlight(null);
    setHighlightStart(null);
  };

  const clearAnnotations = () => {
    if (!confirm('确定要清空全部标注吗？')) return;
    pushUndo();
    onAnnotationChange?.(EMPTY_ANNOTATION);
  };

  // Eraser: delete specific element by index
  const eraseStroke = (idx: number) => {
    updateAnnotations((prev) => ({ ...prev, strokes: prev.strokes.filter((_, i) => i !== idx) }));
  };
  const eraseHighlight = (idx: number) => {
    updateAnnotations((prev) => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== idx) }));
  };
  const eraseNote = (id: string) => {
    updateAnnotations((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== id) }));
  };
  const eraseText = (id: string) => {
    updateAnnotations((prev) => ({ ...prev, texts: (prev.texts || []).filter((t) => t.id !== id) }));
  };

  // Handle text blur: remove empty texts
  const handleTextBlur = (txtId: string) => {
    setEditingTextId(null);
    const txt = (safeAnnotations.texts || []).find((t) => t.id === txtId);
    if (txt && !txt.text.trim()) {
      // Remove empty text without adding to undo (was just created)
      onAnnotationChange?.({
        ...safeAnnotations,
        texts: (safeAnnotations.texts || []).filter((t) => t.id !== txtId),
      });
    }
  };

  const allStrokes = drawingStroke ? [...safeAnnotations.strokes, { points: drawingStroke, color: annotationColor }] : safeAnnotations.strokes;
  const allHighlights = drawingHighlight ? [...safeAnnotations.highlights, drawingHighlight] : safeAnnotations.highlights;

  const isDrawingTool = tool === 'pen' || tool === 'highlight' || tool === 'note' || tool === 'text';
  const isEraserTool = tool === 'eraser';

  return (
    <div className="relative w-full h-full min-h-[400px] bg-muted/20 rounded-2xl overflow-hidden">
      <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit disabled={isDrawingTool || isEraserTool}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <AnnotationToolbar
              activeTool={tool}
              onToolChange={setTool}
              onClearAll={clearAnnotations}
              onSave={() => onSaveAnnotation?.()}
              saving={savingAnnotation}
              color={annotationColor}
              onColorChange={setAnnotationColor}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
            />
            <div className="absolute top-3 right-3 z-20 flex gap-1">
              <Button variant="glass" size="icon" onClick={() => zoomIn()}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="glass" size="icon" onClick={() => zoomOut()}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="glass" size="icon" onClick={() => resetTransform()}>
                <Maximize className="w-4 h-4" />
              </Button>
            </div>

            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
              <div
                ref={containerRef}
                className="relative inline-block select-none"
                style={{ touchAction: (isDrawingTool || isEraserTool) ? 'none' : 'auto' }}
              >
                <img
                  src={imageUrl}
                  alt="Pattern"
                  className="block max-w-full max-h-[70vh]"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const parent = img.parentElement;
                    if (parent) {
                      parent.style.width = `${img.offsetWidth}px`;
                      parent.style.height = `${img.offsetHeight}px`;
                    }
                  }}
                />

                {/* Drawing capture layer */}
                <div
                  className="absolute inset-0"
                  style={{ touchAction: 'none', pointerEvents: isDrawingTool ? 'auto' : 'none', zIndex: 10 }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {allHighlights.map((h, idx) => (
                      <rect
                        key={`h-${idx}`}
                        x={h.x} y={h.y} width={h.width} height={h.height}
                        fill={`${h.color || '#6366f1'}33`}
                        stroke={`${h.color || '#6366f1'}99`}
                        strokeWidth="0.3"
                      />
                    ))}
                    {allStrokes.map((stroke, idx) => (
                      <polyline
                        key={`s-${idx}`}
                        points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={stroke.color || 'hsl(var(--primary))'}
                        strokeWidth="0.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>
                </div>

                {/* Eraser layer - renders clickable SVG elements */}
                {isEraserTool && (
                  <div
                    className="absolute inset-0"
                    style={{ touchAction: 'none', pointerEvents: 'auto', zIndex: 15, cursor: 'crosshair' }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {safeAnnotations.highlights.map((h, idx) => (
                        <rect
                          key={`eh-${idx}`}
                          x={h.x} y={h.y} width={h.width} height={h.height}
                          fill="transparent" stroke="transparent" strokeWidth="1"
                          style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                          onClick={(e) => { e.stopPropagation(); eraseHighlight(idx); }}
                        />
                      ))}
                      {safeAnnotations.strokes.map((stroke, idx) => (
                        <polyline
                          key={`es-${idx}`}
                          points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none" stroke="transparent" strokeWidth="2"
                          style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                          onClick={(e) => { e.stopPropagation(); eraseStroke(idx); }}
                        />
                      ))}
                    </svg>
                  </div>
                )}

                {/* Notes - always interactive */}
                {safeAnnotations.notes.map((note) => (
                  <div
                    key={note.id}
                    className="absolute"
                    style={{ left: `${note.x}%`, top: `${note.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto', zIndex: 20 }}
                  >
                    {isEraserTool ? (
                      <div
                        className="text-xs bg-background/90 border border-destructive/60 rounded p-1.5 w-28 min-h-14 cursor-crosshair flex items-center justify-center text-destructive"
                        onClick={() => eraseNote(note.id)}
                      >
                        点击删除
                      </div>
                    ) : (
                      <textarea
                        value={note.text}
                        onChange={(e) => {
                          const text = e.target.value;
                          updateAnnotations((prev) => ({
                            ...prev,
                            notes: prev.notes.map((n) => (n.id === note.id ? { ...n, text } : n)),
                          }), false);
                        }}
                        className="text-xs bg-background/90 border border-border/60 rounded p-1.5 w-28 min-h-14 resize-none"
                      />
                    )}
                  </div>
                ))}

                {/* Text annotations - always interactive */}
                {(safeAnnotations.texts || []).map((txt) => (
                  <div
                    key={txt.id}
                    className="absolute"
                    style={{ left: `${txt.x}%`, top: `${txt.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto', zIndex: 20 }}
                  >
                    {isEraserTool ? (
                      <span
                        className="text-sm font-medium text-destructive cursor-crosshair bg-background/80 rounded px-1.5 py-0.5 border border-destructive/40"
                        onClick={() => eraseText(txt.id)}
                      >
                        {txt.text || '点击删除'}
                      </span>
                    ) : editingTextId === txt.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={txt.text}
                        onChange={(e) => {
                          const text = e.target.value;
                          onAnnotationChange?.({
                            ...safeAnnotations,
                            texts: (safeAnnotations.texts || []).map((t) => (t.id === txt.id ? { ...t, text } : t)),
                          });
                        }}
                        onBlur={() => handleTextBlur(txt.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleTextBlur(txt.id)}
                        className="text-sm font-medium bg-primary/10 border border-primary/30 rounded px-2 py-0.5 min-w-[60px] outline-none focus:ring-1 focus:ring-primary"
                        style={{ color: txt.color || annotationColor }}
                      />
                    ) : (
                      <span
                        className="text-sm font-medium cursor-pointer bg-background/80 rounded px-1.5 py-0.5 border border-primary/20"
                        style={{ color: txt.color || '#6366f1' }}
                        onClick={() => setEditingTextId(txt.id)}
                      >
                        {txt.text || '点击编辑'}
                      </span>
                    )}
                  </div>
                ))}

                {highlightRegion && (
                  <div
                    className="absolute border-2 border-primary/60 bg-primary/10 rounded-lg pointer-events-none animate-pulse"
                    style={{
                      left: `${highlightRegion.x}%`,
                      top: `${highlightRegion.y}%`,
                      width: `${highlightRegion.width}%`,
                      height: `${highlightRegion.height}%`,
                    }}
                  />
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
