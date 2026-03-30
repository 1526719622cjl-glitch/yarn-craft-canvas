// PixelGenerator - Updated 2026-03-30
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/useI18n';
import { useYarnCluesStore, PixelTool, PixelCell } from '@/store/useYarnCluesStore';
import { 
  Grid3X3, Upload, Palette, Pencil, Eraser, PaintBucket, Pipette, 
  Square, RotateCw, Copy, Move, Grid, Eye, EyeOff, Layers, Replace,
  FlipHorizontal, Sliders, Lock, Unlock, Plus, Undo, Redo,
  RefreshCw, Download, Save, FolderOpen, Navigation, Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SymmetryTools, SymmetryMode, getSymmetricPoints } from '@/components/pixel/SymmetryTools';
import { ColorLegend } from '@/components/pixel/ColorLegend';
import { StitchTypeSelector, StitchType, getStitchRatio } from '@/components/pixel/StitchTypeSelector';
import { InfiniteCanvas } from '@/components/pixel/InfiniteCanvas';
import { StashColor } from '@/components/pixel/YarnStashPalette';
import { ImageCropDialog } from '@/components/pixel/ImageCropDialog';
import { CanvasSizeDialog } from '@/components/pixel/CanvasSizeDialog';
import { ColorLibrary } from '@/components/pixel/ColorLibrary';
import { PixelKnittingGuide } from '@/components/pixel/PixelKnittingGuide';
import { useUndoRedo, useUndoRedoKeyboard } from '@/hooks/useUndoRedo';
import { usePixelDesigns } from '@/hooks/usePixelDesigns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

type ExtendedTool = PixelTool | 'select' | 'replace';

const tools: { type: ExtendedTool; icon: typeof Pencil; label: string }[] = [
  { type: 'pencil', icon: Pencil, label: 'Pencil' },
  { type: 'eraser', icon: Eraser, label: 'Eraser' },
  { type: 'bucket', icon: PaintBucket, label: 'Fill' },
  { type: 'eyedropper', icon: Pipette, label: 'Picker' },
  { type: 'select', icon: Square, label: 'Select' },
  { type: 'replace', icon: Replace, label: 'Replace' },
];

// Ruler component moved to InfiniteCanvas component

