import { motion } from 'framer-motion';
import { useYarnCluesStore } from '@/store/useYarnCluesStore';
import { Ruler, Calculator, TrendingUp, Target, Undo, Redo, Save, Droplets, Info, Loader2, FileImage, Camera, X, Trash2, Clock, ChevronDown, Import, AlertTriangle, Package } from 'lucide-react';
import { ImageCropDialog } from '@/components/pixel/ImageCropDialog';
import { FiberContentSelector } from '@/components/swatch/FiberContentSelector';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useRef, useCallback } from 'react';
import { SmartYarnCalculator } from '@/components/swatch/SmartYarnCalculator';
import { YarnGaugeVault } from '@/components/swatch/YarnGaugeVault';
import { useUndoRedo, useUndoRedoKeyboard } from '@/hooks/useUndoRedo';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useYarnFolders, useYarnEntries, YarnEntry, YarnWeight, YarnStatus } from '@/hooks/useYarnVault';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SwatchReportGenerator } from '@/components/swatch/SwatchReportGenerator';
import { useI18n } from '@/i18n/useI18n';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Tool size presets
const TOOL_SIZES = [2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// Safe number helper
const num = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

// ─── Quick Calc History Hook ───
function useQuickCalcHistory(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['quick-calc-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('quick_calc_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const addRecord = useMutation({
    mutationFn: async (record: {
      swatch_width: number; swatch_height: number; stitches: number; rows: number;
      target_width: number; target_height: number; result_stitches: number; result_rows: number;
    }) => {
      if (!userId) throw new Error('Not authenticated');
      if (history.length >= 15) {
        const oldest = history[history.length - 1];
        await supabase.from('quick_calc_history').delete().eq('id', oldest.id);
      }
      const { error } = await supabase.from('quick_calc_history').insert({ ...record, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quick-calc-history', userId] }),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase.from('quick_calc_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quick-calc-history', userId] }),
  });

  return { history, isLoading, addRecord, clearAll };
}

// ═══════════════════════════════════════════════
// Quick Calc Mode Component
// ═══════════════════════════════════════════════
function QuickCalcMode() {
  const { user } = useAuth();
  const [swatchWidth, setSwatchWidth] = useState(10);
  const [swatchHeight, setSwatchHeight] = useState(10);
  const [stitches, setStitches] = useState<number | ''>('');
  const [rows, setRows] = useState<number | ''>('');
  const [targetWidth, setTargetWidth] = useState<number | ''>('');
  const [targetHeight, setTargetHeight] = useState<number | ''>('');
  const [result, setResult] = useState<{ stitches: number; rows: number } | null>(null);

  const { history, isLoading, addRecord, clearAll } = useQuickCalcHistory(user?.id);

  const handleCalculate = () => {
    const sw = num(swatchWidth, 0);
    const sh = num(swatchHeight, 0);
    const st = num(stitches, 0);
    const rw = num(rows, 0);
    const tw = num(targetWidth, 0);
    const th = num(targetHeight, 0);
    if (sw <= 0 || sh <= 0 || st <= 0 || rw <= 0 || tw <= 0 || th <= 0) return;

    const resultStitches = Math.round(tw / sw * st);
    const resultRows = Math.round(th / sh * rw);
    setResult({ stitches: resultStitches, rows: resultRows });

    if (user) {
      addRecord.mutate({
        swatch_width: sw, swatch_height: sh, stitches: st, rows: rw,
        target_width: tw, target_height: th, result_stitches: resultStitches, result_rows: resultRows,
      });
    }
  };

  const handleReset = () => {
    setSwatchWidth(10); setSwatchHeight(10);
    setStitches(''); setRows('');
    setTargetWidth(''); setTargetHeight('');
    setResult(null);
  };

  return (
    <div className="space-y-5">
      <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>🧶</span> 小样信息
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">小样宽度(cm)</Label>
            <Input type="number" step="0.1" value={swatchWidth} onChange={e => setSwatchWidth(Number(e.target.value))} className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">小样针数</Label>
            <Input type="number" value={stitches} onChange={e => setStitches(e.target.value === '' ? '' : Number(e.target.value))} placeholder="请输入针数" className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">小样高度(cm)</Label>
            <Input type="number" step="0.1" value={swatchHeight} onChange={e => setSwatchHeight(Number(e.target.value))} className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">小样行数</Label>
            <Input type="number" value={rows} onChange={e => setRows(e.target.value === '' ? '' : Number(e.target.value))} placeholder="请输入行数" className="h-10" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" /> 目标尺寸
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">目标宽度(cm)</Label>
            <Input type="number" step="0.1" value={targetWidth} onChange={e => setTargetWidth(e.target.value === '' ? '' : Number(e.target.value))} placeholder="请输入宽度" className="h-10" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">目标高度(cm)</Label>
            <Input type="number" step="0.1" value={targetHeight} onChange={e => setTargetHeight(e.target.value === '' ? '' : Number(e.target.value))} placeholder="请输入高度" className="h-10" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-3">
        <Button onClick={handleCalculate} className="flex-1 rounded-xl h-11" disabled={!stitches || !rows || !targetWidth || !targetHeight}>
          <Calculator className="w-4 h-4 mr-2" /> 计算
        </Button>
        <Button variant="outline" onClick={handleReset} className="rounded-xl h-11">重置</Button>
      </motion.div>

      {result && (
        <motion.div variants={itemVariants} className="glass-card p-5">
          <p className="text-sm text-muted-foreground mb-2">计算结果</p>
          <p className="text-xl font-display font-semibold text-primary">
            起 {result.stitches} 针 / {result.rows} 行
          </p>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> 历史记录
          </h3>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => clearAll.mutate()}>
              一键清空
            </Button>
          )}
        </div>

        {!user ? (
          <p className="text-xs text-muted-foreground text-center py-4">登录后可保存历史记录</p>
        ) : isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : history.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">暂无记录</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {history.map((rec: any) => (
              <div key={rec.id} className="frosted-panel text-xs space-y-0.5">
                <p className="text-muted-foreground">{new Date(rec.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                <p>{rec.swatch_width}×{rec.swatch_height}cm: {rec.stitches}针×{rec.rows}行</p>
                <p>目标: {rec.target_width}×{rec.target_height}cm → <span className="font-medium text-primary">{rec.result_stitches}针 / {rec.result_rows}行</span></p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Pro Mode Component
// ═══════════════════════════════════════════════
interface ProModeProps {
  pendingYarn: YarnEntry | null;
  onPendingYarnConsumed: () => void;
}

function ProMode({ pendingYarn, onPendingYarnConsumed }: ProModeProps) {
  const { 
    swatchData, gaugeData, projectPlan,
    setSwatchData, setProjectPlan, calculateGauge,
  } = useYarnCluesStore();

  const { user } = useAuth();
  const { folders } = useYarnFolders();
  const { createEntry } = useYarnEntries();
  const { t } = useI18n();
  
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [yarnName, setYarnName] = useState('');
  const [yarnBrand, setYarnBrand] = useState('');
  const [yarnWeight, setYarnWeight] = useState<YarnWeight | ''>('');
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [customToolSize, setCustomToolSize] = useState('');
  const [isCustomToolSize, setIsCustomToolSize] = useState(false);
  const [preWashImage, setPreWashImage] = useState<string | null>(null);
  const [postWashImage, setPostWashImage] = useState<string | null>(null);
  const preWashFileRef = useRef<HTMLInputElement>(null);
  const postWashFileRef = useRef<HTMLInputElement>(null);
  const [fiberContent, setFiberContent] = useState('');
  const [projectName, setProjectName] = useState('');

  const [yarnInfoOpen, setYarnInfoOpen] = useState(false);
  const [postWashOpen, setPostWashOpen] = useState(false);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState('');
  const [cropTarget, setCropTarget] = useState<'pre' | 'post'>('pre');

  const handleImageUpload = (file: File, target: 'pre' | 'post') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPendingImageUrl(e.target?.result as string);
      setCropTarget(target);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedUrl: string) => {
    if (cropTarget === 'pre') setPreWashImage(croppedUrl);
    else setPostWashImage(croppedUrl);
  };

  const safeGaugeData = {
    preWashStitchDensity: num(gaugeData?.preWashStitchDensity, 0),
    preWashRowDensity: num(gaugeData?.preWashRowDensity, 0),
    postWashStitchDensity: num(gaugeData?.postWashStitchDensity, 0),
    postWashRowDensity: num(gaugeData?.postWashRowDensity, 0),
    gaugeRatio: num(gaugeData?.gaugeRatio, 1),
    widthShrinkage: num(gaugeData?.widthShrinkage, 0),
    heightShrinkage: num(gaugeData?.heightShrinkage, 0),
    widthFactor: num(gaugeData?.widthFactor, 1),
    heightFactor: num(gaugeData?.heightFactor, 1),
  };

  const safeProjectPlan = {
    targetWidth: num(projectPlan?.targetWidth, 50),
    targetHeight: num(projectPlan?.targetHeight, 60),
    startingStitches: num(projectPlan?.startingStitches, 0),
    startingRows: num(projectPlan?.startingRows, 0),
  };

  const safeSwatchData = {
    preWashWidth: num(swatchData?.preWashWidth, 10),
    preWashHeight: num(swatchData?.preWashHeight, 10),
    stitchesPreWash: num(swatchData?.stitchesPreWash, 20),
    rowsPreWash: num(swatchData?.rowsPreWash, 28),
    postWashWidth: num(swatchData?.postWashWidth, 10),
    postWashHeight: num(swatchData?.postWashHeight, 10),
    stitchesPostWash: num(swatchData?.stitchesPostWash, 20),
    rowsPostWash: num(swatchData?.rowsPostWash, 28),
    toolType: swatchData?.toolType ?? null,
    toolSizeMm: swatchData?.toolSizeMm ?? null,
  };

  // Undo/Redo
  const { state: undoableSwatchData, set: setUndoableSwatch, undo, redo, canUndo, canRedo } = useUndoRedo(safeSwatchData);
  useUndoRedoKeyboard(undo, redo);

  // Track whether we initiated the change internally
  const internalChangeRef = useRef(false);

  useEffect(() => {
    if (JSON.stringify(undoableSwatchData) !== JSON.stringify(safeSwatchData)) {
      internalChangeRef.current = true;
      setSwatchData(undoableSwatchData);
    }
  }, [undoableSwatchData, setSwatchData]);

  // Sync from store when swatchData changes externally (e.g., yarn import from vault)
  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false;
      return;
    }
    const storeData = {
      preWashWidth: num(swatchData?.preWashWidth, 10),
      preWashHeight: num(swatchData?.preWashHeight, 10),
      stitchesPreWash: num(swatchData?.stitchesPreWash, 20),
      rowsPreWash: num(swatchData?.rowsPreWash, 28),
      postWashWidth: num(swatchData?.postWashWidth, 10),
      postWashHeight: num(swatchData?.postWashHeight, 10),
      stitchesPostWash: num(swatchData?.stitchesPostWash, 20),
      rowsPostWash: num(swatchData?.rowsPostWash, 28),
      toolType: swatchData?.toolType ?? null,
      toolSizeMm: swatchData?.toolSizeMm ?? null,
    };
    if (JSON.stringify(storeData) !== JSON.stringify(undoableSwatchData)) {
      setUndoableSwatch(storeData);
    }
  }, [swatchData]);

  useEffect(() => { calculateGauge(); }, [calculateGauge]);

  // Handle pending yarn load from library tab
  useEffect(() => {
    if (!pendingYarn) return;
    setYarnName(pendingYarn.name);
    setYarnBrand(pendingYarn.brand || '');
    setFiberContent(pendingYarn.fiber_content || '');
    setPreWashImage(pendingYarn.pre_wash_photo_url || null);
    setPostWashImage(pendingYarn.post_wash_photo_url || null);
    setYarnInfoOpen(true);
    if (pendingYarn.weight) setYarnWeight(pendingYarn.weight as YarnWeight);
    onPendingYarnConsumed();
  }, [pendingYarn, onPendingYarnConsumed]);

  const handleSwatchChange = (updates: Partial<typeof safeSwatchData>) => {
    setUndoableSwatch((prev) => {
      const next = { ...prev, ...updates };
      // Auto-sync: when post-wash width/height is set, copy pre-wash stitch/row counts
      if ('postWashWidth' in updates || 'postWashHeight' in updates) {
        next.stitchesPostWash = next.stitchesPreWash;
        next.rowsPostWash = next.rowsPreWash;
      }
      return next;
    });
  };

  const handleToolSizeChange = (value: string) => {
    if (value === 'custom') { setIsCustomToolSize(true); }
    else { setIsCustomToolSize(false); handleSwatchChange({ toolSizeMm: parseFloat(value) }); }
  };

  const handleCustomToolSizeChange = (value: string) => {
    setCustomToolSize(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) handleSwatchChange({ toolSizeMm: parsed });
  };

  const uploadSwatchPhoto = useCallback(async (dataUrl: string, label: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const path = `swatch-photos/${user.id}/${Date.now()}_${label}.${ext}`;
      const { error } = await supabase.storage.from('pattern-files').upload(path, blob, { upsert: true });
      if (error) return null;
      const { data } = supabase.storage.from('pattern-files').getPublicUrl(path);
      return data.publicUrl;
    } catch { return null; }
  }, [user]);

  const handleSaveToCloud = async () => {
    if (!yarnName.trim()) return;
    const prePhotoUrl = preWashImage
      ? (preWashImage.startsWith('data:') ? await uploadSwatchPhoto(preWashImage, 'pre') : preWashImage)
      : null;
    const postPhotoUrl = postWashImage
      ? (postWashImage.startsWith('data:') ? await uploadSwatchPhoto(postWashImage, 'post') : postWashImage)
      : null;
    
    createEntry.mutate({
      name: yarnName.trim(),
      brand: yarnBrand.trim() || null,
      color_code: null,
      fiber_content: fiberContent || null,
      weight: (yarnWeight || null) as YarnWeight | null,
      status: 'new' as YarnStatus,
      folder_id: selectedFolderId,
      stitches_per_10cm: safeGaugeData.postWashStitchDensity * 10,
      rows_per_10cm: safeGaugeData.postWashRowDensity * 10,
      post_wash_width_cm: safeSwatchData.postWashWidth,
      post_wash_height_cm: safeSwatchData.postWashHeight,
      pre_wash_width_cm: safeSwatchData.preWashWidth,
      pre_wash_height_cm: safeSwatchData.preWashHeight,
      stitches_pre_wash: safeSwatchData.stitchesPreWash,
      rows_pre_wash: safeSwatchData.rowsPreWash,
      stitches_post_wash: safeSwatchData.stitchesPostWash,
      rows_post_wash: safeSwatchData.rowsPostWash,
      tool_type: safeSwatchData.toolType,
      tool_size_mm: safeSwatchData.toolSizeMm,
      meters_per_ball: null, grams_per_ball: null, balls_in_stock: 0,
      notes: null,
      pre_wash_photo_url: prePhotoUrl, post_wash_photo_url: postPhotoUrl,
    });
    setSaveModalOpen(false);
  };

  // Determine if post-wash data differs from pre-wash
  const hasPostWashData = (
    safeSwatchData.postWashWidth !== safeSwatchData.preWashWidth ||
    safeSwatchData.postWashHeight !== safeSwatchData.preWashHeight ||
    safeSwatchData.stitchesPostWash !== safeSwatchData.stitchesPreWash ||
    safeSwatchData.rowsPostWash !== safeSwatchData.rowsPreWash
  ) && safeSwatchData.postWashWidth > 0 && safeSwatchData.postWashHeight > 0;

  // Smart project planner calculations
  const smartCalc = (() => {
    const tw = safeProjectPlan.targetWidth;
    const th = safeProjectPlan.targetHeight;
    if (tw <= 0 || th <= 0) return null;

    if (hasPostWashData) {
      const preStitchDensity = safeGaugeData.preWashStitchDensity;
      const preRowDensity = safeGaugeData.preWashRowDensity;
      const wFactor = safeGaugeData.widthFactor;
      const hFactor = safeGaugeData.heightFactor;
      const suggestedStitches = Math.round(tw * preStitchDensity * wFactor);
      const suggestedRows = Math.round(th * preRowDensity * hFactor);
      const preWashWidth = preStitchDensity > 0 ? suggestedStitches / preStitchDensity : 0;
      const preWashHeight = preRowDensity > 0 ? suggestedRows / preRowDensity : 0;
      const widthShrinkPct = safeGaugeData.widthShrinkage;
      const heightShrinkPct = safeGaugeData.heightShrinkage;
      return {
        mode: 'compensated' as const,
        stitches: suggestedStitches, rows: suggestedRows,
        preWashWidth: Math.round(preWashWidth * 10) / 10,
        preWashHeight: Math.round(preWashHeight * 10) / 10,
        widthShrinkPct, heightShrinkPct,
      };
    } else {
      const preStitchDensity = safeGaugeData.preWashStitchDensity;
      const preRowDensity = safeGaugeData.preWashRowDensity;
      const suggestedStitches = Math.round(tw * preStitchDensity);
      const suggestedRows = Math.round(th * preRowDensity);
      return { mode: 'simple' as const, stitches: suggestedStitches, rows: suggestedRows };
    }
  })();

  const formatDensity = (stitchDensity: number, rowDensity: number) => {
    const st10 = Math.round(stitchDensity * 10);
    const rw10 = Math.round(rowDensity * 10);
    return `10×10cm：${st10}针 × ${rw10}行`;
  };

  return (
    <div className="space-y-6">
      {/* Undo/Redo + Clear Controls */}
      <motion.div variants={itemVariants} className="flex justify-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} className="rounded-xl soft-press h-8 w-8">
              <Undo className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} className="rounded-xl soft-press h-8 w-8">
              <Redo className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-xl soft-press text-destructive hover:text-destructive h-8 w-8" onClick={() => {
              if (!confirm('确定要清空当前所有数据吗？已保存到线材库的数据不受影响。')) return;
              setSwatchData({
                preWashWidth: 0, preWashHeight: 0, stitchesPreWash: 0, rowsPreWash: 0,
                postWashWidth: 0, postWashHeight: 0, stitchesPostWash: 0, rowsPostWash: 0,
                toolType: null, toolSizeMm: null,
              });
              setProjectPlan({ targetWidth: 0, targetHeight: 0, startingStitches: 0, startingRows: 0 });
              setYarnName(''); setYarnBrand(''); setYarnWeight(''); setFiberContent(''); setProjectName('');
              setPreWashImage(null); setPostWashImage(null);
              setCustomToolSize(''); setIsCustomToolSize(false); setSelectedFolderId(null);
            }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>清空当前数据</TooltipContent>
        </Tooltip>
      </motion.div>

      {/* Collapsible Yarn Info */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <Collapsible open={yarnInfoOpen} onOpenChange={setYarnInfoOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-sm">🏷️</span>
                <h3 className="text-sm font-medium">线材信息</h3>
                <span className="text-xs text-muted-foreground">（选填）</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${yarnInfoOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">线材名称</Label>
                <Input value={yarnName} onChange={e => setYarnName(e.target.value)} placeholder="如：美丽诺羊毛线" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">品牌</Label>
                <Input value={yarnBrand} onChange={e => setYarnBrand(e.target.value)} placeholder="如：编织人生" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">粗细</Label>
                <Select value={yarnWeight} onValueChange={(v) => setYarnWeight(v as YarnWeight)}>
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="选择粗细" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lace">Lace</SelectItem>
                    <SelectItem value="fingering">Fingering</SelectItem>
                    <SelectItem value="sport">Sport</SelectItem>
                    <SelectItem value="dk">DK</SelectItem>
                    <SelectItem value="worsted">Worsted</SelectItem>
                    <SelectItem value="aran">Aran</SelectItem>
                    <SelectItem value="bulky">Bulky</SelectItem>
                    <SelectItem value="super_bulky">Super Bulky</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">纤维成分</Label>
                <FiberContentSelector value={fiberContent} onChange={setFiberContent} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">工具类型</Label>
                <Select value={safeSwatchData.toolType || ''} onValueChange={(v) => handleSwatchChange({ toolType: v as 'hook' | 'needle' })}>
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue placeholder="选择工具" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hook">钩针</SelectItem>
                    <SelectItem value="needle">棒针</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">工具尺寸(mm)</Label>
                <div className="flex gap-2">
                  <Select value={isCustomToolSize ? 'custom' : (safeSwatchData.toolSizeMm?.toString() || '')} onValueChange={handleToolSizeChange}>
                    <SelectTrigger className="h-9 rounded-xl flex-1"><SelectValue placeholder="选择尺寸" /></SelectTrigger>
                    <SelectContent>
                      {TOOL_SIZES.map(size => (<SelectItem key={size} value={size.toString()}>{size}mm</SelectItem>))}
                      <SelectItem value="custom">自定义</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomToolSize && (
                    <Input type="number" step="0.01" value={customToolSize} onChange={e => handleCustomToolSizeChange(e.target.value)} placeholder="mm" className="w-20 h-9" />
                  )}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* Pre-Wash Swatch */}
      <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">🧶</span>
          <h3 className="text-sm font-medium">洗前小样数据</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">小样宽度(cm)</Label>
            <Input type="number" step="0.1" value={safeSwatchData.preWashWidth} onChange={e => handleSwatchChange({ preWashWidth: Number(e.target.value) })} className="h-10 text-lg font-medium" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">小样高度(cm)</Label>
            <Input type="number" step="0.1" value={safeSwatchData.preWashHeight} onChange={e => handleSwatchChange({ preWashHeight: Number(e.target.value) })} className="h-10 text-lg font-medium" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">针数</Label>
            <Input type="number" value={safeSwatchData.stitchesPreWash} onChange={e => handleSwatchChange({ stitchesPreWash: Number(e.target.value) })} className="h-10 text-lg font-medium" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">行数</Label>
            <Input type="number" value={safeSwatchData.rowsPreWash} onChange={e => handleSwatchChange({ rowsPreWash: Number(e.target.value) })} className="h-10 text-lg font-medium" />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">样片照片</Label>
          <input ref={preWashFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, 'pre'); }} />
          {preWashImage ? (
            <div className="relative group">
              <img src={preWashImage} alt="Pre-wash" className="w-full max-h-32 object-contain rounded-xl border border-border/30" />
              <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setPreWashImage(null); if (preWashFileRef.current) preWashFileRef.current.value = ''; }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button onClick={() => preWashFileRef.current?.click()} className="w-full h-16 border-2 border-dashed border-border/40 rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
              <Camera className="w-4 h-4" />
              <span className="text-xs">上传照片</span>
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">洗前密度</p>
          <p className="text-sm font-medium">{formatDensity(safeGaugeData.preWashStitchDensity, safeGaugeData.preWashRowDensity)}</p>
        </div>
      </motion.div>

      {/* Collapsible Post-Wash */}
      <motion.div variants={itemVariants} className="glass-card p-5">
        <Collapsible open={postWashOpen} onOpenChange={setPostWashOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">洗后小样数据</h3>
                <span className="text-xs text-muted-foreground">（选填）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">填写后可自动计算缩水补偿，防缩水变小</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${postWashOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">小样宽度(cm)</Label>
                <Input type="number" step="0.1" value={safeSwatchData.postWashWidth} onChange={e => handleSwatchChange({ postWashWidth: Number(e.target.value) })} className="h-10 text-lg font-medium" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">小样高度(cm)</Label>
                <Input type="number" step="0.1" value={safeSwatchData.postWashHeight} onChange={e => handleSwatchChange({ postWashHeight: Number(e.target.value) })} className="h-10 text-lg font-medium" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">针数</Label>
                <Input type="number" value={safeSwatchData.stitchesPostWash} onChange={e => handleSwatchChange({ stitchesPostWash: Number(e.target.value) })} className="h-10 text-lg font-medium" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">行数</Label>
                <Input type="number" value={safeSwatchData.rowsPostWash} onChange={e => handleSwatchChange({ rowsPostWash: Number(e.target.value) })} className="h-10 text-lg font-medium" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">样片照片</Label>
              <input ref={postWashFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, 'post'); }} />
              {postWashImage ? (
                <div className="relative group">
                  <img src={postWashImage} alt="Post-wash" className="w-full max-h-32 object-contain rounded-xl border border-border/30" />
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setPostWashImage(null); if (postWashFileRef.current) postWashFileRef.current.value = ''; }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <button onClick={() => postWashFileRef.current?.click()} className="w-full h-16 border-2 border-dashed border-border/40 rounded-xl flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                  <Camera className="w-4 h-4" />
                  <span className="text-xs">上传照片</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-border/30">
              <p className="text-xs text-muted-foreground">洗后密度</p>
              <p className="text-sm font-medium">{formatDensity(safeGaugeData.postWashStitchDensity, safeGaugeData.postWashRowDensity)}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* Shrinkage Analysis - always visible, only 2 columns (no compensation factors) */}
      <motion.div variants={itemVariants} className="p-4 rounded-2xl bg-yarn-honey/20 border border-yarn-honey/30">
        <h3 className="text-sm font-medium mb-3">缩水/拉伸分析</h3>
        {hasPostWashData ? (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-semibold text-primary">
                {safeGaugeData.widthShrinkage > 0 ? '-' : '+'}{Math.abs(safeGaugeData.widthShrinkage).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">{safeGaugeData.widthShrinkage > 0 ? '横向缩水' : '横向拉伸'}</p>
            </div>
            <div>
              <p className="text-2xl font-display font-semibold text-primary">
                {safeGaugeData.heightShrinkage > 0 ? '-' : '+'}{Math.abs(safeGaugeData.heightShrinkage).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">{safeGaugeData.heightShrinkage > 0 ? '纵向缩水' : '纵向拉伸'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">暂无洗后数据，无法分析缩水。请展开上方"洗后小样数据"填写。</p>
        )}
      </motion.div>

      {/* Save to Library - moved above project planner */}
      <motion.div variants={itemVariants} className="flex justify-end">
        {user ? (
          <Button onClick={() => setSaveModalOpen(true)} className="rounded-xl soft-press" size="sm">
            <Save className="w-4 h-4 mr-1" /> 保存到线材库
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled className="rounded-xl" size="sm">
                <Save className="w-4 h-4 mr-1" /> 保存到线材库
              </Button>
            </TooltipTrigger>
            <TooltipContent>登录后可保存</TooltipContent>
          </Tooltip>
        )}
      </motion.div>

      {/* Project Planner */}
      <motion.div variants={itemVariants} className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">项目规划器</h3>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">项目名称</Label>
          <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="如：围巾" className="h-10" />
        </div>

        {hasPostWashData && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-xs text-primary">
              ℹ️ 检测到洗后数据，当前目标尺寸 {safeProjectPlan.targetWidth}×{safeProjectPlan.targetHeight} 已默认为下水定型后的成品尺寸
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">目标宽度(cm)</Label>
            <Input type="number" value={safeProjectPlan.targetWidth} onChange={e => setProjectPlan({ targetWidth: Number(e.target.value) })} className="h-10 text-lg font-medium" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">目标高度(cm)</Label>
            <Input type="number" value={safeProjectPlan.targetHeight} onChange={e => setProjectPlan({ targetHeight: Number(e.target.value) })} className="h-10 text-lg font-medium" />
          </div>
        </div>

        {smartCalc && (
          <div className="space-y-3 pt-3 border-t border-border/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="frosted-panel text-center">
                <p className="text-2xl font-display font-semibold text-primary">{smartCalc.stitches}</p>
                <p className="text-xs text-muted-foreground mt-1">建议起针</p>
              </div>
              <div className="frosted-panel text-center">
                <p className="text-2xl font-display font-semibold text-primary">{smartCalc.rows}</p>
                <p className="text-xs text-muted-foreground mt-1">建议行数</p>
              </div>
            </div>

            {smartCalc.mode === 'simple' && (
              <div className="p-3 rounded-xl bg-yarn-honey/20 border border-yarn-honey/30">
                <p className="text-xs text-foreground/70 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  测量提醒：请在编织过程中以当前样片密度为准，此计算未包含缩水补偿
                </p>
              </div>
            )}

            {smartCalc.mode === 'compensated' && (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  在此针数下，你手里的未下水织片尺寸应为：<span className="font-medium text-foreground">{smartCalc.preWashWidth}cm × {smartCalc.preWashHeight}cm</span>
                </p>
                <p>
                  结合样片 {smartCalc.widthShrinkPct > 0 ? `+${smartCalc.widthShrinkPct.toFixed(1)}%` : `${smartCalc.widthShrinkPct.toFixed(1)}%`} 横向{smartCalc.widthShrinkPct > 0 ? '缩水' : '拉伸'} / {smartCalc.heightShrinkPct > 0 ? `+${smartCalc.heightShrinkPct.toFixed(1)}%` : `${smartCalc.heightShrinkPct.toFixed(1)}%`} 纵向{smartCalc.heightShrinkPct > 0 ? '缩水' : '拉伸'}率，尺寸将回归为：<span className="font-medium text-foreground">{safeProjectPlan.targetWidth}cm × {safeProjectPlan.targetHeight}cm</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Report button - only show when projectName is filled */}
        {projectName.trim() && user && (
          <div className="flex justify-end pt-3 border-t border-border/30">
            <Button variant="outline" onClick={() => setShowReportGenerator(true)} className="rounded-xl soft-press" size="sm">
              <FileImage className="w-4 h-4 mr-1" /> 生成报告
            </Button>
          </div>
        )}
      </motion.div>

      {/* Save Modal */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" /> 保存到线材库
            </DialogTitle>
            <DialogDescription>线材信息已从页面自动填入，选择文件夹后即可保存</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!yarnName.trim() && (
              <div className="space-y-2">
                <Label htmlFor="save-yarn-name">线材名称 *</Label>
                <Input id="save-yarn-name" value={yarnName} onChange={e => setYarnName(e.target.value)} placeholder="请输入线材名称" autoFocus />
              </div>
            )}

            {yarnName.trim() && (
              <div className="frosted-panel space-y-1">
                <p className="text-sm font-medium">{yarnName}</p>
                {yarnBrand && <p className="text-xs text-muted-foreground">品牌：{yarnBrand}</p>}
                {yarnWeight && <p className="text-xs text-muted-foreground">粗细：{yarnWeight}</p>}
                {fiberContent && <p className="text-xs text-muted-foreground">成分：{fiberContent}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>保存到文件夹</Label>
              <Select value={selectedFolderId || 'root'} onValueChange={(v) => setSelectedFolderId(v === 'root' ? null : v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="选择文件夹" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">根目录</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>📂 {folder.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="frosted-panel">
              <p className="text-xs text-muted-foreground mb-1">当前密度</p>
              <p className="text-sm font-medium">{formatDensity(safeGaugeData.postWashStitchDensity, safeGaugeData.postWashRowDensity)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)} className="rounded-2xl">取消</Button>
            <Button onClick={handleSaveToCloud} disabled={!yarnName.trim() || createEntry.isPending} className="rounded-2xl">
              {createEntry.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Generator */}
      <SwatchReportGenerator
        open={showReportGenerator}
        onOpenChange={setShowReportGenerator}
        swatchData={safeSwatchData}
        gaugeData={safeGaugeData}
        yarnName={yarnName}
        yarnBrand={yarnBrand}
        preWashImage={preWashImage}
        postWashImage={postWashImage}
        projectPlan={safeProjectPlan.startingStitches > 0 ? safeProjectPlan : undefined}
        compensatedStitches={smartCalc?.mode === 'compensated' ? smartCalc.stitches : 0}
        compensatedRows={smartCalc?.mode === 'compensated' ? smartCalc.rows : 0}
        projectName={projectName}
      />

      {/* Crop Dialog */}
      <ImageCropDialog
        imageUrl={pendingImageUrl}
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════
// Main SwatchLab Page - 3 Tabs
// ═══════════════════════════════════════════════
type TabKey = 'calc' | 'library' | 'yarn-calc';

export default function SwatchLab() {
  const [activeTab, setActiveTab] = useState<TabKey>('calc');
  const [mode, setMode] = useState<'quick' | 'pro'>('quick');
  const [pendingYarn, setPendingYarn] = useState<YarnEntry | null>(null);

  const handleStartProject = useCallback((yarn: YarnEntry) => {
    setPendingYarn(yarn);
    setMode('pro');
    setActiveTab('calc');
  }, []);

  const handlePendingYarnConsumed = useCallback(() => {
    setPendingYarn(null);
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'calc', label: '样片计算' },
    { key: 'library', label: '我的线材库' },
    { key: 'yarn-calc', label: '线量估算' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yarn-sage/30 flex items-center justify-center">
            <Ruler className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">样片实验室</h1>
            <p className="text-sm text-muted-foreground">测量样片，规划项目</p>
          </div>
        </div>

        {/* 3-Tab Segmented Control */}
        <div className="flex bg-muted/50 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      {activeTab === 'calc' && (
        <>
          {/* Quick/Pro toggle inside calc tab */}
          <motion.div variants={itemVariants}>
            <div className="flex bg-muted/30 rounded-xl p-1 max-w-xs mx-auto">
              <button
                onClick={() => setMode('quick')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  mode === 'quick'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                极速
              </button>
              <button
                onClick={() => setMode('pro')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  mode === 'pro'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                专业 Pro
              </button>
            </div>
          </motion.div>

          {mode === 'quick' ? (
            <QuickCalcMode />
          ) : (
            <ProMode pendingYarn={pendingYarn} onPendingYarnConsumed={handlePendingYarnConsumed} />
          )}
        </>
      )}

      {activeTab === 'library' && (
        mode === 'pro' ? (
          <YarnGaugeVault
            onLoadYarn={() => {}}
            onStartProject={handleStartProject}
          />
        ) : (
          <motion.div variants={itemVariants} className="glass-card p-8 text-center space-y-3">
            <Package className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">线材库为专业模式专属功能</p>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setMode('pro'); setActiveTab('calc'); }}>
              切换到专业模式
            </Button>
          </motion.div>
        )
      )}

      {activeTab === 'yarn-calc' && (
        <SmartYarnCalculator />
      )}
    </motion.div>
  );
}
