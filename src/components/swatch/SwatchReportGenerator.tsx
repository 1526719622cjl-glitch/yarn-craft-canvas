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
}: SwatchReportGeneratorProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [yarnName, setYarnName] = useState(initialYarnName);
  const [yarnBrand, setYarnBrand] = useState(initialYarnBrand);
  const [notes, setNotes] = useState('');

  const handleDownload = async () => {
    if (!reportRef.current) return;
    
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        backgroundColor: '#FDFBF7',
      });
      
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
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>样片报告 - ${yarnName || 'Swatch Report'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Space Grotesk', system-ui, sans-serif; padding: 20px; background: #FDFBF7; }
          h2, h3 { margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: center; border-bottom: 1px solid #E8D5C4; }
          th { text-align: left; }
          td:first-child { text-align: left; }
          img { max-width: 100%; height: auto; border-radius: 8px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .section { background: rgba(255,255,255,0.6); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
          .shrinkage { background: linear-gradient(to right, rgba(232,213,196,0.4), rgba(201,160,142,0.3)); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
          .text-center { text-align: center; }
          .text-sm { font-size: 0.875rem; }
          .text-xs { font-size: 0.75rem; }
          .text-2xl { font-size: 1.5rem; }
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .mt-6 { margin-top: 24px; }
          .color-title { color: #5D4E37; }
          .color-sub { color: #8B7355; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const toolLabel = swatchData.toolType === 'hook' ? '🪝 钩针' : swatchData.toolType === 'needle' ? '🥢 棒针' : '';
  const hasImages = preWashImage || postWashImage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            生成样片报告
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>线材名称</Label>
              <Input
                value={yarnName}
                onChange={(e) => setYarnName(e.target.value)}
                placeholder="e.g., Malabrigo Rios"
              />
            </div>
            <div className="space-y-2">
              <Label>品牌</Label>
              <Input
                value={yarnBrand}
                onChange={(e) => setYarnBrand(e.target.value)}
                placeholder="e.g., Malabrigo"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加任何备注信息..."
              rows={2}
            />
          </div>

          {/* Report Preview */}
          <div className="border rounded-2xl overflow-hidden">
            <div
              ref={reportRef}
              className="p-6 bg-gradient-to-br from-[#FDFBF7] to-[#F5F0E8]"
              style={{ width: '100%', minHeight: '400px' }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-display font-semibold text-[#5D4E37]">
                  📐 样片报告
                </h2>
                <p className="text-sm text-[#8B7355] mt-1">Swatch Report</p>
              </div>

              {/* Yarn Info */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                <h3 className="font-medium text-[#5D4E37] mb-2">🧶 线材信息</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[#8B7355]">名称：</span>
                    <span className="font-medium">{yarnName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[#8B7355]">品牌：</span>
                    <span className="font-medium">{yarnBrand || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Swatch Photos */}
              {hasImages && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                  <h3 className="font-medium text-[#5D4E37] mb-3">📷 织片照片</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-[#8B7355] mb-1">洗前 Pre-wash</p>
                      {preWashImage ? (
                        <img src={preWashImage} alt="Pre-wash swatch" className="w-full h-32 object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-32 rounded-lg bg-[#F5F0E8] flex items-center justify-center text-xs text-[#8B7355]">未上传</div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#8B7355] mb-1">洗后 Post-wash</p>
                      {postWashImage ? (
                        <img src={postWashImage} alt="Post-wash swatch" className="w-full h-32 object-cover rounded-lg" />
                      ) : (
                        <div className="w-full h-32 rounded-lg bg-[#F5F0E8] flex items-center justify-center text-xs text-[#8B7355]">未上传</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tool Info */}
              {(swatchData.toolType || swatchData.toolSizeMm) && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                  <h3 className="font-medium text-[#5D4E37] mb-2">🔧 工具尺寸</h3>
                  <p className="text-sm">
                    {toolLabel} {swatchData.toolSizeMm ? `${swatchData.toolSizeMm}mm` : ''}
                  </p>
                </div>
              )}

              {/* Gauge Comparison Table */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm">
                <h3 className="font-medium text-[#5D4E37] mb-3">📊 密度对照表</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8D5C4]">
                      <th className="text-left py-2 text-[#8B7355]"></th>
                      <th className="text-center py-2 text-[#8B7355]">洗前 Pre-wash</th>
                      <th className="text-center py-2 text-[#8B7355]">洗后 Post-wash</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E8D5C4]/50">
                      <td className="py-2 text-[#8B7355]">样片尺寸</td>
                      <td className="text-center font-medium">{swatchData.preWashWidth} × {swatchData.preWashHeight} cm</td>
                      <td className="text-center font-medium">{swatchData.postWashWidth} × {swatchData.postWashHeight} cm</td>
                    </tr>
                    <tr className="border-b border-[#E8D5C4]/50">
                      <td className="py-2 text-[#8B7355]">针数/行数</td>
                      <td className="text-center font-medium">{swatchData.stitchesPreWash} st × {swatchData.rowsPreWash} rows</td>
                      <td className="text-center font-medium">{swatchData.stitchesPostWash} st × {swatchData.rowsPostWash} rows</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-[#8B7355]">密度 (per cm)</td>
                      <td className="text-center font-medium">{gaugeData.preWashStitchDensity.toFixed(2)} st × {gaugeData.preWashRowDensity.toFixed(2)} rows</td>
                      <td className="text-center font-medium">{gaugeData.postWashStitchDensity.toFixed(2)} st × {gaugeData.postWashRowDensity.toFixed(2)} rows</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Shrinkage Analysis */}
              {(gaugeData.widthShrinkage !== 0 || gaugeData.heightShrinkage !== 0) && (
                <div className="bg-gradient-to-r from-[#E8D5C4]/40 to-[#C9A08E]/30 rounded-xl p-4 mb-4">
                  <h3 className="font-medium text-[#5D4E37] mb-2">📉 收缩率分析</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-display font-semibold text-[#8B7355]">
                        {gaugeData.widthShrinkage > 0 ? '-' : '+'}{Math.abs(gaugeData.widthShrinkage).toFixed(1)}%
                      </p>
                      <p className="text-xs text-[#8B7355]">宽度 {gaugeData.widthShrinkage > 0 ? '收缩' : '拉伸'}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-display font-semibold text-[#8B7355]">
                        {gaugeData.heightShrinkage > 0 ? '-' : '+'}{Math.abs(gaugeData.heightShrinkage).toFixed(1)}%
                      </p>
                      <p className="text-xs text-[#8B7355]">高度 {gaugeData.heightShrinkage > 0 ? '收缩' : '拉伸'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {notes && (
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                  <h3 className="font-medium text-[#5D4E37] mb-2">📝 备注</h3>
                  <p className="text-sm text-[#5D4E37] whitespace-pre-wrap">{notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 text-center text-xs text-[#8B7355]">
                Generated by Yarn Clues • {new Date().toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={handleDownload} 
              disabled={isGenerating}
              className="w-full rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? '生成中...' : '下载报告图片'}
            </Button>
            <Button 
              onClick={handlePrint}
              variant="outline"
              className="w-full rounded-xl"
            >
              <Printer className="w-4 h-4 mr-2" />
              打印报告
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
