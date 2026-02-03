import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Palette, Hash } from 'lucide-react';
import { PixelCell } from '@/store/useYarnCluesStore';

interface ColorLegendProps {
  pixelGrid: PixelCell[];
  ignoredColor: string | null;
  onColorClick?: (color: string) => void;
  selectedColor?: string;
}

interface ColorStats {
  color: string;
  count: number;
  percentage: number;
  name?: string;
}

export function ColorLegend({ pixelGrid, ignoredColor, onColorClick, selectedColor }: ColorLegendProps) {
  const colorStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    
    for (const cell of pixelGrid) {
      if (ignoredColor && cell.color === ignoredColor) continue;
      counts[cell.color] = (counts[cell.color] || 0) + 1;
      total++;
    }
    
    const stats: ColorStats[] = Object.entries(counts)
      .map(([color, count]) => ({
        color,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
    
    return { stats, total };
  }, [pixelGrid, ignoredColor]);

  if (colorStats.stats.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Color Legend</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {colorStats.total} stitches
        </span>
      </div>
      
      <div className="space-y-1.5 max-h-[200px] overflow-auto">
        {colorStats.stats.map((stat, i) => (
          <motion.button
            key={stat.color}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onColorClick?.(stat.color)}
            className={`w-full flex items-center gap-2 p-2 rounded-xl transition-all hover:bg-muted/50 ${
              selectedColor === stat.color ? 'bg-primary/10 ring-1 ring-primary/30' : ''
            }`}
          >
            <div 
              className="w-6 h-6 rounded-lg shadow-sm border border-border/50 flex-shrink-0"
              style={{ backgroundColor: stat.color }}
            />
            <div className="flex-1 text-left">
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">
                  {stat.color.replace('rgb(', '').replace(')', '').split(',').map(n => 
                    parseInt(n.trim()).toString(16).padStart(2, '0')
                  ).join('').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{stat.count}</p>
              <p className="text-[10px] text-muted-foreground">{stat.percentage.toFixed(1)}%</p>
            </div>
          </motion.button>
        ))}
      </div>
      
      {ignoredColor && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/30">
          <div 
            className="w-4 h-4 rounded border border-dashed border-muted-foreground/50"
            style={{ backgroundColor: ignoredColor }}
          />
          <span>Background (ignored)</span>
        </div>
      )}
    </div>
  );
}
