import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize, Home, Eye, EyeOff, Lock, Unlock, Move } from 'lucide-react';
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
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Calculate total canvas size
  const canvasWidth = width * cellWidth;
  const canvasHeight = height * cellHeight;

  // LOD: Hide grid lines when zoomed out below 30%
  const showLODGrid = useMemo(() => currentZoom >= 0.3, [currentZoom]);
  const showLODLabels = useMemo(() => currentZoom >= 0.5, [currentZoom]);
  
  // CRITICAL: Fit to view calculation - ensures entire pattern is visible
  const fitToView = useCallback(() => {
    if (!containerRef.current || !transformRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 80; // padding for rulers
    const containerHeight = container.clientHeight - 80;
    
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    
    const scaleX = containerWidth / canvasWidth;
    const scaleY = containerHeight / canvasHeight;
    // Scale to fit the entire pattern, cap at 100% (never zoom in past 1:1)
    const scale = Math.min(scaleX, scaleY, 1);
    
    // Center and apply scale
    transformRef.current.centerView(scale);
    setCurrentZoom(scale);
  }, [canvasWidth, canvasHeight]);

  // CRITICAL: Auto-fit on mount and dimension changes - immediate zoom-to-fit
  useEffect(() => {
    if (!autoFitOnMount) return;
    
    // Immediate fit on first render
    const immediateTimer = setTimeout(() => {
      fitToView();
      setHasInitialized(true);
    }, 50);
    
    // Delayed fit for when dimensions settle
    const delayedTimer = setTimeout(fitToView, 200);
    
    return () => {
      clearTimeout(immediateTimer);
      clearTimeout(delayedTimer);
    };
  }, [fitToView, autoFitOnMount]);

  // Re-fit when dimensions change significantly
  useEffect(() => {
    if (hasInitialized) {
      const timer = setTimeout(fitToView, 100);
      return () => clearTimeout(timer);
    }
  }, [width, height, hasInitialized, fitToView]);

  // Handle zoom change for LOD
  const handleTransform = useCallback((ref: ReactZoomPanPinchRef) => {
    setCurrentZoom(ref.state.scale);
  }, []);

  // Spacebar pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPanning) {
        e.preventDefault();
        setIsPanning(true);
        document.body.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
        document.body.style.cursor = 'default';
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPanning]);

  // Generate grid overlay for major lines (every 10)
  const gridOverlay = useMemo(() => {
    if (!showLODGrid || !showGridLines) return null;

    const majorLines: React.ReactNode[] = [];
    
    // Vertical lines every 10 stitches
    for (let x = 10; x < width; x += 10) {
      majorLines.push(
        <div
          key={`v-${x}`}
          className="absolute top-0 bottom-0 bg-primary/20 pointer-events-none"
          style={{ 
            left: x * cellWidth,
            width: 2,
          }}
        />
      );
    }
    
    // Horizontal lines every 10 rows
    for (let y = 10; y < height; y += 10) {
      majorLines.push(
        <div
          key={`h-${y}`}
          className="absolute left-0 right-0 bg-primary/20 pointer-events-none"
          style={{ 
            top: y * cellHeight,
            height: 2,
          }}
        />
      );
    }
    
    return majorLines;
  }, [width, height, cellWidth, cellHeight, showLODGrid, showGridLines]);

  // Axis rulers
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
                onClick={() => transformRef.current?.zoomIn()}
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
                onClick={() => transformRef.current?.zoomOut()}
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
            <TooltipContent>Fit to View (Zoom-to-Fit)</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => transformRef.current?.resetTransform()}
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
            {Math.round(currentZoom * 100)}%
          </span>
          <Slider
            value={[currentZoom * 100]}
            onValueChange={([val]) => {
              const scale = val / 100;
              transformRef.current?.setTransform(
                transformRef.current.state.positionX,
                transformRef.current.state.positionY,
                scale
              );
            }}
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

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden bg-muted/10 rounded-b-2xl relative"
        style={{ 
          cursor: isPanning ? 'grab' : 'crosshair',
          // Checkerboard pattern for transparency
          backgroundImage: `
            linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%),
            linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
            linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        <TransformWrapper
          ref={transformRef}
          initialScale={0.5}
          minScale={0.05}
          maxScale={5}
          wheel={{ step: 0.05 }}
          panning={{ disabled: false }}
          onTransformed={handleTransform}
          doubleClick={{ disabled: true }}
          centerOnInit={true}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: canvasWidth + 48, height: canvasHeight + 48 }}
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
              className="absolute top-0 left-6 right-0 h-5 bg-muted/60 border-b border-border/40 z-10"
              style={{ width: canvasWidth }}
            >
              {horizontalRuler}
            </div>

            {/* Vertical Ruler */}
            <div 
              className="absolute left-0 top-5 bottom-0 w-6 bg-muted/60 border-r border-border/40 z-10"
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
          </TransformComponent>
        </TransformWrapper>

        {/* LOD indicator */}
        {!showLODGrid && (
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-sm text-xs text-primary font-medium">
            Macro View (zoom in for details)
          </div>
        )}
        
        {/* Pan hint */}
        {isPanning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-muted/80 backdrop-blur-sm text-xs text-muted-foreground flex items-center gap-2">
            <Move className="w-3 h-3" />
            Drag to pan
          </div>
        )}
      </div>
    </div>
  );
}