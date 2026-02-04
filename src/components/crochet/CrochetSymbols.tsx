import { CrochetStitch } from '@/store/useYarnCluesStore';
import { CrochetStitchType, STITCH_DATABASE } from '@/lib/crochetStitchTypes';
import { getSymbolPath, SymbolPath } from '@/lib/crochetSymbolPaths';

interface StitchSymbolProps {
  type: CrochetStitch;
  size?: number;
  rotation?: number;
  color?: string;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

// Use the enhanced symbol paths, with fallback for legacy types
function getSymbolDef(type: CrochetStitch): SymbolPath {
  return getSymbolPath(type as CrochetStitchType);
}
// Legacy symbol paths kept for backward compatibility (now uses enhanced paths from lib)

export function StitchSymbol({ 
  type, 
  size = 24, 
  rotation = 0, 
  color,
  isSelected = false,
  isHighlighted = false,
  onClick 
}: StitchSymbolProps) {
  const symbolDef = getSymbolDef(type);
  const strokeColor = color || 'currentColor';
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={symbolDef.viewBox || '0 0 24 24'}
      style={{ transform: `rotate(${rotation}rad)` }}
      className={`transition-all duration-150 ${
        isSelected ? 'stroke-primary' : ''
      } ${
        isHighlighted ? 'filter drop-shadow-[0_0_4px_hsl(var(--primary))]' : ''
      } ${
        onClick ? 'cursor-pointer hover:scale-110' : ''
      }`}
      onClick={onClick}
    >
      <path
        d={symbolDef.path}
        fill={symbolDef.filled ? strokeColor : 'none'}
        stroke={symbolDef.filled ? 'none' : strokeColor}
        strokeWidth={symbolDef.strokeWidth || 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Secondary path for modifiers */}
      {symbolDef.secondaryPath && (
        <path
          d={symbolDef.secondaryPath}
          fill={symbolDef.secondaryFilled ? strokeColor : 'none'}
          stroke={symbolDef.secondaryFilled ? 'none' : strokeColor}
          strokeWidth={(symbolDef.strokeWidth || 2) * 0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      )}
    </svg>
  );
}

// 3-stitch increase (W shape)
export function WIncSymbol({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M 12,20 L 4,4 M 12,20 L 12,4 M 12,20 L 20,4"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 3-stitch decrease (M shape)
export function MDecSymbol({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M 4,20 L 12,4 M 12,20 L 12,4 M 20,20 L 12,4"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Front Post DC
export function FPdcSymbol({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M 12,2 L 12,22 M 6,2 L 18,2 M 8,11 L 16,9"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 14,20 Q 18,20 18,16"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Back Post DC
export function BPdcSymbol({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M 12,2 L 12,22 M 6,2 L 18,2 M 8,11 L 16,9"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M 10,20 Q 6,20 6,16"
        fill="none"
        stroke={color || 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function getStitchDisplayName(type: CrochetStitch): string {
  // Use enhanced database if available
  const info = STITCH_DATABASE[type as CrochetStitchType];
  if (info) {
    return `${info.name} (${info.abbreviation.toUpperCase()})`;
  }
  
  // Fallback for any missing types
  return type.charAt(0).toUpperCase() + type.slice(1);
}
