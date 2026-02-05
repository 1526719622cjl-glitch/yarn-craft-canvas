// PixelGenerator - Updated 2026-02-04
import { motion } from 'framer-motion';
import { useYarnCluesStore, PixelTool, PixelCell } from '@/store/useYarnCluesStore';
import { 
  Grid3X3, Upload, Palette, Pencil, Eraser, PaintBucket, Pipette, 
  Square, RotateCw, Copy, Move, Grid, Eye, EyeOff, Layers, Replace,
  FlipHorizontal, Sliders, Lock, Unlock, Plus, Undo, Redo
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
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
import { useUndoRedo, useUndoRedoKeyboard } from '@/hooks/useUndoRedo';

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
  
  const [colorCount, setColorCount] = useState(8);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
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
  
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [showCanvasSizeDialog, setShowCanvasSizeDialog] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingCroppedImage, setPendingCroppedImage] = useState<{ url: string; width: number; height: number } | null>(null);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [manualHeight, setManualHeight] = useState(customGridHeight);
  const [emptyCanvasColor, setEmptyCanvasColor] = useState('#FDFBF7');
  const [customColor, setCustomColor] = useState('#6B8E23');
  const [canvasScale, setCanvasScale] = useState(100);
  
  const {
    state: undoablePixelGrid,
    set: setUndoableGrid,
    undo: undoGrid,
    redo: redoGrid,
    canUndo,
    canRedo,
    reset: resetUndoHistory,
  } = useUndoRedo<PixelCell[]>(pixelGrid, 30);

  useUndoRedoKeyboard(undoGrid, redoGrid, pixelGrid.length > 0);

  useEffect(() => {
    if (undoablePixelGrid && JSON.stringify(undoablePixelGrid) !== JSON.stringify(pixelGrid)) {
      setPixelGrid(undoablePixelGrid);
    }
  }, [undoablePixelGrid]);

  useEffect(() => {
    localStorage.setItem('pixel-editor-state', JSON.stringify({
      pixelGrid: undoablePixelGrid,
      gridWidth,
      gridHeight,
      colorPalette,
      stitchType
    }));
  }, [undoablePixelGrid, gridWidth, gridHeight, colorPalette, stitchType]);

  useEffect(() => {
    const saved = localStorage.getItem('pixel-editor-state');
    if (saved) {
      try {
        const { pixelGrid: savedGrid, gridWidth: sw, gridHeight: sh, colorPalette: sp, stitchType: st } = JSON.parse(saved);
        if (savedGrid) setUndoableGrid(savedGrid);
        if (sw && sh) setGridDimensions(sw, sh);
        if (sp) setColorPalette(sp);
        if (st) setStitchType(st);
      } catch (e) {
        console.error('Failed to load pixel editor state', e);
      }
    }
  }, []);
  
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

  const baseGaugeRatio = typeof gaugeData?.gaugeRatio === 'number' && Number.isFinite(gaugeData.gaugeRatio) 
    ? gaugeData.gaugeRatio 
    : 1;
  const stitchRatio = getStitchRatio(stitchType);
  const combinedRatio = baseGaugeRatio * stitchRatio;

  const calculatedHeight = useMemo(() => {
    if (lockAspectRatio) {
      return Math.round(customGridWidth / combinedRatio);
    }
    return manualHeight;
  }, [customGridWidth, combinedRatio, lockAspectRatio, manualHeight]);

  useEffect(() => {
    if (lockAspectRatio) {
      setManualHeight(Math.round(customGridWidth / combinedRatio));
    }
  }, [customGridWidth, combinedRatio, lockAspectRatio]);

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
    e.target.value = '';
  }, []);

  const handleCropComplete = useCallback((croppedImageUrl: string, width: number, height: number) => {
    setPendingCroppedImage({ url: croppedImageUrl, width, height });
    setPendingImageUrl(null);
    setShowCanvasSizeDialog(true);
  }, []);

  const handleCanvasSizeComplete = useCallback((finalWidth: number, finalHeight: number) => {
    if (!pendingCroppedImage) return;
    setGridDimensions(finalWidth, finalHeight);
    setUploadedImage(pendingCroppedImage.url);
    processImage(pendingCroppedImage.url, finalWidth, finalHeight);
    setShowCanvasSizeDialog(false);
    setPendingCroppedImage(null);
  }, [pendingCroppedImage, setGridDimensions]);

  const processImage = useCallback((imageUrl: string, targetWidth: number, targetHeight: number) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const palette = kMeansQuantize(imageData, colorCount);
      let processedData = imageData;
      if (useDithering) {
        processedData = floydSteinbergDither(imageData, targetWidth, targetHeight, palette);
      }
      const newGrid: PixelCell[] = [];
      const hexPalette: string[] = [];
      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          const i = (y * targetWidth + x) * 4;
          if (processedData.data[i + 3] > 128) {
            const r = processedData.data[i];
            const g = processedData.data[i + 1];
            const b = processedData.data[i + 2];
            let color = `rgb(${r}, ${g}, ${b})`;
            if (limitToPalette && stashColors.length > 0) {
              const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
              const nearest = findNearestColor(hex, stashColors);
              if (nearest) color = nearest.hex;
            }
            newGrid.push({ x, y, color });
            if (!hexPalette.includes(color)) hexPalette.push(color);
          }
        }
      }
      setUndoableGrid(newGrid);
      setColorPalette(hexPalette);
    };
    img.src = imageUrl;
  }, [colorCount, useDithering, limitToPalette, stashColors, setUndoableGrid, setColorPalette]);

  const createEmptyGrid = (fillColor: string = '#FDFBF7') => {
    const newWidth = customGridWidth;
    const newHeight = calculatedHeight;
    setGridDimensions(newWidth, newHeight);
    const newGrid: PixelCell[] = [];
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        newGrid.push({ x, y, color: fillColor });
      }
    }
    setUndoableGrid(newGrid);
    setColorPalette([fillColor]);
    setUploadedImage(null);
  };

  const cellWidth = 20;
  const cellHeight = cellWidth / combinedRatio;

  const handleToolChange = (tool: ExtendedTool) => {
    setCurrentTool(tool);
    if (tool === 'pencil' || tool === 'eraser' || tool === 'bucket' || tool === 'eyedropper') {
      setSelectedTool(tool as PixelTool);
    }
    if (tool !== 'select') {
      clearSelection();
    }
  };

  const handlePaletteColorClick = (color: string) => {
    setSelectedColor(color);
    if (currentTool === 'eraser') setCurrentTool('pencil');
  };

  const preparePDFData = useCallback(() => {
    const grid: { color: string }[][] = Array.from({ length: gridHeight }, () =>
      Array.from({ length: gridWidth }, () => ({ color: emptyCanvasColor }))
    );
    pixelGrid.forEach((cell) => {
      if (cell.x >= 0 && cell.x < gridWidth && cell.y >= 0 && cell.y < gridHeight) {
        grid[cell.y][cell.x] = { color: cell.color };
      }
    });
    console.log('Prepared PDF Data:', grid);
    return grid;
  }, [pixelGrid, gridWidth, gridHeight, emptyCanvasColor]);

  const toggleIgnoreBackground = () => {
    if (ignoredColor) {
      setIgnoredColor(null);
    } else if (colorPalette.length > 0) {
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
    const borderStyle = showGridLines ? '1px solid rgba(0,0,0,0.1)' : 'none';
    const majorBorderStyle = showGridLines ? '2px solid hsl(var(--primary) / 0.4)' : 'none';
    return (
      <div
        key={index}
        className={`cursor-crosshair ${inSelection ? 'ring-1 ring-inset ring-primary/60' : ''} ${isSelectionBorder ? 'ring-2 ring-primary' : ''}`}
        style={{
          width: cellWidth,
          height: cellHeight,
          backgroundColor: cell.color,
          borderRight: isMajorX ? majorBorderStyle : borderStyle,
          borderBottom: isMajorY ? majorBorderStyle : borderStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          color: 'rgba(0,0,0,0.3)',
          userSelect: 'none'
        }}
        onMouseDown={() => handleCellMouseDown(cell.x, cell.y)}
        onMouseEnter={() => handleCellMouseEnter(cell.x, cell.y)}
      >
        {showSymbols && getStitchSymbol(cell.color)}
      </div>
    );
  };

  const getStitchSymbol = (color: string) => {
    const index = colorPalette.indexOf(color);
    if (index === -1) return '';
    const symbols = ['•', '×', '□', '∆', '○', '⬧', '▿', '▿', '⬦', '⭒', '✦', '✧', '△', '▽', '◁', '▷'];
    return symbols[index % symbols.length];
  };

  const handleCellMouseDown = (x: number, y: number) => {
    setIsDragging(true);
    if (currentTool === 'select') {
      setSelection({ ...selection, startX: x, startY: y, endX: x, endY: y, isSelecting: true, hasSelection: true });
    } else {
      applyTool(x, y);
    }
  };

  const handleCellMouseEnter = (x: number, y: number) => {
    if (isDragging) {
      if (currentTool === 'select' && selection.isSelecting) {
        setSelection({ ...selection, endX: x, endY: y });
      } else {
        applyTool(x, y);
      }
    }
  };

  const handleGlobalMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (currentTool === 'select') {
        setSelection(prev => ({ ...prev, isSelecting: false }));
      }
    }
  }, [isDragging, currentTool]);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  const applyTool = (x: number, y: number) => {
    const points = getSymmetricPoints(x, y, gridWidth, gridHeight, symmetryMode);
    let newGrid = [...pixelGrid];
    let changed = false;
    points.forEach(p => {
      const idx = newGrid.findIndex(c => c.x === p.x && c.y === p.y);
      if (idx === -1) return;
      if (currentTool === 'pencil') {
        if (newGrid[idx].color !== selectedColor) {
          newGrid[idx] = { ...newGrid[idx], color: selectedColor };
          changed = true;
        }
      } else if (currentTool === 'eraser') {
        if (newGrid[idx].color !== emptyCanvasColor) {
          newGrid[idx] = { ...newGrid[idx], color: emptyCanvasColor };
          changed = true;
        }
      } else if (currentTool === 'bucket') {
        const targetColor = newGrid[idx].color;
        if (targetColor === selectedColor) return;
        const fillQueue = [{ x: p.x, y: p.y }];
        const visited = new Set();
        while (fillQueue.length > 0) {
          const curr = fillQueue.shift()!;
          const key = `${curr.x},${curr.y}`;
          if (visited.has(key)) continue;
          visited.add(key);
          const cIdx = newGrid.findIndex(c => c.x === curr.x && c.y === curr.y);
          if (cIdx !== -1 && newGrid[cIdx].color === targetColor) {
            newGrid[cIdx] = { ...newGrid[cIdx], color: selectedColor };
            changed = true;
            if (curr.x > 0) fillQueue.push({ x: curr.x - 1, y: curr.y });
            if (curr.x < gridWidth - 1) fillQueue.push({ x: curr.x + 1, y: curr.y });
            if (curr.y > 0) fillQueue.push({ x: curr.x, y: curr.y - 1 });
            if (curr.y < gridHeight - 1) fillQueue.push({ x: curr.x, y: curr.y + 1 });
          }
        }
      } else if (currentTool === 'eyedropper') {
        setSelectedColor(newGrid[idx].color);
        setCurrentTool('pencil');
      } else if (currentTool === 'replace') {
        const targetColor = newGrid[idx].color;
        if (targetColor === selectedColor) return;
        newGrid = newGrid.map(c => c.color === targetColor ? { ...c, color: selectedColor } : c);
        changed = true;
      }
    });
    if (changed) setUndoableGrid(newGrid);
  };

  const isInSelection = (x: number, y: number) => {
    if (!selection.hasSelection) return false;
    const minX = Math.min(selection.startX, selection.endX);
    const maxX = Math.max(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxY = Math.max(selection.startY, selection.endY);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };

  const clearSelection = () => setSelection({ ...selection, hasSelection: false, isSelecting: false });

  const copySelection = () => {
    const minX = Math.min(selection.startX, selection.endX);
    const maxX = Math.max(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const maxY = Math.max(selection.startY, selection.endY);
    const copied = pixelGrid.filter(c => c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY)
      .map(c => ({ ...c, x: c.x - minX, y: c.y - minY }));
    setSelection({ ...selection, copiedCells: copied });
  };

  const pasteSelection = () => {
    if (selection.copiedCells.length === 0) return;
    const newGrid = [...pixelGrid];
    selection.copiedCells.forEach(cell => {
      const targetX = selection.startX + cell.x;
      const targetY = selection.startY + cell.y;
      if (targetX < gridWidth && targetY < gridHeight) {
        const idx = newGrid.findIndex(c => c.x === targetX && c.y === targetY);
        if (idx !== -1) newGrid[idx] = { ...newGrid[idx], color: cell.color };
      }
    });
    setUndoableGrid(newGrid);
  };

  const flipSelectionH = () => {
    if (!selection.hasSelection) return;
    const minX = Math.min(selection.startX, selection.endX);
    const maxX = Math.max(selection.startX, selection.endX);
    const newGrid = [...pixelGrid];
    pixelGrid.forEach(cell => {
      if (isInSelection(cell.x, cell.y)) {
        const flippedX = maxX - (cell.x - minX);
        const targetIdx = newGrid.findIndex(c => c.x === flippedX && c.y === cell.y);
        if (targetIdx !== -1) newGrid[targetIdx] = { ...newGrid[targetIdx], color: cell.color };
      }
    });
    setUndoableGrid(newGrid);
  };

  const rotateSelection90 = () => {
    if (!selection.hasSelection) return;
    const minX = Math.min(selection.startX, selection.endX);
    const minY = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.startX - selection.endX) + 1;
    const height = Math.abs(selection.startY - selection.endY) + 1;
    const newGrid = [...pixelGrid];
    const subGrid = pixelGrid.filter(c => isInSelection(c.x, c.y));
    subGrid.forEach(cell => {
      const relX = cell.x - minX;
      const relY = cell.y - minY;
      const rotX = (height - 1) - relY;
      const rotY = relX;
      const targetX = minX + rotX;
      const targetY = minY + rotY;
      if (targetX < gridWidth && targetY < gridHeight) {
        const idx = newGrid.findIndex(c => c.x === targetX && c.y === targetY);
        if (idx !== -1) newGrid[idx] = { ...newGrid[idx], color: cell.color };
      }
    });
    setUndoableGrid(newGrid);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-7xl mx-auto space-y-8">
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yarn-honey/30 flex items-center justify-center">
              <Grid3X3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-semibold text-foreground">Pixel Generator</h1>
              <p className="text-muted-foreground">Convert images to crochet/knitting charts with smart color matching</p>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium">Image Import</h2>
            </div>
            <div className="space-y-4">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-24 rounded-2xl border-dashed border-2 flex flex-col gap-2">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload pattern or photo</span>
              </Button>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <Label>Max Colors</Label>
                  <span className="font-medium">{colorCount}</span>
                </div>
                <Slider value={[colorCount]} onValueChange={([v]) => setColorCount(v)} min={2} max={32} step={1} />
                <div className="flex items-center justify-between">
                  <Label htmlFor="dither-toggle">Dithering</Label>
                  <Switch id="dither-toggle" checked={useDithering} onCheckedChange={setUseDithering} />
                </div>
              </div>
            </div>
          </div>
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium">Drawing Tools</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {tools.map((tool) => (
                <Tooltip key={tool.type}>
                  <TooltipTrigger asChild>
                    <Button variant={currentTool === tool.type ? 'default' : 'outline'} size="icon" onClick={() => handleToolChange(tool.type)} className="h-12 w-full rounded-xl soft-press">
                      <tool.icon className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            <div className="space-y-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Active Color</Label>
                <div className="w-6 h-6 rounded-md border border-border shadow-sm" style={{ backgroundColor: selectedColor }} />
              </div>
              <div className="grid grid-cols-6 gap-2">
                {colorPalette.map((color, i) => (
                  <button key={i} onClick={() => handlePaletteColorClick(color)} className={`w-full aspect-square rounded-lg border-2 transition-all ${selectedColor === color ? 'border-primary scale-110 shadow-md' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </div>
          </div>
          <div className="glass-card p-6 space-y-4">
            <SymmetryTools mode={symmetryMode} onModeChange={setSymmetryMode} />
            <StitchTypeSelector value={stitchType} onChange={setStitchType} />
            <div className="space-y-3 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Trace Image Opacity</Label>
                <span className="text-xs font-medium">{Math.round(traceOpacity * 100)}%</span>
              </div>
              <Slider value={[traceOpacity * 100]} onValueChange={([v]) => setTraceOpacity(v / 100)} min={0} max={100} step={5} />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="symbol-toggle" className="text-sm">Show Symbols</Label>
              <Switch id="symbol-toggle" checked={showSymbols} onCheckedChange={setShowSymbols} />
            </div>
          </div>
          {selection.hasSelection && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-4 space-y-3 bg-primary/5 border-primary/20">
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Selection Tools</p>
              <div className="grid grid-cols-4 gap-2">
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
                    <Button variant="outline" size="sm" onClick={pasteSelection} disabled={selection.copiedCells.length === 0} className="rounded-xl">
                      <Move className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paste</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={rotateSelection90} className="rounded-xl">
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rotate 90°</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={flipSelectionH} className="rounded-xl">
                      <FlipHorizontal className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Flip H</TooltipContent>
                </Tooltip>
              </div>
              <Button variant="ghost" size="sm" onClick={clearSelection} className="w-full rounded-xl text-muted-foreground">Clear Selection</Button>
            </motion.div>
          )}
        </motion.div>
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Yarn Grid Preview</h2>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={undoGrid} disabled={!canUndo} className="rounded-xl h-8 w-8">
                      <Undo className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={redoGrid} disabled={!canRedo} className="rounded-xl h-8 w-8">
                      <Redo className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
                </Tooltip>
                <div className="w-px h-6 bg-border mx-1" />
                <span className="text-sm text-muted-foreground">{gridWidth} × {gridHeight} stitches</span>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            {pixelGrid.length > 0 ? (
              <div className="flex-1">
                <InfiniteCanvas width={gridWidth} height={gridHeight} cellWidth={cellWidth} cellHeight={cellHeight} showGridLines={showGridLines} onShowGridLinesChange={setShowGridLines} uploadedImage={uploadedImage} traceOpacity={traceOpacity} autoFitOnMount={true}>
                  <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${gridWidth}, ${cellWidth + (showGridLines ? 1 : 0)}px)` }}>
                    {pixelGrid.map((cell, i) => renderCell(cell, i))}
                  </div>
                </InfiniteCanvas>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="h-40 flex items-center justify-center rounded-2xl bg-muted/20 border-2 border-dashed border-border">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-3">Upload an image or create an empty canvas</p>
                    <Button variant="outline" onClick={() => createEmptyGrid()} className="rounded-xl">Create {customGridWidth}×{calculatedHeight} Canvas</Button>
                  </div>
                </div>
                <ColorLibrary onColorSelect={(color) => { setEmptyCanvasColor(color); setSelectedColor(color); }} selectedColor={emptyCanvasColor} />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shadow-sm border border-border" style={{ backgroundColor: emptyCanvasColor }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Selected Fill Color</p>
                    <p className="text-xs text-muted-foreground">{emptyCanvasColor}</p>
                  </div>
                  <Button onClick={() => createEmptyGrid(emptyCanvasColor)} className="rounded-xl">Create Canvas</Button>
                </div>
              </div>
            )}
          </div>
          {pixelGrid.length > 0 && (
            <div className="glass-card p-6">
              <ColorLegend pixelGrid={pixelGrid} ignoredColor={ignoredColor} onColorClick={handlePaletteColorClick} selectedColor={selectedColor} />
            </div>
          )}
        </motion.div>
      </div>
      <ImageCropDialog open={showCropDialog} onOpenChange={setShowCropDialog} imageUrl={pendingImageUrl || ''} onCropComplete={handleCropComplete} />
      <CanvasSizeDialog open={showCanvasSizeDialog} onOpenChange={setShowCanvasSizeDialog} initialWidth={pendingCroppedImage?.width || 60} initialHeight={pendingCroppedImage?.height || 40} onConfirm={handleCanvasSizeComplete} />
    </motion.div>
  );
}
