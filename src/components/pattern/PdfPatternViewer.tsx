import { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatternViewer, type PatternAnnotationData } from './PatternViewer';

// Reuse worker from thumbnailGenerator
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PdfPatternViewerProps {
  pdfUrl: string;
  annotations?: PatternAnnotationData | null;
  onAnnotationChange?: (data: PatternAnnotationData) => void;
  onSaveAnnotation?: () => void;
  savingAnnotation?: boolean;
  onPageChange?: (page: number) => void;
}

export function PdfPatternViewer({
  pdfUrl,
  annotations,
  onAnnotationChange,
  onSaveAnnotation,
  savingAnnotation,
  onPageChange,
}: PdfPatternViewerProps) {
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const renderPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      setTotalPages(pdf.numPages);
      const page = await pdf.getPage(pageNum);
      
      // Render at 2x scale for clarity
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      setPageImageUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      console.warn('PDF render failed:', e);
    } finally {
      setLoading(false);
    }
  }, [pdfUrl]);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  const goToPage = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
    onPageChange?.(p);
  };

  if (loading && !pageImageUrl) {
    return (
      <div className="w-full min-h-[400px] bg-muted/20 rounded-2xl flex items-center justify-center">
        <div className="text-muted-foreground text-sm">加载 PDF 中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pageImageUrl && (
        <PatternViewer
          imageUrl={pageImageUrl}
          annotations={annotations}
          onAnnotationChange={onAnnotationChange}
          onSaveAnnotation={onSaveAnnotation}
          savingAnnotation={savingAnnotation}
        />
      )}
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button variant="outline" size="icon" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
