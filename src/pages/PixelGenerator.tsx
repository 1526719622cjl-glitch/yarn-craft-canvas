import { motion } from 'framer-motion';
import { useYarnCluesStore } from '@/store/useYarnCluesStore';
import { Grid3X3, Upload, Palette, ZoomIn } from 'lucide-react';
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

// K-Means clustering for color quantization
function kMeansQuantize(imageData: ImageData, colorCount: number): string[] {
  const pixels: [number, number, number][] = [];
  
  // Sample pixels
  for (let i = 0; i < imageData.data.length; i += 4) {
    if (imageData.data[i + 3] > 128) { // Only opaque pixels
      pixels.push([imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]]);
    }
  }

  if (pixels.length === 0) return [];

  // Initialize centroids randomly
  let centroids: [number, number, number][] = [];
  for (let i = 0; i < colorCount; i++) {
    centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
  }

  // K-Means iterations
  for (let iter = 0; iter < 10; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: colorCount }, () => []);

    // Assign pixels to nearest centroid
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

    // Update centroids
    centroids = clusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i];
      const sum = cluster.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
      return [sum[0] / cluster.length, sum[1] / cluster.length, sum[2] / cluster.length] as [number, number, number];
    });
  }

  return centroids.map(c => 
    `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`
  );
}

function getClosestColor(r: number, g: number, b: number, palette: string[]): string {
  let closest = palette[0];
  let minDist = Infinity;

  for (const color of palette) {
    const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (match) {
      const [, cr, cg, cb] = match.map(Number);
      const dist = Math.sqrt(
        Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = color;
      }
    }
  }

  return closest;
}

export default function PixelGenerator() {
  const { gaugeData, pixelGrid, setPixelGrid, gridWidth, gridHeight, setGridDimensions, colorPalette, setColorPalette } = useYarnCluesStore();
  const [colorCount, setColorCount] = useState(6);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showLoupe, setShowLoupe] = useState(false);
  const [loupePosition, setLoupePosition] = useState({ x: 0, y: 0 });
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
      // Calculate grid dimensions based on gauge ratio
      const aspectRatio = img.width / img.height;
      const baseSize = 30;
      const newWidth = Math.round(baseSize * aspectRatio);
      const newHeight = baseSize;
      
      setGridDimensions(newWidth, newHeight);

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
      
      // Quantize colors
      const palette = kMeansQuantize(imageData, colorCount);
      setColorPalette(palette);

      // Create pixel grid
      const newGrid = [];
      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          const i = (y * newWidth + x) * 4;
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          const color = getClosestColor(r, g, b, palette);
          newGrid.push({ x, y, color });
        }
      }
      setPixelGrid(newGrid);
    };
    img.src = uploadedImage;
  }, [uploadedImage, colorCount, setGridDimensions, setColorPalette, setPixelGrid]);

  useEffect(() => {
    if (uploadedImage) {
      processImage();
    }
  }, [uploadedImage, colorCount, processImage]);

  const cellWidth = 16;
  const cellHeight = cellWidth * gaugeData.gaugeRatio;

  const handleGridTouch = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setLoupePosition({ x: touch.clientX, y: touch.clientY });
    setShowLoupe(true);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Settings */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">Image Upload</h2>
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
            className="w-full h-32 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all soft-press"
            variant="ghost"
          >
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload image</p>
            </div>
          </Button>

          {uploadedImage && (
            <div className="rounded-2xl overflow-hidden">
              <img src={uploadedImage} alt="Uploaded" className="w-full h-auto" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Color Count: {colorCount}</h3>
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
              <h3 className="text-sm font-medium text-muted-foreground">Extracted Palette</h3>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg shadow-soft"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

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
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">Yarn Grid Preview</h2>
            <span className="text-sm text-muted-foreground">
              {gridWidth} × {gridHeight} stitches
            </span>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {pixelGrid.length > 0 ? (
            <div 
              className="overflow-auto max-h-[500px] rounded-2xl bg-muted/20 p-4"
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
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.001 }}
                    className="rounded-sm transition-transform hover:scale-110 hover:z-10"
                    style={{ 
                      width: cellWidth, 
                      height: cellHeight,
                      backgroundColor: cell.color,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center rounded-2xl bg-muted/20">
              <p className="text-muted-foreground">Upload an image to generate a grid</p>
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
