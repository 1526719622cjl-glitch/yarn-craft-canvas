import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';
import type { PixelCell } from '@/store/useYarnCluesStore';

interface PixelKnittingGuideProps {
  pixelGrid: PixelCell[];
  gridWidth: number;
  gridHeight: number;
  onClose: () => void;
}

export function PixelKnittingGuide({ pixelGrid, gridWidth, gridHeight, onClose }: PixelKnittingGuideProps) {
  const { t } = useI18n();
  // Start from the bottom row (knitting goes bottom-up typically)
  const [currentRow, setCurrentRow] = useState(gridHeight - 1);

  const rows = useMemo(() => {
    const result: PixelCell[][] = [];
    for (let y = 0; y < gridHeight; y++) {
      result.push(pixelGrid.filter(c => c.y === y).sort((a, b) => a.x - b.x));
    }
    return result;
  }, [pixelGrid, gridHeight]);

  // Build actual color sequence for current row (consecutive same-color groups)
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
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="inline-block">
          {rows.map((row, y) => (
            <div
              key={y}
              className="flex"
              style={{
                opacity: y === currentRow ? 1 : 0.3,
                outline: y === currentRow ? '3px solid hsl(var(--primary))' : 'none',
                outlineOffset: '1px',
                transition: 'opacity 0.2s, outline 0.2s',
              }}
            >
              {/* Row number label */}
              <div className="flex items-center justify-end pr-1 text-[10px] text-muted-foreground" style={{ width: 28 }}>
                {gridHeight - y}
              </div>
              {row.map((cell, x) => (
                <div
                  key={x}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: cell.color,
                    borderRight: '1px solid rgba(0,0,0,0.05)',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Row color sequence (actual order, not totals) */}
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
