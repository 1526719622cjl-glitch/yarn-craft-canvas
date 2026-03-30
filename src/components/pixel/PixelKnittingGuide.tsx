import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/i18n/useI18n';
import type { PixelCell } from '@/store/useYarnCluesStore';
import type { KnittingProgress } from '@/hooks/usePixelDesigns';

interface PixelKnittingGuideProps {
  pixelGrid: PixelCell[];
  gridWidth: number;
  gridHeight: number;
  onClose: () => void;
  designId?: string;
  initialProgress?: KnittingProgress;
  onSaveProgress?: (progress: KnittingProgress) => void;
}

export function PixelKnittingGuide({ pixelGrid, gridWidth, gridHeight, onClose, designId, initialProgress, onSaveProgress }: PixelKnittingGuideProps) {
  const { t } = useI18n();
  const [currentRow, setCurrentRow] = useState(
    initialProgress?.currentRow != null && initialProgress.currentRow >= 0
      ? initialProgress.currentRow
      : gridHeight - 1
  );
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(
    new Set(initialProgress?.highlightedCells || [])
  );
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rows = useMemo(() => {
    const result: PixelCell[][] = [];
    for (let y = 0; y < gridHeight; y++) {
      result.push(pixelGrid.filter(c => c.y === y).sort((a, b) => a.x - b.x));
    }
    return result;
  }, [pixelGrid, gridHeight]);

  const currentRowSequence = useMemo(() => {
    const row = rows[currentRow] || [];
    if (row.length === 0) return [];
    const sequence: { color: string; count: number }[] = [];
    let currentColor = row[0]?.color;
    let currentCount = 0;
    for (const cell of row) {
      if (cell.color === currentColor) {
        currentCount++;
      } else {
        sequence.push({ color: currentColor, count: currentCount });
        currentColor = cell.color;
        currentCount = 1;
      }
    }
    if (currentCount > 0) {
      sequence.push({ color: currentColor, count: currentCount });
    }
    return sequence;
  }, [rows, currentRow]);

  const progressPercent = useMemo(() => {
    const completedRows = gridHeight - currentRow;
    return Math.round((completedRows / gridHeight) * 100);
  }, [currentRow, gridHeight]);

  const handleCellClick = useCallback((x: number, y: number) => {
    const key = `${x},${y}`;
    setHighlightedCells(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleCellLongPressStart = useCallback((x: number, y: number) => {
    longPressTimer.current = setTimeout(() => {
      const key = `${x},${y}`;
      setHighlightedCells(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    }, 400);
  }, []);

  const handleCellLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleSave = useCallback(() => {
    if (onSaveProgress) {
      onSaveProgress({
        currentRow,
        highlightedCells: Array.from(highlightedCells),
      });
    }
  }, [currentRow, highlightedCells, onSaveProgress]);

  // Auto-save on close
  const handleClose = useCallback(() => {
    handleSave();
    onClose();
  }, [handleSave, onClose]);

  const cellSize = Math.min(Math.floor((window.innerWidth - 80) / gridWidth), 24);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold">{t('pixel.knittingGuide')}</h2>
        <div className="flex items-center gap-2">
          {onSaveProgress && (
            <Button variant="outline" size="sm" onClick={handleSave} className="rounded-xl gap-1.5">
              <Save className="w-4 h-4" />
              保存进度
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">编织进度</span>
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs font-medium text-primary">{progressPercent}%</span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="inline-block">
          {rows.map((row, y) => {
            const isCurrentRow = y === currentRow;
            return (
              <div
                key={y}
                className="flex"
                style={{
                  opacity: isCurrentRow ? 1 : 0.35,
                  outline: isCurrentRow ? '3px solid #FF4444' : 'none',
                  outlineOffset: '1px',
                  transition: 'opacity 0.2s, outline 0.2s',
                  cursor: isCurrentRow ? 'default' : 'pointer',
                }}
                onClick={() => { if (!isCurrentRow) setCurrentRow(y); }}
              >
                {/* Row number label */}
                <div
                  className="flex items-center justify-end pr-1 text-[10px] text-muted-foreground select-none"
                  style={{ width: 28, cursor: 'pointer', fontWeight: isCurrentRow ? 700 : 400 }}
                  onClick={(e) => { e.stopPropagation(); setCurrentRow(y); }}
                >
                  {gridHeight - y}
                </div>
                {row.map((cell, x) => {
                  const cellKey = `${cell.x},${cell.y}`;
                  const isHighlighted = highlightedCells.has(cellKey);
                  return (
                    <div
                      key={x}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: cell.color,
                        borderRight: '1px solid rgba(0,0,0,0.05)',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        outline: isHighlighted ? '3px solid #FF4444' : 'none',
                        outlineOffset: '-2px',
                        cursor: isCurrentRow ? 'pointer' : 'pointer',
                        position: 'relative',
                        zIndex: isHighlighted ? 2 : 0,
                      }}
                      onClick={(e) => {
                        if (isCurrentRow) {
                          e.stopPropagation();
                          handleCellClick(cell.x, cell.y);
                        }
                      }}
                      onPointerDown={() => isCurrentRow && handleCellLongPressStart(cell.x, cell.y)}
                      onPointerUp={handleCellLongPressEnd}
                      onPointerLeave={handleCellLongPressEnd}
                    >
                      {isHighlighted && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{
                          background: 'rgba(255, 68, 68, 0.35)',
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)',
                        }}>
                          <div style={{
                            width: Math.max(4, cellSize * 0.3),
                            height: Math.max(4, cellSize * 0.3),
                            borderRadius: '50%',
                            backgroundColor: '#FF4444',
                            boxShadow: '0 0 2px rgba(0,0,0,0.5)',
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row color sequence */}
      <div className="px-4 py-2 border-t border-border/50 overflow-x-auto">
        <div className="flex items-center gap-1 justify-center flex-wrap">
          <span className="text-xs text-muted-foreground font-medium mr-1">{t('pixel.rowColors')}:</span>
          {currentRowSequence.map((seg, i) => (
            <div key={i} className="flex items-center gap-0.5">
              <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: seg.color }} />
              <span className="text-xs font-mono">{seg.count}</span>
              {i < currentRowSequence.length - 1 && <span className="text-muted-foreground text-[10px] mx-0.5">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-6 px-4 py-4 border-t border-border bg-muted/30">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-2xl"
          onClick={() => setCurrentRow(r => Math.min(gridHeight - 1, r + 1))}
          disabled={currentRow >= gridHeight - 1}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <div className="text-center min-w-[100px]">
          <p className="text-xs text-muted-foreground">{t('pixel.currentRow')}</p>
          <p className="text-4xl font-mono font-bold text-primary">{gridHeight - currentRow}</p>
          <p className="text-xs text-muted-foreground">/ {gridHeight}</p>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-2xl"
          onClick={() => setCurrentRow(r => Math.max(0, r - 1))}
          disabled={currentRow <= 0}
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
    </motion.div>
  );
}
