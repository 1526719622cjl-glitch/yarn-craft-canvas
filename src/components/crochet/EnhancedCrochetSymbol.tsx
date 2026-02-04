/**
 * Enhanced Crochet Symbol Component
 * Renders JIS-standard crochet symbols with full support for all stitch types
 */

import { memo, useMemo } from 'react';
import { CrochetStitchType, getStitchInfo, STITCH_DATABASE } from '@/lib/crochetStitchTypes';
import { getSymbolPath } from '@/lib/crochetSymbolPaths';
import { cn } from '@/lib/utils';

interface EnhancedCrochetSymbolProps {
  type: CrochetStitchType;
  size?: number;
  rotation?: number;
  color?: string;
  isSelected?: boolean;
  isHighlighted?: boolean;
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}

export const EnhancedCrochetSymbol = memo(function EnhancedCrochetSymbol({
  type,
  size = 24,
  rotation = 0,
  color,
  isSelected = false,
  isHighlighted = false,
  showLabel = false,
  onClick,
  className,
}: EnhancedCrochetSymbolProps) {
  const symbolPath = useMemo(() => getSymbolPath(type), [type]);
  const stitchInfo = useMemo(() => getStitchInfo(type), [type]);
  
  const strokeColor = color || 'currentColor';
  const strokeWidth = symbolPath.strokeWidth || 2;
  
  // Category-based color hints
  const categoryColor = useMemo(() => {
    if (color) return null;
    const info = STITCH_DATABASE[type];
    if (!info) return null;
    
    switch (info.category) {
      case 'increase':
        return 'hsl(var(--chart-2))';
      case 'decrease':
        return 'hsl(var(--chart-1))';
      case 'texture':
        return 'hsl(var(--chart-3))';
      case 'special':
        return 'hsl(var(--chart-4))';
      case 'decorative':
        return 'hsl(var(--chart-5))';
      default:
        return null;
    }
  }, [type, color]);
  
  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <svg 
        width={size} 
        height={size} 
        viewBox={symbolPath.viewBox}
        style={{ transform: rotation ? `rotate(${rotation}rad)` : undefined }}
        className={cn(
          'transition-all duration-150',
          isSelected && 'stroke-primary',
          isHighlighted && 'filter drop-shadow-[0_0_6px_hsl(var(--primary))]',
          onClick && 'cursor-pointer hover:scale-110'
        )}
        onClick={onClick}
      >
        {/* Main path */}
        <path
          d={symbolPath.path}
          fill={symbolPath.filled ? (categoryColor || strokeColor) : 'none'}
          stroke={symbolPath.filled ? 'none' : (categoryColor || strokeColor)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Secondary path (for modifiers like BLO/FLO indicators, post stitch curves) */}
        {symbolPath.secondaryPath && (
          <path
            d={symbolPath.secondaryPath}
            fill={symbolPath.secondaryFilled ? (categoryColor || strokeColor) : 'none'}
            stroke={symbolPath.secondaryFilled ? 'none' : (categoryColor || strokeColor)}
            strokeWidth={strokeWidth * 0.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        )}
      </svg>
      
      {/* Optional label */}
      {showLabel && stitchInfo && (
        <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
          {stitchInfo.abbreviation.toUpperCase()}
        </span>
      )}
    </div>
  );
});

// Stitch Palette Component for selecting stitches
interface StitchPaletteProps {
  selectedStitch: CrochetStitchType;
  onSelect: (stitch: CrochetStitchType) => void;
  category?: 'basic' | 'increase' | 'decrease' | 'loop' | 'texture' | 'special' | 'decorative' | 'all';
  size?: number;
}

export function StitchPalette({ 
  selectedStitch, 
  onSelect, 
  category = 'all',
  size = 28 
}: StitchPaletteProps) {
  const stitches = useMemo(() => {
    const allStitches = Object.values(STITCH_DATABASE);
    if (category === 'all') return allStitches;
    return allStitches.filter(s => s.category === category);
  }, [category]);
  
  return (
    <div className="flex flex-wrap gap-1">
      {stitches.map((stitch) => (
        <button
          key={stitch.id}
          onClick={() => onSelect(stitch.id)}
          className={cn(
            'p-1.5 rounded-lg transition-all hover:bg-muted',
            selectedStitch === stitch.id && 'bg-primary/10 ring-2 ring-primary/30'
          )}
          title={`${stitch.name} (${stitch.nameJP})`}
        >
          <EnhancedCrochetSymbol
            type={stitch.id}
            size={size}
            isSelected={selectedStitch === stitch.id}
            showLabel
          />
        </button>
      ))}
    </div>
  );
}

// Category tabs for organizing stitches
interface StitchCategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function StitchCategoryTabs({ selectedCategory, onCategoryChange }: StitchCategoryTabsProps) {
  const categories = [
    { id: 'basic', label: 'Basic', icon: '━' },
    { id: 'increase', label: 'Increase', icon: 'V' },
    { id: 'decrease', label: 'Decrease', icon: 'A' },
    { id: 'loop', label: 'Loop', icon: '↺' },
    { id: 'texture', label: 'Texture', icon: '●' },
    { id: 'special', label: 'Special', icon: '◎' },
    { id: 'decorative', label: 'Decorative', icon: '❋' },
  ];
  
  return (
    <div className="flex gap-1 overflow-x-auto pb-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={cn(
            'px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
            selectedCategory === cat.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
          )}
        >
          <span className="mr-1">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}

// Legend component for chart documentation
interface SymbolLegendProps {
  stitchTypes: CrochetStitchType[];
  size?: number;
}

export function SymbolLegend({ stitchTypes, size = 20 }: SymbolLegendProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
      {stitchTypes.map((type) => {
        const info = STITCH_DATABASE[type];
        if (!info) return null;
        
        return (
          <div key={type} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
            <EnhancedCrochetSymbol type={type} size={size} />
            <div className="flex flex-col">
              <span className="font-medium text-xs">{info.abbreviation.toUpperCase()}</span>
              <span className="text-[10px] text-muted-foreground">{info.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
