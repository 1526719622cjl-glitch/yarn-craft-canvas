import { motion } from 'framer-motion';
import { useYarnCluesStore, PixelTool } from '@/store/useYarnCluesStore';
import { Grid3X3, Upload, Palette, ZoomIn, Pencil, Eraser, PaintBucket, Pipette, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useState, useRef, useCallback, useEffect } from 'react';

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

const tools: { type: PixelTool; icon: typeof Pencil; label: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pencil' },
  { type: 'eraser', icon: Eraser, label: 'Eraser' },
  { type: 'bucket', icon: PaintBucket, label: 'Fill' },
  { type: 'eyedropper', icon: Pipette, label: 'Picker' },
];

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
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const newGrid = [];
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

  const cellWidth = 12;
  const cellHeight = cellWidth * gaugeData.gaugeRatio;

  const handleCellClick = (x: number, y: number) => {
    switch (selectedTool) {
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
          setSelectedTool('pencil');
        }
        break;
    }
  };

  const handleMouseDown = (x: number, y: number) => {
    setIsDragging(true);
    handleCellClick(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (isDragging && (selectedTool === 'pencil' || selectedTool === 'eraser')) {
      handleCellClick(x, y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleGridTouch = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setLoupePosition({ x: touch.clientX, y: touch.clientY });
    setShowLoupe(true);
  };

  const createEmptyGrid = () => {
    const newGrid = [];
    const defaultColor = colorPalette[0] || '#FDFBF7';
    for (let y = 0; y < customGridHeight; y++) {
      for (let x = 0; x < customGridWidth; x++) {
        newGrid.push({ x, y, color: defaultColor });
      }
    }
    setGridDimensions(customGridWidth, customGridHeight);
    setPixelGrid(newGrid);
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
            <p className="text-muted-foreground">Convert images to gauge-aware yarn grids</p>
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
            <div className="grid grid-cols-4 gap-2">
              {tools.map((tool) => (
                <Button
                  key={tool.type}
                  variant={selectedTool === tool.type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTool(tool.type)}
                  className="h-10 rounded-xl flex-col gap-0.5 soft-press"
                >
                  <tool.icon className="w-4 h-4" />
                  <span className="text-[10px]">{tool.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="frosted-panel">
            <div className="flex items-center gap-2 mb-2">
              <ZoomIn className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Gauge Ratio</span>
            </div>
            <p className="text-2xl font-display font-semibold text-primary">
              {gaugeData.gaugeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Applied to grid cell dimensions
            </p>
          </div>
        </motion.div>

        {/* Pixel Grid */}
        <motion.div variants={itemVariants} className="lg:col-span-3 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">Yarn Grid Preview</h2>
            <span className="text-sm text-muted-foreground">
              {gridWidth} × {gridHeight} stitches
            </span>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {pixelGrid.length > 0 ? (
            <div 
              className="overflow-auto max-h-[600px] rounded-2xl bg-muted/20 p-4"
              onTouchStart={handleGridTouch}
              onTouchMove={handleGridTouch}
              onTouchEnd={() => setShowLoupe(false)}
            >
              <div 
                className="inline-grid gap-[1px]"
                style={{ 
                  gridTemplateColumns: `repeat(${gridWidth}, ${cellWidth}px)`,
                }}
              >
                {pixelGrid.map((cell, i) => (
                  <div
                    key={i}
                    className="rounded-[2px] cursor-crosshair transition-transform hover:scale-110 hover:z-10"
                    style={{ 
                      width: cellWidth, 
                      height: cellHeight,
                      backgroundColor: cell.color,
                    }}
                    onMouseDown={() => handleMouseDown(cell.x, cell.y)}
                    onMouseEnter={() => handleMouseEnter(cell.x, cell.y)}
                  />
                ))}
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
