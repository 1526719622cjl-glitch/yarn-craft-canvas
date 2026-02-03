import { CrochetStitch } from '@/store/useYarnCluesStore';

interface StitchSymbolProps {
  type: CrochetStitch;
  size?: number;
  rotation?: number;
  color?: string;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

// SVG Path definitions for JIS standard crochet symbols
const SYMBOL_PATHS: Record<CrochetStitch, { path: string; filled?: boolean; viewBox?: string }> = {
  sc: {
    path: 'M 6,6 L 18,18 M 18,6 L 6,18',
    viewBox: '0 0 24 24',
  },
  chain: {
    path: 'M 12,12 m -8,0 a 8,4 0 1,0 16,0 a 8,4 0 1,0 -16,0',
    viewBox: '0 0 24 24',
  },
  slip: {
    path: 'M 12,12 m -3,0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0',
    filled: true,
    viewBox: '0 0 24 24',
  },
  hdc: {
    path: 'M 12,4 L 12,20 M 6,4 L 18,4',
    viewBox: '0 0 24 24',
  },
  dc: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,11 L 16,9',
    viewBox: '0 0 24 24',
  },
  tr: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,9 L 16,7 M 8,14 L 16,12',
    viewBox: '0 0 24 24',
  },
  dtr: {
    path: 'M 12,1 L 12,23 M 6,1 L 18,1 M 8,7 L 16,5 M 8,12 L 16,10 M 8,17 L 16,15',
    viewBox: '0 0 24 24',
  },
  inc: {
    path: 'M 12,20 L 4,4 M 12,20 L 20,4',
    viewBox: '0 0 24 24',
  },
  dec: {
    path: 'M 4,20 L 12,4 M 20,20 L 12,4',
    viewBox: '0 0 24 24',
  },
  magic: {
    path: 'M 12,12 m -9,0 a 9,9 0 1,0 18,0 a 9,9 0 1,0 -18,0 M 12,12 m -3,0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0',
    viewBox: '0 0 24 24',
  },
  blo: {
    path: 'M 6,16 L 18,4 M 6,4 L 18,16 M 12,20 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
    viewBox: '0 0 24 24',
  },
  flo: {
    path: 'M 6,18 L 18,6 M 6,6 L 18,18 M 12,2 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
    viewBox: '0 0 24 24',
  },
  spike: {
    path: 'M 12,2 L 12,22 M 6,12 L 18,12',
    viewBox: '0 0 24 24',
  },
  popcorn: {
    path: 'M 12,12 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
    viewBox: '0 0 24 24',
  },
  bobble: {
    path: 'M 12,3 Q 4,3 4,12 Q 4,21 12,21 Q 20,21 20,12 Q 20,3 12,3',
    viewBox: '0 0 24 24',
  },
  puff: {
    path: 'M 4,12 Q 4,6 12,6 Q 20,6 20,12 Q 20,18 12,18 Q 4,18 4,12 M 12,6 L 12,18',
    viewBox: '0 0 24 24',
  },
};

export function StitchSymbol({ 
  type, 
  size = 24, 
  rotation = 0, 
  color,
  isSelected = false,
  isHighlighted = false,
  onClick 
}: StitchSymbolProps) {
  const symbolDef = SYMBOL_PATHS[type] || SYMBOL_PATHS.sc;
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const names: Record<CrochetStitch, string> = {
    chain: 'Chain (CH)',
    slip: 'Slip Stitch (SL)',
    sc: 'Single Crochet (SC)',
    hdc: 'Half Double Crochet (HDC)',
    dc: 'Double Crochet (DC)',
    tr: 'Treble Crochet (TR)',
    dtr: 'Double Treble (DTR)',
    inc: 'Increase (V)',
    dec: 'Decrease (A)',
    magic: 'Magic Ring',
    blo: 'Back Loop Only',
    flo: 'Front Loop Only',
    spike: 'Spike Stitch',
    popcorn: 'Popcorn',
    bobble: 'Bobble',
    puff: 'Puff Stitch',
  };
  return names[type] || type;
}
