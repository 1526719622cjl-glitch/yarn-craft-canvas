import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize, Home, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface InfiniteCanvasProps {
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  showGridLines: boolean;
  onShowGridLinesChange: (show: boolean) => void;
  children: React.ReactNode;
  uploadedImage?: string | null;
  traceOpacity?: number;
  autoFitOnMount?: boolean;
}

export function InfiniteCanvas({
  width,
  height,
  cellWidth,
  cellHeight,
  showGridLines,
  onShowGridLinesChange,
  children,
  uploadedImage,
  traceOpacity = 0,
  autoFitOnMount = true,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [aspectLocked, setAspectLocked] = useState(true);

  // Calculate total canvas size
  const canvasWidth = width * cellWidth;
  const canvasHeight = height * cellHeight;

  // LOD: Hide grid lines when zoomed out below 30%
  const showLODGrid = useMemo(() => zoom >= 0.3, [zoom]);
  const showLODLabels = useMemo(() => zoom >= 0.5, [zoom]);

  // Fit to view calculation
  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    setZoom(scale);
    
    // Reset scroll to top-left
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollLeft = 0;
        containerRef.current.scrollTop = 0;
      }
    });
  }, [canvasWidth, canvasHeight]);

  // Auto-fit on mount
  useEffect(() => {
    if (!autoFitOnMount) return;
    const timer = setTimeout(fitToView, 100);
    return () => clearTimeout(timer);
  }, [fitToView, autoFitOnMount]);

  // Re-fit when dimensions change
  useEffect(() => {
    const timer = setTimeout(fitToView, 100);
    return () => clearTimeout(timer);
  }, [width, height, fitToView]);

  // Mouse wheel zoom with cursor-centered behavior
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseXInViewport = e.clientX - rect.left;
    const mouseYInViewport = e.clientY - rect.top;
    
    // Mouse position in scrolled content
    const mouseX = mouseXInViewport + container.scrollLeft;
    const mouseY = mouseYInViewport + container.scrollTop;

    const oldZoom = zoom;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, oldZoom * delta));

    // Calculate canvas coordinate under mouse
    const canvasX = mouseX / oldZoom;
    const canvasY = mouseY / oldZoom;
    
    // New scroll position to keep the same canvas point under mouse
    const newScrollX = canvasX * newZoom - mouseXInViewport;
    const newScrollY = canvasY * newZoom - mouseYInViewport;

    setZoom(newZoom);

    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollLeft = Math.max(0, newScrollX);
        containerRef.current.scrollTop = Math.max(0, newScrollY);
      }
    });
  }, [zoom]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(5, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.1, prev * 0.8));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  }, []);

  // Generate grid overlay for major lines (every 10)
  const gridOverlay = useMemo(() => {
    if (!showLODGrid || !showGridLines) return null;

    const majorLines: React.ReactNode[] = [];
    
    for (let x = 10; x < width; x += 10) {
      majorLines.push(
        <div
          key={`v-${x}`}
          className="absolute top-0 bottom-0 bg-primary/20 pointer-events-none"
          style={{ left: x * cellWidth, width: 2 }}
        />
      );
    }
    
    for (let y = 10; y < height; y += 10) {
      majorLines.push(
        <div
          key={`h-${y}`}
          className="absolute left-0 right-0 bg-primary/20 pointer-events-none"
          style={{ top: y * cellHeight, height: 2 }}
        />
      );
    }
    
    return majorLines;
  }, [width, height, cellWidth, cellHeight, showLODGrid, showGridLines]);

  // Horizontal ruler
  const horizontalRuler = useMemo(() => {
    if (!showLODLabels) return null;
    
    const markers: React.ReactNode[] = [];
    for (let x = 0; x < width; x++) {
      if ((x + 1) % 10 === 0) {
        markers.push(
          <div
            key={x}
            className="absolute text-[9px] font-medium text-muted-foreground"
            style={{ left: x * cellWidth + cellWidth / 2 - 8, top: 4 }}
          >
            {x + 1}
          </div>
        );
      }
    }
    return markers;
  }, [width, cellWidth, showLODLabels]);

  // Vertical ruler
  const verticalRuler = useMemo(() => {
    if (!showLODLabels) return null;
    
    const markers: React.ReactNode[] = [];
    for (let y = 0; y < height; y++) {
      if ((y + 1) % 10 === 0) {
        markers.push(
          <div
            key={y}
            className="absolute text-[9px] font-medium text-muted-foreground"
            style={{ top: y * cellHeight + cellHeight / 2 - 6, left: 4 }}
          >
            {y + 1}
          </div>
        );
      }
    }
    return markers;
  }, [height, cellHeight, showLODLabels]);

  // Scaled dimensions for the wrapper
  const scaledWidth = canvasWidth * zoom + 24; // 24 for left ruler
  const scaledHeight = canvasHeight * zoom + 20; // 20 for top ruler

  return (
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex items-center justify-between p-2 border-b border-border/30 bg-muted/20 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                className="h-8 w-8 rounded-lg"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                className="h-8 w-8 rounded-lg"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                onClick={fitToView}
                className="h-8 w-8 rounded-lg"
              >
                <Maximize className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to View</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetZoom}
                className="h-8 w-8 rounded-lg"
              >
                <Home className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View (100%)</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border/50 mx-1" />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showGridLines ? 'default' : 'ghost'}
                size="icon"
                onClick={() => onShowGridLinesChange(!showGridLines)}
                className="h-8 w-8 rounded-lg"
              >
                {showGridLines ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Grid Lines</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={aspectLocked ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setAspectLocked(!aspectLocked)}
                className="h-8 w-8 rounded-lg"
              >
                {aspectLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aspect Ratio Lock</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Slider
            value={[zoom * 100]}
            onValueChange={([val]) => setZoom(val / 100)}
            min={10}
            max={500}
            step={5}
            className="w-24"
          />
          <span className="text-xs text-muted-foreground font-medium">
            {width}×{height}
          </span>
        </div>
      </div>

      {/* Canvas Area - Scrollable Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/10 rounded-b-2xl"
        onWheel={handleWheel}
        style={{ cursor: 'crosshair' }}
      >
        {/* Scaled Content Wrapper */}
        <div 
          style={{ 
            width: scaledWidth,
            height: scaledHeight,
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          {/* Transform Container */}
          <div 
            style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: canvasWidth + 24,
              height: canvasHeight + 20,
            }}
          >
            {/* Trace image background */}
            {uploadedImage && traceOpacity > 0 && (
              <div 
                className="absolute pointer-events-none z-0"
                style={{ 
                  left: 24,
                  top: 20,
                  width: canvasWidth,
                  height: canvasHeight,
                  backgroundImage: `url(${uploadedImage})`,
                  backgroundSize: '100% 100%',
                  opacity: traceOpacity / 100,
                  mixBlendMode: 'multiply',
                }}
              />
            )}

            {/* Horizontal Ruler */}
            <div 
              className="absolute top-0 left-6 h-5 bg-muted/60 border-b border-border/40"
              style={{ width: canvasWidth }}
            >
              {horizontalRuler}
            </div>

            {/* Vertical Ruler */}
            <div 
              className="absolute left-0 top-5 w-6 bg-muted/60 border-r border-border/40"
              style={{ height: canvasHeight }}
            >
              {verticalRuler}
            </div>

            {/* Main Grid Content */}
            <div 
              className="absolute"
              style={{ 
                top: 20,
                left: 24,
                width: canvasWidth,
                height: canvasHeight,
              }}
            >
              {/* Grid overlay for major lines */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {gridOverlay}
              </div>

              {/* Children (grid cells) */}
              {children}
            </div>
          </div>
        </div>

        {/* LOD indicator */}
        {!showLODGrid && (
          <div className="fixed bottom-4 left-4 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-sm text-xs text-primary font-medium">
            Macro View (zoom in for details)
          </div>
        )}
      </div>
    </div>
  );
}
