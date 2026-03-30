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
}

export interface AnnotationHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
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
  const containerRef = useRef<HTMLDivElement>(null);

  const getRelativePoint = (e: React.PointerEvent<HTMLDivElement>): AnnotationPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const safeAnnotations = annotations || EMPTY_ANNOTATION;

  const updateAnnotations = (updater: (prev: PatternAnnotationData) => PatternAnnotationData) => {
    if (!onAnnotationChange) return;
    onAnnotationChange(updater(safeAnnotations));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === 'none') return;
    const point = getRelativePoint(e);

    if (tool === 'pen') {
      setDrawingStroke([point]);
    }

    if (tool === 'highlight') {
      setHighlightStart(point);
      setDrawingHighlight({ x: point.x, y: point.y, width: 0, height: 0 });
    }

    if (tool === 'note') {
      updateAnnotations((prev) => ({
        ...prev,
        notes: [
          ...prev.notes,
          {
            id: crypto.randomUUID(),
            x: point.x,
            y: point.y,
            text: t('pattern.newNote'),
          },
        ],
      }));
    }

    if (tool === 'text') {
      const newId = crypto.randomUUID();
      updateAnnotations((prev) => ({
        ...prev,
        texts: [
          ...(prev.texts || []),
          {
            id: newId,
            x: point.x,
            y: point.y,
            text: '',
          },
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
      setDrawingHighlight({ x, y, width, height });
    }
  };

  const handlePointerUp = () => {
    if (tool === 'pen' && drawingStroke && drawingStroke.length > 1) {
      updateAnnotations((prev) => ({ ...prev, strokes: [...prev.strokes, { points: drawingStroke }] }));
    }
    if (tool === 'highlight' && drawingHighlight && drawingHighlight.width > 0.2 && drawingHighlight.height > 0.2) {
      updateAnnotations((prev) => ({ ...prev, highlights: [...prev.highlights, drawingHighlight] }));
    }

    setDrawingStroke(null);
    setDrawingHighlight(null);
    setHighlightStart(null);
  };

  const clearAnnotations = () => {
    onAnnotationChange?.(EMPTY_ANNOTATION);
  };

  const allStrokes = drawingStroke ? [...safeAnnotations.strokes, { points: drawingStroke }] : safeAnnotations.strokes;
  const allHighlights = drawingHighlight ? [...safeAnnotations.highlights, drawingHighlight] : safeAnnotations.highlights;

  const isDrawingTool = tool !== 'none';

  return (
    <div className="relative w-full h-full min-h-[400px] bg-muted/20 rounded-2xl overflow-hidden">
      <TransformWrapper initialScale={1} minScale={0.5} maxScale={5} centerOnInit disabled={isDrawingTool}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <AnnotationToolbar
              activeTool={tool}
              onToolChange={setTool}
              onClear={clearAnnotations}
              onSave={() => onSaveAnnotation?.()}
              saving={savingAnnotation}
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
                style={{ touchAction: isDrawingTool ? 'none' : 'auto' }}
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

                <div
                  className="absolute inset-0"
                  style={{ touchAction: 'none', pointerEvents: isDrawingTool ? 'auto' : 'none' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {allHighlights.map((h, idx) => (
                      <rect
                        key={`h-${idx}`}
                        x={h.x}
                        y={h.y}
                        width={h.width}
                        height={h.height}
                        className="fill-primary/20 stroke-primary/60"
                        strokeWidth="0.3"
                      />
                    ))}

                    {allStrokes.map((stroke, idx) => (
                      <polyline
                        key={`s-${idx}`}
                        points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="0.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>

                  {safeAnnotations.notes.map((note) => (
                    <textarea
                      key={note.id}
                      value={note.text}
                      onChange={(e) => {
                        const text = e.target.value;
                        updateAnnotations((prev) => ({
                          ...prev,
                          notes: prev.notes.map((n) => (n.id === note.id ? { ...n, text } : n)),
                        }));
                      }}
                      className="absolute text-xs bg-background/90 border border-border/60 rounded p-1.5 w-28 min-h-14 resize-none"
                      style={{ left: `${note.x}%`, top: `${note.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}
                    />
                  ))}

                  {(safeAnnotations.texts || []).map((txt) => (
                    <div
                      key={txt.id}
                      className="absolute"
                      style={{ left: `${txt.x}%`, top: `${txt.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}
                    >
                      {editingTextId === txt.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={txt.text}
                          onChange={(e) => {
                            const text = e.target.value;
                            updateAnnotations((prev) => ({
                              ...prev,
                              texts: (prev.texts || []).map((t) => (t.id === txt.id ? { ...t, text } : t)),
                            }));
                          }}
                          onBlur={() => setEditingTextId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingTextId(null)}
                          className="text-sm font-medium bg-primary/10 border border-primary/30 rounded px-2 py-0.5 min-w-[60px] outline-none focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        <span
                          className="text-sm font-medium text-primary cursor-pointer bg-background/80 rounded px-1.5 py-0.5 border border-primary/20"
                          onClick={() => setEditingTextId(txt.id)}
                        >
                          {txt.text || '点击编辑'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

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