export default function PixelGenerator() {
  const { t } = useI18n();
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

  const { user } = useAuth();
  const { toast } = useToast();
  const { designs, saveDesign, deleteDesign, updateKnittingProgress } = usePixelDesigns();
  
  const [colorCount, setColorCount] = useState(8);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [baseImageDataUrl, setBaseImageDataUrl] = useState<string | null>(null);
  const [rotationTurns, setRotationTurns] = useState(0); // 0-3, tracks 90° CW rotations from original
  const [isDragging, setIsDragging] = useState(false);
  const [useDithering, setUseDithering] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [currentTool, setCurrentTool] = useState<ExtendedTool>('pencil');
  const [symmetryMode, setSymmetryMode] = useState<SymmetryMode>('none');
  const [stitchType, setStitchType] = useState<StitchType>('sc');
  const [traceOpacity, setTraceOpacity] = useState(0);
  const [ignoredColor, setIgnoredColor] = useState<string | null>(null);
  const [stashColors, setStashColors] = useState<StashColor[]>([]);
  const [limitToPalette, setLimitToPalette] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  
  // New state for enhancements
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [showCanvasSizeDialog, setShowCanvasSizeDialog] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingCroppedImage, setPendingCroppedImage] = useState<{ url: string; width: number; height: number } | null>(null);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [manualHeight, setManualHeight] = useState(customGridHeight);
  const [emptyCanvasColor, setEmptyCanvasColor] = useState('#FDFBF7');
  const [customColor, setCustomColor] = useState('#6B8E23');
  const eyedropperInputRef = useRef<HTMLInputElement>(null);
  const eyedropperCanvasRef = useRef<HTMLCanvasElement>(null);
  // Canvas scaling state
  const [canvasScale, setCanvasScale] = useState(100);

  // New features state
  const [showKnittingGuide, setShowKnittingGuide] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [designName, setDesignName] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportIncludeGrid, setExportIncludeGrid] = useState(true);
  const [exportIncludeNumbers, setExportIncludeNumbers] = useState(true);
  const [eraserSize, setEraserSize] = useState(1);
  const [eyedropperImage, setEyedropperImage] = useState<string | null>(null);
  const [eyedropperPos, setEyedropperPos] = useState<{ x: number; y: number } | null>(null);
  const [showEyedropperDialog, setShowEyedropperDialog] = useState(false);
  const [activeDesignId, setActiveDesignId] = useState<string | null>(null);
  const [activeDesignProgress, setActiveDesignProgress] = useState<any>(null);

  // Undo/Redo state for pixel grid
  const {
    state: undoablePixelGrid,
    set: setUndoableGrid,
    undo: undoGrid,
    redo: redoGrid,
    canUndo,
    canRedo,
    reset: resetUndoHistory,
  } = useUndoRedo<PixelCell[]>(pixelGrid, 30);

  // Keyboard shortcuts for undo/redo
  useUndoRedoKeyboard(undoGrid, redoGrid, pixelGrid.length > 0);

  // Sync undo state with store
  useEffect(() => {
    if (undoablePixelGrid && JSON.stringify(undoablePixelGrid) !== JSON.stringify(pixelGrid)) {
      setPixelGrid(undoablePixelGrid);
    }
  }, [undoablePixelGrid]);
  
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

  // Safe gauge ratio combined with stitch type ratio
  const baseGaugeRatio = typeof gaugeData?.gaugeRatio === 'number' && Number.isFinite(gaugeData.gaugeRatio) 
    ? gaugeData.gaugeRatio 
    : 1;
  const stitchRatio = getStitchRatio(stitchType);
  const combinedRatio = baseGaugeRatio * stitchRatio;

  // Calculate target height based on width and stitch ratio (or use manual height)
  const calculatedHeight = useMemo(() => {
    if (lockAspectRatio) {
      return Math.round(customGridWidth / combinedRatio);
    }
    return manualHeight;
  }, [customGridWidth, combinedRatio, lockAspectRatio, manualHeight]);

  // Sync manual height with calculated when lock is enabled
  useEffect(() => {
    if (lockAspectRatio) {
      setManualHeight(Math.round(customGridWidth / combinedRatio));
    }
  }, [customGridWidth, combinedRatio, lockAspectRatio]);

  // Re-quantize colors from original base image when colorCount changes — rebuild entire grid from source
  // Uses rotationTurns to apply current rotation to the original image before quantizing
  useEffect(() => {
    if (!baseImageDataUrl || pixelGrid.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetW = gridWidth;
    const targetH = gridHeight;

    const img = new Image();
    img.onload = () => {
      // First draw original image to a temp canvas
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Apply rotation: for turns 0/2, use original aspect; for 1/3, swap
      const turns = rotationTurns % 4;
      const swapped = turns === 1 || turns === 3;
      const srcW = swapped ? targetH : targetW;
      const srcH = swapped ? targetW : targetH;
      
      tempCanvas.width = srcW;
      tempCanvas.height = srcH;
      tempCtx.drawImage(img, 0, 0, srcW, srcH);
      const srcData = tempCtx.getImageData(0, 0, srcW, srcH);
      
      // Now create rotated image data at targetW x targetH
      canvas.width = targetW;
      canvas.height = targetH;
      const rotatedData = ctx.createImageData(targetW, targetH);
      
      for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          let sx: number, sy: number;
          switch (turns) {
            case 0: sx = x; sy = y; break;
            case 1: sx = y; sy = srcH - 1 - x; break;
            case 2: sx = srcW - 1 - x; sy = srcH - 1 - y; break;
            case 3: sx = srcW - 1 - y; sy = x; break;
            default: sx = x; sy = y;
          }
          sx = Math.min(sx, srcW - 1);
          sy = Math.min(sy, srcH - 1);
          const si = (sy * srcW + sx) * 4;
          const di = (y * targetW + x) * 4;
          rotatedData.data[di] = srcData.data[si];
          rotatedData.data[di + 1] = srcData.data[si + 1];
          rotatedData.data[di + 2] = srcData.data[si + 2];
          rotatedData.data[di + 3] = srcData.data[si + 3];
        }
      }
      
      ctx.putImageData(rotatedData, 0, 0);
      let imageData = rotatedData;

      let paletteRgb = kMeansQuantize(imageData, colorCount);

      if (limitToPalette && stashColors.length > 0) {
        paletteRgb = stashColors.map(c => {
          const m = c.hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
          return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] as [number,number,number] : [128,128,128] as [number,number,number];
        });
      }

      setColorPalette(paletteRgb.map(rgbToString));

      if (useDithering) {
        imageData = floydSteinbergDither(imageData, targetW, targetH, paletteRgb);
      }

      const newGrid: PixelCell[] = [];
      for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          const i = (y * targetW + x) * 4;
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          newGrid.push({ x, y, color: `rgb(${r}, ${g}, ${b})` });
        }
      }
      setPixelGrid(newGrid);
      resetUndoHistory(newGrid);
    };
    img.src = baseImageDataUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorCount]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setPendingImageUrl(imageUrl);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  const handleCropComplete = useCallback((croppedImageUrl: string, width: number, height: number) => {
    setPendingCroppedImage({ url: croppedImageUrl, width, height });
    setPendingImageUrl(null);
    setShowCanvasSizeDialog(true);
  }, []);

  const handleCanvasSizeConfirm = useCallback((canvasWidth: number, canvasHeight: number) => {
    if (pendingCroppedImage) {
      const imageUrl = pendingCroppedImage.url;
      setPendingCroppedImage(null);
      setCustomGridDimensions(canvasWidth, canvasHeight);
      setBaseImageDataUrl(imageUrl); // Store original base image for color re-quantization
      
      // Directly process image with confirmed dimensions - bypass state dependency issues
      processImageWithDimensions(imageUrl, canvasWidth, canvasHeight);
    }
  }, [pendingCroppedImage, setCustomGridDimensions]);
  
  // Process image with explicit dimensions (bypasses state sync issues)
  const processImageWithDimensions = useCallback((imageUrl: string, targetWidth: number, targetHeight: number) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      setGridDimensions(targetWidth, targetHeight);
      setUploadedImage(imageUrl);

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      let imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      
      // Get palette via K-means
      let paletteRgb = kMeansQuantize(imageData, colorCount);
      
      // If limit to stash palette is enabled, map to stash colors
      if (limitToPalette && stashColors.length > 0) {
        const stashRgb = stashColors.map(c => {
          const match = c.hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
          if (match) {
            return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] as [number, number, number];
          }
          return [128, 128, 128] as [number, number, number];
        });
        paletteRgb = stashRgb;
      }
      
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
      resetUndoHistory(newGrid);
      
      // Auto-detect background
      const colorCounts: Record<string, number> = {};
      for (const cell of newGrid) {
        colorCounts[cell.color] = (colorCounts[cell.color] || 0) + 1;
      }
      const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
      if (sortedColors.length > 0) {
        setIgnoredColor(null);
      }
    };
    img.src = imageUrl;
  }, [colorCount, useDithering, limitToPalette, stashColors, setGridDimensions, setColorPalette, setPixelGrid]);

  // Add custom color to palette
  const addColorToPalette = useCallback((color: string) => {
    if (!colorPalette.includes(color)) {
      setColorPalette([...colorPalette, color]);
    }
    setSelectedColor(color);
  }, [colorPalette, setColorPalette, setSelectedColor]);

  // Scale canvas proportionally (preserves existing edits using nearest-neighbor)
  const scaleCanvas = useCallback((newScale: number) => {
    if (pixelGrid.length === 0) return;
    
    const scaleFactor = newScale / 100;
    const newWidth = Math.round(gridWidth * scaleFactor);
    const newHeight = Math.round(gridHeight * scaleFactor);
    
    // Minimum size limit
    if (newWidth < 10 || newHeight < 10) return;
    if (newWidth > 500 || newHeight > 500) return;
    
    // Nearest-neighbor scaling to preserve edits
    const newGrid: PixelCell[] = [];
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        // Map to original coordinates
        const srcX = Math.floor(x / scaleFactor);
        const srcY = Math.floor(y / scaleFactor);
        const srcCell = pixelGrid.find(c => c.x === srcX && c.y === srcY);
        newGrid.push({ 
          x, 
          y, 
          color: srcCell?.color || '#FDFBF7' 
        });
      }
    }
    
    setGridDimensions(newWidth, newHeight);
    setPixelGrid(newGrid);
    setCanvasScale(100); // Reset slider after applying
  }, [pixelGrid, gridWidth, gridHeight, setGridDimensions, setPixelGrid]);

  // Cell sizing that responds to stitch type ratio
  // SC = 1:1 (square), HDC = 1:1.5, DC = 1:2
  const cellWidth = 14;
  const cellHeight = Math.round(cellWidth * stitchRatio);

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

  // Paint with symmetry support
  const paintWithSymmetry = (x: number, y: number, color: string) => {
    const points = getSymmetricPoints(x, y, gridWidth, gridHeight, symmetryMode);
    // Create new grid for batch update
    let newGrid = [...pixelGrid];
    for (const point of points) {
      const idx = newGrid.findIndex(p => p.x === point.x && p.y === point.y);
      if (idx >= 0) {
        newGrid[idx] = { ...newGrid[idx], color };
      }
    }
    setPixelGrid(newGrid);
    setUndoableGrid(newGrid);
  };

  // Replace all color
  const replaceAllColor = (oldColor: string, newColor: string) => {
    const newGrid = pixelGrid.map(cell => 
      cell.color === oldColor ? { ...cell, color: newColor } : cell
    );
    setPixelGrid(newGrid);
    setUndoableGrid(newGrid);
  };

  const handleCellClick = (x: number, y: number) => {
    if (currentTool === 'select') return;
    
    if (currentTool === 'replace') {
      const cell = pixelGrid.find(p => p.x === x && p.y === y);
      if (cell && cell.color !== selectedColor) {
        replaceAllColor(cell.color, selectedColor);
      }
      return;
    }
    
    const tool = currentTool as PixelTool;
    switch (tool) {
      case 'pencil':
        paintWithSymmetry(x, y, selectedColor);
        break;
      case 'eraser':
        const defaultColor = colorPalette[0] || '#FDFBF7';
        const eraseGrid = [...pixelGrid];
        const halfSize = Math.floor(eraserSize / 2);
        for (let dy = -halfSize; dy <= halfSize; dy++) {
          for (let dx = -halfSize; dx <= halfSize; dx++) {
            const ex = x + dx;
            const ey = y + dy;
            if (ex < 0 || ex >= gridWidth || ey < 0 || ey >= gridHeight) continue;
            const eraseIdx = eraseGrid.findIndex(p => p.x === ex && p.y === ey);
            if (eraseIdx >= 0) {
              eraseGrid[eraseIdx] = { ...eraseGrid[eraseIdx], color: defaultColor };
            }
          }
        }
        setPixelGrid(eraseGrid);
        setUndoableGrid(eraseGrid);
        break;
      case 'bucket':
        // Custom bucket fill that tracks undo
        const targetCell = pixelGrid.find(p => p.x === x && p.y === y);
        if (!targetCell || targetCell.color === selectedColor) break;
        
        const targetColor = targetCell.color;
        const bucketGrid = [...pixelGrid];
        const visited = new Set<string>();
        const stack: [number, number][] = [[x, y]];

        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          const key = `${cx},${cy}`;
          if (visited.has(key)) continue;
          if (cx < 0 || cx >= gridWidth || cy < 0 || cy >= gridHeight) continue;
          
          const cellIdx = bucketGrid.findIndex(p => p.x === cx && p.y === cy);
          if (cellIdx < 0 || bucketGrid[cellIdx].color !== targetColor) continue;

          visited.add(key);
          bucketGrid[cellIdx] = { ...bucketGrid[cellIdx], color: selectedColor };
          
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }

        setPixelGrid(bucketGrid);
        setUndoableGrid(bucketGrid);
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
      x: cell.x - minX,
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

  const createEmptyGrid = (fillColor?: string) => {
    const newGrid: PixelCell[] = [];
    const defaultColor = fillColor || emptyCanvasColor || colorPalette[0] || '#FDFBF7';
    for (let y = 0; y < calculatedHeight; y++) {
      for (let x = 0; x < customGridWidth; x++) {
        newGrid.push({ x, y, color: defaultColor });
      }
    }
    setGridDimensions(customGridWidth, calculatedHeight);
    setPixelGrid(newGrid);
    resetUndoHistory(newGrid);
    setColorPalette([defaultColor]);
  };

  const handleToolChange = (tool: ExtendedTool) => {
    setCurrentTool(tool);
    if (tool !== 'select') {
      setSelectedTool(tool as PixelTool);
    }
    if (tool !== 'select') {
      clearSelection();
    }
  };

  const handlePaletteColorClick = (color: string) => {
    setSelectedColor(color);
    if (currentTool !== 'pencil' && currentTool !== 'bucket' && currentTool !== 'replace') {
      setCurrentTool('pencil');
    }
  };

  // Download pixel grid as PNG with options
  const handleDownloadPNG = useCallback((showGrid: boolean = false, showNumbers: boolean = false) => {
    if (pixelGrid.length === 0) return;
    const scale = 10;
    const margin = showNumbers ? 30 : 0;
    const canvas = document.createElement('canvas');
    canvas.width = gridWidth * scale + margin;
    canvas.height = gridHeight * scale + margin;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FDFBF7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pixels
    for (const cell of pixelGrid) {
      ctx.fillStyle = cell.color;
      ctx.fillRect(margin + cell.x * scale, margin + cell.y * scale, scale, scale);
    }
    
    // Draw grid lines
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= gridWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(margin + x * scale, margin);
        ctx.lineTo(margin + x * scale, margin + gridHeight * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= gridHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(margin, margin + y * scale);
        ctx.lineTo(margin + gridWidth * scale, margin + y * scale);
        ctx.stroke();
      }
      // Major grid lines every 10
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= gridWidth; x += 10) {
        ctx.beginPath();
        ctx.moveTo(margin + x * scale, margin);
        ctx.lineTo(margin + x * scale, margin + gridHeight * scale);
        ctx.stroke();
      }
      for (let y = 0; y <= gridHeight; y += 10) {
        ctx.beginPath();
        ctx.moveTo(margin, margin + y * scale);
        ctx.lineTo(margin + gridWidth * scale, margin + y * scale);
        ctx.stroke();
      }
    }
    
    // Draw row/column numbers
    if (showNumbers) {
      ctx.fillStyle = '#333';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Column numbers on top
      for (let x = 0; x < gridWidth; x += 5) {
        ctx.fillText(String(x + 1), margin + x * scale + scale / 2, margin / 2);
      }
      // Row numbers on left
      ctx.textAlign = 'right';
      for (let y = 0; y < gridHeight; y += 5) {
        ctx.fillText(String(y + 1), margin - 4, margin + y * scale + scale / 2);
      }
    }
    
    const link = document.createElement('a');
    link.download = 'pixel-design.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [pixelGrid, gridWidth, gridHeight]);

  // Rotate entire canvas 90° clockwise
  const rotateCanvas90 = useCallback(() => {
    if (pixelGrid.length === 0) return;
    const newGrid: PixelCell[] = [];
    for (let r = 0; r < gridWidth; r++) {
      for (let c = 0; c < gridHeight; c++) {
        const srcX = c;
        const srcY = gridWidth - 1 - r;
        const srcCell = pixelGrid.find(p => p.x === srcX && p.y === srcY);
        newGrid.push({ x: r, y: c, color: srcCell?.color || '#FDFBF7' });
      }
    }
    // Swap dimensions: new width = old height, new height = old width
    // But our grid stores (x, y) where x is col and y is row
    // After 90° CW rotation: newWidth = gridHeight, newHeight = gridWidth
    const newW = gridHeight;
    const newH = gridWidth;
    // Re-map correctly
    const correctGrid: PixelCell[] = [];
    for (let y = 0; y < newH; y++) {
      for (let x = 0; x < newW; x++) {
        // Map from old: old_x = y, old_y = (newW - 1 - x)  -- for 90° CW
        const oldX = y;
        const oldY = newW - 1 - x;
        const oldCell = pixelGrid.find(p => p.x === oldX && p.y === oldY);
        correctGrid.push({ x, y, color: oldCell?.color || '#FDFBF7' });
      }
    }
    setGridDimensions(newW, newH);
    setPixelGrid(correctGrid);
    setUndoableGrid(correctGrid);
  }, [pixelGrid, gridWidth, gridHeight, setGridDimensions, setPixelGrid, setUndoableGrid]);

  // Save design to library
  const handleSaveDesign = useCallback(async () => {
    if (!designName.trim()) return;
    try {
      await saveDesign.mutateAsync({
        name: designName.trim(),
        grid_data: pixelGrid,
        width: gridWidth,
        height: gridHeight,
        color_palette: colorPalette,
      });
      toast({ title: t('pixel.designSaved') });
      setShowSaveDialog(false);
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    }
  }, [designName, pixelGrid, gridWidth, gridHeight, colorPalette, saveDesign, toast, t]);

  // Load design from library
  const handleLoadDesign = useCallback((design: any) => {
    setGridDimensions(design.width, design.height);
    setPixelGrid(design.grid_data);
    setColorPalette(design.color_palette);
    resetUndoHistory(design.grid_data);
    setActiveDesignId(design.id);
    setActiveDesignProgress(design.knitting_progress || null);
    setShowLibrary(false);
    toast({ title: t('pixel.designLoaded') });
  }, [setGridDimensions, setPixelGrid, setColorPalette, resetUndoHistory, toast, t]);

  const toggleIgnoreBackground = () => {
    if (ignoredColor) {
      setIgnoredColor(null);
    } else if (colorPalette.length > 0) {
      // Find most frequent color
      const colorCounts: Record<string, number> = {};
      for (const cell of pixelGrid) {
        colorCounts[cell.color] = (colorCounts[cell.color] || 0) + 1;
      }
      const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        setIgnoredColor(sorted[0][0]);
      }
    }
  };

  // Render cell with grid line logic - use borders instead of gap
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

    // Use right/bottom borders to create grid lines (consistent 1px)
    const borderStyle = showGridLines ? '1px solid rgba(0,0,0,0.1)' : 'none';
    const majorBorderStyle = showGridLines ? '2px solid hsl(var(--primary) / 0.4)' : 'none';

    return (
      <div
        key={index}
        className={`
          cursor-crosshair
          ${inSelection ? 'ring-1 ring-inset ring-primary/60' : ''}
          ${isSelectionBorder ? 'ring-2 ring-primary' : ''}
        `}
        style={{ 
          width: cellWidth, 
          height: cellHeight,
          backgroundColor: cell.color,
          borderRight: isMajorX ? majorBorderStyle : borderStyle,
          borderBottom: isMajorY ? majorBorderStyle : borderStyle,
          boxSizing: 'content-box',
        }}
        onMouseDown={() => handleMouseDown(cell.x, cell.y)}
        onMouseEnter={() => handleMouseEnter(cell.x, cell.y)}
      />
    );
  };

  // Removed handleWheel - using InfiniteCanvas TransformWrapper instead

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Image Crop Dialog */}
      {pendingImageUrl && (
        <ImageCropDialog
          imageUrl={pendingImageUrl}
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Canvas Size Dialog */}
      {pendingCroppedImage && (
        <CanvasSizeDialog
          open={showCanvasSizeDialog}
          onOpenChange={setShowCanvasSizeDialog}
          croppedImageUrl={pendingCroppedImage.url}
          croppedWidth={pendingCroppedImage.width}
          croppedHeight={pendingCroppedImage.height}
          defaultRatio={combinedRatio}
          onConfirm={handleCanvasSizeConfirm}
        />
      )}

      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yarn-rose/30 flex items-center justify-center">
            <Grid3X3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">{t('pixel.title')}</h1>
            <p className="text-muted-foreground">{t('pixel.subtitle')}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Settings */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">{t('pixel.imageUpload')}</h2>
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
            className="w-full h-20 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all soft-press"
            variant="ghost"
          >
            <div className="text-center">
              <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('pixel.uploadImage')}</p>
            </div>
          </Button>

          {/* Stitch Type Selector */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{t('pixel.stitchType')}</Label>
            <StitchTypeSelector value={stitchType} onChange={setStitchType} />
          </div>

          {/* Canvas Dimensions - Always visible */}
          <div className="space-y-3 border-t border-border/30 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {t('pixel.canvasDimensions')}
                {pixelGrid.length > 0 && (
                  <span className="ml-2 text-[10px] text-primary">{t('pixel.current')}</span>
                )}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg"
                    onClick={() => setLockAspectRatio(!lockAspectRatio)}
                  >
                    {lockAspectRatio ? (
                      <Lock className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {lockAspectRatio ? t('pixel.unlockAspectRatio') : t('pixel.lockAspectRatio')}
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t('common.width')}</Label>
                <Input
                  type="number"
                  value={pixelGrid.length > 0 ? gridWidth : customGridWidth}
                  onChange={(e) => {
                    const newWidth = Number(e.target.value);
                    if (pixelGrid.length > 0) {
                      // Resize existing canvas
                      const scaleFactor = newWidth / gridWidth;
                      setCanvasScale(Math.round(scaleFactor * 100));
                    } else {
                      setCustomGridDimensions(newWidth, customGridHeight);
                    }
                  }}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t('common.height')}</Label>
                <Input
                  type="number"
                  value={pixelGrid.length > 0 ? gridHeight : (lockAspectRatio ? calculatedHeight : manualHeight)}
                  onChange={(e) => {
                    if (pixelGrid.length > 0) {
                      // Resize existing canvas
                      const newHeight = Number(e.target.value);
                      const scaleFactor = newHeight / gridHeight;
                      setCanvasScale(Math.round(scaleFactor * 100));
                    } else if (!lockAspectRatio) {
                      setManualHeight(Number(e.target.value));
                    }
                  }}
                  disabled={pixelGrid.length === 0 && lockAspectRatio}
                  className={`h-9 ${pixelGrid.length === 0 && lockAspectRatio ? 'opacity-60' : ''}`}
                />
              </div>
            </div>
            
            {pixelGrid.length > 0 ? (
              <p className="text-[10px] text-muted-foreground">{t('pixel.editResize')}</p>
            ) : lockAspectRatio ? (
              <p className="text-[10px] text-muted-foreground">{t('pixel.autoHeight')}</p>
            ) : null}
          </div>
          
          {/* Scale Canvas (when grid exists) */}
          {pixelGrid.length > 0 && (
            <div className="space-y-2 border-t border-border/30 pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('pixel.scaleCanvas')}</Label>
                <span className="text-xs text-muted-foreground">{canvasScale}%</span>
              </div>
              <div className="flex gap-2">
                <Slider
                  value={[canvasScale]}
                  onValueChange={([val]) => setCanvasScale(val)}
                  min={50}
                  max={200}
                  step={10}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => scaleCanvas(canvasScale)}
                  disabled={canvasScale === 100}
                  className="rounded-xl"
                >
                  {t('common.apply')}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t('pixel.preview')} {Math.round(gridWidth * canvasScale / 100)} × {Math.round(gridHeight * canvasScale / 100)} {t('swatch.stitches')}
              </p>
            </div>
          )}
          
          {/* Dithering Toggle & Create Canvas */}
          <div className="space-y-3 border-t border-border/30 pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dithering"
                checked={useDithering}
                onChange={(e) => setUseDithering(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="dithering" className="text-sm">{t('pixel.dithering')}</Label>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => createEmptyGrid()}
              className="w-full rounded-xl"
            >
              {t('pixel.createEmpty')}
            </Button>
          </div>

          {/* Color Count Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">{t('pixel.maxColors')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">{colorCount}</span>
                {uploadedImage && pixelGrid.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 rounded-lg text-xs"
                        onClick={() => {
                          // Re-quantize from current pixel grid colors (preserves rotation & edits)
                          const pixels: [number, number, number][] = pixelGrid.map(cell => {
                            const match = cell.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                            if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] as [number, number, number];
                            // Handle hex colors
                            const hex = cell.color.replace('#', '');
                            if (hex.length === 6) {
                              return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)] as [number, number, number];
                            }
                            return [128, 128, 128] as [number, number, number];
                          });
                          
                          // Build ImageData from current grid for k-means
                          const imgData = new ImageData(gridWidth, gridHeight);
                          pixels.forEach((p, i) => {
                            imgData.data[i*4] = p[0];
                            imgData.data[i*4+1] = p[1];
                            imgData.data[i*4+2] = p[2];
                            imgData.data[i*4+3] = 255;
                          });
                          
                          let paletteRgb = kMeansQuantize(imgData, colorCount);
                          if (limitToPalette && stashColors.length > 0) {
                            paletteRgb = stashColors.map(c => {
                              const m = c.hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
                              return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] as [number,number,number] : [128,128,128] as [number,number,number];
                            });
                          }
                          
                          setColorPalette(paletteRgb.map(rgbToString));
                          
                          // Map each pixel to nearest palette color
                          const newGrid = pixelGrid.map(cell => {
                            const idx = pixels.indexOf(pixels[pixelGrid.indexOf(cell)]);
                            const p = pixels[pixelGrid.indexOf(cell)];
                            let minDist = Infinity;
                            let best = paletteRgb[0];
                            for (const c of paletteRgb) {
                              const d = (p[0]-c[0])**2 + (p[1]-c[1])**2 + (p[2]-c[2])**2;
                              if (d < minDist) { minDist = d; best = c; }
                            }
                            return { ...cell, color: `rgb(${Math.round(best[0])}, ${Math.round(best[1])}, ${Math.round(best[2])})` };
                          });
                          
                          setPixelGrid(newGrid);
                          resetUndoHistory(newGrid);
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        {t('pixel.syncColors')}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('pixel.syncColors')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
             <Slider
              value={[colorCount]}
              onValueChange={([val]) => setColorCount(val)}
              min={2}
              max={32}
              step={1}
              className="w-full"
            />
          </div>

          {/* Dynamic Palette */}
          {colorPalette.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">{t('pixel.projectPalette')}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleIgnoreBackground}
                  className="text-xs h-6 px-2"
                >
                  {ignoredColor ? t('pixel.showBg') : t('pixel.hideBg')}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {colorPalette.map((color, i) => (
                  <button
                    key={i}
                    className={`w-8 h-8 rounded-lg shadow-sm transition-all hover:scale-110 ${
                      selectedColor === color ? 'ring-2 ring-primary ring-offset-2' : ''
                    } ${ignoredColor === color ? 'opacity-40' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePaletteColorClick(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Color Picker - always available when canvas exists */}
          {pixelGrid.length > 0 && (
            <div className="space-y-3 border-t border-border/30 pt-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('pixel.addCustomColor')}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                />
                <Input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  placeholder="#FFFFFF"
                  className="flex-1 h-10"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => addColorToPalette(customColor)}
                      className="h-10 w-10 rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('pixel.addToPalette')}</TooltipContent>
                </Tooltip>
              </div>

              {/* Eyedropper from image */}
              <div className="flex gap-2">
                <input
                  ref={eyedropperInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setEyedropperImage(ev.target?.result as string);
                      setShowEyedropperDialog(true);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl text-xs gap-1.5"
                  onClick={() => eyedropperInputRef.current?.click()}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  从图片吸色
                </Button>
              </div>

              {/* Global color replace hint */}
              {selectedColor && (
                <p className="text-[10px] text-muted-foreground">
                  提示：选中调色板中的颜色后，使用替换工具 <Replace className="w-3 h-3 inline" /> 可一键替换画布上所有同色格子
                </p>
              )}
            </div>
          )}

          {/* Tools */}
          <div className="space-y-2 border-t border-border/30 pt-4">
            <h3 className="text-sm font-medium text-muted-foreground">{t('pixel.drawingTools')}</h3>
            <div className="grid grid-cols-3 gap-1">
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

          {/* Eraser Size (shown when eraser selected) */}
          {currentTool === 'eraser' && (
            <div className="space-y-2 border-t border-border/30 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{t('pixel.eraserSize')}</span>
                <span className="text-xs text-primary font-semibold">{eraserSize}×{eraserSize}</span>
              </div>
              <div className="flex gap-1">
                {[1, 3, 5, 7].map(size => (
                  <Button
                    key={size}
                    variant={eraserSize === size ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 h-8 rounded-lg text-xs"
                    onClick={() => setEraserSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Symmetry Tools */}
          <div className="space-y-2 border-t border-border/30 pt-4">
            <div className="flex items-center gap-2">
              <FlipHorizontal className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{t('pixel.symmetry')}</span>
            </div>
            <SymmetryTools mode={symmetryMode} onChange={setSymmetryMode} />
          </div>

          {/* Trace Mode */}
          {uploadedImage && (
            <div className="space-y-2 border-t border-border/30 pt-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('pixel.traceOpacity')}</span>
              </div>
              <Slider
                value={[traceOpacity]}
                onValueChange={([val]) => setTraceOpacity(val)}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}

          {/* Selection Actions */}
          {selection.hasSelection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 border-t border-border/30 pt-4"
            >
              <h3 className="text-sm font-medium text-muted-foreground">{t('pixel.selection')}</h3>
              <div className="grid grid-cols-3 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={copySelection} className="rounded-xl">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.copy')}</TooltipContent>
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
                  <TooltipContent>{t('common.paste')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={rotateSelection90} className="rounded-xl">
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('pixel.rotate90')}</TooltipContent>
                </Tooltip>
              </div>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="w-full rounded-xl text-muted-foreground">
                {t('pixel.clearSelection')}
              </Button>
            </motion.div>
          )}

        </motion.div>

        {/* Main Area - Preview + Color Legend stacked */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Preview Card */}
          <div className="glass-card p-6 min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">{t('pixel.yarnGridPreview')}</h2>
              <div className="flex items-center gap-2">
                {/* Undo/Redo Buttons */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={undoGrid}
                      disabled={!canUndo}
                      className="rounded-xl h-8 w-8"
                    >
                      <Undo className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.undo')} (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={redoGrid}
                      disabled={!canRedo}
                      className="rounded-xl h-8 w-8"
                    >
                      <Redo className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('common.redo')} (Ctrl+Y)</TooltipContent>
                </Tooltip>
                <div className="w-px h-6 bg-border mx-1" />
                <span className="text-sm text-muted-foreground">
                  {gridWidth} × {gridHeight} {t('swatch.stitches')}
                </span>
                {pixelGrid.length > 0 && (
                  <>
                    <div className="w-px h-6 bg-border mx-1" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => setShowExportDialog(true)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('pixel.download')}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={() => {
                          if (!user) { toast({ title: t('common.signIn'), variant: 'destructive' }); return; }
                          setDesignName('');
                          setShowSaveDialog(true);
                        }}>
                          <Save className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('pixel.saveToLibrary')}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-xl h-8 w-8" onClick={rotateCanvas90}>
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('pixel.rotateCanvas')}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="default" size="sm" className="rounded-xl h-8 gap-1.5" onClick={() => setShowKnittingGuide(true)}>
                          <Navigation className="w-4 h-4" />
                          <span className="text-xs">{t('pixel.startKnitting')}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('pixel.startKnitting')}</TooltipContent>
                    </Tooltip>
                  </>
                )}
                <Button variant="outline" size="sm" className="rounded-xl h-8 gap-1.5" onClick={() => setShowLibrary(true)}>
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-xs">{t('pixel.library')}</span>
                </Button>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {pixelGrid.length > 0 ? (
              <div className="flex-1">
                <InfiniteCanvas
                  width={gridWidth}
                  height={gridHeight}
                  cellWidth={cellWidth}
                  cellHeight={cellHeight}
                  showGridLines={showGridLines}
                  onShowGridLinesChange={setShowGridLines}
                  uploadedImage={uploadedImage}
                  traceOpacity={traceOpacity}
                  autoFitOnMount={true}
                >
                  {/* Grid without gap - using cell borders instead */}
                  <div 
                    className="inline-grid gap-0"
                    style={{ 
                      gridTemplateColumns: `repeat(${gridWidth}, ${cellWidth + (showGridLines ? 1 : 0)}px)`,
                    }}
                  >
                    {pixelGrid.map((cell, i) => renderCell(cell, i))}
                  </div>
                </InfiniteCanvas>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-40 flex items-center justify-center rounded-2xl bg-muted/20 border-2 border-dashed border-border">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-3">{t('pixel.uploadOrCreate')}</p>
                    <Button variant="outline" onClick={() => createEmptyGrid()} className="rounded-xl">
                      {t('pixel.createCanvas')} {customGridWidth}×{calculatedHeight}
                    </Button>
                  </div>
                </div>
                
                {/* Color Library for empty canvas */}
                <ColorLibrary 
                  onColorSelect={(color) => {
                    setEmptyCanvasColor(color);
                    setSelectedColor(color);
                  }}
                  selectedColor={emptyCanvasColor}
                />
                
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl shadow-sm border border-border"
                    style={{ backgroundColor: emptyCanvasColor }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('pixel.selectedFillColor')}</p>
                    <p className="text-xs text-muted-foreground">{emptyCanvasColor}</p>
                  </div>
                  <Button 
                    onClick={() => createEmptyGrid(emptyCanvasColor)} 
                    className="rounded-xl"
                  >
                    {t('pixel.createCanvas')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Color Legend - below Preview */}
          {pixelGrid.length > 0 && (
            <div className="glass-card p-6">
              <ColorLegend 
                pixelGrid={pixelGrid} 
                ignoredColor={ignoredColor}
                onColorClick={handlePaletteColorClick}
                selectedColor={selectedColor}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* Export Options Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('pixel.exportOptions')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="export-grid"
                checked={exportIncludeGrid}
                onCheckedChange={(checked) => setExportIncludeGrid(checked === true)}
              />
              <Label htmlFor="export-grid" className="text-sm cursor-pointer">{t('pixel.includeGrid')}</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="export-numbers"
                checked={exportIncludeNumbers}
                onCheckedChange={(checked) => setExportIncludeNumbers(checked === true)}
              />
              <Label htmlFor="export-numbers" className="text-sm cursor-pointer">{t('pixel.includeNumbers')}</Label>
            </div>
            <Button
              onClick={() => {
                handleDownloadPNG(exportIncludeGrid, exportIncludeNumbers);
                setShowExportDialog(false);
              }}
              className="w-full rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              {t('pixel.export')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Design Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pixel.saveToLibrary')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('pixel.saveDesignName')}</Label>
              <Input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder={t('pixel.saveDesignName')}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveDesign()}
              />
            </div>
            <Button onClick={handleSaveDesign} disabled={!designName.trim() || saveDesign.isPending} className="w-full rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Design Library Dialog */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('pixel.designLibrary')}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {designs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t('pixel.noDesigns')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {designs.map((design) => (
                  <div key={design.id} className="rounded-xl border border-border hover:bg-muted/30 transition-colors overflow-hidden">
                    <div className="w-full h-32 overflow-hidden border-b border-border bg-muted/20">
                      <canvas
                        ref={(canvas) => {
                          if (!canvas) return;
                          const ctx = canvas.getContext('2d');
                          if (!ctx) return;
                          canvas.width = design.width;
                          canvas.height = design.height;
                          for (const cell of design.grid_data) {
                            ctx.fillStyle = cell.color;
                            ctx.fillRect(cell.x, cell.y, 1, 1);
                          }
                        }}
                        className="w-full h-full"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{design.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{design.width}×{design.height}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg flex-1" onClick={() => handleLoadDesign(design)}>
                          {t('pixel.loadDesign')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={async () => {
                            await deleteDesign.mutateAsync(design.id);
                            toast({ title: t('pixel.designDeleted') });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Eyedropper Dialog */}
      <Dialog open={showEyedropperDialog} onOpenChange={setShowEyedropperDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>从图片吸色</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {eyedropperImage && (
              <div className="relative cursor-crosshair rounded-xl overflow-hidden border border-border">
                <canvas
                  ref={eyedropperCanvasRef}
                  className="hidden"
                />
                <img
                  src={eyedropperImage}
                  alt="Eyedropper"
                  className="w-full max-h-64 object-contain"
                  onClick={(e) => {
                    const img = e.currentTarget;
                    const canvas = eyedropperCanvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    ctx.drawImage(img, 0, 0);
                    const rect = img.getBoundingClientRect();
                    const scaleX = img.naturalWidth / rect.width;
                    const scaleY = img.naturalHeight / rect.height;
                    const x = Math.round((e.clientX - rect.left) * scaleX);
                    const y = Math.round((e.clientY - rect.top) * scaleY);
                    const pixel = ctx.getImageData(x, y, 1, 1).data;
                    const hex = `#${pixel[0].toString(16).padStart(2,'0')}${pixel[1].toString(16).padStart(2,'0')}${pixel[2].toString(16).padStart(2,'0')}`;
                    setCustomColor(hex);
                    addColorToPalette(hex);
                  }}
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-border" style={{ backgroundColor: customColor }} />
              <span className="text-sm font-mono">{customColor}</span>
            </div>
            <p className="text-xs text-muted-foreground">点击图片上任意位置以吸取颜色</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Knitting Guide Fullscreen */}
      <AnimatePresence>
        {showKnittingGuide && pixelGrid.length > 0 && (
          <PixelKnittingGuide
            pixelGrid={pixelGrid}
            gridWidth={gridWidth}
            gridHeight={gridHeight}
            onClose={() => setShowKnittingGuide(false)}
            designId={activeDesignId || undefined}
            initialProgress={activeDesignProgress || undefined}
            onSaveProgress={(progress) => {
              if (activeDesignId) {
                updateKnittingProgress.mutate({ id: activeDesignId, progress });
                toast({ title: '编织进度已保存' });
              }
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}