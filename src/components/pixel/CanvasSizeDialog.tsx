import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Lock, Unlock, Grid3X3, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CanvasSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  croppedImageUrl: string;
  croppedWidth: number;
  croppedHeight: number;
  defaultRatio: number;
  onConfirm: (width: number, height: number) => void;
}

const PRESET_SIZES = [
  { label: 'Small', width: 40 },
  { label: 'Medium', width: 60 },
  { label: 'Large', width: 80 },
  { label: 'XL', width: 100 },
];

export function CanvasSizeDialog({
  open,
  onOpenChange,
  croppedImageUrl,
  croppedWidth,
  croppedHeight,
  defaultRatio,
  onConfirm,
}: CanvasSizeDialogProps) {
  const imageAspectRatio = croppedWidth / croppedHeight;
  
  // Calculate suggested dimensions based on image aspect ratio
  const suggestedWidth = useMemo(() => {
    // Suggest a reasonable default width (60 stitches)
    return 60;
  }, []);
  
  const suggestedHeight = useMemo(() => {
    return Math.round(suggestedWidth / imageAspectRatio);
  }, [suggestedWidth, imageAspectRatio]);

  const [width, setWidth] = useState(suggestedWidth);
  const [height, setHeight] = useState(suggestedHeight);
  const [lockAspect, setLockAspect] = useState(true);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setWidth(suggestedWidth);
      setHeight(suggestedHeight);
      setLockAspect(true);
    }
  }, [open, suggestedWidth, suggestedHeight]);

  // Update height when width changes and aspect is locked
  useEffect(() => {
    if (lockAspect && width > 0) {
      setHeight(Math.round(width / imageAspectRatio));
    }
  }, [width, lockAspect, imageAspectRatio]);

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
  };

  const handleHeightChange = (newHeight: number) => {
    if (!lockAspect) {
      setHeight(newHeight);
    }
  };

  const handlePresetClick = (presetWidth: number) => {
    setWidth(presetWidth);
  };

  const handleConfirm = () => {
    onConfirm(width, height);
    onOpenChange(false);
  };

  // Calculate how the image will map to the grid
  const totalCells = width * height;
  const cellsPerPixelX = croppedWidth / width;
  const cellsPerPixelY = croppedHeight / height;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            Choose Canvas Size
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Image Preview & Info */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden border border-border flex-shrink-0">
              <img 
                src={croppedImageUrl} 
                alt="Cropped preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Image Dimensions</p>
              <p className="text-xs text-muted-foreground">
                {croppedWidth} × {croppedHeight} pixels
              </p>
              <p className="text-xs text-muted-foreground">
                Aspect ratio: {imageAspectRatio.toFixed(2)}:1
              </p>
              <div className="flex items-center gap-1 text-xs text-primary mt-2">
                <Info className="w-3 h-3" />
                <span>Suggested: {suggestedWidth} × {suggestedHeight} stitches</span>
              </div>
            </div>
          </div>

          {/* Preset Sizes */}
          <div className="space-y-2">
            <Label className="text-sm">Quick Presets</Label>
            <div className="flex gap-2">
              {PRESET_SIZES.map((preset) => {
                const presetHeight = Math.round(preset.width / imageAspectRatio);
                return (
                  <Button
                    key={preset.label}
                    variant={width === preset.width ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetClick(preset.width)}
                    className="flex-1 rounded-xl flex flex-col gap-0 h-auto py-2"
                  >
                    <span className="text-xs font-medium">{preset.label}</span>
                    <span className="text-[10px] opacity-70">{preset.width}×{presetHeight}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Custom Dimensions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Canvas Dimensions (stitches)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => setLockAspect(!lockAspect)}
                  >
                    {lockAspect ? (
                      <Lock className="w-4 h-4 text-primary" />
                    ) : (
                      <Unlock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {lockAspect ? 'Unlock aspect ratio' : 'Lock to image aspect ratio'}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  type="number"
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  min={10}
                  max={200}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  min={10}
                  max={200}
                  disabled={lockAspect}
                  className={`h-10 ${lockAspect ? 'opacity-60' : ''}`}
                />
              </div>
            </div>
            
            {lockAspect && (
              <p className="text-[10px] text-muted-foreground">
                Height auto-calculated to match image aspect ratio
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-1">
            <p className="text-sm font-medium">Canvas Summary</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Total cells:</span>
              <span className="font-medium text-foreground">{totalCells.toLocaleString()}</span>
              <span>Pixels per cell (approx):</span>
              <span className="font-medium text-foreground">
                {cellsPerPixelX.toFixed(1)} × {cellsPerPixelY.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="rounded-xl">
            Create {width}×{height} Canvas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
