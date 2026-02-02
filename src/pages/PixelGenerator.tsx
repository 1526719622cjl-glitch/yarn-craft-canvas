import { motion } from 'framer-motion';
import { useYarnCluesStore, PixelTool, PixelCell } from '@/store/useYarnCluesStore';
import { 
  Grid3X3, Upload, Palette, ZoomIn, Pencil, Eraser, PaintBucket, Pipette, 
  Settings, Square, RotateCw, Copy, Move, Grid, Eye, EyeOff
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Selection state interface
interface SelectionState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isSelecting: boolean;
  hasSelection: boolean;
  copiedCells: PixelCell[];
}

// Floyd-Steinberg dithering implementation
function floydSteinbergDither(
  imageData: ImageData, 
  width: number, 
  height: number, 
  palette: [number, number, number][]
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const oldR = data[i];
      const oldG = data[i + 1];
      const oldB = data[i + 2];
      
      // Find closest palette color
      let minDist = Infinity;
      let newColor: [number, number, number] = [0, 0, 0];
      for (const color of palette) {
        const dist = Math.sqrt(
          Math.pow(oldR - color[0], 2) +
          Math.pow(oldG - color[1], 2) +
          Math.pow(oldB - color[2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          newColor = color;
        }
      }
      
      data[i] = newColor[0];
      data[i + 1] = newColor[1];
      data[i + 2] = newColor[2];
      
      // Calculate error
      const errR = oldR - newColor[0];
      const errG = oldG - newColor[1];
      const errB = oldB - newColor[2];
      
      // Distribute error to neighboring pixels
      const distribute = (dx: number, dy: number, factor: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = (ny * width + nx) * 4;
          data[ni] = Math.max(0, Math.min(255, data[ni] + errR * factor));
          data[ni + 1] = Math.max(0, Math.min(255, data[ni + 1] + errG * factor));
          data[ni + 2] = Math.max(0, Math.min(255, data[ni + 2] + errB * factor));
        }
      };
      
      distribute(1, 0, 7/16);
      distribute(-1, 1, 3/16);
      distribute(0, 1, 5/16);
      distribute(1, 1, 1/16);
    }
  }
  
  return new ImageData(data, width, height);
}

// K-Means clustering for color quantization
function kMeansQuantize(imageData: ImageData, colorCount: number): [number, number, number][] {
  const pixels: [number, number, number][] = [];
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] > 128) {
      pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
    }
  }

  if (pixels.length === 0) return [];

  let centroids: [number, number, number][] = [];
  for (let i = 0; i < colorCount; i++) {
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
  }

  for (let iter = 0; iter < 15; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: colorCount }, () => []);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let nearest = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - centroids[c][0], 2) +
          Math.pow(pixel[1] - centroids[c][1], 2) +
          Math.pow(pixel[2] - centroids[c][2], 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }
      clusters[nearest].push(pixel);
    }

    centroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i];
      const sum = cluster.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
      return [sum[0] / cluster.length, sum[1] / cluster.length, sum[2] / cluster.length] as [number, number, number];
    });
  }

  return centroids.map(c => [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])] as [number, number, number]);
}

