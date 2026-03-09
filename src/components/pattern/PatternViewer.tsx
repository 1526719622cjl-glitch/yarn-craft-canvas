import { useState, useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';

interface PatternViewerProps {
  imageUrl: string;
  highlightRegion?: { x: number; y: number; width: number; height: number } | null;
}

export function PatternViewer({ imageUrl, highlightRegion }: PatternViewerProps) {
  const { t } = useI18n();

  return (
    <div className="relative w-full h-full min-h-[400px] bg-muted/20 rounded-2xl overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={5}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-3 right-3 z-10 flex gap-1">
              <Button variant="glass" size="icon" onClick={() => zoomIn()}><ZoomIn className="w-4 h-4" /></Button>
              <Button variant="glass" size="icon" onClick={() => zoomOut()}><ZoomOut className="w-4 h-4" /></Button>
              <Button variant="glass" size="icon" onClick={() => resetTransform()}><Maximize className="w-4 h-4" /></Button>
            </div>
            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
              <div className="relative">
                <img src={imageUrl} alt="Pattern" className="max-w-full max-h-[70vh] object-contain" />
                {highlightRegion && (
                  <div
                    className="absolute border-2 border-primary/60 bg-primary/10 rounded-lg pointer-events-none animate-pulse"
                    style={{
                      left: `${highlightRegion.x}%`,
                      top: `${highlightRegion.y}%`,
                      width: `${highlightRegion.width}%`,
                      height: `${highlightRegion.height}%`,
                    }}
                  />
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
