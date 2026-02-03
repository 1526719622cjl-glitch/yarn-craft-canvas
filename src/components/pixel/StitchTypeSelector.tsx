import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type StitchType = 'sc' | 'hdc' | 'dc';

interface StitchTypeSelectorProps {
  value: StitchType;
  onChange: (type: StitchType) => void;
}

const stitchTypes: { type: StitchType; label: string; ratio: string; description: string }[] = [
  { type: 'sc', label: 'SC', ratio: '1:1', description: 'Single Crochet - Square cells' },
  { type: 'hdc', label: 'HDC', ratio: '1:1.5', description: 'Half Double Crochet - Slightly tall cells' },
  { type: 'dc', label: 'DC', ratio: '1:2', description: 'Double Crochet - Tall vertical cells' },
];

export function StitchTypeSelector({ value, onChange }: StitchTypeSelectorProps) {
  return (
    <div className="flex gap-1">
      {stitchTypes.map((stitch) => (
        <Tooltip key={stitch.type}>
          <TooltipTrigger asChild>
            <Button
              variant={value === stitch.type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(stitch.type)}
              className="h-9 rounded-xl flex flex-col gap-0 px-3"
            >
              <span className="text-xs font-bold">{stitch.label}</span>
              <span className="text-[9px] opacity-70">{stitch.ratio}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{stitch.description}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export function getStitchRatio(type: StitchType): number {
  switch (type) {
    case 'sc': return 1;
    case 'hdc': return 1.5;
    case 'dc': return 2;
    default: return 1;
  }
}
