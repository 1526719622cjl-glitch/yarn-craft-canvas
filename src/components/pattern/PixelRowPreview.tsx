import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/useI18n';

export interface PixelColor {
  color: string;  // hex or color name
  count: number;  // how many stitches in this color
}

export interface RowPixelData {
  row: number;
  pixels: PixelColor[];
  totalStitches: number;
}

interface PixelRowPreviewProps {
  rowData: RowPixelData | null;
  highlightIndex?: number;
}

export function PixelRowPreview({ rowData, highlightIndex }: PixelRowPreviewProps) {
  const { t } = useI18n();

  if (!rowData || rowData.pixels.length === 0) {
    return null;
  }

  // Expand pixels into individual cells for display
  const expandedPixels: { color: string; index: number }[] = [];
  let idx = 0;
  for (const segment of rowData.pixels) {
    for (let i = 0; i < segment.count; i++) {
      expandedPixels.push({ color: segment.color, index: idx++ });
    }
  }

  // Calculate cell width based on total stitches
  const maxCells = Math.min(expandedPixels.length, 60); // Limit display width
  const displayPixels = expandedPixels.length > 60 
    ? expandedPixels.filter((_, i) => i % Math.ceil(expandedPixels.length / 60) === 0).slice(0, 60)
    : expandedPixels;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/30"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground font-medium">
          {t('pattern.pixelPreview')}
        </p>
        <span className="text-xs text-muted-foreground font-mono">
          {rowData.totalStitches} {t('pattern.stitchesTotal')}
        </span>
      </div>

      <div className="flex gap-0.5 justify-center flex-wrap">
        {displayPixels.map((pixel, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.01 }}
            className={`w-4 h-4 rounded-sm border transition-all ${
              highlightIndex !== undefined && i === highlightIndex
                ? 'ring-2 ring-primary ring-offset-1 scale-125 z-10'
                : 'border-border/20'
            }`}
            style={{ backgroundColor: pixel.color }}
            title={`#${i + 1}: ${pixel.color}`}
          />
        ))}
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {rowData.pixels.map((segment, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-3 h-3 rounded-sm border border-border/30"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-muted-foreground">×{segment.count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
