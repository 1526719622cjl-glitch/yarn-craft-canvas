import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, RotateCcw, Crop, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface ImageCropDialogProps {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedImageUrl: string, width: number, height: number) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ASPECT_PRESETS = [
  { label: 'Free', value: null, icon: Crop },
  { label: '1:1', value: 1, icon: Square },
  { label: '4:3', value: 4 / 3, icon: RectangleHorizontal },
  { label: '3:4', value: 3 / 4, icon: RectangleVertical },
  { label: '16:9', value: 16 / 9, icon: RectangleHorizontal },
  { label: '9:16', value: 9 / 16, icon: RectangleVertical },
];

export function ImageCropDialog({ imageUrl, open, onOpenChange, onCropComplete }: ImageCropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [selectedAspect, setSelectedAspect] = useState<number | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageLoaded && imageDimensions.width > 0) {
      const containerWidth = containerRef.current?.clientWidth || 400;
      const containerHeight = containerRef.current?.clientHeight || 300;
      
      // Center crop area at 80% of visible area
      const size = Math.min(containerWidth, containerHeight) * 0.8;
      setCropArea({
        x: (containerWidth - size) / 2,
        y: (containerHeight - size) / 2,
        width: size,
        height: size,
      });
    }
  }, [imageLoaded, imageDimensions]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const container = containerRef.current.getBoundingClientRect();

    if (dragType === 'move') {
      setCropArea(prev => ({
        ...prev,
        x: Math.max(0, Math.min(container.width - prev.width, prev.x + deltaX)),
        y: Math.max(0, Math.min(container.height - prev.height, prev.y + deltaY)),
      }));
    } else if (dragType === 'resize') {
      setCropArea(prev => {
        let newWidth = Math.max(50, prev.width + deltaX);
        let newHeight = Math.max(50, prev.height + deltaY);

        // Constrain to aspect ratio if selected
        if (selectedAspect) {
          newHeight = newWidth / selectedAspect;
        }

        // Constrain to container
        newWidth = Math.min(newWidth, container.width - prev.x);
        newHeight = Math.min(newHeight, container.height - prev.y);

        return { ...prev, width: newWidth, height: newHeight };
      });
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragType, dragStart, selectedAspect]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const applyAspectRatio = (aspect: number | null) => {
    setSelectedAspect(aspect);
    if (aspect && containerRef.current) {
      const container = containerRef.current.getBoundingClientRect();
      const maxWidth = container.width * 0.8;
      const maxHeight = container.height * 0.8;
      
      let newWidth = maxWidth;
      let newHeight = newWidth / aspect;
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * aspect;
      }
      
      setCropArea({
        x: (container.width - newWidth) / 2,
        y: (container.height - newHeight) / 2,
        width: newWidth,
        height: newHeight,
      });
    }
  };

  const handleCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;

    const container = containerRef.current.getBoundingClientRect();
    const img = imageRef.current;
    
    // Calculate scale between displayed and natural image size
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    
    // Get image position within container
    const imgRect = img.getBoundingClientRect();
    const containerRect = container;
    
    const imgOffsetX = imgRect.left - containerRect.left;
    const imgOffsetY = imgRect.top - containerRect.top;
    
    // Calculate crop coordinates in natural image space
    const naturalX = Math.max(0, (cropArea.x - imgOffsetX) * scaleX);
    const naturalY = Math.max(0, (cropArea.y - imgOffsetY) * scaleY);
    const naturalWidth = Math.round(cropArea.width * scaleX);
    const naturalHeight = Math.round(cropArea.height * scaleY);

    // Create cropped image
    const canvas = document.createElement('canvas');
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(
        img,
        naturalX,
        naturalY,
        naturalWidth,
        naturalHeight,
        0,
        0,
        naturalWidth,
        naturalHeight
      );
      
      const croppedUrl = canvas.toDataURL('image/png');
      onCropComplete(croppedUrl, naturalWidth, naturalHeight);
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    // When skipping, use the full image dimensions
    const img = imageRef.current;
    const width = img?.naturalWidth || 800;
    const height = img?.naturalHeight || 600;
    onCropComplete(imageUrl, width, height);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop Image
          </DialogTitle>
        </DialogHeader>

        {/* Aspect Ratio Presets */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-border/30">
          {ASPECT_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant={selectedAspect === preset.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyAspectRatio(preset.value)}
              className="rounded-xl gap-1.5"
            >
              <preset.icon className="w-3.5 h-3.5" />
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Crop Area */}
        <div 
          ref={containerRef}
          className="relative flex-1 min-h-[400px] bg-muted/30 rounded-xl overflow-hidden select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <TransformWrapper
            disabled={isDragging}
            minScale={0.5}
            maxScale={3}
            centerOnInit
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Upload preview"
                    onLoad={handleImageLoad}
                    className="max-w-full max-h-full object-contain"
                    style={{ pointerEvents: 'none' }}
                  />
                </TransformComponent>

                {/* Zoom controls */}
                <div className="absolute bottom-4 left-4 flex gap-2 z-20">
                  <Button variant="secondary" size="icon" onClick={() => zoomOut()} className="rounded-xl h-8 w-8">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={() => zoomIn()} className="rounded-xl h-8 w-8">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={() => resetTransform()} className="rounded-xl h-8 w-8">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </TransformWrapper>

          {/* Crop overlay */}
          {imageLoaded && (
            <>
              {/* Darkened areas outside crop */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: cropArea.y }} />
                <div className="absolute bg-black/50" style={{ top: cropArea.y + cropArea.height, left: 0, right: 0, bottom: 0 }} />
                <div className="absolute bg-black/50" style={{ top: cropArea.y, left: 0, width: cropArea.x, height: cropArea.height }} />
                <div className="absolute bg-black/50" style={{ top: cropArea.y, left: cropArea.x + cropArea.width, right: 0, height: cropArea.height }} />
              </div>

              {/* Crop frame */}
              <div
                className="absolute border-2 border-primary cursor-move z-20"
                style={{
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Corner handles */}
                <div
                  className="absolute -right-2 -bottom-2 w-4 h-4 bg-primary rounded-full cursor-se-resize"
                  onMouseDown={(e) => handleMouseDown(e, 'resize')}
                />
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-white/30" />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleSkip} className="rounded-xl">
            Skip Cropping
          </Button>
          <Button onClick={handleCrop} className="rounded-xl">
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}