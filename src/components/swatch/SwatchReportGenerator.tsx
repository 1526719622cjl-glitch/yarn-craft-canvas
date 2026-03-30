import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from '@/i18n/useI18n';

interface SwatchReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  swatchData: {
    preWashWidth: number;
    preWashHeight: number;
    stitchesPreWash: number;
    rowsPreWash: number;
    postWashWidth: number;
    postWashHeight: number;
    stitchesPostWash: number;
    rowsPostWash: number;
    toolType: 'hook' | 'needle' | null;
    toolSizeMm: number | null;
  };
  gaugeData: {
    preWashStitchDensity: number;
    preWashRowDensity: number;
    postWashStitchDensity: number;
    postWashRowDensity: number;
    widthShrinkage: number;
    heightShrinkage: number;
  };
  yarnName?: string;
  yarnBrand?: string;
  preWashImage?: string | null;
  postWashImage?: string | null;
  projectPlan?: {
    targetWidth: number;
    targetHeight: number;
    startingStitches: number;
    startingRows: number;
  };
  compensatedStitches?: number;
  compensatedRows?: number;
  projectName?: string;
}

export function SwatchReportGenerator({
  open,
  onOpenChange,
  swatchData,
  gaugeData,
  yarnName: initialYarnName = '',
  yarnBrand: initialYarnBrand = '',
  preWashImage,
  postWashImage,
  projectPlan,
  compensatedStitches,
  compensatedRows,
  projectName,
}: SwatchReportGeneratorProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [yarnName, setYarnName] = useState(initialYarnName);
  const [yarnBrand, setYarnBrand] = useState(initialYarnBrand);
  const [notes, setNotes] = useState('');
  const { t } = useI18n();

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: '#FDFBF7' });
      const link = document.createElement('a');
      link.download = `swatch-report-${yarnName || 'untitled'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    const printContent = reportRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${t('report.header')} - ${yarnName || 'Swatch Report'}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Space Grotesk', system-ui, sans-serif; padding: 20px; background: #FDFBF7; } h2, h3 { margin-bottom: 8px; } table { width: 100%; border-collapse: collapse; } th, td { padding: 8px; text-align: center; border-bottom: 1px solid #E8D5C4; } th { text-align: left; } td:first-child { text-align: left; } img { max-width: 100%; height: auto; border-radius: 8px; } .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .section { background: rgba(255,255,255,0.6); border-radius: 12px; padding: 16px; margin-bottom: 12px; } @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }</style></head><body>${printContent}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const toolLabel = swatchData.toolType === 'hook' ? t('swatch.toolType.hook') : swatchData.toolType === 'needle' ? t('swatch.toolType.needle') : '';
  const hasImages = preWashImage || postWashImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {t('report.title')}
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('report.yarnName')}</Label>
              <Input value={yarnName} onChange={(e) => setYarnName(e.target.value)} placeholder="如：美丽诺羊毛" />
            </div>
            <div className="space-y-2">
              <Label>{t('report.brand')}</Label>
              <Input value={yarnBrand} onChange={(e) => setYarnBrand(e.target.value)} placeholder="如：编织人生" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('report.notes')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('report.notesPlaceholder')} rows={2} />
          </div>

          {/* Report Preview */}
          <div className="border rounded-2xl overflow-hidden">
            <div ref={reportRef} className="p-6 bg-gradient-to-br from-[#FDFBF7] to-[#F5F0E8]" style={{ width: '100%', minHeight: '400px' }}>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-semibold text-[#5D4E37]">{t('report.header')}</h2>
                {projectName && <p className="text-base font-medium text-[#5D4E37] mt-1">{projectName}</p>}
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                <h3 className="font-medium text-[#5D4E37] mb-2">{t('report.yarnInfo')}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-[#8B7355]">{t('report.name')}</span><span className="font-medium">{yarnName || '-'}</span></div>
                  <div><span className="text-[#8B7355]">{t('report.brandLabel')}</span><span className="font-medium">{yarnBrand || '-'}</span></div>
                </div>
              </div>

              {hasImages && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                  <h3 className="font-medium text-[#5D4E37] mb-3">{t('report.photos')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-[#8B7355] mb-1">{t('report.preWash')}</p>
                      {preWashImage ? <img src={preWashImage} alt="Pre-wash" className="w-full max-h-48 object-contain rounded-lg bg-[#F5F0E8]" /> : <div className="w-full h-32 rounded-lg bg-[#F5F0E8] flex items-center justify-center text-xs text-[#8B7355]">{t('report.notUploaded')}</div>}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#8B7355] mb-1">{t('report.postWash')}</p>
                      {postWashImage ? <img src={postWashImage} alt="Post-wash" className="w-full max-h-48 object-contain rounded-lg bg-[#F5F0E8]" /> : <div className="w-full h-32 rounded-lg bg-[#F5F0E8] flex items-center justify-center text-xs text-[#8B7355]">{t('report.notUploaded')}</div>}
                    </div>
                  </div>
                </div>
              )}

              {(swatchData.toolType || swatchData.toolSizeMm) && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                  <h3 className="font-medium text-[#5D4E37] mb-2">{t('report.toolSize')}</h3>
                  <p className="text-sm">{toolLabel} {swatchData.toolSizeMm ? `${swatchData.toolSizeMm}mm` : ''}</p>
                </div>
              )}

              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                <h3 className="font-medium text-[#5D4E37] mb-3">{t('report.gaugeTable')}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8D5C4]">
                      <th className="text-left py-2 text-[#8B7355]"></th>
                      <th className="text-center py-2 text-[#8B7355]">{t('report.preWash')}</th>
                      <th className="text-center py-2 text-[#8B7355]">{t('report.postWash')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E8D5C4]/50">
                      <td className="py-2 text-[#8B7355]">{t('report.swatchSize')}</td>
                      <td className="text-center font-medium">{swatchData.preWashWidth} × {swatchData.preWashHeight} cm</td>
                      <td className="text-center font-medium">{swatchData.postWashWidth} × {swatchData.postWashHeight} cm</td>
                    </tr>
                    <tr className="border-b border-[#E8D5C4]/50">
                      <td className="py-2 text-[#8B7355]">{t('report.stitchRows')}</td>
                      <td className="text-center font-medium">{swatchData.stitchesPreWash} st × {swatchData.rowsPreWash} rows</td>
                      <td className="text-center font-medium">{swatchData.stitchesPostWash} st × {swatchData.rowsPostWash} rows</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-[#8B7355]">{t('report.density')}</td>
                      <td className="text-center font-medium">{gaugeData.preWashStitchDensity.toFixed(2)} st × {gaugeData.preWashRowDensity.toFixed(2)} rows</td>
                      <td className="text-center font-medium">{gaugeData.postWashStitchDensity.toFixed(2)} st × {gaugeData.postWashRowDensity.toFixed(2)} rows</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {(gaugeData.widthShrinkage !== 0 || gaugeData.heightShrinkage !== 0) && (
                <div className="bg-gradient-to-r from-[#E8D5C4]/40 to-[#C9A08E]/30 rounded-xl p-4 mb-4">
                  <h3 className="font-medium text-[#5D4E37] mb-2">{t('report.shrinkage')}</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-display font-semibold text-[#8B7355]">{gaugeData.widthShrinkage > 0 ? '-' : '+'}{Math.abs(gaugeData.widthShrinkage).toFixed(1)}%</p>
                      <p className="text-xs text-[#8B7355]">{gaugeData.widthShrinkage > 0 ? t('report.widthShrink') : t('report.widthStretch')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-display font-semibold text-[#8B7355]">{gaugeData.heightShrinkage > 0 ? '-' : '+'}{Math.abs(gaugeData.heightShrinkage).toFixed(1)}%</p>
                      <p className="text-xs text-[#8B7355]">{gaugeData.heightShrinkage > 0 ? t('report.heightShrink') : t('report.heightStretch')}</p>
                    </div>
                  </div>
                </div>
              )}

              {projectPlan && projectPlan.startingStitches > 0 && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                  <h3 className="font-medium text-[#5D4E37] mb-3">{t('report.projectPlan')}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#8B7355]">{t('report.targetSize')}：</span>
                      <span className="font-medium">{projectPlan.targetWidth} × {projectPlan.targetHeight} cm</span>
                    </div>
                    <div>
                      <span className="text-[#8B7355]">{t('report.castOn')}：</span>
                      <span className="font-medium">{projectPlan.startingStitches} st × {projectPlan.startingRows} rows</span>
                    </div>
                    {compensatedStitches && compensatedRows && (compensatedStitches !== projectPlan.startingStitches || compensatedRows !== projectPlan.startingRows) && (
                      <div className="col-span-2">
                        <span className="text-[#8B7355]">{t('report.compensated')}：</span>
                        <span className="font-medium">{compensatedStitches} st × {compensatedRows} rows</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {notes && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                  <h3 className="font-medium text-[#5D4E37] mb-2">{t('report.notesSection')}</h3>
                  <p className="text-sm text-[#5D4E37] whitespace-pre-wrap">{notes}</p>
                </div>
              )}

              <div className="mt-6 text-center text-xs text-[#8B7355]">
                Generated by Yarn Clues • {new Date().toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleDownload} disabled={isGenerating} className="w-full rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? t('report.downloading') : t('report.download')}
            </Button>
            <Button onClick={handlePrint} variant="outline" className="w-full rounded-xl">
              <Printer className="w-4 h-4 mr-2" />
              {t('report.print')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
