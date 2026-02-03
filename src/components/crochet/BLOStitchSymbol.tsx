import { useMemo } from 'react';
import { CrochetStitch } from '@/store/useYarnCluesStore';

interface BLOStitchSymbolProps {
  type: CrochetStitch;
  modifier?: 'blo' | 'flo';
  size?: number;
  color?: string;
  className?: string;
}

// BLO (Back Loop Only) adds a dash/underline symbol below the stitch
// FLO (Front Loop Only) adds a dash/overline symbol above the stitch
export function BLOStitchSymbol({
  type,
  modifier,
  size = 24,
  color = 'currentColor',
  className = '',
}: BLOStitchSymbolProps) {
  const stitchData = useMemo(() => {
    // Base stitch paths (simplified for demonstration)
    const paths: Record<CrochetStitch, { path: string; viewBox: string }> = {
      sc: { 
        path: 'M 6,18 L 18,6 M 6,6 L 18,18', // X shape
        viewBox: '0 0 24 24' 
      },
      hdc: { 
        path: 'M 12,4 L 12,20 M 8,4 L 16,4', // T shape
        viewBox: '0 0 24 24' 
      },
      dc: { 
        path: 'M 12,2 L 12,22 M 8,2 L 16,2 M 8,10 L 16,10', // F shape (T with extra bar)
        viewBox: '0 0 24 24' 
      },
      tr: { 
        path: 'M 12,2 L 12,22 M 8,2 L 16,2 M 8,8 L 16,8 M 8,14 L 16,14', // E shape
        viewBox: '0 0 24 24' 
      },
      dtr: { 
        path: 'M 12,2 L 12,22 M 8,2 L 16,2 M 8,7 L 16,7 M 8,12 L 16,12 M 8,17 L 16,17',
        viewBox: '0 0 24 24' 
      },
      inc: { 
        path: 'M 4,20 L 12,4 L 20,20', // V shape
        viewBox: '0 0 24 24' 
      },
      dec: { 
        path: 'M 4,4 L 12,20 L 20,4', // Inverted V (A shape)
        viewBox: '0 0 24 24' 
      },
      chain: { 
        path: 'M 8,12 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0', // O shape
        viewBox: '0 0 24 24' 
      },
      slip: { 
        path: 'M 8,12 L 16,12 M 12,8 L 12,16', // + shape
        viewBox: '0 0 24 24' 
      },
      magic: { 
        path: 'M 12,4 a 8,8 0 1,0 0,16 a 8,8 0 1,0 0,-16 M 12,8 L 12,12', // Circle with line
        viewBox: '0 0 24 24' 
      },
      blo: { 
        path: 'M 6,18 L 18,6 M 6,6 L 18,18 M 4,22 L 20,22', // X with underline
        viewBox: '0 0 24 24' 
      },
      flo: { 
        path: 'M 6,18 L 18,6 M 6,6 L 18,18 M 4,2 L 20,2', // X with overline
        viewBox: '0 0 24 24' 
      },
      spike: { 
        path: 'M 12,4 L 6,20 M 12,4 L 18,20 M 12,4 L 12,24',
        viewBox: '0 0 24 24' 
      },
      popcorn: { 
        path: 'M 12,6 a 6,6 0 1,0 0,12 a 6,6 0 1,0 0,-12 M 12,6 L 12,2 M 8,8 L 4,4 M 16,8 L 20,4',
        viewBox: '0 0 24 24' 
      },
      bobble: { 
        path: 'M 12,8 a 4,4 0 1,0 0,8 a 4,4 0 1,0 0,-8 M 12,4 L 12,8 M 12,16 L 12,20',
        viewBox: '0 0 24 24' 
      },
      puff: { 
        path: 'M 8,10 Q 12,4 16,10 Q 12,16 8,10',
        viewBox: '0 0 24 24' 
      },
    };
    
    const match = paths[type] || paths.sc;
    return { basePath: match.path, viewBox: match.viewBox };
  }, [type]);

  // Additional modifier path
  const modifierPath = useMemo(() => {
    if (!modifier) return '';
    
    // BLO: Dashed underline (indicating working into back loop)
    if (modifier === 'blo') {
      return 'M 4,23 L 8,23 M 10,23 L 14,23 M 16,23 L 20,23'; // Dashed line
    }
    
    // FLO: Dashed overline (indicating working into front loop)
    if (modifier === 'flo') {
      return 'M 4,1 L 8,1 M 10,1 L 14,1 M 16,1 L 20,1';
    }
    
    return '';
  }, [modifier]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={stitchData.viewBox}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Base stitch */}
      <path d={stitchData.basePath} />
      
      {/* BLO/FLO modifier */}
      {modifierPath && (
        <path 
          d={modifierPath} 
          strokeWidth={2.5}
          stroke={modifier === 'blo' ? 'hsl(var(--primary))' : 'hsl(var(--secondary-foreground))'}
        />
      )}
    </svg>
  );
}

// 3D offset for BLO stitches - used in YarnSimulation
export function getBLOOffset(modifier?: 'blo' | 'flo'): { x: number; y: number; z: number } {
  if (!modifier) return { x: 0, y: 0, z: 0 };
  
  // BLO: Offset towards the back (negative Z in 3D space)
  if (modifier === 'blo') {
    return { x: 0, y: 0.02, z: -0.03 };
  }
  
  // FLO: Offset towards the front (positive Z)
  if (modifier === 'flo') {
    return { x: 0, y: -0.02, z: 0.03 };
  }
  
  return { x: 0, y: 0, z: 0 };
}

// Chart legend entry for BLO/FLO
export function BLOLegendEntry({ modifier }: { modifier: 'blo' | 'flo' }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-6 h-6 flex items-center justify-center">
        {modifier === 'blo' ? (
          <svg width={20} height={6} viewBox="0 0 20 6">
            <line x1="0" y1="3" x2="4" y2="3" stroke="currentColor" strokeWidth={2} />
            <line x1="8" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth={2} />
            <line x1="16" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth={2} />
          </svg>
        ) : (
          <svg width={20} height={6} viewBox="0 0 20 6">
            <line x1="0" y1="3" x2="4" y2="3" stroke="currentColor" strokeWidth={2} strokeDasharray="2,2" />
            <line x1="8" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth={2} strokeDasharray="2,2" />
            <line x1="16" y1="3" x2="20" y2="3" stroke="currentColor" strokeWidth={2} strokeDasharray="2,2" />
          </svg>
        )}
      </div>
      <span className="text-muted-foreground">
        {modifier === 'blo' ? 'Back Loop Only (BLO)' : 'Front Loop Only (FLO)'}
      </span>
    </div>
  );
}