function rgbToString(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

type ExtendedTool = PixelTool | 'select';

const tools: { type: ExtendedTool; icon: typeof Pencil; label: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pencil' },
  { type: 'eraser', icon: Eraser, label: 'Eraser' },
  { type: 'bucket', icon: PaintBucket, label: 'Fill' },
  { type: 'eyedropper', icon: Pipette, label: 'Picker' },
  { type: 'select', icon: Square, label: 'Select' },
];

// Ruler component with numbers
function Ruler({ 
  type, 
  size, 
  cellSize, 
  offset = 0 
}: { 
  type: 'horizontal' | 'vertical'; 
  size: number; 
  cellSize: number; 
  offset?: number;
}) {
  const rulerSize = 24;
  const markers = useMemo(() => {
    const items = [];
    for (let i = 0; i < size; i++) {
      const isMajor = (i + 1) % 10 === 0;
      const isMinor = (i + 1) % 5 === 0;
      items.push({ index: i, isMajor, isMinor, label: i + 1 });
    }
    return items;
  }, [size]);

  if (type === 'horizontal') {
    return (
      <div 
        className="flex bg-muted/40 border-b border-border/50 select-none"
        style={{ marginLeft: rulerSize, height: rulerSize }}
      >
        {markers.map(({ index, isMajor, isMinor, label }) => (
          <div
            key={index}
            className="relative flex items-end justify-center border-r"
            style={{ 
              width: cellSize + 1, 
              borderColor: isMajor ? 'hsl(var(--primary) / 0.3)' : 'transparent'
            }}
          >
            {isMajor && (
              <span className="text-[9px] font-medium text-muted-foreground pb-0.5">
                {label}
              </span>
            )}
            {!isMajor && isMinor && (
              <div className="w-[1px] h-2 bg-muted-foreground/30" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col bg-muted/40 border-r border-border/50 select-none"
      style={{ width: rulerSize }}
    >
      <div style={{ height: rulerSize }} /> {/* Corner spacer */}
      {markers.map(({ index, isMajor, isMinor, label }) => (
        <div
          key={index}
          className="relative flex items-center justify-end border-b pr-1"
          style={{ 
            height: cellSize + 1, 
            borderColor: isMajor ? 'hsl(var(--primary) / 0.3)' : 'transparent'
          }}
        >
          {isMajor && (
            <span className="text-[9px] font-medium text-muted-foreground">
              {label}
            </span>
          )}
          {!isMajor && isMinor && (
            <div className="h-[1px] w-2 bg-muted-foreground/30" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function PixelGenerator() {
  const { 
    gaugeData, 
    pixelGrid, 
    setPixelGrid, 
    gridWidth, 
    gridHeight, 
    setGridDimensions, 
    colorPalette, 
    setColorPalette,
    selectedTool,
    setSelectedTool,
    selectedColor,
    setSelectedColor,
    customGridWidth,
    customGridHeight,
    setCustomGridDimensions,
    paintPixel,
    erasePixel,
    bucketFill
  } = useYarnCluesStore();
  
  const [colorCount, setColorCount] = useState(6);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showLoupe, setShowLoupe] = useState(false);
  const [loupePosition, setLoupePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [useDithering, setUseDithering] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);
  const [currentTool, setCurrentTool] = useState<ExtendedTool>('pencil');
  
  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    isSelecting: false,
    hasSelection: false,
    copiedCells: [],
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safe gauge ratio
  const safeGaugeRatio = typeof gaugeData?.gaugeRatio === 'number' && Number.isFinite(gaugeData.gaugeRatio) 
    ? gaugeData.gaugeRatio 
    : 1;

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const processImage = useCallback(() => {
    if (!uploadedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const targetWidth = customGridWidth;
      const targetHeight = customGridHeight;
      
      setGridDimensions(targetWidth, targetHeight);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      
      // Get palette via K-means
      const paletteRgb = kMeansQuantize(imageData, colorCount);
      setColorPalette(paletteRgb.map(rgbToString));
      
      // Apply Floyd-Steinberg dithering if enabled
      if (useDithering) {
        imageData = floydSteinbergDither(imageData, targetWidth, targetHeight, paletteRgb);
      }

      // Create pixel grid
      const newGrid: PixelCell[] = [];
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          const i = (y * targetWidth + x) * 4;
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          newGrid.push({ x, y, color: `rgb(${r}, ${g}, ${b})` });
        }
      }
      setPixelGrid(newGrid);
    };
    img.src = uploadedImage;
  }, [uploadedImage, colorCount, customGridWidth, customGridHeight, useDithering, setGridDimensions, setColorPalette, setPixelGrid]);

  useEffect(() => {
    if (uploadedImage) {
      processImage();
    }
  }, [uploadedImage, colorCount, customGridWidth, customGridHeight, useDithering, processImage]);

  const cellWidth = 14;
  const cellHeight = cellWidth * safeGaugeRatio;

  // Selection helpers
  const getSelectionBounds = () => {
    const minX = Math.min(selection.startX, selection.endX);
    const maxX = Math.max(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxY = Math.max(selection.startY, selection.endY);
    return { minX, maxX, minY, maxY };
  };

  const isInSelection = (x: number, y: number) => {
    if (!selection.hasSelection) return false;
    const { minX, maxX, minY, maxY } = getSelectionBounds();
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };

  const handleCellClick = (x: number, y: number) => {
    if (currentTool === 'select') return;
    
    const tool = currentTool as PixelTool;
    switch (tool) {
      case 'pencil':
        paintPixel(x, y, selectedColor);
        break;
      case 'eraser':
        erasePixel(x, y);
        break;
      case 'bucket':
        bucketFill(x, y, selectedColor);
        break;
      case 'eyedropper':
        const cell = pixelGrid.find(p => p.x === x && p.y === y);
        if (cell) {
          setSelectedColor(cell.color);
          setCurrentTool('pencil');
        }
        break;
    }
  };

  const handleMouseDown = (x: number, y: number) => {
    if (currentTool === 'select') {
      setSelection(prev => ({
        ...prev,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        isSelecting: true,
        hasSelection: false,
      }));
    } else {
      setIsDragging(true);
      handleCellClick(x, y);
    }
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (currentTool === 'select' && selection.isSelecting) {
      setSelection(prev => ({ ...prev, endX: x, endY: y }));
    } else if (isDragging && (currentTool === 'pencil' || currentTool === 'eraser')) {
      handleCellClick(x, y);
    }
  };

  const handleMouseUp = () => {
    if (currentTool === 'select' && selection.isSelecting) {
      setSelection(prev => ({ ...prev, isSelecting: false, hasSelection: true }));
    }
    setIsDragging(false);
  };

  // Selection actions
  const copySelection = () => {
    if (!selection.hasSelection) return;
    const { minX, maxX, minY, maxY } = getSelectionBounds();
    const copied = pixelGrid.filter(cell => 
      cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY
    ).map(cell => ({
      ...cell,
      x: cell.x - minX, // Normalize to 0,0
      y: cell.y - minY,
    }));
    setSelection(prev => ({ ...prev, copiedCells: copied }));
  };

  const pasteSelection = (offsetX: number = 0, offsetY: number = 0) => {
    if (selection.copiedCells.length === 0) return;
    const { minX, minY } = getSelectionBounds();
    const newGrid = [...pixelGrid];
    
    selection.copiedCells.forEach(copiedCell => {
      const targetX = minX + copiedCell.x + offsetX;
      const targetY = minY + copiedCell.y + offsetY;
      const idx = newGrid.findIndex(c => c.x === targetX && c.y === targetY);
      if (idx >= 0) {
        newGrid[idx] = { ...newGrid[idx], color: copiedCell.color };
      }
    });
    
    setPixelGrid(newGrid);
  };

  const rotateSelection90 = () => {
    if (!selection.hasSelection) return;
    const { minX, maxX, minY, maxY } = getSelectionBounds();
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    
    const newGrid = [...pixelGrid];
    const selectionCells = pixelGrid.filter(cell => 
      cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY
    );
    
    // Rotate 90° clockwise: (x, y) -> (height - 1 - y, x)
    selectionCells.forEach(cell => {
      const localX = cell.x - minX;
      const localY = cell.y - minY;
      const newLocalX = height - 1 - localY;
      const newLocalY = localX;
      
      // Map back if within bounds
      const targetX = minX + newLocalX;
      const targetY = minY + newLocalY;
      
      if (targetX < gridWidth && targetY < gridHeight) {
        const idx = newGrid.findIndex(c => c.x === targetX && c.y === targetY);
        if (idx >= 0) {
          newGrid[idx] = { ...newGrid[idx], color: cell.color };
        }
      }
    });
    
    setPixelGrid(newGrid);
  };

  const clearSelection = () => {
    setSelection({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      isSelecting: false,
      hasSelection: false,
      copiedCells: [],
    });
  };

  const handleGridTouch = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setLoupePosition({ x: touch.clientX, y: touch.clientY });
    setShowLoupe(true);
  };

  const createEmptyGrid = () => {
    const newGrid: PixelCell[] = [];
    const defaultColor = colorPalette[0] || '#FDFBF7';
    for (let y = 0; y < customGridHeight; y++) {
      for (let x = 0; x < customGridWidth; x++) {
        newGrid.push({ x, y, color: defaultColor });
      }
    }
    setGridDimensions(customGridWidth, customGridHeight);
    setPixelGrid(newGrid);
  };

  // Handle tool change - sync with store for non-select tools
  const handleToolChange = (tool: ExtendedTool) => {
    setCurrentTool(tool);
    if (tool !== 'select') {
      setSelectedTool(tool as PixelTool);
    }
    if (tool !== 'select') {
      clearSelection();
    }
  };

  // Render cell with grid line logic
  const renderCell = (cell: PixelCell, index: number) => {
    const isMajorX = (cell.x + 1) % 10 === 0;
    const isMajorY = (cell.y + 1) % 10 === 0;
    const inSelection = isInSelection(cell.x, cell.y);
    const isSelectionBorder = selection.hasSelection && (
      cell.x === Math.min(selection.startX, selection.endX) ||
      cell.x === Math.max(selection.startX, selection.endX) ||
      cell.y === Math.min(selection.startY, selection.endY) ||
      cell.y === Math.max(selection.startY, selection.endY)
    ) && inSelection;

    return (
      <div
        key={index}
        className={`
          transition-transform cursor-crosshair
          ${!showGridLines ? '' : isMajorX && isMajorY ? 'border-r-2 border-b-2 border-primary/40' : 
            isMajorX ? 'border-r-2 border-primary/40' : 
            isMajorY ? 'border-b-2 border-primary/40' : ''}
          ${inSelection ? 'ring-1 ring-inset ring-primary/60' : ''}
          ${isSelectionBorder ? 'ring-2 ring-primary' : ''}
        `}
        style={{ 
          width: cellWidth, 
          height: cellHeight,
          backgroundColor: cell.color,
        }}
        onMouseDown={() => handleMouseDown(cell.x, cell.y)}
        onMouseEnter={() => handleMouseEnter(cell.x, cell.y)}
      />
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yarn-rose/30 flex items-center justify-center">
            <Grid3X3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Pixel Generator</h1>
            <p className="text-muted-foreground">Convert images to gauge-aware yarn grids with Floyd-Steinberg dithering</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Upload & Settings */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium">Image Upload</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-xl"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-24 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all soft-press"
            variant="ghost"
          >
            <div className="text-center">
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Upload image</p>
            </div>
          </Button>

          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 border-t border-border/30 pt-4"
            >
              <h3 className="text-sm font-medium">Canvas Dimensions</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Width (sts)</Label>
                  <Input
                    type="number"
                    value={customGridWidth}
                    onChange={(e) => setCustomGridDimensions(Number(e.target.value), customGridHeight)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (rows)</Label>
                  <Input
                    type="number"
                    value={customGridHeight}
                    onChange={(e) => setCustomGridDimensions(customGridWidth, Number(e.target.value))}
                    className="h-9"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={createEmptyGrid}
                className="w-full rounded-xl"
              >
                Create Empty Canvas
              </Button>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dithering"
                  checked={useDithering}
                  onChange={(e) => setUseDithering(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="dithering" className="text-sm">Floyd-Steinberg Dithering</Label>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Colors: {colorCount}</h3>
            </div>
            <Slider
              value={[colorCount]}
              onValueChange={([val]) => setColorCount(val)}
              min={2}
              max={16}
              step={1}
              className="w-full"
            />
          </div>

          {colorPalette.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Palette</h3>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map((color, i) => (
                  <button
                    key={i}
                    className={`w-8 h-8 rounded-lg shadow-sm transition-all ${
                      selectedColor === color ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Editing Tools */}
          <div className="space-y-2 border-t border-border/30 pt-4">
            <h3 className="text-sm font-medium text-muted-foreground">Tools</h3>
            <div className="grid grid-cols-5 gap-1">
              {tools.map((tool) => (
                <Tooltip key={tool.type}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentTool === tool.type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToolChange(tool.type)}
                      className="h-10 rounded-xl flex-col gap-0.5 soft-press px-2"
                    >
                      <tool.icon className="w-4 h-4" />
                      <span className="text-[9px]">{tool.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Selection Actions */}
          {selection.hasSelection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 border-t border-border/30 pt-4"
            >
              <h3 className="text-sm font-medium text-muted-foreground">Selection Actions</h3>
              <div className="grid grid-cols-3 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={copySelection} className="rounded-xl">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => pasteSelection(1, 1)} 
                      disabled={selection.copiedCells.length === 0}
                      className="rounded-xl"
                    >
                      <Move className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paste (+1,+1)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={rotateSelection90} className="rounded-xl">
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate 90°</TooltipContent>
                </Tooltip>
              </div>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="w-full rounded-xl text-muted-foreground">
                Clear Selection
              </Button>
            </motion.div>
          )}

          {/* Grid Toggle */}
          <div className="flex items-center justify-between border-t border-border/30 pt-4">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Grid Lines</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGridLines(!showGridLines)}
              className="rounded-xl"
            >
              {showGridLines ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>

          <div className="frosted-panel">
            <div className="flex items-center gap-2 mb-2">
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gauge Ratio</span>
            </div>
            <p className="text-2xl font-display font-semibold text-primary">
              {safeGaugeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Applied to grid cell dimensions
            </p>
          </div>
        </motion.div>

        {/* Pixel Grid */}
        <motion.div variants={itemVariants} className="lg:col-span-3 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Yarn Grid Preview</h2>
            <span className="text-sm text-muted-foreground">
              {gridWidth} × {gridHeight} stitches
            </span>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {pixelGrid.length > 0 ? (
            <div 
              className="overflow-auto max-h-[600px] rounded-2xl bg-muted/20"
              onTouchStart={handleGridTouch}
              onTouchMove={handleGridTouch}
              onTouchEnd={() => setShowLoupe(false)}
            >
              <div className="inline-flex">
                {/* Vertical Ruler */}
                <Ruler type="vertical" size={gridHeight} cellSize={cellHeight} />
                
                <div className="flex flex-col">
                  {/* Horizontal Ruler */}
                  <Ruler type="horizontal" size={gridWidth} cellSize={cellWidth} />
                  
                  {/* Grid */}
                  <div 
                    className={`inline-grid ${showGridLines ? 'gap-[1px]' : 'gap-0'}`}
                    style={{ 
                      gridTemplateColumns: `repeat(${gridWidth}, ${cellWidth}px)`,
                    }}
                  >
                    {pixelGrid.map((cell, i) => renderCell(cell, i))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center rounded-2xl bg-muted/20">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Upload an image or create an empty canvas</p>
                <Button variant="outline" onClick={createEmptyGrid} className="rounded-xl">
                  Create {customGridWidth}×{customGridHeight} Canvas
                </Button>
              </div>
            </div>
          )}

          {/* Mobile Loupe */}
          {showLoupe && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="fixed w-32 h-32 rounded-full glass-card border-4 border-primary/30 overflow-hidden pointer-events-none z-50"
              style={{
                left: loupePosition.x - 64,
                top: loupePosition.y - 150,
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ZoomIn className="w-8 h-8" />
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
