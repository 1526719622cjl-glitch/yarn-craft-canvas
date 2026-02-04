import { useMemo } from 'react';
import { CrochetStitch } from '@/store/useYarnCluesStore';
import { CrochetStitchType } from '@/lib/crochetStitchTypes';
import { getSymbolPath } from '@/lib/crochetSymbolPaths';

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
    // Use enhanced symbol paths from the library
    const symbolPath = getSymbolPath(type as CrochetStitchType);
    return { basePath: symbolPath.path, viewBox: symbolPath.viewBox };
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