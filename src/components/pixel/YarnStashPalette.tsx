import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Pipette, Palette, Plus, X, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export interface StashColor {
  id: string;
  hex: string;
  name: string;
  brand?: string;
  yarnWeight?: string;
}

interface YarnStashPaletteProps {
  stashColors: StashColor[];
  onStashColorsChange: (colors: StashColor[]) => void;
  selectedColor: string;
  onColorSelect: (color: string) => void;
  limitToPalette: boolean;
  onLimitToPaletteChange: (limit: boolean) => void;
}

// Delta E (CIE76) color distance
export function deltaE(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return Infinity;
  
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);
  
  return Math.sqrt(
    Math.pow(lab2.l - lab1.l, 2) +
    Math.pow(lab2.a - lab1.a, 2) +
    Math.pow(lab2.b - lab1.b, 2)
  );
}

// Find nearest color in palette using Delta E
export function findNearestColor(targetHex: string, palette: StashColor[]): StashColor | null {
  if (palette.length === 0) return null;
  
  let nearest = palette[0];
  let minDistance = deltaE(targetHex, nearest.hex);
  
  for (const color of palette) {
    const distance = deltaE(targetHex, color.hex);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = color;
    }
  }
  
  return nearest;
}

// Quantize image to stash palette
export function quantizeToStash(
  imageData: ImageData,
  palette: StashColor[]
): Map<string, StashColor> {
  const colorMap = new Map<string, StashColor>();
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const hex = rgbToHex(r, g, b);
    
    if (!colorMap.has(hex)) {
      const nearest = findNearestColor(hex, palette);
      if (nearest) {
        colorMap.set(hex, nearest);
      }
    }
  }
  
  return colorMap;
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle both #RRGGBB and rgb(r, g, b) formats
  if (hex.startsWith('rgb')) {
    const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
    }
    return null;
  }
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function rgbToLab(rgb: { r: number; g: number; b: number }): { l: number; a: number; b: number } {
  // RGB to XYZ
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  // XYZ to Lab
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

export function YarnStashPalette({
  stashColors,
  onStashColorsChange,
  selectedColor,
  onColorSelect,
  limitToPalette,
  onLimitToPaletteChange,
}: YarnStashPaletteProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPickingFromImage, setIsPickingFromImage] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newColor, setNewColor] = useState<Partial<StashColor>>({
    hex: '#C9A08E',
    name: '',
    brand: '',
  });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setIsPickingFromImage(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get click position relative to image
    const rect = img.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (img.naturalWidth / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (img.naturalHeight / rect.height));

    // Draw image to canvas and get pixel
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    
    setNewColor(prev => ({ ...prev, hex }));
    toast({
      title: 'Color picked',
      description: hex,
    });
  }, [toast]);

  const addColorToStash = () => {
    if (!newColor.hex || !newColor.name) {
      toast({
        title: 'Name required',
        description: 'Please give your color a name',
        variant: 'destructive',
      });
      return;
    }

    const color: StashColor = {
      id: crypto.randomUUID(),
      hex: newColor.hex,
      name: newColor.name,
      brand: newColor.brand,
    };

    onStashColorsChange([...stashColors, color]);
    setNewColor({ hex: '#C9A08E', name: '', brand: '' });
    setIsPickingFromImage(false);
    setUploadedImage(null);
  };

  const removeColor = (id: string) => {
    onStashColorsChange(stashColors.filter(c => c.id !== id));
  };

  const updateColorName = (id: string, name: string) => {
    onStashColorsChange(stashColors.map(c => 
      c.id === id ? { ...c, name } : c
    ));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">My Yarn Stash</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl h-7">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle>Add Yarn Color</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 pt-4">
              {/* Image upload for eyedropper */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {!isPickingFromImage ? (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 rounded-2xl border-dashed"
                >
                  <div className="text-center">
                    <ImagePlus className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload yarn photo</p>
                  </div>
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Pipette className="w-4 h-4" />
                    Click on the image to pick a color
                  </p>
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      ref={imageRef}
                      src={uploadedImage!}
                      alt="Yarn sample"
                      className="w-full max-h-48 object-contain cursor-crosshair"
                      onClick={handleImageClick}
                    />
                  </div>
                </div>
              )}

              {/* Color preview and inputs */}
              <div className="flex gap-4">
                <div
                  className="w-20 h-20 rounded-2xl shadow-sm flex-shrink-0"
                  style={{ backgroundColor: newColor.hex }}
                />
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Hex Color</Label>
                    <Input
                      type="color"
                      value={newColor.hex}
                      onChange={(e) => setNewColor(prev => ({ ...prev, hex: e.target.value }))}
                      className="h-8 p-1 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Color Name *</Label>
                    <Input
                      value={newColor.name}
                      onChange={(e) => setNewColor(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Sky Blue"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Brand (Optional)</Label>
                    <Input
                      value={newColor.brand}
                      onChange={(e) => setNewColor(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="e.g., Malabrigo Rios"
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={addColorToStash} className="w-full rounded-xl">
                Add to Stash
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Limit to palette toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
        <div>
          <p className="text-sm font-medium">Limit to My Palette</p>
          <p className="text-xs text-muted-foreground">Force-map all colors to stash</p>
        </div>
        <Button
          variant={limitToPalette ? 'default' : 'outline'}
          size="sm"
          onClick={() => onLimitToPaletteChange(!limitToPalette)}
          className="rounded-xl"
        >
          {limitToPalette ? 'On' : 'Off'}
        </Button>
      </div>

      {/* Stash colors grid */}
      {stashColors.length > 0 ? (
        <ScrollArea className="max-h-[200px]">
          <div className="grid grid-cols-2 gap-2">
            {stashColors.map((color) => (
              <motion.div
                key={color.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`group relative p-2 rounded-xl border transition-all cursor-pointer ${
                  selectedColor === color.hex 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-primary/30'
                }`}
                onClick={() => onColorSelect(color.hex)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    {editingId === color.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-6 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateColorName(color.id, editName);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateColorName(color.id, editName);
                          }}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-medium truncate">{color.name}</p>
                        {color.brand && (
                          <p className="text-[10px] text-muted-foreground truncate">{color.brand}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Hover actions */}
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(color.id);
                      setEditName(color.name);
                    }}
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeColor(color.id);
                    }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No colors in stash yet</p>
          <p className="text-xs">Add colors from your yarn collection</p>
        </div>
      )}
    </div>
  );
}
