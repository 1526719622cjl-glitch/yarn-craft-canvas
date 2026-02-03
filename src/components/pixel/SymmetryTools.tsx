import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { FlipHorizontal, FlipVertical, Circle } from 'lucide-react';

export type SymmetryMode = 'none' | 'horizontal' | 'vertical' | 'radial';

interface SymmetryToolsProps {
  mode: SymmetryMode;
  onChange: (mode: SymmetryMode) => void;
}

export function SymmetryTools({ mode, onChange }: SymmetryToolsProps) {
  const tools: { type: SymmetryMode; icon: typeof FlipHorizontal; label: string }[] = [
    { type: 'horizontal', icon: FlipHorizontal, label: 'Horizontal Symmetry' },
    { type: 'vertical', icon: FlipVertical, label: 'Vertical Symmetry' },
    { type: 'radial', icon: Circle, label: 'Radial Symmetry' },
  ];

  return (
    <div className="flex gap-1">
      {tools.map((tool) => (
        <Tooltip key={tool.type}>
          <TooltipTrigger asChild>
            <Button
              variant={mode === tool.type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(mode === tool.type ? 'none' : tool.type)}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <tool.icon className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tool.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

// Apply symmetry to painting
export function getSymmetricPoints(
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  mode: SymmetryMode
): { x: number; y: number }[] {
  const points = [{ x, y }];
  
  switch (mode) {
    case 'horizontal':
      points.push({ x: width - 1 - x, y });
      break;
    case 'vertical':
      points.push({ x, y: height - 1 - y });
      break;
    case 'radial':
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      const dx = x - centerX;
      const dy = y - centerY;
      // 4-way radial
      points.push({ x: centerX - dx, y: centerY + dy }); // horizontal flip
      points.push({ x: centerX + dx, y: centerY - dy }); // vertical flip
      points.push({ x: centerX - dx, y: centerY - dy }); // both
      break;
  }
  
  // Filter out duplicates and out of bounds
  return points.filter((p, i, arr) => 
    p.x >= 0 && p.x < width && p.y >= 0 && p.y < height &&
    arr.findIndex(q => q.x === p.x && q.y === p.y) === i
  );
}
